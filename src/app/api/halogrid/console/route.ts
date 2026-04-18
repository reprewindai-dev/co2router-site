import { NextResponse } from 'next/server'

import { getCommandCenterSnapshot } from '@/lib/control-surface/command-center'
import { getEngineBaseUrl } from '@/lib/control-surface/engine'
import { getControlPlaneSnapshot } from '@/lib/ecobe'
import { HALOGRID_REGION_BASES } from '@/lib/halogrid/region-bases'
import type {
  BackendHealth,
  Decision,
  HaloGridConsoleSnapshot,
  Region,
  RouterAction,
  SignalProvider,
  SystemMetrics,
  TraceFrame,
} from '@/lib/halogrid/types'
import { clamp } from '@/lib/halogrid/utils'

export const dynamic = 'force-dynamic'

type GridSummaryRegion = {
  region: string
  carbonIntensity: number | null
  source: string | null
  renewableRatio: number | null
  demandRampPct: number | null
  signalQuality: 'high' | 'medium' | 'low'
}

type GridSummaryResponse = {
  timestamp: string
  regions: GridSummaryRegion[]
}

type LiveDecision = Awaited<ReturnType<typeof getControlPlaneSnapshot>>['decisions'][number]

function mapControlActionToRouterAction(action: string): RouterAction {
  switch (action) {
    case 'reroute':
      return 'SHIFT_REGION'
    case 'delay':
      return 'DEFER_JOB'
    case 'throttle':
      return 'THROTTLE'
    case 'deny':
      return 'HOLD'
    default:
      return 'PASS'
  }
}

function inferProviderType(name: string): 'carbon' | 'water' {
  const normalized = name.toLowerCase()
  return normalized.includes('water') ||
    normalized.includes('aqueduct') ||
    normalized.includes('aware') ||
    normalized.includes('wwf') ||
    normalized.includes('tomorrow')
    ? 'water'
    : 'carbon'
}

function computeFreshnessSeconds(iso: string | null) {
  if (!iso) return 999
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return 999
  return Math.max(0, Math.round((Date.now() - timestamp) / 1000))
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8_000,
): Promise<T | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchBackendHealth(baseUrl: string) {
  return fetchJsonWithTimeout<BackendHealth>(`${baseUrl}/health`)
}

async function fetchGridSummary(baseUrl: string) {
  return fetchJsonWithTimeout<GridSummaryResponse>(`${baseUrl}/api/v1/intelligence/grid/summary`)
}

function buildSignalProviders(
  backendHealth: BackendHealth | null,
  controlPlane: Awaited<ReturnType<typeof getControlPlaneSnapshot>>,
): SignalProvider[] {
  const providers = new Map<string, SignalProvider>()

  for (const provider of controlPlane.methodologyProviders?.providers ?? []) {
    providers.set(provider.name, {
      name: provider.name,
      type: inferProviderType(provider.name),
      authority: provider.name,
      status: provider.status,
      freshness: computeFreshnessSeconds(provider.lastSuccessAt),
    })
  }

  const backendProviderLabels: Record<string, { name: string; type: 'carbon' | 'water'; authority: string }> = {
    watttime: { name: 'WattTime', type: 'carbon', authority: 'Marginal emissions' },
    gridstatus: { name: 'GridStatus', type: 'carbon', authority: 'Grid data network' },
    eia930: { name: 'EIA-930', type: 'carbon', authority: 'Public grid monitor' },
    ember: { name: 'Ember', type: 'carbon', authority: 'Power data dataset' },
    gbCarbon: { name: 'GB Carbon', type: 'carbon', authority: 'Great Britain carbon feed' },
    dkCarbon: { name: 'DK Carbon', type: 'carbon', authority: 'Denmark carbon feed' },
    fiCarbon: { name: 'FI Carbon', type: 'carbon', authority: 'Finland carbon feed' },
    onCarbon: { name: 'ON Carbon', type: 'carbon', authority: 'Ontario carbon feed' },
    qcCarbon: { name: 'QC Carbon', type: 'carbon', authority: 'Quebec carbon feed' },
    bcCarbon: { name: 'BC Carbon', type: 'carbon', authority: 'British Columbia carbon feed' },
    static: { name: 'Static Dataset', type: 'water', authority: 'Fallback artifact bundle' },
  }

  for (const [key, online] of Object.entries(backendHealth?.providers ?? {})) {
    const meta = backendProviderLabels[key]
    if (!meta) continue
    if (providers.has(meta.name)) continue
    providers.set(meta.name, {
      name: meta.name,
      type: meta.type,
      authority: backendHealth?.providerModes?.[key] ?? meta.authority,
      status: online ? 'healthy' : 'offline',
      freshness: online ? 0 : 999,
    })
  }

  if (backendHealth?.checks.waterArtifacts?.bundlePresent && !providers.has('Aqueduct')) {
    providers.set('Aqueduct', {
      name: 'Aqueduct',
      type: 'water',
      authority: 'Versioned baseline water dataset',
      status: 'healthy',
      freshness: 0,
    })
  }

  return Array.from(providers.values()).sort((left, right) => left.name.localeCompare(right.name))
}

function buildRegionState(carbon: number): Region['state'] {
  if (carbon < 200) return 'green'
  if (carbon < 400) return 'yellow'
  return 'red'
}

