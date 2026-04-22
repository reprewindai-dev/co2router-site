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
  regions: { id?: string; label?: string; state: string; action: string | null; reasonCode?: string | null }[]
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
  datasetSummary?: { verifiedDatasets: number; totalDatasets: number }
  hud?: { active: number; marginal: number; blocked: number; threatPercentage: number; decisionVelocity: number; queue: number }
  governance?: { source: string | null; active: boolean | null; enforcementMode: string | null; selectedScore: number | null }
  latencySlo?: { p95TotalMs: number | null; budgetTotalP95Ms: number | null; withinBudget: boolean | null }
  impact?: { totalDecisions: number; carbonAvoidedKg: number; waterShiftedLiters: number; costOptimizedUsd: number; delayedDecisions: number } | null
}

const ACTION = { deny: 'DENY', delay: 'DELAY', reroute: 'REROUTE', throttle: 'THROTTLE' } as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalized(value: string | null | undefined, mode: 'upper' | 'lower' = 'upper') {
  const text = String(value ?? '').trim()
  return mode === 'lower' ? text.toLowerCase() : text.toUpperCase()
}

function safeTimestamp(value: string | null | undefined) {
  if (!value) return null
  const ts = Date.parse(value)
  return Number.isFinite(ts) ? ts : null
}

function linReg(vals: number[]) {
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
  return { slope, r2: total === 0 ? 0 : 1 - residual / total }
}

function zScore(value: number, values: number[]) {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, entry) => sum + entry, 0) / values.length
  const sd = Math.sqrt(values.reduce((sum, entry) => sum + (entry - mean) ** 2, 0) / values.length)
  return sd === 0 ? 0 : (value - mean) / sd
}

function topCount(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null
}

function severityRank(severity: Severity) {
  return severity === 'critical' ? 0 : severity === 'warning' ? 1 : 2
}

function confidence(value: number) {
  return clamp(value, 0.35, 0.99)
}

function pushInsight(insights: FleetInsight[], insight: FleetInsight) {
  if (!insights.some((entry) => entry.id === insight.id)) insights.push(insight)
}

