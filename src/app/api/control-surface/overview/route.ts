import { NextResponse } from 'next/server'

import { fetchEngineJson, hasInternalApiKey } from '@/lib/control-surface/engine'
import { STATIC_WATER_BUNDLE_TTL_SEC } from '@/lib/control-surface/freshness'
import { FALLBACK_OVERVIEW } from '@/lib/control-surface/fallbacks'
import {
  dashboardTelemetryMetricNames,
  recordDashboardMetric,
} from '@/lib/observability/telemetry'
import type {
  ActionDistributionItem,
  CiHealthSnapshot,
  CiRouteResponse,
  CiSloSnapshot,
  ControlAction,
  ControlSurfaceDecisionSummary,
  ControlSurfaceOverview,
  ControlSurfaceProviderNode,
  ScenarioPreview,
  ControlSurfaceTimelineEvent,
  OutboxMetrics,
  ReplayBundle,
} from '@/types/control-surface'

export const dynamic = 'force-dynamic'

type DecisionRow = {
  decisionFrameId: string
  selectedRunner: string
  selectedRegion: string
  carbonIntensity: number
  baseline: number
  savings: number
  decisionAction?: ControlAction
  action?: ControlAction
  reasonCode: string
  signalConfidence: number
  decisionMode?: 'runtime_authorization' | 'scenario_planning'
  signalMode?: 'marginal' | 'average' | 'fallback'
  accountingMethod?: 'marginal' | 'flow-traced' | 'average'
  notBefore?: string | null
  proofHash?: string
  waterAuthorityMode?: 'basin' | 'facility_overlay' | 'fallback'
  waterScenario?: 'current' | '2030' | '2050' | '2080'
  facilityId?: string | null
  waterEvidenceRefs?: string[]
  waterImpactLiters: number | null
  waterBaselineLiters: number | null
  waterScarcityImpact: number | null
  waterStressIndex: number | null
  waterConfidence: number | null
  fallbackUsed: boolean
  jobType: string
  metadata: Record<string, unknown>
  latencyMs?: {
    total: number
    compute: number
    providerResolution?: number
    cacheStatus?: 'live' | 'warm' | 'redis' | 'lkg' | 'degraded-safe' | 'fallback'
    providers?: {
      electricityMaps?: number | null
      wattTime?: number | null
      validation?: number | null
    }
    withinEnvelope?: boolean
  } | null
  createdAt: string
}

type DecisionFeed = {
  decisions: DecisionRow[]
}

type ProviderTrustResponse = {
  freshness: Array<{
    provider: string
    latestObservedAt: string
    freshnessSec: number
    isStale: boolean
  }>
  providers: Record<
    string,
    Array<{
      zone: string
      signalType: string
        value: number
        confidence: number
        freshnessSec: number
        observedAt: string
        metadata?: Record<string, unknown> | null
      }>
  >
  waterProviders?: Array<{
    provider: string
    authorityRole?: 'baseline' | 'overlay' | 'facility'
    authorityStatus?: 'authoritative' | 'advisory' | 'fallback'
    region?: string
    scenario?: 'current' | '2030' | '2050' | '2080'
    authorityMode?: 'basin' | 'facility_overlay' | 'fallback'
    confidence?: number | null
    observedAt?: string | null
    evidenceRefs?: string[]
    metadata?: Record<string, unknown> | null
    freshnessSec?: number | null
    datasetVersion?: string | null
  }>
}

type WaterProvenanceResponse = {
  datasets: Array<{
    name: string
    datasetVersion: string | null
    manifestHash: string | null
    computedHash: string | null
    verificationStatus: 'verified' | 'unverified' | 'missing_source' | 'mismatch' | 'unavailable'
  }>
}

type LedgerSummary = {
  totalJobsRouted: number
  carbonAvoidedPeriodKg: number
  carbonReductionMultiplier: number | null
  highConfidenceDecisionPct: number
  providerDisagreementRatePct: number
}

type MetricsResponse = {
  totalDecisions: number
  fallbackRate: number
}

function deriveFallbackRate(decisions: ControlSurfaceDecisionSummary[]) {
  if (decisions.length === 0) return 0
  const fallbackCount = decisions.filter((decision) => decision.fallbackUsed).length
  return Number((fallbackCount / decisions.length).toFixed(4))
}

const OVERVIEW_ROUTE_TIMEOUT_MS = 4_500

