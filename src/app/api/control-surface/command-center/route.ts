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
const SNAPSHOT_CACHE_CONTROL = 'no-store, max-age=0'
function buildFallbackResponse(totalMs: number) {
  const snapshot = FALLBACK_COMMAND_CENTER_SNAPSHOT
  const serialized = JSON.stringify(snapshot)
  const responseBytes = Buffer.byteLength(serialized)

  const response = new NextResponse(serialized, {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
  response.headers.set('x-co2router-snapshot-cache', 'fallback')
  response.headers.set('x-co2router-command-mode', snapshot.runtime.mode)
  response.headers.set('x-co2router-response-bytes', String(responseBytes))
  response.headers.set('Cache-Control', SNAPSHOT_CACHE_CONTROL)
  response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
  return response
}

export async function GET() {
  const startedAt = performance.now()
  try {
    const snapshotResult = await getCachedSnapshot(
      'command-center',
      COMMAND_CENTER_CACHE_TTL_MS,
      getCommandCenterSnapshot
    )
    const { value: cachedSnapshot, cacheStatus, lastSuccessfulAt, errorMessage } = snapshotResult
    const snapshot =
      cacheStatus === 'stale'
        ? {
            ...cachedSnapshot,
            generatedAt: new Date().toISOString(),
            runtime: {
              ...cachedSnapshot.runtime,
              mode: 'read_only_degraded' as const,
              stale: true,
              lastSuccessfulAt: lastSuccessfulAt ?? cachedSnapshot.runtime.lastSuccessfulAt,
              degradedReason:
                errorMessage ??
                cachedSnapshot.runtime.degradedReason ??
                'Command-center refresh failed while serving the last good snapshot.',
              mutationsAllowed: false,
            },
            header: {
              ...cachedSnapshot.header,
              systemStatus: 'read_only_degraded',
            },
          }
        : cachedSnapshot
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
    response.headers.set('x-co2router-command-mode', snapshot.runtime.mode)
    response.headers.set('x-co2router-response-bytes', String(responseBytes))
    response.headers.set('Cache-Control', SNAPSHOT_CACHE_CONTROL)
    response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
    return response
  } catch (error) {
    recordDashboardMetric(dashboardTelemetryMetricNames.routeErrorCount, 'counter', 1, {
      route: 'command-center',
    })
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to build command center snapshot',
      },
      { status: 500 }
    )
  }
}
