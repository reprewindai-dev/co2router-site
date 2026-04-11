/* =======================================================
   HALOGRID ADVISOR CORE — v2
   Domain-tuned carbon-routing operator guidance.
   Runs fully offline in the browser against live console data.
   Designed to catch problems before the operator does,
   surface actionable context, and confirm when things are clean.
   ======================================================= */

type InsightType =
  | 'carbon_trend'
  | 'anomaly'
  | 'region_reliability'
  | 'water_stress'
  | 'fleet_health'
  | 'self_heal'
  | 'governance'
  | 'counterfactual'
  | 'slo_breach'
  | 'provider_redundancy'
  | 'cascade_risk'
  | 'cost_opportunity'
  | 'posture_drift'
  | 'velocity'
  | 'confirmation'

type Severity = 'info' | 'warning' | 'critical'

export interface FleetInsight {
  id: string
  type: InsightType
  severity: Severity
  title: string
  detail: string
  confidence: number
  ts: string
  recommendedAction?: string | null
  metric?: string | null
}

export interface IntelligenceReport {
  healthScore: number
  carbonTrend: 'improving' | 'degrading' | 'stable'
  denyRate: number
  fallbackRate: number
  riskLevel: 'nominal' | 'elevated' | 'critical'
  operatorBrief: string
  priorityAction: string | null
  insights: FleetInsight[]
  analyzedAt: string
  confirmedClear: string[]
}

interface FleetAnalysisInput {
  regions: {
    id?: string
    label?: string
    state: string
    action: string | null
    reasonCode?: string | null
  }[]
  decisions: {
    action: string
    latencyTotalMs: number | null
    selectedRegion: string
    reasonCode?: string | null
    fallbackUsed?: boolean
    governanceSource?: string | null
    signalMode?: string | null
    waterAuthorityMode?: string | null
    createdAt?: string | null
    systemState?: string | null
    accountingMethod?: string | null
  }[]
  carbonPressure: number
  providers: {
    status: string
    freshnessSec: number | null
    providerType?: string
    provenanceStatus?: string | null
    degradedReason?: string | null
  }[]
  pressureHistory: number[]
  datasetSummary?: {
    verifiedDatasets: number
    totalDatasets: number
  }
  hud?: {
    active: number
    marginal: number
    blocked: number
    threatPercentage: number
    decisionVelocity: number
    queue: number
  }
  governance?: {
    source: string | null
    active: boolean | null
    enforcementMode: string | null
    selectedScore: number | null
  }
  latencySlo?: {
    p95TotalMs: number | null
    budgetTotalP95Ms: number | null
    withinBudget: boolean | null
  }
  impact?: {
    totalDecisions: number
    carbonAvoidedKg: number
    waterShiftedLiters: number
    costOptimizedUsd: number
    delayedDecisions: number
  } | null
}

function linReg(vals: number[]): { slope: number; r2: number } {
  const n = vals.length
  if (n < 2) return { slope: 0, r2: 0 }

  const xm = (n - 1) / 2
  const ym = vals.reduce((sum, value) => sum + value, 0) / n
  let numerator = 0
  let denominator = 0
  let total = 0
  let residual = 0

  for (let i = 0; i < n; i += 1) {
    numerator += (i - xm) * (vals[i] - ym)
    denominator += (i - xm) ** 2
  }

  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = ym - slope * xm

  for (let i = 0; i < n; i += 1) {
    total += (vals[i] - ym) ** 2
    residual += (vals[i] - (intercept + slope * i)) ** 2
  }

  return {
    slope,
    r2: total === 0 ? 0 : 1 - residual / total,
  }
}

