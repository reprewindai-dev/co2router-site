import crypto from 'crypto'
import axios from 'axios'
import { NextResponse } from 'next/server'

import { getClientIp, RateLimiter } from '@/lib/rate-limit'
import { getInternalApiKey } from '@/lib/internal-api-key'

const FORWARDED_HEADERS = ['accept', 'content-type', 'authorization', 'x-request-id', 'x-ecobe-signature'] as const
const SIGNED_DECISION_PATHS = new Set(['ci/route', 'ci/authorize', 'ci/carbon-route'])
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
]

const engineLimiter = new RateLimiter({
  // 240 req/min/IP burst, refills at 4 req/sec
  capacity: 240,
  refillPerSecond: 4,
})

function getEngineBaseUrl() {
  const brokerUrl = process.env.ECOBE_API_URL || process.env.ECOBE_MVP_URL || null
  return brokerUrl ? brokerUrl.replace(/\/$/, '') : null
}

function getEngineTimeoutMs() {
  const raw = process.env.ECOBE_ENGINE_TIMEOUT_MS
  const parsed = raw ? Number(raw) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return 12_000
  return Math.min(Math.max(parsed, 2_000), 60_000)
}

function isCuratedProofInspectionPath(joined: string) {
  return /^ci\/decisions\/[^/]+\/(trace|replay)$/.test(joined)
}

function shouldUseInternalKey(path: string[]) {
  const joined = path.join('/')
  return (
    joined === 'methodology' ||
    joined.startsWith('methodology/') ||
    joined.startsWith('disclosure/') ||
    joined.startsWith('system/') ||
    joined === 'ci/decisions/export' ||
    joined.startsWith('ci/decisions/export/')
  )
}

function getDecisionApiSignatureSecret() {
  return (
    process.env.DECISION_API_SIGNATURE_SECRET ||
    process.env.CO2ROUTER_DECISION_API_SIGNATURE_SECRET ||
    null
  )
}

function signDecisionBody(body: Buffer) {
  const secret = getDecisionApiSignatureSecret()
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function proxy(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params

  const ip = getClientIp(request)
  const limit = engineLimiter.consume(ip)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      {
        status: 429,
        headers: {
          'retry-after': String(limit.retryAfterSeconds),
        },
      }
    )
  }

  const engineBaseUrl = getEngineBaseUrl()
  if (!engineBaseUrl) {
    return NextResponse.json(
      { error: 'ECOBE broker is not configured.' },
      { status: 503 }
    )
  }
  const url = new URL(request.url)
  const useInternalKey = shouldUseInternalKey(path)

  const joinedPath = path.map((part) => encodeURIComponent(part)).join('/')
  const targetUrl = new URL(`${engineBaseUrl}/api/v1/${joinedPath}${url.search}`)

  // Engine quirk hardening:
  // - `/ci/decisions?limit=<small>` intermittently fails upstream with 500
  // - `/ci/decisions?limit=<n>` may fail when `limit` is the only query param
  // Normalize to a safe request and slice response back down when needed.
  const requestedDecisionLimitRaw =
    request.method === 'GET' && path.join('/') === 'ci/decisions'
      ? targetUrl.searchParams.get('limit')
      : null
  const requestedDecisionLimit = requestedDecisionLimitRaw ? Number(requestedDecisionLimitRaw) : null
  const shouldSliceDecisions =
    requestedDecisionLimit !== null &&
    Number.isFinite(requestedDecisionLimit) &&
    requestedDecisionLimit > 0 &&
    requestedDecisionLimit < 100

  if (requestedDecisionLimit !== null) {
    // ensure we never send "limit-only" to upstream
    if (targetUrl.searchParams.size === 1) {
      targetUrl.searchParams.set('offset', '0')
    }
    // still add offset for stability even if other params exist
    if (!targetUrl.searchParams.has('offset')) {
      targetUrl.searchParams.set('offset', '0')
    }
    if (shouldSliceDecisions) {
      targetUrl.searchParams.set('limit', '100')
    }
  }

  const headers: Record<string, string> = {}
  for (const header of FORWARDED_HEADERS) {
    if (useInternalKey && header === 'authorization') {
      continue
    }
    const value = request.headers.get(header)
    if (value) headers[header] = value
  }

  if (useInternalKey) {
    const internalKey = getInternalApiKey()
    if (!internalKey) {
      return NextResponse.json(
        { error: 'Dashboard internal engine authentication is not configured.' },
        { status: 503 }
      )
    }
    headers.authorization = `Bearer ${internalKey}`
    headers['x-ecobe-internal-key'] = internalKey
    headers['x-api-key'] = internalKey
  }

  const bodyBuffer =
    ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.from(await request.arrayBuffer())

  if (!useInternalKey && bodyBuffer && SIGNED_DECISION_PATHS.has(path.join('/')) && !headers['x-ecobe-signature']) {
    const signature = signDecisionBody(bodyBuffer)
    if (signature) {
      headers['x-ecobe-signature'] = `v1=${signature}`
    }
  }

  const upstream = await axios.request<ArrayBuffer>({
    url: targetUrl.toString(),
    method: request.method as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'HEAD'
      | 'OPTIONS',
    headers,
    data: bodyBuffer,
    responseType: 'arraybuffer',
    validateStatus: () => true,
    maxRedirects: 0,
    timeout: getEngineTimeoutMs(),
  })

  if (shouldSliceDecisions) {
    const contentType = String((upstream.headers as Record<string, string>)['content-type'] ?? '')
    if (contentType.includes('application/json')) {
      try {
        const decoded = Buffer.from(upstream.data).toString('utf8')
        const json = JSON.parse(decoded) as { decisions?: unknown[]; total?: number; limit?: number }
        const decisions = Array.isArray(json?.decisions) ? json.decisions : []
        const sliced = decisions.slice(0, requestedDecisionLimit as number)
        return NextResponse.json(
          {
            ...json,
            decisions: sliced,
            limit: sliced.length,
            total: sliced.length,
          },
          {
            status: upstream.status,
            headers: {
              'x-ecobe-proxy-mode': useInternalKey ? 'internal' : 'forwarded',
              'x-ecobe-proxy-sliced': '1',
            },
          }
        )
      } catch {
        // If slicing fails, fall through to raw upstream passthrough.
      }
    }
  }

  const responseHeaders = new Headers(upstream.headers as HeadersInit)
  for (const header of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(header)
  }

  const responseBody = Buffer.isBuffer(upstream.data) ? upstream.data : Buffer.from(upstream.data)
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  })
  response.headers.set('x-ecobe-proxy-mode', useInternalKey ? 'internal' : 'forwarded')
  return response
}

export async function GET(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx)
}

export async function POST(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx)
}

export async function PUT(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx)
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx)
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx)
}
