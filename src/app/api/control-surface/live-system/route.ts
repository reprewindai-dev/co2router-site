import { NextResponse } from 'next/server'

import { getLiveSystemSnapshot } from '@/lib/control-surface/live-system'
import { FALLBACK_LIVE_SYSTEM_SNAPSHOT } from '@/lib/control-surface/fallbacks'
import { getCachedSnapshot } from '@/lib/control-surface/snapshot-cache'
import {
  dashboardTelemetryMetricNames,
  recordDashboardMetric,
} from '@/lib/observability/telemetry'

export const dynamic = 'force-dynamic'

const LIVE_SYSTEM_CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000
const SNAPSHOT_CACHE_CONTROL = 'no-store, max-age=0'
function buildFallbackResponse(totalMs: number) {
  const snapshot = FALLBACK_LIVE_SYSTEM_SNAPSHOT
  const serialized = JSON.stringify(snapshot)
  const responseBytes = Buffer.byteLength(serialized)

  const response = new NextResponse(serialized, {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
  response.headers.set('x-co2router-snapshot-cache', 'fallback')
  response.headers.set('x-co2router-response-bytes', String(responseBytes))
  response.headers.set('Cache-Control', SNAPSHOT_CACHE_CONTROL)
  response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
  return response
}

export async function GET() {
  const startedAt = performance.now()
  try {
    const snapshotResult = await getCachedSnapshot(
      'live-system',
      LIVE_SYSTEM_CACHE_TTL_MS,
      () => getLiveSystemSnapshot()
    )
    const { value: snapshot, cacheStatus } = snapshotResult
    const serialized = JSON.stringify(snapshot)
    const totalMs = performance.now() - startedAt
    const responseBytes = Buffer.byteLength(serialized)

    recordDashboardMetric(dashboardTelemetryMetricNames.routeDurationMs, 'histogram', totalMs, {
      route: 'live-system',
      cacheStatus,
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeResponseBytes, 'histogram', responseBytes, {
      route: 'live-system',
      cacheStatus,
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeCacheCount, 'counter', 1, {
      route: 'live-system',
      cacheStatus,
    })

    const response = new NextResponse(serialized, {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    })
    response.headers.set('x-co2router-snapshot-cache', cacheStatus)
    response.headers.set('x-co2router-response-bytes', String(responseBytes))
    response.headers.set('Cache-Control', SNAPSHOT_CACHE_CONTROL)
    response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
    return response
  } catch (error) {
    recordDashboardMetric(dashboardTelemetryMetricNames.routeErrorCount, 'counter', 1, {
      route: 'live-system',
    })
    const totalMs = performance.now() - startedAt
    return buildFallbackResponse(totalMs)
  }
}