function buildFallbackOverviewResponse(totalMs: number, reason: string) {
  const liveDecision = {
    decision: 'run_now',
    decisionMode: 'runtime_authorization',
    reasonCode: 'OVERVIEW_FALLBACK',
    decisionFrameId: 'overview-fallback',
    selectedRunner: 'fallback-runner',
    selectedRegion: 'us-east-1',
    recommendation: 'Overview data is hydrating from the live control plane.',
    signalConfidence: 0,
    fallbackUsed: true,
    signalMode: 'fallback',
    accountingMethod: 'average',
    notBefore: null,
    proofHash: 'unavailable',
    waterAuthority: {
      authorityMode: 'fallback',
      scenario: 'current',
      confidence: 0,
      supplierSet: [],
      evidenceRefs: [],
      bundleHash: null,
      manifestHash: null,
    },
    policyTrace: {},
    baseline: {
      region: 'us-east-1',
      carbonIntensity: 0,
      waterImpactLiters: 0,
      waterScarcityImpact: 0,
    },
    selected: {
      region: 'us-east-1',
      carbonIntensity: 0,
      waterImpactLiters: 0,
      waterScarcityImpact: 0,
    },
    savings: {
      carbonReductionPct: 0,
      waterImpactDeltaLiters: 0,
    },
    water: {
      selectedLiters: 0,
      baselineLiters: 0,
      selectedScarcityImpact: 0,
      baselineScarcityImpact: 0,
      intensityLPerKwh: 0,
      stressIndex: 0,
      qualityIndex: null,
      droughtRiskIndex: null,
      confidence: 0,
      source: ['fallback'],
      datasetVersion: {},
      guardrailTriggered: false,
      fallbackUsed: true,
    },
    workflowOutputs: {},
    candidateEvaluations: [],
    proofRecord: {
      job_id: 'overview-fallback',
      baseline_region: 'us-east-1',
      selected_region: 'us-east-1',
      carbon_delta: 0,
      water_delta: 0,
      signals_used: ['fallback'],
      timestamp: new Date().toISOString(),
      dataset_versions: {},
      confidence_score: 0,
      proof_hash: 'unavailable',
      provider_snapshot_refs: [],
    },
    latencyMs: {
      total: 0,
      compute: 0,
      providerResolution: 0,
      cacheStatus: 'fallback',
      influencedDecision: false,
      providers: {
        electricityMaps: null,
        wattTime: null,
        validation: null,
      },
      budget: {
        totalP95Ms: 0,
        computeP95Ms: 0,
      },
      withinEnvelope: false,
    },
  } as CiRouteResponse

  const overview: ControlSurfaceOverview = {
    generatedAt: new Date().toISOString(),
    service: {
      status: 'degraded',
      proofPosture: 'Fallback overview served while live data hydrates.',
      detail: reason,
    },
    impact: {
      totalDecisions: 0,
      carbonAvoidedKg: 0,
      carbonReductionMultiplier: null,
      waterShiftedLiters: 0,
      costOptimizedUsd: 0,
      delayedDecisions: 0,
    },
    liveDecision,
    replay: FALLBACK_OVERVIEW.replay,
    decisions: [],
    actionDistribution: FALLBACK_OVERVIEW.actionDistribution,
    providers: FALLBACK_OVERVIEW.providers,
    scenarioPreviews: [],
    timeline: [],
    metrics: {
      fallbackRate: 1,
      highConfidenceDecisionPct: 0,
      providerDisagreementRatePct: 0,
      p50TotalMs: 0,
      p50ComputeMs: 0,
      p95TotalMs: 0,
      p95ComputeMs: 0,
      p99TotalMs: 0,
      p99ComputeMs: 0,
      currentTotalMs: 0,
      currentComputeMs: 0,
    },
    health: {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        waterArtifacts: {
          bundlePresent: false,
          manifestPresent: false,
          schemaCompatible: false,
          regionCount: 0,
          sourceCount: 0,
          datasetHashesPresent: false,
        },
      },
      errors: ['Overview fallback served while live data hydrates.'],
      sloBudgetMs: {
        totalP95Ms: 0,
        computeP95Ms: 0,
      },
    },
    slo: {
      samples: 0,
      p50: { totalMs: 0, computeMs: 0 },
      p95: { totalMs: 0, computeMs: 0 },
      p99: { totalMs: 0, computeMs: 0 },
      current: { totalMs: 0, computeMs: 0 },
      budget: { totalP95Ms: 0, computeP95Ms: 0 },
      withinBudget: { total: false, compute: false },
    },
    outbox: null,
    simulationDefaults: {
      preferredRegions: ['us-east1', 'eu-west1', 'us-west1'],
      waterPolicyProfile: 'default',
      jobType: 'standard',
      criticality: 'standard',
      carbonWeight: 0.55,
      waterWeight: 0.35,
      latencyWeight: 0.05,
      costWeight: 0.05,
      allowDelay: true,
      estimatedEnergyKwh: 2.5,
    },
  }

  const serialized = JSON.stringify(overview)
  const responseBytes = Buffer.byteLength(serialized)
  const response = new NextResponse(serialized, {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
  response.headers.set('x-co2router-snapshot-cache', 'fallback')
  response.headers.set('x-co2router-response-bytes', String(responseBytes))
  response.headers.set('x-co2router-overview-mode', 'fallback')
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
  return response
}

function toSourceMode(decision: DecisionRow): 'live' | 'mirrored' | 'fallback' {
  if (decision.fallbackUsed) return 'fallback'
  const sourceUsed = String((decision.metadata?.response as Record<string, unknown> | undefined)?.['source_used'] ?? '')
  return sourceUsed ? 'live' : 'mirrored'
}

function buildDecisionSummary(decision: DecisionRow): ControlSurfaceDecisionSummary {
  const waterSelected = decision.waterImpactLiters ?? 0
  const waterBaseline = decision.waterBaselineLiters ?? waterSelected
  const waterDelta = Number((waterBaseline - waterSelected).toFixed(3))
  const action = decision.action ?? decision.decisionAction ?? 'run_now'
  const workloadLabel =
    decision.jobType === 'heavy'
      ? 'GPU build pipeline'
      : decision.jobType === 'light'
        ? 'Light CI verification'
        : 'CI execution frame'

  return {
    decisionFrameId: decision.decisionFrameId,
    createdAt: decision.createdAt,
    workloadLabel,
    action,
    decisionMode: decision.decisionMode ?? 'runtime_authorization',
    reasonCode: decision.reasonCode,
    selectedRegion: decision.selectedRegion,
    selectedRunner: decision.selectedRunner,
    carbonIntensity: decision.carbonIntensity,
    baselineCarbonIntensity: decision.baseline,
    carbonReductionPct: decision.savings,
    waterSelectedLiters: waterSelected,
    waterBaselineLiters: waterBaseline,
    waterImpactDeltaLiters: waterDelta,
    waterScarcityImpact: decision.waterScarcityImpact ?? 0,
    waterStressIndex: decision.waterStressIndex ?? 0,
    signalConfidence: decision.signalConfidence,
    fallbackUsed: decision.fallbackUsed,
    sourceMode: toSourceMode(decision),
    signalMode: decision.signalMode ?? 'fallback',
    accountingMethod: decision.accountingMethod ?? 'average',
    waterAuthorityMode: decision.waterAuthorityMode ?? 'fallback',
    waterScenario: decision.waterScenario ?? 'current',
    facilityId: decision.facilityId ?? null,
    precedenceOverrideApplied: Boolean((decision.metadata?.response as Record<string, unknown> | undefined)?.['policyTrace'] && ((decision.metadata?.response as Record<string, any>)?.policyTrace?.precedenceOverrideApplied)),
    notBefore: decision.notBefore ?? null,
    proofHash:
      decision.proofHash ??
      String((decision.metadata?.response as Record<string, unknown> | undefined)?.['proofHash'] ?? 'unavailable'),
    latencyMs: decision.latencyMs ?? null,
    summaryReason: action === 'delay'
      ? 'Held for a safer carbon-water window'
      : action === 'reroute'
        ? 'Shifted to a cleaner execution region'
        : action === 'throttle'
          ? 'Rate limited under strict policy pressure'
          : action === 'deny'
            ? 'Blocked by deterministic doctrine'
            : 'Allowed to execute under current conditions',
  }
}

function buildActionDistribution(decisions: ControlSurfaceDecisionSummary[]): ActionDistributionItem[] {
  const counts: Record<ControlAction, number> = {
    run_now: 0,
    reroute: 0,
    delay: 0,
    throttle: 0,
    deny: 0,
  }
  decisions.forEach((decision) => {
    counts[decision.action] += 1
  })
  const total = decisions.length || 1
  return (Object.entries(counts) as Array<[ControlAction, number]>).map(([action, count]) => ({
    action,
    count,
    pct: Number(((count / total) * 100).toFixed(1)),
  }))
}

function normalizeProviderIdentity(provider: string): string {
  const normalized = provider.trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (normalized === 'EMBER' || normalized === 'EMBER_STRUCTURAL' || normalized === 'EMBER_STRUCTURAL_BASELINE') {
    return 'EMBER_STRUCTURAL_BASELINE'
  }
  if (normalized === 'WATTTIME') return 'WATTTIME_MOER'
  return normalized
}

function providerLabel(provider: string): string {
  return provider.replace(/_/g, ' ')
}

function isCanonicalCarbonProvider(provider: string) {
  return (
    provider === 'WATTTIME_MOER' ||
    provider === 'GRIDSTATUS' ||
    provider === 'EIA_930' ||
    provider === 'ON_CARBON' ||
    provider === 'QC_CARBON' ||
    provider === 'BC_CARBON' ||
    provider === 'GB_CARBON' ||
    provider === 'DK_CARBON' ||
    provider === 'FI_CARBON' ||
    provider === 'EMBER_STRUCTURAL_BASELINE'
  )
}

function buildProviders(
  providerTrust: ProviderTrustResponse,
  provenance: WaterProvenanceResponse | null
): ControlSurfaceProviderNode[] {
  const freshnessMap = new Map(
    providerTrust.freshness.map((item) => [normalizeProviderIdentity(item.provider), item])
  )
  const provenanceMap = new Map(
    (provenance?.datasets ?? []).map((dataset) => [dataset.name.trim().toLowerCase(), dataset])
  )

  const carbonProviderBuckets = new Map<string, ProviderTrustResponse['providers'][string]>()
  for (const [key, snapshots] of Object.entries(providerTrust.providers)) {
    carbonProviderBuckets.set(normalizeProviderIdentity(key), snapshots)
  }

  for (const canonicalKey of Array.from(freshnessMap.keys())) {
    if (!isCanonicalCarbonProvider(canonicalKey) || carbonProviderBuckets.has(canonicalKey)) {
      continue
    }
    carbonProviderBuckets.set(canonicalKey, [])
  }

  const carbonProviders = Array.from(carbonProviderBuckets.entries()).map(([canonicalKey, snapshots]) => {
    const fresh = freshnessMap.get(canonicalKey)
    const hasFreshnessSignal = Boolean(fresh)
    const hasSnapshotRecord = snapshots.length > 0
    const latestConfidence = snapshots[0]?.confidence ?? null
    const isStale = Boolean(fresh?.isStale)
    const status: ControlSurfaceProviderNode['status'] = isStale ? 'degraded' : 'healthy'
    const statusReasonCode: ControlSurfaceProviderNode['statusReasonCode'] = isStale
      ? 'DEGRADED_STALE'
      : 'HEALTHY_LIVE'
    const mode: ControlSurfaceProviderNode['mode'] =
      canonicalKey === 'EMBER_STRUCTURAL_BASELINE' ? 'mirrored' : isStale ? 'fallback' : 'live'
    const signalAuthority: ControlSurfaceProviderNode['signalAuthority'] =
      canonicalKey.includes('WATTTIME') ? 'marginal' : isStale ? 'fallback' : 'average'
    return {
      id: canonicalKey,
      label: providerLabel(canonicalKey),
      providerType: 'carbon' as const,
      status,
      statusReasonCode,
      statusLabel: isStale ? 'degraded stale' : 'healthy live',
      freshnessSec: fresh && fresh.freshnessSec >= 0 ? fresh.freshnessSec : null,
      confidence: latestConfidence,
      mirrored: canonicalKey === 'EMBER_STRUCTURAL_BASELINE',
      lineageCount: snapshots.length,
      mode,
      signalAuthority,
      degradedReason: isStale
        ? 'Freshness breached safe mirror window.'
        : hasFreshnessSignal && !hasSnapshotRecord
          ? 'Freshness is live, but zone-level trust snapshots are not attached for this provider yet.'
          : null,
      mirrorVersion:
        typeof snapshots[0]?.metadata?.['version'] === 'string'
          ? String(snapshots[0]?.metadata?.['version'])
          : null,
    }
  })

  const waterProviders = (providerTrust.waterProviders ?? []).map((provider) => {
    const freshnessSec =
      provider.freshnessSec ??
      (provider.observedAt ? Math.max(0, Math.round((Date.now() - new Date(provider.observedAt).getTime()) / 1000)) : null)
    const provenanceRecord = provenanceMap.get(provider.provider.trim().toLowerCase())
    const provenanceStatus = provenanceRecord?.verificationStatus ?? 'unavailable'
    const bundleExpired = freshnessSec != null && freshnessSec > STATIC_WATER_BUNDLE_TTL_SEC

    let status: ControlSurfaceProviderNode['status'] = 'healthy'
    let statusReasonCode: ControlSurfaceProviderNode['statusReasonCode'] = 'VERIFIED_STATIC'
    let degradedReason: string | null = null

    if (provider.authorityStatus === 'fallback') {
      status = 'degraded'
      statusReasonCode = 'PROVENANCE_FAILED'
      degradedReason = 'Water authority degraded to fallback posture.'
    } else if (provenanceStatus === 'mismatch') {
      status = 'degraded'
      statusReasonCode = 'HASH_MISMATCH'
      degradedReason = 'Verified dataset hash does not match the current manifest.'
    } else if (
      provenanceStatus === 'missing_source' ||
      provenanceStatus === 'unverified' ||
      provenanceStatus === 'unavailable'
    ) {
      status = 'degraded'
      statusReasonCode = 'PROVENANCE_FAILED'
      degradedReason = 'Water provenance could not be verified from the current bundle.'
    } else if (bundleExpired) {
      status = 'degraded'
      statusReasonCode = 'EXPIRED_BUNDLE'
      degradedReason = 'Verified static bundle is past its allowed TTL.'
    }

    return {
      id: `water:${provider.provider}`,
      label: providerLabel(provider.provider),
      providerType: 'water' as const,
      status,
      statusReasonCode,
      statusLabel: statusReasonCode.toLowerCase().replace(/_/g, ' '),
      freshnessSec,
      confidence: provider.confidence ?? null,
      mirrored: false,
      lineageCount: provider.evidenceRefs?.length ?? 0,
      mode: provider.authorityStatus === 'fallback' ? 'fallback' : 'mirrored',
      signalAuthority: provider.authorityStatus === 'fallback' ? 'fallback' : 'average',
      authorityRole:
        provider.authorityStatus === 'authoritative'
          ? 'authoritative'
          : provider.authorityStatus === 'fallback'
            ? 'fallback'
            : 'advisory',
      authorityMode: provider.authorityMode ?? 'basin',
      scenario: provider.scenario ?? 'current',
      degradedReason,
      mirrorVersion: provider.datasetVersion ?? null,
      provenanceStatus,
    } satisfies ControlSurfaceProviderNode
  })

  return [...carbonProviders, ...waterProviders]
}

async function getScenarioPreviews(
  liveDecision: CiRouteResponse
): Promise<ScenarioPreview[]> {
  const scenarios: Array<'current' | '2030' | '2050' | '2080'> = ['current', '2030', '2050', '2080']
  const requests = scenarios.map((scenario) => ({
    preferredRegions: ['us-east-1', 'eu-west-1', 'us-west-2'],
    carbonWeight: 0.55,
    waterWeight: 0.35,
    latencyWeight: 0.05,
    costWeight: 0.05,
    jobType: 'standard',
    criticality: 'standard',
    waterPolicyProfile: 'default',
    allowDelay: true,
    estimatedEnergyKwh: 2.5,
    decisionMode: 'scenario_planning',
    waterContext: {
      scenario,
    },
    facilityId: liveDecision.waterAuthority.facilityId ?? undefined,
  }))

  try {
    const response = await fetchEngineJson<{ decisions: CiRouteResponse[] }>('/water/scenarios/plan', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    })
    return response.decisions.map((decision) => ({
      scenario: decision.waterAuthority.scenario,
      decision: decision.decision,
      selectedRegion: decision.selectedRegion,
      carbonReductionPct: decision.savings.carbonReductionPct,
      waterImpactDeltaLiters: decision.savings.waterImpactDeltaLiters,
      executable: decision.enforcementBundle?.githubActions.executable ?? false,
      proofHash: decision.proofHash,
    }))
  } catch {
    return []
  }
}

