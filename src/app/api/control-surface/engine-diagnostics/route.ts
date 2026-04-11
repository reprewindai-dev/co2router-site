import { NextResponse } from 'next/server'

import { getEngineBaseUrl } from '@/lib/control-surface/engine'
import { recordDashboardMetric } from '@/lib/observability/telemetry'

export const dynamic = 'force-dynamic'

const PROBE_TIMEOUT_MS = 12_000

type ProbeResult = {
  path: string
  ok: boolean
  status: number | null
  durationMs: number
  bytes: number | null
  error: string | null
}

function getInternalApiKey() {
  return process.env.ECOBE_INTERNAL_API_KEY || process.env.CO2ROUTER_INTERNAL_API_KEY || null
}

function getTimeoutMs() {
  const raw = process.env.ECOBE_ENGINE_TIMEOUT_MS || process.env.CO2ROUTER_ENGINE_TIMEOUT_MS
  if (!raw) return PROBE_TIMEOUT_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return PROBE_TIMEOUT_MS
  return Math.max(1_000, Math.min(60_000, Math.round(parsed)))
}

async function probe(path: string, options?: { internal?: boolean }): Promise<ProbeResult> {
  const startedAt = performance.now()
  const timeoutMs = getTimeoutMs()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers = new Headers()
    headers.set('content-type', 'application/json')

    if (options?.internal) {
      const key = getInternalApiKey()
      if (key) headers.set('authorization', `Bearer ${key}`)
    }

    const response = await fetch(`${getEngineBaseUrl()}/api/v1${path}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: controller.signal,
    })

    const raw = await response.arrayBuffer().catch(() => null)
    const durationMs = performance.now() - startedAt
    const bytes = raw ? raw.byteLength : null

    recordDashboardMetric('co2router.dashboard.engine.probe.duration.ms', 'histogram', durationMs, {
      path,
      ok: String(response.ok),
      status: String(response.status),
    })

    return {
      path,
      ok: response.ok,
      status: response.status,
      durationMs,
      bytes,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    const durationMs = performance.now() - startedAt
    const message =
      error instanceof Error
        ? error.name === 'AbortError'
          ? `Timed out after ${timeoutMs}ms`
          : error.message
        : 'Unknown error'

    recordDashboardMetric('co2router.dashboard.engine.probe.duration.ms', 'histogram', durationMs, {
      path,
      ok: 'false',
      status: 'error',
    })
    recordDashboardMetric('co2router.dashboard.engine.probe.error.count', 'counter', 1, {
      path,
      error: message.slice(0, 96),
    })

    return {
      path,
      ok: false,
      status: null,
      durationMs,
      bytes: null,
      error: message,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET() {
  const engineBaseUrl = getEngineBaseUrl()
  const hasInternal = Boolean(getInternalApiKey())

  const paths: Array<{ path: string; internal?: boolean }> = [
    { path: '/ci/decisions?limit=1' },
    { path: '/ci/health' },
    { path: '/ci/slo' },
    { path: '/water/provenance' },
    { path: '/dashboard/metrics?window=24h' },
    { path: '/dashboard/carbon-ledger-summary?days=30' },
    { path: '/dashboard/provider-trust' },
    { path: '/integrations/events/outbox/metrics', internal: true },
  ]

  const probes = await Promise.all(paths.map((item) => probe(item.path, { internal: Boolean(item.internal && hasInternal) })))

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      engineBaseUrl,
      internalAccessConfigured: hasInternal,
      probes,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