function buildRegions(
  gridSummary: GridSummaryResponse | null,
  commandSnapshot: Awaited<ReturnType<typeof getCommandCenterSnapshot>>,
  liveDecisions: LiveDecision[],
): Region[] {
  const gridSummaryByRegion = new Map((gridSummary?.regions ?? []).map((region) => [region.region, region]))
  const worldStateByRegion = new Map(commandSnapshot.world.nodes.map((node) => [node.region, node]))
  const decisionByRegion = new Map<string, LiveDecision>()

  for (const decision of liveDecisions) {
    if (!decisionByRegion.has(decision.selectedRegion)) {
      decisionByRegion.set(decision.selectedRegion, decision)
    }
  }

  return HALOGRID_REGION_BASES.map((baseRegion) => {
    const summary = gridSummaryByRegion.get(baseRegion.id)
    const worldNode = worldStateByRegion.get(baseRegion.id)
    const decision = decisionByRegion.get(baseRegion.id)
    const decisionEnvelope = (decision?.decisionEnvelope ?? null) as
      | { transport?: { adapterId?: string | number | null } }
      | null
    const carbon = Math.round(summary?.carbonIntensity ?? decision?.carbonIntensity ?? baseRegion.carbon)
    const renewable = Math.round(
      summary?.renewableRatio != null ? summary.renewableRatio * 100 : baseRegion.renewable,
    )
    const load = clamp(
      Math.round(summary?.demandRampPct != null ? 50 + summary.demandRampPct * 5 : baseRegion.load),
      10,
      98,
    )
    const waterStress = clamp(decision?.waterStressIndex ?? baseRegion.waterStress, 0, 1)
    const state =
      worldNode?.state === 'active'
        ? 'green'
        : worldNode?.state === 'marginal'
          ? 'yellow'
          : worldNode?.state === 'blocked'
            ? 'red'
            : buildRegionState(carbon)
    const lastDecision = decision ? mapControlActionToRouterAction(decision.action) : 'PASS'
    const trend: Region['trend'] =
      summary?.demandRampPct == null
        ? baseRegion.id === decision?.selectedRegion
          ? 'down'
          : 'flat'
        : summary.demandRampPct > 0.6
          ? 'up'
          : summary.demandRampPct < -0.6
            ? 'down'
            : 'flat'

    return {
      ...baseRegion,
      carbon,
      renewable,
      load,
      waterStress,
      state,
      lastDecision,
      trend,
      provider: decisionEnvelope?.transport?.adapterId?.toString() ?? baseRegion.provider,
    }
  })
}

function buildDecisions(liveDecisions: LiveDecision[]): Decision[] {
  return liveDecisions.map((decision) => ({
    id: decision.decisionFrameId,
    regionId: decision.selectedRegion,
    regionName: decision.selectedRegion,
    action: mapControlActionToRouterAction(decision.action),
    reason: decision.reasonCode,
    carbon: Math.round(decision.carbonIntensity),
    reductionPct: Number(decision.savings.toFixed(1)),
    timestamp: Date.parse(decision.createdAt),
    confidence: Math.round(decision.signalConfidence * 100),
    proofHash: decision.proofHash ?? 'unavailable',
  }))
}

function buildTraces(liveDecisions: LiveDecision[]): TraceFrame[] {
  return liveDecisions
    .filter((decision) => decision.proofHash)
    .slice(0, 10)
    .map((decision) => ({
      id: decision.decisionFrameId,
      regionName: decision.selectedRegion,
      action: mapControlActionToRouterAction(decision.action),
      proofHash: decision.proofHash ?? 'unavailable',
      timestamp: Date.parse(decision.createdAt),
    }))
}

function buildMetrics(
  backendHealth: BackendHealth | null,
  regions: Region[],
  liveDecisions: LiveDecision[],
  commandSnapshot: Awaited<ReturnType<typeof getCommandCenterSnapshot>>,
): SystemMetrics {
  const avgCarbon = Math.round(
    regions.reduce((sum, region) => sum + region.carbon, 0) / Math.max(regions.length, 1),
  )

  return {
    totalSavingsKg: Number((commandSnapshot.impact?.carbonAvoidedKg ?? 0).toFixed(1)),
    decisionsToday: commandSnapshot.impact?.totalDecisions ?? liveDecisions.length,
    avgCarbon,
    uptimePct: backendHealth?.status === 'ok' ? 99.95 : 97.5,
    activeRegions: regions.filter((region) => region.state !== 'red').length,
    alertCount: regions.filter((region) => region.state === 'red').length,
  }
}

export async function GET() {
  const engineBaseUrl = getEngineBaseUrl()
  const [backendHealth, controlPlane, commandSnapshot, gridSummary] = await Promise.all([
    fetchBackendHealth(engineBaseUrl),
    getControlPlaneSnapshot(),
    getCommandCenterSnapshot(),
    fetchGridSummary(engineBaseUrl),
  ])

  const regions = buildRegions(gridSummary, commandSnapshot, controlPlane.decisions)
  const decisions = buildDecisions(controlPlane.decisions.slice(0, 18))
  const traces = buildTraces(controlPlane.decisions)
  const metrics = buildMetrics(backendHealth, regions, controlPlane.decisions, commandSnapshot)
  const signalProviders = buildSignalProviders(backendHealth, controlPlane)

  const snapshot: HaloGridConsoleSnapshot = {
    fetchedAt: new Date().toISOString(),
    backendHealth,
    regions,
    decisions,
    traces,
    metrics,
    signalProviders,
  }

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
