import type { ControlSurfaceProviderNode, HallOGridFrame, WorldRegionState } from '@/types/control-surface'

export type SmartAdvisorTrend = 'improving' | 'stable' | 'degrading'
export type SmartAdvisorSeverity = 'positive' | 'watch' | 'risk'

export interface SmartAdvisorInsight {
  id: string
  label: string
  detail: string
  severity: SmartAdvisorSeverity
  confidence: number
}

export interface SmartAdvisorReport {
  generatedAt: string
  fleetHealthPct: number
  carbonTrend: SmartAdvisorTrend
  denyRatePct: number
  providerStressPct: number
  integrityPct: number
  reportHash: string
  insights: SmartAdvisorInsight[]
}

export interface SmartAdvisorInput {
  generatedAt: string
  frames: HallOGridFrame[]
  nodes: WorldRegionState[]
  providers: ControlSurfaceProviderNode[]
  streamHealthy: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function slope(values: number[]) {
  if (values.length < 2) return 0

  const meanX = (values.length - 1) / 2
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length

  let numerator = 0
  let denominator = 0

  values.forEach((value, index) => {
    const deltaX = index - meanX
    numerator += deltaX * (value - meanY)
    denominator += deltaX * deltaX
  })

  return denominator === 0 ? 0 : numerator / denominator
}

function stableHash(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `hg-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function analyzeSmartAdvisor(input: SmartAdvisorInput): SmartAdvisorReport {
  const totalNodes = Math.max(input.nodes.length, 1)
  const activeNodes = input.nodes.filter((node) => node.state === 'active').length
  const guardedNodes = input.nodes.filter((node) => node.state === 'marginal').length
  const blockedNodes = input.nodes.filter((node) => node.state === 'blocked').length
  const staleNodes = input.nodes.filter((node) => node.freshnessState === 'stale').length
  const highPressureNodes = input.nodes.filter((node) => node.pressureLevel === 'high').length

  const orderedFrames = [...input.frames].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )
  const carbonSeries = orderedFrames
    .map((frame) => frame.metrics.carbonReductionPct)
    .filter((value): value is number => value != null && Number.isFinite(value))
  const denyCount = orderedFrames.filter((frame) => frame.action === 'deny').length
  const traceLockedCount = orderedFrames.filter((frame) => frame.traceState === 'locked').length
  const replayVerifiedCount = orderedFrames.filter((frame) => frame.replayState === 'verified').length
  const proofAvailableCount = orderedFrames.filter((frame) => frame.proofState === 'available').length

  const providerCount = Math.max(input.providers.length, 1)
  const degradedProviders = input.providers.filter((provider) => provider.status === 'degraded').length
  const offlineProviders = input.providers.filter((provider) => provider.status === 'offline').length
  const providerStressPct = round(((degradedProviders + offlineProviders) / providerCount) * 100)

  const healthBase = ((activeNodes + guardedNodes * 0.55) / totalNodes) * 100
  const healthPenalty = providerStressPct * 0.2 + staleNodes * 4
  const fleetHealthPct = round(clamp(healthBase - healthPenalty, 0, 100))

  const carbonSlope = slope(carbonSeries)
  const carbonTrend: SmartAdvisorTrend = carbonSlope > 0.35 ? 'improving' : carbonSlope < -0.35 ? 'degrading' : 'stable'
  const denyRatePct = round((denyCount / Math.max(orderedFrames.length, 1)) * 100)
  const integrityPct = round(
    clamp(
      ((traceLockedCount + replayVerifiedCount + proofAvailableCount) / Math.max(orderedFrames.length * 3, 1)) * 100,
      0,
      100,
    ),
  )

  const insights: SmartAdvisorInsight[] = []

  insights.push({
    id: 'carbon-trend',
    label:
      carbonTrend === 'improving'
        ? 'Carbon trend improving'
        : carbonTrend === 'degrading'
          ? 'Carbon trend degrading'
          : 'Carbon trend holding steady',
    detail:
      carbonTrend === 'improving'
        ? 'Recent governed frames are trending toward stronger carbon reduction.'
        : carbonTrend === 'degrading'
          ? 'Recent governed frames are losing carbon advantage and need operator attention.'
          : 'Recent governed frames are staying inside a stable carbon posture band.',
    severity: carbonTrend === 'degrading' ? 'watch' : 'positive',
    confidence: round(clamp(Math.abs(carbonSlope) * 18 + 62, 52, 98)),
  })

  if (providerStressPct >= 30) {
    insights.push({
      id: 'provider-stress',
      label: 'Provider stress cluster',
      detail: `${degradedProviders + offlineProviders} provider feeds are degraded or offline across the live orbit.`,
      severity: offlineProviders > 0 ? 'risk' : 'watch',
      confidence: round(clamp(68 + providerStressPct * 0.4, 68, 97)),
    })
  } else {
    insights.push({
      id: 'provider-health',
      label: 'Provider orbit stable',
      detail: 'Provider health is staying inside the live envelope without multi-feed drift.',
      severity: 'positive',
      confidence: round(clamp(72 - providerStressPct * 0.2, 58, 92)),
    })
  }

  if (blockedNodes >= Math.max(2, Math.ceil(input.nodes.length / 3)) || denyRatePct >= 30) {
    insights.push({
      id: 'deny-cluster',
      label: 'Deny cluster detected',
      detail: 'Blocked regions or deny decisions are clustering tightly enough to warrant operator review.',
      severity: 'risk',
      confidence: round(clamp(70 + denyRatePct * 0.5 + blockedNodes * 2, 70, 98)),
    })
  } else {
    insights.push({
      id: 'execution-availability',
      label: 'Execution lanes available',
      detail: 'The region graph retains enough active or guarded lanes to preserve authorization choice.',
      severity: 'positive',
      confidence: round(clamp(76 - denyRatePct * 0.2, 60, 94)),
    })
  }

  if (highPressureNodes >= 2) {
    insights.push({
      id: 'pressure-cluster',
      label: 'High-pressure region cluster',
      detail: `${highPressureNodes} regions are reporting high pressure in the live theater.`,
      severity: 'watch',
      confidence: round(clamp(66 + highPressureNodes * 6, 66, 96)),
    })
  }

  if (!input.streamHealthy || staleNodes > 0) {
    insights.push({
      id: 'transport-watchdog',
      label: !input.streamHealthy ? 'Transport degraded' : 'Stale telemetry detected',
      detail: !input.streamHealthy
        ? 'The advisor is operating on the last verified snapshot while the live stream is guarded.'
        : `${staleNodes} region signals are stale and should be treated as guarded until refreshed.`,
      severity: 'risk',
      confidence: round(clamp(74 + staleNodes * 3, 74, 97)),
    })
  }

  if (integrityPct >= 85) {
    insights.push({
      id: 'integrity-posture',
      label: 'Trace / replay / proof posture locked',
      detail: 'Recent governed frames are retaining audit-grade trace, replay, and proof continuity.',
      severity: 'positive',
      confidence: round(clamp(70 + integrityPct * 0.2, 70, 96)),
    })
  } else {
    insights.push({
      id: 'integrity-drift',
      label: 'Audit posture needs review',
      detail: 'Recent governed frames are missing some trace, replay, or proof guarantees.',
      severity: 'watch',
      confidence: round(clamp(62 + (100 - integrityPct) * 0.2, 62, 92)),
    })
  }

  const severityRank: Record<SmartAdvisorSeverity, number> = {
    risk: 0,
    watch: 1,
    positive: 2,
  }

  const orderedInsights = insights
    .sort((left, right) => {
      const severityDelta = severityRank[left.severity] - severityRank[right.severity]
      if (severityDelta !== 0) return severityDelta
      return left.label.localeCompare(right.label)
    })
    .slice(0, 5)

  const reportHash = stableHash(
    JSON.stringify({
      fleetHealthPct,
      carbonTrend,
      denyRatePct,
      providerStressPct,
      integrityPct,
      insights: orderedInsights.map((insight) => [insight.id, insight.severity, insight.confidence]),
    }),
  )

  return {
    generatedAt: input.generatedAt,
    fleetHealthPct,
    carbonTrend,
    denyRatePct,
    providerStressPct,
    integrityPct,
    reportHash,
    insights: orderedInsights,
  }
}