function zScore(value: number, values: number[]) {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, entry) => sum + entry, 0) / values.length
  const sd = Math.sqrt(
    values.reduce((sum, entry) => sum + (entry - mean) ** 2, 0) / values.length,
  )
  return sd === 0 ? 0 : (value - mean) / sd
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function topReason(decisions: FleetAnalysisInput['decisions']) {
  const counts = new Map<string, number>()
  for (const decision of decisions) {
    if (!decision.reasonCode) continue
    counts.set(decision.reasonCode, (counts.get(decision.reasonCode) ?? 0) + 1)
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null
}

function topRegion(decisions: FleetAnalysisInput['decisions']) {
  const counts = new Map<string, number>()
  for (const decision of decisions) {
    counts.set(decision.selectedRegion, (counts.get(decision.selectedRegion) ?? 0) + 1)
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null
}

function severityRank(severity: Severity) {
  if (severity === 'critical') return 0
  if (severity === 'warning') return 1
  return 2
}

export function analyzeFleet(data: FleetAnalysisInput): IntelligenceReport {
  const insights: FleetInsight[] = []
  const confirmedClear: string[] = []
  const now = new Date().toISOString()
  const { regions, decisions, carbonPressure, providers, pressureHistory, datasetSummary, hud, governance, latencySlo, impact } = data

  // ── Core metrics ──
  const denies = decisions.filter((d) => d.action === 'deny').length
  const denyRate = decisions.length > 0 ? denies / decisions.length : 0
  const fallbackCount = decisions.filter((d) => d.fallbackUsed).length
  const fallbackRate = decisions.length > 0 ? fallbackCount / decisions.length : 0
  const fallbackSignalCount = decisions.filter(
    (d) => d.signalMode === 'fallback' || d.waterAuthorityMode === 'fallback',
  ).length
  const governanceMissingCount = decisions.filter((d) => {
    const source = (d.governanceSource ?? '').toUpperCase()
    return !source || source === 'NONE'
  }).length
  const delayCount = decisions.filter((d) => d.action === 'delay').length
  const rerouteCount = decisions.filter((d) => d.action === 'reroute').length

  // ── Health score ──
  const activePct =
    regions.filter((r) => r.state === 'active').length / Math.max(regions.length, 1)
  const healthyPct =
    providers.filter((p) => p.status === 'healthy').length / Math.max(providers.length, 1)
  const verifiedDatasetPct = datasetSummary
    ? datasetSummary.verifiedDatasets / Math.max(datasetSummary.totalDatasets, 1)
    : healthyPct
  const governancePenalty = governance?.active === false ? 6 : 0
  const sloPenalty = latencySlo?.withinBudget === false ? 5 : 0

  const healthScore = Math.round(
    clamp(
      activePct * 30 +
        healthyPct * 20 +
        verifiedDatasetPct * 20 +
        (1 - fallbackRate) * 12 +
        (1 - denyRate) * 10 +
        (governance?.active ? 4 : 0) +
        (latencySlo?.withinBudget ? 4 : 0) -
        (carbonPressure >= 70 ? 8 : carbonPressure >= 55 ? 4 : 0) -
        governancePenalty -
        sloPenalty,
      0,
      100,
    ),
  )

  // ── Carbon trend ──
  const trend = linReg(pressureHistory.length >= 2 ? pressureHistory : [carbonPressure])
  const carbonTrend: IntelligenceReport['carbonTrend'] =
    trend.slope < -0.5 ? 'improving' : trend.slope > 0.5 ? 'degrading' : 'stable'

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 1: Carbon pressure trend
  // ═════════════════════════════════════════════════
  if (carbonTrend === 'degrading') {
    insights.push({
      id: 'carbon-pressure-rising',
      type: 'carbon_trend',
      severity: carbonPressure >= 70 ? 'critical' : 'warning',
      title: 'Carbon pressure is climbing',
      detail: `Grid pressure slope is +${trend.slope.toFixed(2)} over ${Math.max(pressureHistory.length, 1)} samples (current: ${carbonPressure}%). Rising pressure increases override costs and weakens lane quality.`,
      confidence: clamp(Math.max(0.45, trend.r2), 0, 0.96),
      ts: now,
      metric: `${carbonPressure}%`,
      recommendedAction: 'Shift new work toward the cleanest verified lane before queue pressure hardens.',
    })
  } else if (carbonTrend === 'improving' && carbonPressure < 50) {
    confirmedClear.push('Carbon pressure is declining — routing conditions are favorable.')
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 2: Deny rate
  // ═════════════════════════════════════════════════
  if (denyRate >= 0.25) {
    insights.push({
      id: 'deny-rate-elevated',
      type: 'anomaly',
      severity: denyRate >= 0.5 ? 'critical' : 'warning',
      title: `Denial rate at ${Math.round(denyRate * 100)}%`,
      detail: `${denies}/${decisions.length} recent decisions denied. Operators are stuck in refusal loops instead of routing work. Each denied cycle costs time and erodes the clean-route window.`,
      confidence: 0.92,
      ts: now,
      metric: `${denies}/${decisions.length}`,
      recommendedAction: 'Inspect the dominant reason code and reopen a verified secondary lane before forcing another override.',
    })
  } else if (denyRate === 0 && decisions.length >= 3) {
    confirmedClear.push('Zero denials in the current decision window.')
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 3: Fallback posture
  // ═════════════════════════════════════════════════
  if (fallbackRate >= 0.2) {
    insights.push({
      id: 'fallback-rate-elevated',
      type: 'fleet_health',
      severity: fallbackRate >= 0.4 ? 'critical' : 'warning',
      title: `Fallback posture on ${Math.round(fallbackRate * 100)}% of decisions`,
      detail: `${fallbackCount}/${decisions.length} decisions relied on fallback. The engine is protecting integrity, but throughput and confidence will stay degraded until the authority path is restored.`,
      confidence: 0.9,
      ts: now,
      metric: `${Math.round(fallbackRate * 100)}%`,
      recommendedAction: 'Prioritize provider freshness and governance activation before widening operator overrides.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 4: Fallback signal authority
  // ═════════════════════════════════════════════════
  if (fallbackSignalCount >= 2) {
    insights.push({
      id: 'fallback-signal-authority',
      type: 'water_stress',
      severity: fallbackSignalCount >= 4 ? 'critical' : 'warning',
      title: 'Authority path leaning on fallback signals',
      detail: `${fallbackSignalCount} decisions evaluated with fallback signal or water authority mode. Trust is reduced even when the route is technically executable.`,
      confidence: 0.88,
      ts: now,
      recommendedAction: 'Re-establish verified basin or facility-overlay authority before approving aggressive lane moves.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 5: Governance posture
  // ═════════════════════════════════════════════════
  if (governanceMissingCount > 0) {
    insights.push({
      id: 'governance-missing',
      type: 'governance',
      severity: governanceMissingCount >= 2 ? 'critical' : 'warning',
      title: `Governance inactive on ${governanceMissingCount} decision${governanceMissingCount > 1 ? 's' : ''}`,
      detail: `Without active governance, operators can still act but post-decision defensibility is weakened. Auditors and compliance reviewers will flag ungoverned routing decisions.`,
      confidence: 0.94,
      ts: now,
      metric: `${governanceMissingCount}`,
      recommendedAction: 'Treat manual overrides as temporary — restore the policy adapter or external hook before clearing the queue.',
    })
  }

  if (governance?.active && governance.enforcementMode) {
    confirmedClear.push(`Governance active (${governance.enforcementMode} mode).`)
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 6: Provider health & redundancy
  // ═════════════════════════════════════════════════
  const providersByType = new Map<string, FleetAnalysisInput['providers']>()
  for (const p of providers) {
    const key = p.providerType ?? 'unknown'
    const list = providersByType.get(key) ?? []
    list.push(p)
    providersByType.set(key, list)
  }

  const carbonProviders = providersByType.get('carbon') ?? []
  const waterProviders = providersByType.get('water') ?? []
  const healthyCarbonCount = carbonProviders.filter((p) => p.status === 'healthy').length
  const healthyWaterCount = waterProviders.filter((p) => p.status === 'healthy').length

  if (carbonProviders.length === 0 || carbonProviders.every((p) => p.status !== 'healthy')) {
    insights.push({
      id: 'carbon-coverage-missing',
      type: 'fleet_health',
      severity: 'critical',
      title: 'No healthy carbon provider',
      detail: carbonProviders.length === 0
        ? 'No live carbon provider is visible. Scoring will drift toward defensive posture.'
        : 'All carbon providers are degraded or offline. Route scoring may remain conservative even when capacity is available.',
      confidence: 0.93,
      ts: now,
      recommendedAction: 'Restore live carbon authority before trusting tight margin reroutes.',
    })
  } else if (healthyCarbonCount === 1 && carbonProviders.length > 1) {
    insights.push({
      id: 'carbon-single-provider',
      type: 'provider_redundancy',
      severity: 'warning',
      title: 'Single carbon provider remaining',
      detail: `Only ${healthyCarbonCount}/${carbonProviders.length} carbon providers are healthy. If this last provider degrades, the engine will enter full fallback posture with no clean authority path.`,
      confidence: 0.87,
      ts: now,
      metric: `${healthyCarbonCount}/${carbonProviders.length}`,
      recommendedAction: 'Investigate degraded carbon providers now — losing the last healthy source will force fleet-wide conservative routing.',
    })
  }

  if (waterProviders.length > 0 && healthyWaterCount === 0) {
    insights.push({
      id: 'water-coverage-missing',
      type: 'water_stress',
      severity: 'critical',
      title: 'No healthy water provider',
      detail: `All ${waterProviders.length} water providers are degraded. Water-sensitive routing decisions lack reliable authority.`,
      confidence: 0.91,
      ts: now,
      recommendedAction: 'Restrict water-dependent lane decisions until at least one provider is restored.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 7: Provenance integrity
  // ═════════════════════════════════════════════════
  const provenanceMismatchCount = providers.filter(
    (p) =>
      p.provenanceStatus === 'mismatch' ||
      p.degradedReason?.toLowerCase().includes('mismatch') ||
      p.degradedReason?.toLowerCase().includes('provenance'),
  ).length
  if (provenanceMismatchCount > 0 || (datasetSummary && datasetSummary.verifiedDatasets === 0)) {
    insights.push({
      id: 'water-provenance-integrity',
      type: 'water_stress',
      severity: 'critical',
      title: 'Water provenance integrity degraded',
      detail: datasetSummary
        ? `${datasetSummary.verifiedDatasets}/${datasetSummary.totalDatasets} datasets verified. ${provenanceMismatchCount} providers show provenance issues. Unverified chains undermine audit defensibility.`
        : `${provenanceMismatchCount} providers show provenance mismatch or degradation.`,
      confidence: 0.96,
      ts: now,
      metric: datasetSummary ? `${datasetSummary.verifiedDatasets}/${datasetSummary.totalDatasets}` : null,
      recommendedAction: 'Keep water-sensitive workloads in conservative mode until the verified dataset chain is restored.',
    })
  } else if (datasetSummary && datasetSummary.verifiedDatasets === datasetSummary.totalDatasets && datasetSummary.totalDatasets > 0) {
    confirmedClear.push(`All ${datasetSummary.totalDatasets} water datasets verified.`)
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 8: Stale providers
  // ═════════════════════════════════════════════════
  const staleProviders = providers.filter((p) => p.freshnessSec != null && p.freshnessSec > 300)
  if (staleProviders.length > 0) {
    const worstFreshness = Math.max(...staleProviders.map((p) => p.freshnessSec ?? 0))
    const isCritical = worstFreshness > 900 || staleProviders.length >= 3
    insights.push({
      id: `provider-staleness-cluster`,
      type: 'anomaly',
      severity: isCritical ? 'critical' : 'warning',
      title: `${staleProviders.length} provider${staleProviders.length > 1 ? 's' : ''} stale`,
      detail: `Worst freshness is ${Math.round(worstFreshness / 60)}min old across ${staleProviders.length} provider${staleProviders.length > 1 ? 's' : ''}. Stale signals increase defensive scoring and unnecessary delays.`,
      confidence: 0.85,
      ts: now,
      metric: `${Math.round(worstFreshness / 60)}min`,
      recommendedAction: staleProviders.length >= 2
        ? 'Multiple signals are aging out simultaneously — investigate the upstream ingestion pipeline, not just individual providers.'
        : 'Refresh the upstream signal before trusting marginal lane improvements.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 9: Latency anomaly detection
  // ═════════════════════════════════════════════════
  const latencyValues = decisions
    .map((d) => d.latencyTotalMs)
    .filter((v): v is number => v != null)
  if (latencyValues.length >= 3) {
    const latestLatency = latencyValues[latencyValues.length - 1]
    const latencyZ = zScore(latestLatency, latencyValues)
    if (Math.abs(latencyZ) > 2) {
      insights.push({
        id: 'latency-anomaly',
        type: 'anomaly',
        severity: Math.abs(latencyZ) > 3 ? 'critical' : 'warning',
        title: `Latency spike: ${latestLatency}ms (z=${latencyZ.toFixed(1)})`,
        detail: `Decision latency is ${latencyZ > 0 ? 'above' : 'below'} the recent envelope. ${latencyZ > 0 ? 'Operators may see sluggish confirms or delayed replay generation.' : 'Unusually fast — verify the decision was not short-circuited.'}`,
        confidence: clamp(0.55 + Math.abs(latencyZ) * 0.12, 0, 0.95),
        ts: now,
        metric: `${latestLatency}ms`,
        recommendedAction: latencyZ > 0
          ? 'Watch for provider or proof bottlenecks before queue depth compounds.'
          : 'Verify the fast decision was not bypassed or truncated.',
      })
    }
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 10: SLO breach detection
  // ═════════════════════════════════════════════════
  if (latencySlo?.withinBudget === false && latencySlo.p95TotalMs != null && latencySlo.budgetTotalP95Ms != null) {
    const overshoot = latencySlo.p95TotalMs - latencySlo.budgetTotalP95Ms
    insights.push({
      id: 'slo-breach',
      type: 'slo_breach',
      severity: overshoot > 100 ? 'critical' : 'warning',
      title: `SLO breach: p95 at ${Math.round(latencySlo.p95TotalMs)}ms`,
      detail: `The p95 latency (${Math.round(latencySlo.p95TotalMs)}ms) exceeds the ${Math.round(latencySlo.budgetTotalP95Ms)}ms budget by ${Math.round(overshoot)}ms. This affects operator responsiveness and queue throughput.`,
      confidence: 0.95,
      ts: now,
      metric: `+${Math.round(overshoot)}ms`,
      recommendedAction: 'Identify the slowest stage in the decision pipeline — provider resolution, cache misses, or proof generation are the usual culprits.',
    })
  } else if (latencySlo?.withinBudget === true) {
    confirmedClear.push('Latency SLO within budget.')
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 11: Lane concentration risk
  // ═════════════════════════════════════════════════
  const dominantRegion = topRegion(decisions)
  if (dominantRegion && decisions.length >= 4) {
    const dominantShare = dominantRegion[1] / decisions.length
    if (dominantShare >= 0.6) {
      insights.push({
        id: `lane-concentration-${dominantRegion[0]}`,
        type: 'counterfactual',
        severity: dominantShare >= 0.8 ? 'warning' : 'info',
        title: `${dominantRegion[0]} carrying ${Math.round(dominantShare * 100)}% of traffic`,
        detail: `${dominantRegion[1]}/${decisions.length} recent decisions in one region. If this lane degrades, there are no recent counterfactual proofs on alternatives.`,
        confidence: 0.77,
        ts: now,
        metric: `${Math.round(dominantShare * 100)}%`,
        recommendedAction: 'Exercise a verified secondary lane now — having a clean counterfactual ready reduces recovery time from hours to minutes.',
      })
    }
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 12: Repeat failure pattern
  // ═════════════════════════════════════════════════
  const repeatedReason = topReason(decisions)
  if (repeatedReason && repeatedReason[1] >= 2) {
    insights.push({
      id: `repeat-reason-${repeatedReason[0]}`,
      type: 'counterfactual',
      severity: repeatedReason[1] >= 4 ? 'warning' : 'info',
      title: `Recurring: ${repeatedReason[0]} (×${repeatedReason[1]})`,
      detail: `${repeatedReason[1]} decisions hit the same reason code. This is a doctrine pattern, not a one-off — triaging each one individually wastes operator time.`,
      confidence: 0.84,
      ts: now,
      metric: `×${repeatedReason[1]}`,
      recommendedAction: 'Treat this as a systemic pattern. Address the root condition instead of clearing individual decisions.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 13: Multi-region cascade risk
  // ═════════════════════════════════════════════════
  const blockedRegions = regions.filter((r) => r.state === 'blocked')
  const marginalRegions = regions.filter((r) => r.state === 'marginal')
  if (blockedRegions.length >= 3) {
    insights.push({
      id: 'cascade-risk-blocked',
      type: 'cascade_risk',
      severity: 'critical',
      title: `${blockedRegions.length} regions blocked — cascade risk`,
      detail: `This is not an isolated lane issue. ${blockedRegions.length}/${regions.length} regions are blocked. The remaining executable lanes are absorbing all traffic and may degrade under load.`,
      confidence: 0.91,
      ts: now,
      metric: `${blockedRegions.length}/${regions.length}`,
      recommendedAction: 'Protect the cleanest executable lane. Slow discretionary reroutes and avoid aggressive overrides until integrity stabilizes.',
    })
  } else if (blockedRegions.length + marginalRegions.length >= Math.ceil(regions.length * 0.6) && regions.length >= 3) {
    insights.push({
      id: 'cascade-risk-marginal',
      type: 'cascade_risk',
      severity: 'warning',
      title: `${blockedRegions.length + marginalRegions.length}/${regions.length} regions stressed`,
      detail: `More than half the network is in blocked or marginal state. A single additional degradation could trigger cascading failures across remaining lanes.`,
      confidence: 0.82,
      ts: now,
      recommendedAction: 'Stabilize marginal lanes before they tip to blocked. Prioritize the region with the lowest current pressure.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 14: Decision velocity anomaly
  // ═════════════════════════════════════════════════
  if (hud) {
    if (hud.decisionVelocity === 0 && hud.queue > 0) {
      insights.push({
        id: 'velocity-stalled',
        type: 'velocity',
        severity: 'warning',
        title: `Decision pipeline stalled with ${hud.queue} queued`,
        detail: `No decisions have been processed in the recent window despite ${hud.queue} items in the queue. The pipeline may be blocked or waiting on a degraded dependency.`,
        confidence: 0.83,
        ts: now,
        metric: `${hud.queue} queued`,
        recommendedAction: 'Check if the engine is healthy and processing. A stalled pipeline with a growing queue usually means a blocking dependency.',
      })
    } else if (hud.decisionVelocity > 3 && decisions.length >= 6) {
      confirmedClear.push(`Decision velocity nominal at ${hud.decisionVelocity}/min.`)
    }
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 15: Delay clustering
  // ═════════════════════════════════════════════════
  if (delayCount >= 3 && decisions.length >= 4) {
    const delayPct = Math.round((delayCount / decisions.length) * 100)
    insights.push({
      id: 'delay-clustering',
      type: 'posture_drift',
      severity: delayPct >= 50 ? 'warning' : 'info',
      title: `${delayPct}% of decisions delayed`,
      detail: `${delayCount}/${decisions.length} recent decisions were delayed. The engine is preferring caution, which is safe but erodes throughput. This pattern often precedes a posture shift toward full fallback.`,
      confidence: 0.79,
      ts: now,
      metric: `${delayPct}%`,
      recommendedAction: 'If delays are consistent, check whether a governance threshold or signal source is forcing unnecessary caution.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 16: Cost optimization opportunity
  // ═════════════════════════════════════════════════
  if (impact && impact.carbonAvoidedKg > 0 && carbonTrend === 'improving' && denyRate < 0.1 && fallbackRate < 0.15) {
    insights.push({
      id: 'cost-optimization-window',
      type: 'cost_opportunity',
      severity: 'info',
      title: 'Favorable routing window open',
      detail: `Carbon is declining, denials are low (${Math.round(denyRate * 100)}%), and fallback usage is minimal. This is an ideal window to route cost-sensitive workloads through the cleanest lanes for maximum savings.`,
      confidence: 0.74,
      ts: now,
      metric: `${impact.carbonAvoidedKg.toFixed(1)}kg saved`,
      recommendedAction: 'Push cost-sensitive or batch workloads through now while routing conditions are favorable.',
    })
  }

  // ═════════════════════════════════════════════════
  //  ANALYSIS MODULE 17: Reroute pressure
  // ═════════════════════════════════════════════════
  if (rerouteCount >= 3 && decisions.length >= 4) {
    insights.push({
      id: 'reroute-pressure',
      type: 'region_reliability',
      severity: rerouteCount >= 5 ? 'warning' : 'info',
      title: `${rerouteCount} reroutes in current window`,
      detail: `The engine is actively redirecting workloads away from primary lanes. While rerouting preserves service, each redirect adds latency and reduces proof quality on the original path.`,
      confidence: 0.76,
      ts: now,
      metric: `${rerouteCount}`,
      recommendedAction: 'Investigate why primary lanes are being avoided — signal degradation, carbon spikes, or governance blocks are the usual causes.',
    })
  }

  // ── Sort and rank ──
  const sortedInsights = insights.sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  )

  const criticalCount = sortedInsights.filter((i) => i.severity === 'critical').length
  const warningCount = sortedInsights.filter((i) => i.severity === 'warning').length
  const topInsight = sortedInsights[0] ?? null

  const riskLevel: IntelligenceReport['riskLevel'] =
    criticalCount > 0
      ? 'critical'
      : warningCount > 0
        ? 'elevated'
        : 'nominal'

  // ── Dynamic operator brief ──
  let operatorBrief: string
  if (criticalCount >= 3) {
    operatorBrief = `Multiple critical conditions detected (${criticalCount} critical, ${warningCount} warning). The fleet is under significant stress — prioritize the highest-severity item and stabilize before addressing secondary issues.`
  } else if (criticalCount >= 1) {
    operatorBrief = topInsight!.detail
  } else if (warningCount >= 3) {
    operatorBrief = `No critical issues, but ${warningCount} warnings require attention. Left unaddressed, these can compound into critical posture within the next decision cycle.`
  } else if (warningCount >= 1) {
    operatorBrief = topInsight!.detail
  } else if (confirmedClear.length > 0) {
    operatorBrief = `Fleet is nominal. ${confirmedClear.slice(0, 3).join(' ')} No operator intervention required.`
  } else {
    operatorBrief = 'The fleet is nominal. No operator intervention stands out above the current routing posture.'
  }

  return {
    healthScore,
    carbonTrend,
    denyRate,
    fallbackRate,
    riskLevel,
    operatorBrief,
    priorityAction: topInsight?.recommendedAction ?? null,
    insights: sortedInsights,
    analyzedAt: now,
    confirmedClear,
  }
}

export class SelfHealingWatchdog {
  private lastFreshTs = Date.now()
  private staleThresholdMs: number
  private onHeal: () => void
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(opts: { staleThresholdMs?: number; onHeal: () => void }) {
    this.staleThresholdMs = opts.staleThresholdMs ?? 20_000
    this.onHeal = opts.onHeal
  }

  start() {
    this.timer = setInterval(() => {
      if (Date.now() - this.lastFreshTs > this.staleThresholdMs) {
        console.log('[HalOGrid Watchdog] Stale feed - self-healed.')
        this.onHeal()
        this.lastFreshTs = Date.now()
      }
    }, 5_000)
  }

  feed() {
    this.lastFreshTs = Date.now()
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