function buildTimeline(
  decisions: ControlSurfaceDecisionSummary[],
  replay: ReplayBundle | null,
  outbox: OutboxMetrics | null,
  providers: ControlSurfaceProviderNode[]
): ControlSurfaceTimelineEvent[] {
  const events: ControlSurfaceTimelineEvent[] = decisions.slice(0, 6).map((decision) => {
    const actionTypeMap: Record<ControlAction, ControlSurfaceTimelineEvent['type']> = {
      run_now: 'DecisionEvaluated',
      reroute: 'Rerouted',
      delay: 'Delayed',
      throttle: 'Throttled',
      deny: 'Denied',
    }

    return {
      id: `${decision.decisionFrameId}-${decision.action}`,
      type: actionTypeMap[decision.action],
      label: `${decision.action} -> ${decision.selectedRegion}`,
      timestamp: decision.createdAt,
      severity:
        decision.action === 'deny'
          ? 'critical'
          : decision.action === 'delay' || decision.action === 'throttle'
            ? 'warning'
            : 'success',
      detail: `${decision.workloadLabel} (${decision.reasonCode})`,
    }
  })

  if (replay?.deterministicMatch) {
    events.unshift({
      id: `${replay.decisionFrameId}-replay`,
      type: 'ReplayVerified',
      label: 'Replay verified',
      timestamp: replay.replayedAt,
      severity: 'success',
      detail: 'Persisted and replayed decision matched action, region, and reason.',
    })
  }

  if (outbox?.alertActive) {
    events.unshift({
      id: 'outbox-alert',
      type: 'OutboxAlert',
      label: 'Event delivery attention',
      timestamp: outbox.generatedAt,
      severity: 'warning',
      detail: `Lag ${outbox.lagMinutes.toFixed(1)}m, failure ${outbox.failureRatePct.toFixed(1)}%.`,
    })
  }

  const slowDecisions = decisions
    .filter((decision) => (decision.latencyMs?.total ?? 0) > 100)
    .slice(0, 2)

  slowDecisions.forEach((decision) => {
    events.unshift({
      id: `${decision.decisionFrameId}-latency`,
      type: 'LatencyAnomaly',
      label: `${decision.action} latency ${decision.latencyMs?.total?.toFixed(0)}ms`,
      timestamp: decision.createdAt,
      severity: 'warning',
      detail: `${decision.workloadLabel} exceeded the 100ms total budget.`,
    })
  })

  providers
    .filter((provider) => provider.status !== 'healthy')
    .slice(0, 2)
    .forEach((provider) => {
      events.unshift({
        id: `${provider.id}-degraded`,
        type: 'ProviderDegraded',
        label: `${provider.label} degraded`,
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: provider.freshnessSec == null
          ? 'Provider freshness unavailable; mirrored lineage still present.'
          : `Latest mirrored freshness ${provider.freshnessSec}s.`,
      })
    })

  return events.slice(0, 10)
}

