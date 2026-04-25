import crypto from 'crypto'
import { getServerBrokerBaseUrl } from '@/lib/broker-url'
import { getInternalApiKey as resolveInternalApiKey } from '@/lib/internal-api-key'

const DECISION_SIGNATURE_PATHS = new Set(['/ci/route', '/ci/authorize', '/ci/carbon-route'])
const DEFAULT_MCP_TIMEOUT_MS = 4_000

export function getMcpBrokerBaseUrl() {
  return getServerBrokerBaseUrl().replace(/\/api\/v1\/?$/, '')
}

export function getEngineBaseUrl() {
  return getMcpBrokerBaseUrl()
}

function getInternalApiKey() {
  return resolveInternalApiKey()
}

function getDecisionApiSignatureSecret() {
  return (
    process.env.DECISION_API_SIGNATURE_SECRET ||
    process.env.CO2ROUTER_DECISION_API_SIGNATURE_SECRET ||
    null
  )
}

function signDecisionBody(body: string) {
  const secret = getDecisionApiSignatureSecret()
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

function getMcpTimeoutMs() {
  const raw = process.env.MCP_TIMEOUT_MS || process.env.CO2ROUTER_MCP_TIMEOUT_MS
  if (!raw) return DEFAULT_MCP_TIMEOUT_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_MCP_TIMEOUT_MS
  return Math.max(1_000, Math.min(60_000, Math.round(parsed)))
}

function mergeAbortSignals(signals: Array<AbortSignal | null | undefined>) {
  const filtered = signals.filter(Boolean) as AbortSignal[]
  if (filtered.length === 0) return undefined
  if (filtered.length === 1) return filtered[0]

  const controller = new AbortController()
  const onAbort = () => controller.abort()

  for (const signal of filtered) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }

  return controller.signal
}

export async function fetchEngineJson<T>(
  path: string,
  init: RequestInit = {},
  options: { internal?: boolean; timeoutMs?: number } = {}
) {
  const baseUrl = getMcpBrokerBaseUrl()
  if (!baseUrl) {
    throw new Error('Private engine bridge is unavailable')
  }

  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  const requestBody = typeof init.body === 'string' ? init.body : null
  const shouldSignDecisionBody =
    requestBody !== null &&
    DECISION_SIGNATURE_PATHS.has(path) &&
    !headers.has('x-ecobe-signature')

  if (shouldSignDecisionBody) {
    const signature = signDecisionBody(requestBody)
    if (signature) {
      headers.set('x-ecobe-signature', `v1=${signature}`)
    }
  }

  if (options.internal) {
    const token = getInternalApiKey()
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
  }

  const timeoutMs =
    options.timeoutMs != null
      ? Math.max(1_000, Math.min(60_000, Math.round(options.timeoutMs)))
      : getMcpTimeoutMs()
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)
  const mergedSignal = mergeAbortSignals([init.signal, timeoutController.signal])

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: mergedSignal,
    })
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new Error(`MCP broker request timed out for ${path} after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MCP broker request failed for ${path}: ${response.status} ${text}`)
  }

  return (await response.json()) as T
}

export function hasInternalApiKey() {
  return Boolean(getInternalApiKey())
}
