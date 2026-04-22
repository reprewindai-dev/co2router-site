import { NextResponse } from 'next/server'

import { resolveHallOGridAccess } from '@/lib/control-surface/access'
import { FALLBACK_HALLOGRID_SNAPSHOT } from '@/lib/control-surface/fallbacks'
import { getHallOGridHotMirror } from '@/lib/control-surface/hallogrid-mirror'
import { SNAPSHOT_CACHE_CONTROL } from '@/lib/control-surface/hallogrid-preview'
import {
  dashboardTelemetryMetricNames,
  recordDashboardMetric,
} from '@/lib/observability/telemetry'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const startedAt = performance.now()
  const access = resolveHallOGridAccess(request)

  try {
    const baseSnapshot = await getHallOGridHotMirror(access)
    const snapshot = baseSnapshot
    const serialized = JSON.stringify(snapshot)
    const totalMs = performance.now() - startedAt
    const responseBytes = Buffer.byteLength(serialized)

    recordDashboardMetric(dashboardTelemetryMetricNames.routeDurationMs, 'histogram', totalMs, {
      route: 'hallogrid',
      cacheStatus: 'mirror',
      tenantId: access.tenantId,
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeResponseBytes, 'histogram', responseBytes, {
      route: 'hallogrid',
      cacheStatus: 'mirror',
      tenantId: access.tenantId,
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeCacheCount, 'counter', 1, {
      route: 'hallogrid',
      cacheStatus: 'mirror',
      tenantId: access.tenantId,
    })

    const response = new NextResponse(serialized, {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    })
    response.headers.set('x-co2router-snapshot-cache', 'mirror')
    response.headers.set('x-co2router-response-bytes', String(responseBytes))
    response.headers.set(
      'Cache-Control',
      access.isReadOnlyPreview ? SNAPSHOT_CACHE_CONTROL : 'private, no-store'
    )
    response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
    return response
  } catch (error) {
    recordDashboardMetric(dashboardTelemetryMetricNames.routeErrorCount, 'counter', 1, {
      route: 'hallogrid',
    })
    const fallback = {
      ...FALLBACK_HALLOGRID_SNAPSHOT,
      generatedAt: new Date().toISOString(),
      mirror: {
        ...FALLBACK_HALLOGRID_SNAPSHOT.mirror,
        generatedAt: new Date().toISOString(),
        degradedReason: 'Canonical engine unavailable. HallOGrid mirror is serving a degraded snapshot.',
      },
    }
    const response = NextResponse.json(fallback, { status: 200 })
    response.headers.set('x-co2router-degraded', 'engine-unavailable')
    response.headers.set(
      'Cache-Control',
      access.isReadOnlyPreview ? SNAPSHOT_CACHE_CONTROL : 'private, no-store'
    )
    return response
  }
}