function chooseFeaturedDecision(
  liveDecision: CiRouteResponse,
  decisions: ControlSurfaceDecisionSummary[]
): CiRouteResponse | ControlSurfaceDecisionSummary {
  const featuredSummary = decisions.find(
    (decision) =>
      (decision.action === 'reroute' || decision.action === 'delay' || decision.action === 'deny') &&
      (decision.carbonReductionPct > 0 || decision.waterImpactDeltaLiters > 0)
  )

  if (featuredSummary) return featuredSummary
  return liveDecision
}

async function getReplayBundle(decisions: DecisionFeed['decisions']) {
  const latest = decisions[0]
  if (!latest) return null

  if (hasInternalApiKey()) {
    try {
      return await fetchEngineJson<ReplayBundle>(
        `/ci/decisions/${encodeURIComponent(latest.decisionFrameId)}/replay`,
        undefined,
        { internal: true }
      )
    } catch (error) {
      console.warn('Failed to fetch internal replay bundle, falling back to live sample:', error)
    }
  }

  const replay = await fetchEngineJson<CiRouteResponse>('/ci/route', {
    method: 'POST',
    body: JSON.stringify({
      preferredRegions: ['us-east1', 'eu-west1', 'us-west1'],
      carbonWeight: 0.55,
      waterWeight: 0.35,
      latencyWeight: 0.05,
      costWeight: 0.05,
      jobType: 'standard',
      criticality: 'standard',
      waterPolicyProfile: 'default',
      allowDelay: true,
      estimatedEnergyKwh: 2.5,
    }),
  })

  return {
    decisionFrameId: replay.decisionFrameId,
    persisted: null,
    replay,
    deterministicMatch: false,
    replayedAt: new Date().toISOString(),
  }
}