export function analyzeFleet(data: FleetAnalysisInput): IntelligenceReport {
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const insights: FleetInsight[] = []
  const confirmedClear: string[] = []
  const decisions = data.decisions.map((decision) => ({
    ...decision,
    actionNorm: normalized(decision.action),
    governanceSourceNorm: normalized(decision.governanceSource),
    createdMs: safeTimestamp(decision.createdAt),
  }))

  const denies = decisions.filter((d) => d.actionNorm === ACTION.deny).length
  const denyRate = decisions.length ? denies / decisions.length : 0
  const fallbackCount = decisions.filter((d) => d.fallbackUsed).length
  const fallbackRate = decisions.length ? fallbackCount / decisions.length : 0
  const fallbackSignalCount = decisions.filter((d) => d.signalMode === 'fallback' || d.waterAuthorityMode === 'fallback').length
  const governanceMissingCount = decisions.filter((d) => !d.governanceSourceNorm || d.governanceSourceNorm === 'NONE').length
  const delayCount = decisions.filter((d) => d.actionNorm === ACTION.delay).length
  const rerouteCount = decisions.filter((d) => d.actionNorm === ACTION.reroute).length
  const throttleCount = decisions.filter((d) => d.actionNorm === ACTION.throttle).length
  const newestDecisionMs = decisions.reduce<number | null>((latest, decision) => {
    if (decision.createdMs == null) return latest
    return latest == null || decision.createdMs > latest ? decision.createdMs : latest
  }, null)
  const staleDecisionAgeSec = newestDecisionMs == null ? null : Math.round((nowMs - newestDecisionMs) / 1000)

  const activePct = data.regions.filter((region) => normalized(region.state, 'lower') === 'active').length / Math.max(data.regions.length, 1)
  const healthyPct = data.providers.filter((provider) => normalized(provider.status, 'lower') === 'healthy').length / Math.max(data.providers.length, 1)
  const verifiedDatasetPct = data.datasetSummary ? data.datasetSummary.verifiedDatasets / Math.max(data.datasetSummary.totalDatasets, 1) : healthyPct
  const healthScore = Math.round(clamp(
    activePct * 28 +
      healthyPct * 18 +
      verifiedDatasetPct * 20 +
      (1 - fallbackRate) * 12 +
      (1 - denyRate) * 9 +
      (data.governance?.active ? 5 : 0) +
      (data.latencySlo?.withinBudget ? 5 : 0) -
      (data.carbonPressure >= 75 ? 10 : data.carbonPressure >= 60 ? 5 : 0) -
      (data.governance?.active === false ? 8 : governanceMissingCount > 0 ? 4 : 0) -
      (data.latencySlo?.withinBudget === false ? 6 : 0) -
      ((data.hud?.queue ?? 0) > 0 && staleDecisionAgeSec != null && staleDecisionAgeSec > 180 ? 8 : 0),
    0,
    100,
  ))

  const trendInput = data.pressureHistory.length >= 2 ? data.pressureHistory : [data.carbonPressure]
  const trend = linReg(trendInput)
  const carbonTrend: IntelligenceReport['carbonTrend'] = trend.slope < -0.5 ? 'improving' : trend.slope > 0.5 ? 'degrading' : 'stable'

  if (carbonTrend === 'degrading') {
    pushInsight(insights, {
      id: 'carbon-pressure-rising',
      type: 'carbon_trend',
      severity: data.carbonPressure >= 70 ? 'critical' : 'warning',
      title: 'Carbon pressure is climbing',
      detail: `Grid pressure slope is +${trend.slope.toFixed(2)} over ${trendInput.length} samples. Current pressure is ${data.carbonPressure}%, so clean-route quality is narrowing.`,
      confidence: confidence(Math.max(0.55, trend.r2)),
      ts: now,
      metric: `${data.carbonPressure}%`,
      recommendedAction: 'Shift queued work toward the cleanest verified lane before carbon pressure hardens further.',
    })
  } else if (carbonTrend === 'improving' && data.carbonPressure < 50) {
    confirmedClear.push('Carbon pressure is declining and clean routing conditions are improving.')
  }

  if (denyRate >= 0.25) {
    pushInsight(insights, {
      id: 'deny-rate-elevated',
      type: 'anomaly',
      severity: denyRate >= 0.5 ? 'critical' : 'warning',
      title: `Deny rate at ${Math.round(denyRate * 100)}%`,
      detail: `${denies}/${decisions.length} recent decisions were denied. Throughput is being lost to refusal loops instead of clean reroutes.`,
      confidence: 0.92,
      ts: now,
      metric: `${denies}/${decisions.length}`,
      recommendedAction: 'Inspect the dominant reason code and reopen a verified alternate route before forcing more overrides.',
    })
  } else if (denyRate === 0 && decisions.length >= 3) {
    confirmedClear.push('No denials in the current decision window.')
  }

  if (fallbackRate >= 0.2) {
    pushInsight(insights, {
      id: 'fallback-rate-elevated',
      type: 'fleet_health',
      severity: fallbackRate >= 0.4 ? 'critical' : 'warning',
      title: `Fallback posture on ${Math.round(fallbackRate * 100)}% of decisions`,
      detail: `${fallbackCount}/${decisions.length} recent decisions relied on fallback. The fleet is staying safe, but trust and throughput are already degraded.`,
      confidence: 0.9,
      ts: now,
      metric: `${Math.round(fallbackRate * 100)}%`,
      recommendedAction: 'Restore provider freshness and governance coverage before widening operator overrides.',
    })
  } else if (fallbackRate < 0.1 && decisions.length >= 4) {
    confirmedClear.push('Fallback usage is low; the authority path is mostly intact.')
  }

  if (fallbackSignalCount >= 2) {
    pushInsight(insights, {
      id: 'fallback-signal-authority',
      type: 'water_stress',
      severity: fallbackSignalCount >= 4 ? 'critical' : 'warning',
      title: 'Signal authority is leaning on fallback data',
      detail: `${fallbackSignalCount} decisions used fallback signal or water authority modes. Precision and audit defensibility are reduced.`,
      confidence: 0.88,
      ts: now,
      recommendedAction: 'Re-establish verified basin or facility authority before approving aggressive water-sensitive moves.',
    })
  }

  if (governanceMissingCount > 0 || data.governance?.active === false) {
    pushInsight(insights, {
      id: 'governance-missing',
      type: 'governance',
      severity: governanceMissingCount >= 2 || data.governance?.active === false ? 'critical' : 'warning',
      title: data.governance?.active === false ? 'Governance is inactive' : `Governance missing on ${governanceMissingCount} decision${governanceMissingCount > 1 ? 's' : ''}`,
      detail: data.governance?.active === false
        ? 'Operator actions are no longer protected by active doctrine enforcement.'
        : 'Recent decisions are missing governance attribution, which weakens compliance posture and reviewability.',
      confidence: 0.94,
      ts: now,
      metric: data.governance?.active === false ? data.governance.enforcementMode ?? null : `${governanceMissingCount}`,
      recommendedAction: 'Restore doctrine enforcement before clearing the queue under manual intervention.',
    })
  } else if (data.governance?.active && data.governance.enforcementMode) {
    confirmedClear.push(`Governance is active in ${data.governance.enforcementMode} mode.`)
  }

  if (data.governance?.selectedScore != null && data.governance.active && data.governance.selectedScore < 0.55 && decisions.length > 0) {
    pushInsight(insights, {
      id: 'governance-score-thin',
      type: 'posture_drift',
      severity: data.governance.selectedScore < 0.4 ? 'warning' : 'info',
      title: 'Governance confidence is running thin',
      detail: `Selected governance score is ${(data.governance.selectedScore * 100).toFixed(0)}%. Decisions are still passing, but safety margin is narrowing.`,
      confidence: 0.81,
      ts: now,
      metric: `${(data.governance.selectedScore * 100).toFixed(0)}%`,
      recommendedAction: 'Stabilize provider freshness before this drifts into denials.',
    })
  }

  const byType = new Map<string, FleetAnalysisInput['providers']>()
  for (const provider of data.providers) {
    const key = normalized(provider.providerType, 'lower') || 'unknown'
    const bucket = byType.get(key) ?? []
    bucket.push(provider)
    byType.set(key, bucket)
  }
  const carbonProviders = byType.get('carbon') ?? []
  const waterProviders = byType.get('water') ?? []
  const healthyCarbonCount = carbonProviders.filter((provider) => normalized(provider.status, 'lower') === 'healthy').length
  const healthyWaterCount = waterProviders.filter((provider) => normalized(provider.status, 'lower') === 'healthy').length

  if (carbonProviders.length === 0 || healthyCarbonCount === 0) {
    pushInsight(insights, {
      id: 'carbon-coverage-missing',
      type: 'fleet_health',
      severity: 'critical',
      title: 'No healthy carbon provider',
      detail: carbonProviders.length === 0 ? 'No live carbon provider is visible to the advisor.' : 'All visible carbon providers are degraded or offline.',
      confidence: 0.93,
      ts: now,
      recommendedAction: 'Restore a healthy carbon authority source before trusting tight-margin reroutes.',
    })
  } else if (healthyCarbonCount === 1 && carbonProviders.length > 1) {
    pushInsight(insights, {
      id: 'carbon-single-provider',
      type: 'provider_redundancy',
      severity: 'warning',
      title: 'Carbon redundancy is down to one healthy source',
      detail: `Only ${healthyCarbonCount}/${carbonProviders.length} carbon providers are healthy. One more degradation will force full carbon fallback posture.`,
      confidence: 0.87,
      ts: now,
      metric: `${healthyCarbonCount}/${carbonProviders.length}`,
      recommendedAction: 'Investigate degraded carbon providers now instead of waiting for the last healthy source to fail.',
    })
  }

  if (waterProviders.length > 0 && healthyWaterCount === 0) {
    pushInsight(insights, {
      id: 'water-coverage-missing',
      type: 'water_stress',
      severity: 'critical',
      title: 'No healthy water provider',
      detail: `All ${waterProviders.length} visible water providers are degraded. Water-sensitive routing decisions are now missing a reliable authority path.`,
      confidence: 0.91,
      ts: now,
      recommendedAction: 'Hold water-sensitive lane changes until at least one water provider is healthy again.',
    })
  }

  const provenanceMismatchCount = data.providers.filter((provider) => {
    const reason = String(provider.degradedReason ?? '').toLowerCase()
    return provider.provenanceStatus === 'mismatch' || reason.includes('mismatch') || reason.includes('provenance')
  }).length
  if (provenanceMismatchCount > 0 || (data.datasetSummary && data.datasetSummary.verifiedDatasets === 0)) {
    pushInsight(insights, {
      id: 'water-provenance-integrity',
      type: 'water_stress',
      severity: 'critical',
      title: 'Water provenance integrity is degraded',
      detail: data.datasetSummary
        ? `${data.datasetSummary.verifiedDatasets}/${data.datasetSummary.totalDatasets} datasets are verified and ${provenanceMismatchCount} providers show provenance issues.`
        : `${provenanceMismatchCount} providers show provenance mismatch or degradation.`,
      confidence: 0.96,
      ts: now,
      metric: data.datasetSummary ? `${data.datasetSummary.verifiedDatasets}/${data.datasetSummary.totalDatasets}` : null,
      recommendedAction: 'Keep water-sensitive workloads conservative until the verified dataset chain is restored.',
    })
  } else if (data.datasetSummary && data.datasetSummary.totalDatasets > 0 && data.datasetSummary.verifiedDatasets === data.datasetSummary.totalDatasets) {
    confirmedClear.push(`All ${data.datasetSummary.totalDatasets} water datasets are verified.`)
  }

  const staleProviders = data.providers.filter((provider) => provider.freshnessSec != null && provider.freshnessSec > 300)
  if (staleProviders.length > 0) {
    const worstFreshness = Math.max(...staleProviders.map((provider) => provider.freshnessSec ?? 0))
    pushInsight(insights, {
      id: 'provider-staleness-cluster',
      type: 'anomaly',
      severity: worstFreshness > 900 || staleProviders.length >= 3 ? 'critical' : 'warning',
      title: `${staleProviders.length} provider${staleProviders.length > 1 ? 's' : ''} stale`,
      detail: `Worst freshness is ${Math.round(worstFreshness / 60)} minutes old. Aging signal authority is pushing the fleet toward defensive behavior.`,
      confidence: 0.85,
      ts: now,
      metric: `${Math.round(worstFreshness / 60)}m`,
      recommendedAction: staleProviders.length >= 2 ? 'Investigate the ingestion path itself; multiple stale providers usually means pipeline drift.' : 'Refresh the stale provider before trusting marginal route improvements.',
    })
  }

  const latencyValues = decisions.map((decision) => decision.latencyTotalMs).filter((value): value is number => value != null)
  if (latencyValues.length >= 3) {
    const latestLatency = latencyValues[latencyValues.length - 1]
    const latencyZ = zScore(latestLatency, latencyValues)
    if (Math.abs(latencyZ) > 2) {
      pushInsight(insights, {
        id: 'latency-anomaly',
        type: 'anomaly',
        severity: Math.abs(latencyZ) > 3 ? 'critical' : 'warning',
        title: `Latency anomaly at ${Math.round(latestLatency)}ms`,
        detail: latencyZ > 0
          ? `Decision latency is ${latencyZ.toFixed(1)} standard deviations above the recent envelope.`
          : `Decision latency is unusually low (${latencyZ.toFixed(1)} z-score). Verify the pipeline was not short-circuited.`,
        confidence: confidence(0.55 + Math.abs(latencyZ) * 0.12),
        ts: now,
        metric: `${Math.round(latestLatency)}ms`,
        recommendedAction: latencyZ > 0 ? 'Check provider resolution, cache misses, and proof generation before queue depth compounds the slowdown.' : 'Confirm the fast path was legitimate and not a missing-proof shortcut.',
      })
    }
  }

  if (data.latencySlo?.withinBudget === false && data.latencySlo.p95TotalMs != null && data.latencySlo.budgetTotalP95Ms != null) {
    const overshoot = data.latencySlo.p95TotalMs - data.latencySlo.budgetTotalP95Ms
    pushInsight(insights, {
      id: 'slo-breach',
      type: 'slo_breach',
      severity: overshoot > 100 ? 'critical' : 'warning',
      title: `SLO breach: p95 at ${Math.round(data.latencySlo.p95TotalMs)}ms`,
      detail: `Current p95 latency exceeds budget by ${Math.round(overshoot)}ms.`,
      confidence: 0.95,
      ts: now,
      metric: `+${Math.round(overshoot)}ms`,
      recommendedAction: 'Find the slowest stage in the decision path before adding more discretionary reroutes.',
    })
  } else if (data.latencySlo?.withinBudget === true) {
    confirmedClear.push('Latency SLO is within budget.')
  }

  if (staleDecisionAgeSec != null && staleDecisionAgeSec > 180 && (data.hud?.queue ?? 0) > 0) {
    pushInsight(insights, {
      id: 'feed-stale-with-queue',
      type: 'self_heal',
      severity: staleDecisionAgeSec > 600 ? 'critical' : 'warning',
      title: `Decision feed stale for ${Math.round(staleDecisionAgeSec / 60)} minutes`,
      detail: `The newest decision in memory is ${Math.round(staleDecisionAgeSec / 60)} minutes old while ${data.hud?.queue ?? 0} items remain queued.`,
      confidence: 0.89,
      ts: now,
      metric: `${Math.round(staleDecisionAgeSec / 60)}m`,
      recommendedAction: 'Force a feed refresh or inspect the engine before trusting the current queue posture.',
    })
  }

  const dominantRegion = topCount(decisions.map((decision) => decision.selectedRegion))
  if (dominantRegion && decisions.length >= 4) {
    const dominantShare = dominantRegion[1] / decisions.length
    if (dominantShare >= 0.6) {
      pushInsight(insights, {
        id: `lane-concentration-${dominantRegion[0]}`,
        type: 'counterfactual',
        severity: dominantShare >= 0.8 ? 'warning' : 'info',
        title: `${dominantRegion[0]} is carrying ${Math.round(dominantShare * 100)}% of traffic`,
        detail: `${dominantRegion[1]}/${decisions.length} recent decisions concentrated into one region. Alternate-lane evidence is thin.`,
        confidence: 0.78,
        ts: now,
        metric: `${Math.round(dominantShare * 100)}%`,
        recommendedAction: 'Exercise a clean secondary lane now so recovery is fast if the dominant region degrades.',
      })
    }
  }

  const repeatedReason = topCount(decisions.map((decision) => decision.reasonCode ?? ''))
  if (repeatedReason && repeatedReason[1] >= 2) {
    pushInsight(insights, {
      id: `repeat-reason-${repeatedReason[0]}`,
      type: 'counterfactual',
      severity: repeatedReason[1] >= 4 ? 'warning' : 'info',
      title: `Recurring reason code: ${repeatedReason[0]} (${repeatedReason[1]}x)`,
      detail: `${repeatedReason[1]} recent decisions hit the same reason code. This is a repeating doctrine or provider pattern, not a one-off.`,
      confidence: 0.84,
      ts: now,
      metric: `${repeatedReason[1]}x`,
      recommendedAction: 'Address the underlying repeated condition instead of triaging each decision in isolation.',
    })
  }

  const blockedRegions = data.regions.filter((region) => normalized(region.state, 'lower') === 'blocked')
  const marginalRegions = data.regions.filter((region) => normalized(region.state, 'lower') === 'marginal')
  if (blockedRegions.length >= 3) {
    pushInsight(insights, {
      id: 'cascade-risk-blocked',
      type: 'cascade_risk',
      severity: 'critical',
      title: `${blockedRegions.length} regions are blocked`,
      detail: `${blockedRegions.length}/${data.regions.length} regions are blocked. Remaining clean lanes are now carrying concentration risk.`,
      confidence: 0.91,
      ts: now,
      metric: `${blockedRegions.length}/${data.regions.length}`,
      recommendedAction: 'Protect the cleanest executable lane and avoid aggressive manual overrides until integrity stabilizes.',
    })
  } else if (data.regions.length >= 3 && blockedRegions.length + marginalRegions.length >= Math.ceil(data.regions.length * 0.6)) {
    pushInsight(insights, {
      id: 'cascade-risk-marginal',
      type: 'cascade_risk',
      severity: 'warning',
      title: `${blockedRegions.length + marginalRegions.length}/${data.regions.length} regions are stressed`,
      detail: 'More than half the network is blocked or marginal. One more degradation could trigger a fast cascade.',
      confidence: 0.82,
      ts: now,
      recommendedAction: 'Stabilize the least-stressed marginal lane before it tips into blocked state.',
    })
  }

  if (data.hud?.decisionVelocity === 0 && (data.hud?.queue ?? 0) > 0) {
    pushInsight(insights, {
      id: 'velocity-stalled',
      type: 'velocity',
      severity: 'warning',
      title: `Decision pipeline stalled with ${data.hud.queue} queued`,
      detail: 'No decisions are clearing while the queue remains non-zero. The operator is likely waiting on a blocked dependency.',
      confidence: 0.83,
      ts: now,
      metric: `${data.hud.queue} queued`,
      recommendedAction: 'Check engine health, provider freshness, and trace generation before the queue compounds further.',
    })
  } else if ((data.hud?.decisionVelocity ?? 0) > 3 && decisions.length >= 6) {
    confirmedClear.push(`Decision velocity is healthy at ${data.hud?.decisionVelocity}/min.`)
  }

  if (delayCount >= 3 && decisions.length >= 4) {
    const delayPct = Math.round((delayCount / decisions.length) * 100)
    pushInsight(insights, {
      id: 'delay-clustering',
      type: 'posture_drift',
      severity: delayPct >= 50 ? 'warning' : 'info',
      title: `${delayPct}% of recent decisions are delayed`,
      detail: `${delayCount}/${decisions.length} recent decisions were delayed. The posture is drifting toward defensive routing and lower throughput.`,
      confidence: 0.79,
      ts: now,
      metric: `${delayPct}%`,
      recommendedAction: 'Check whether governance thresholds or stale signals are forcing more caution than current conditions require.',
    })
  }

  if (rerouteCount >= 3 && decisions.length >= 4) {
    pushInsight(insights, {
      id: 'reroute-pressure',
      type: 'region_reliability',
      severity: rerouteCount >= 5 ? 'warning' : 'info',
      title: `${rerouteCount} reroutes in the current window`,
      detail: 'The engine is actively redirecting work away from primary lanes. Reroutes preserve service but increase complexity.',
      confidence: 0.76,
      ts: now,
      metric: `${rerouteCount}`,
      recommendedAction: 'Investigate why primary lanes are being avoided before reroute behavior becomes the new normal.',
    })
  }

  if (throttleCount >= 2 && decisions.length >= 4) {
    pushInsight(insights, {
      id: 'throttle-cluster',
      type: 'velocity',
      severity: throttleCount >= 4 ? 'warning' : 'info',
      title: `${throttleCount} throttles in the current window`,
      detail: 'Throttle decisions indicate the fleet is preserving integrity by slowing flow instead of denying it outright.',
      confidence: 0.73,
      ts: now,
      metric: `${throttleCount}`,
      recommendedAction: 'Inspect queue growth and lane freshness before throttles turn into denials.',
    })
  }

  if (data.impact && data.impact.carbonAvoidedKg > 0 && carbonTrend === 'improving' && denyRate < 0.1 && fallbackRate < 0.15) {
    pushInsight(insights, {
      id: 'cost-optimization-window',
      type: 'cost_opportunity',
      severity: 'info',
      title: 'Favorable routing window is open',
      detail: 'Carbon pressure is easing, denials are low, and fallback usage is contained. This is a good moment for cost-sensitive workloads.',
      confidence: 0.76,
      ts: now,
      metric: `${data.impact.carbonAvoidedKg.toFixed(1)}kg saved`,
      recommendedAction: 'Move discretionary or batch workloads now while conditions are favorable.',
    })
  }

  if (insights.length === 0 && confirmedClear.length < 3 && healthScore >= 80 && fallbackRate < 0.1 && denyRate === 0) {
    confirmedClear.push('No operator intervention stands out above the current routing posture.')
  }

  const sortedInsights = insights.slice().sort((a, b) => {
    const severityDelta = severityRank(a.severity) - severityRank(b.severity)
    if (severityDelta !== 0) return severityDelta
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    return a.title.localeCompare(b.title)
  }).slice(0, 8)

  const criticalCount = sortedInsights.filter((insight) => insight.severity === 'critical').length
  const warningCount = sortedInsights.filter((insight) => insight.severity === 'warning').length
  const topInsight = sortedInsights[0] ?? null
  const riskLevel: IntelligenceReport['riskLevel'] = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'elevated' : 'nominal'

  let operatorBrief = 'Fleet is nominal. No operator action stands out above the current routing posture.'
  if (criticalCount >= 3) {
    operatorBrief = `Multiple critical conditions detected (${criticalCount} critical, ${warningCount} warning). Stabilize the top issue first, then clear secondary drift before the queue compounds.`
  } else if (topInsight) {
    operatorBrief = `${topInsight.title}. ${topInsight.detail}`
  } else if (confirmedClear.length > 0) {
    operatorBrief = `Fleet is nominal. ${confirmedClear.slice(0, 3).join(' ')}`
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
        console.log('[CO2 Grid Watchdog] Stale feed - self-healed.')
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
