import { NextResponse } from 'next/server'

import { getCommandCenterSnapshot } from '@/lib/control-surface/command-center'
import { FALLBACK_COMMAND_CENTER_SNAPSHOT } from '@/lib/control-surface/fallbacks'
import { getCachedSnapshot } from '@/lib/control-surface/snapshot-cache'
import {
  dashboardTelemetryMetricNames,
  recordDashboardMetric,
} from '@/lib/observability/telemetry'

export const dynamic = 'force-dynamic'

const COMMAND_CENTER_CACHE_TTL_MS = 5_000
const SNAPSHOT_CACHE_CONTROL = 'public, max-age=0, s-maxage=5, stale-while-revalidate=10'

export async function GET() {
  const startedAt = performance.now()
  try {
    const { value: snapshot, cacheStatus } = await getCachedSnapshot(
      'command-center',
      COMMAND_CENTER_CACHE_TTL_MS,
      getCommandCenterSnapshot
    )
    const serialized = JSON.stringify(snapshot)
    const totalMs = performance.now() - startedAt
    const responseBytes = Buffer.byteLength(serialized)

    recordDashboardMetric(dashboardTelemetryMetricNames.routeDurationMs, 'histogram', totalMs, {
      route: 'command-center',
      cacheStatus,
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeResponseBytes, 'histogram', responseBytes, {
      route: 'command-center',
      cacheStatus,
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeCacheCount, 'counter', 1, {
      route: 'command-center',
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
      route: 'command-center',
    })
    const fallback = {
      ...FALLBACK_COMMAND_CENTER_SNAPSHOT,
      generatedAt: new Date().toISOString(),
      header: {
        ...FALLBACK_COMMAND_CENTER_SNAPSHOT.header,
        detail: 'Canonical engine unavailable. Frontend fallback snapshot is active.',
      },
    }
    const response = NextResponse.json(fallback, { status: 200 })
    response.headers.set('x-co2router-degraded', 'engine-unavailable')
    response.headers.set('Cache-Control', SNAPSHOT_CACHE_CONTROL)
    return response
  }
}