async function buildOverviewResponse() {
  const startedAt = performance.now()
  try {
    const describeFailure = (error: unknown) => (error instanceof Error ? error.message : 'Unknown engine failure.')

    const [healthSettled, sloSettled, decisionsSettled] = await Promise.allSettled([
      fetchEngineJson<CiHealthSnapshot>('/ci/health'),
      fetchEngineJson<CiSloSnapshot>('/ci/slo'),
      fetchEngineJson<DecisionFeed>('/ci/decisions?limit=12'),
    ])

    const [ledgerResult, metricsResult] = await Promise.all([
      fetchEngineJson<LedgerSummary>('/dashboard/carbon-ledger-summary?days=30').catch(() => null),
      fetchEngineJson<MetricsResponse>('/dashboard/metrics?window=24h').catch(() => null),
    ])

    if (decisionsSettled.status === 'rejected') {
      throw new Error(`Decision feed unavailable: ${describeFailure(decisionsSettled.reason)}`)
    }

    const decisionFeed = decisionsSettled.value

    const fallbackSlo: CiSloSnapshot = {
      samples: 0,
      p50: { totalMs: 0, computeMs: 0 },
      p95: { totalMs: 0, computeMs: 0 },
      p99: { totalMs: 0, computeMs: 0 },
      current: { totalMs: 0, computeMs: 0 },
      budget: { totalP95Ms: 0, computeP95Ms: 0 },
      withinBudget: { total: false, compute: false },
    }

    const sloError = sloSettled.status === 'rejected' ? describeFailure(sloSettled.reason) : null
    const slo = sloSettled.status === 'fulfilled' ? sloSettled.value : fallbackSlo

    const fallbackHealth: CiHealthSnapshot = {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        waterArtifacts: {
          bundlePresent: false,
          manifestPresent: false,
          schemaCompatible: false,
          regionCount: 0,
          sourceCount: 0,
          datasetHashesPresent: false,
        },
      },
      errors: ['Health snapshot unavailable.'],
      sloBudgetMs: {
        totalP95Ms: slo.budget.totalP95Ms,
        computeP95Ms: slo.budget.computeP95Ms,
      },
    }

    const healthError = healthSettled.status === 'rejected' ? describeFailure(healthSettled.reason) : null
    const health =
      healthSettled.status === 'fulfilled'
        ? healthSettled.value
        : {
            ...fallbackHealth,
            errors: healthError ? [`Health snapshot unavailable: ${healthError}`] : fallbackHealth.errors,
          }

    const [providerTrustResult, provenanceResult, outboxResult] = await Promise.allSettled([
      fetchEngineJson<ProviderTrustResponse>('/dashboard/provider-trust'),
      fetchEngineJson<WaterProvenanceResponse>('/water/provenance'),
      hasInternalApiKey()
        ? fetchEngineJson<OutboxMetrics>('/integrations/events/outbox/metrics', undefined, { internal: true })
        : Promise.resolve(null),
    ])

    const providerTrust =
      providerTrustResult.status === 'fulfilled'
        ? providerTrustResult.value
        : { freshness: [], providers: {} }
    const provenance = provenanceResult.status === 'fulfilled' ? provenanceResult.value : null
    const outbox = outboxResult.status === 'fulfilled' ? outboxResult.value : null

    const replay = await getReplayBundle(decisionFeed.decisions)
    const liveDecision = replay?.replay ?? replay?.persisted
    if (!liveDecision) {
      throw new Error('No live decision available for control surface')
    }

    const decisions = decisionFeed.decisions.map(buildDecisionSummary)
    const fallbackRate = metricsResult?.fallbackRate ?? deriveFallbackRate(decisions)
    const totalDecisionCount = ledgerResult?.totalJobsRouted ?? metricsResult?.totalDecisions ?? decisionFeed.decisions.length
    const carbonAvoidedKg = ledgerResult?.carbonAvoidedPeriodKg ?? 0
    const carbonReductionMultiplier = ledgerResult?.carbonReductionMultiplier ?? null
    const providers = buildProviders(providerTrust, provenance)
    const actionDistribution = buildActionDistribution(decisions)
    const timeline = buildTimeline(decisions, replay, outbox, providers)
    const scenarioPreviews = await getScenarioPreviews(liveDecision)

    if (healthSettled.status !== 'fulfilled') {
      timeline.unshift({
        id: 'engine-health-degraded',
        type: 'ProviderDegraded',
        label: 'Engine health snapshot degraded',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: healthError ? `Engine health endpoint degraded: ${healthError}` : 'Engine health endpoint is unavailable or timed out.',
      })
    }

    if (sloSettled.status !== 'fulfilled') {
      timeline.unshift({
        id: 'engine-slo-degraded',
        type: 'ProviderDegraded',
        label: 'Engine latency surface degraded',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: sloError ? `Engine SLO endpoint degraded: ${sloError}` : 'Engine SLO endpoint is unavailable or timed out.',
      })
    }
    if (providerTrustResult.status === 'rejected') {
      timeline.unshift({
        id: 'provider-trust-degraded',
        type: 'ProviderDegraded',
        label: 'Provider trust surface degraded',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: 'The overview stayed live, but provider freshness details could not be loaded.',
      })
    }
    if (provenanceResult.status === 'rejected') {
      timeline.unshift({
        id: 'provenance-degraded',
        type: 'ProviderDegraded',
        label: 'Water provenance surface degraded',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: 'Provider overview stayed live, but provenance verification could not be loaded.',
      })
    }
    if (!ledgerResult) {
      timeline.unshift({
        id: 'impact-summary-degraded',
        type: 'ProviderDegraded',
        label: 'Impact summary degraded',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: 'Carbon ledger summary is unavailable, so impact falls back to the live decision feed.',
      })
    }
    if (!metricsResult) {
      timeline.unshift({
        id: 'decision-metrics-degraded',
        type: 'ProviderDegraded',
        label: 'Decision metrics degraded',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        detail: 'Fallback-rate summary is unavailable, so the overview derives it from live decisions only.',
      })
    }
    if (!slo.withinBudget.total || !slo.withinBudget.compute) {
      timeline.unshift({
        id: 'slo-breach',
        type: 'SLOBreach',
        label: `rolling p95 ${slo.p95.totalMs.toFixed(0)}ms`,
        timestamp: new Date().toISOString(),
        severity: 'critical',
        detail: `Budget ${slo.budget.totalP95Ms}ms total / ${slo.budget.computeP95Ms}ms compute. Current warm path is ${slo.current.totalMs.toFixed(0)}ms total and rolling compute p95 is ${slo.p95.computeMs.toFixed(0)}ms.`,
      })
    }

    const waterShiftedLiters = decisions.reduce(
      (sum, decision) => sum + Math.max(0, decision.waterImpactDeltaLiters),
      0
    )

    const delayedDecisions = actionDistribution.find((item) => item.action === 'delay')?.count ?? 0
    const featuredDecision = chooseFeaturedDecision(liveDecision, decisions)

    const overview: ControlSurfaceOverview = {
      generatedAt: new Date().toISOString(),
      service: {
        status: health.status,
        proofPosture: replay?.persisted || replay?.deterministicMatch ? 'Replayable proof live' : 'Live proof sample',
        detail: `DB ${health.checks.database ? 'ok' : 'degraded'} | Water artifacts ${
          health.checks.waterArtifacts.schemaCompatible ? 'verified' : 'degraded'
        } | Current ${slo.current.totalMs.toFixed(0)}ms | Rolling p95 ${slo.p95.totalMs.toFixed(0)}ms`,
      },
      impact: {
        totalDecisions: totalDecisionCount,
        carbonAvoidedKg,
        carbonReductionMultiplier,
        waterShiftedLiters,
        costOptimizedUsd: Number((carbonAvoidedKg * 0.42).toFixed(2)),
        delayedDecisions,
      },
      liveDecision,
      featuredDecision,
      replay,
      decisions,
      actionDistribution,
      providers,
      scenarioPreviews,
      timeline,
      metrics: {
        fallbackRate,
        highConfidenceDecisionPct: ledgerResult?.highConfidenceDecisionPct ?? 0,
        providerDisagreementRatePct: ledgerResult?.providerDisagreementRatePct ?? 0,
        p50TotalMs: slo.p50.totalMs,
        p50ComputeMs: slo.p50.computeMs,
        p95TotalMs: slo.p95.totalMs,
        p95ComputeMs: slo.p95.computeMs,
        p99TotalMs: slo.p99.totalMs,
        p99ComputeMs: slo.p99.computeMs,
        currentTotalMs: slo.current.totalMs,
        currentComputeMs: slo.current.computeMs,
      },
      health,
      slo,
      outbox,
      simulationDefaults: {
        preferredRegions: ['us-east1', 'eu-west1', 'us-west1'],
        waterPolicyProfile: 'default',
        jobType: 'standard',
        criticality: 'standard',
        carbonWeight: 0.55,
        waterWeight: 0.35,
        latencyWeight: 0.05,
        costWeight: 0.05,
        allowDelay: true,
        estimatedEnergyKwh: 2.5,
      },
    }

    const serialized = JSON.stringify(overview)
    const totalMs = performance.now() - startedAt
    const responseBytes = Buffer.byteLength(serialized)

    recordDashboardMetric(dashboardTelemetryMetricNames.routeDurationMs, 'histogram', totalMs, {
      route: 'overview',
    })
    recordDashboardMetric(dashboardTelemetryMetricNames.routeResponseBytes, 'histogram', responseBytes, {
      route: 'overview',
    })

    const response = new NextResponse(serialized, {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    })
    response.headers.set('x-co2router-response-bytes', String(responseBytes))
    response.headers.set('Server-Timing', `total;dur=${totalMs.toFixed(1)}`)
    return response
  } catch (error) {
    console.error('Control surface overview error:', error)
    recordDashboardMetric(dashboardTelemetryMetricNames.routeErrorCount, 'counter', 1, {
      route: 'overview',
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build control surface overview' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const startedAt = performance.now()
  const fallbackPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      resolve(
        buildFallbackOverviewResponse(
          performance.now() - startedAt,
          'Overview snapshot timed out while live data continued hydrating.'
        )
      )
    }, OVERVIEW_ROUTE_TIMEOUT_MS)
  })

  return Promise.race([buildOverviewResponse(), fallbackPromise])
}
