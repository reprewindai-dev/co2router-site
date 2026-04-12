import type {
  CommandCenterDecisionItem,
  CommandCenterSnapshot,
  ControlSurfaceProviderNode,
  DecisionTraceRawRecord,
  LiveSystemSnapshot,
  ReplayBundle,
  WorldRegionState,
  WorldRoutingFlow,
} from '@/types/control-surface'

export type HalogridTier = 'freeview' | 'pro' | 'elite'
export type HalogridConsoleMode = 'command' | 'focus' | 'presentation'

export interface HalogridEntitlementView {
  tier: HalogridTier
  canInspect: boolean
  canOpenManual: boolean
  canUseElite: boolean
}

export interface HalogridRegionView {
  id: string
  label: string
  x: number
  y: number
  lat: number
  lng: number
  state: WorldRegionState['state']
  action: string | null
  frameId: string | null
  reasonCode: string | null
  pressurePct: number
  emphasis: number
}

export interface HalogridFlowView {
  id: string
  from: HalogridRegionView | null
  to: HalogridRegionView | null
  mode: WorldRoutingFlow['mode']
  stroke: number
  altitude: number
  dashLength: number
  dashGap: number
  dashAnimateTime: number
}

export interface HalogridProviderView {
  id: string
  label: string
  providerType: ControlSurfaceProviderNode['providerType']
  status: ControlSurfaceProviderNode['status']
  provenanceStatus: ControlSurfaceProviderNode['provenanceStatus']
  degradedReason: ControlSurfaceProviderNode['degradedReason']
  freshnessSec: number | null
  freshnessLabel: string
  confidence: number | null
  confidenceLabel: string
  detail: string
}

export interface HalogridHudView {
  active: number
  marginal: number
  blocked: number
  carbonPressure: number
  threatPercentage: number
  decisionVelocity: number
  queue: number
  verifiedDatasets: number
  totalDatasets: number
}

export interface HalogridAlarmView {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  createdAt: string
}

export interface HalogridDecisionMetrics {
  carbonReductionPct: number | null
  waterDeltaLiters: number | null
  confidence: number | null
  carbonIntensity: number | null
  waterImpactLiters: number | null
  waterStressIndex: number | null
  baselineRegion: string | null
  proofRefs: number
  evidenceRefs: number
  providerRefs: number
  replayVerified: boolean | null
}

export interface HalogridDecisionView {
  frame: CommandCenterDecisionItem
  trace: DecisionTraceRawRecord | null
  replay: ReplayBundle | null
  metrics: HalogridDecisionMetrics
}

export interface HalogridHoverCardView {
  region: HalogridRegionView
  headline: string
  actionLabel: string
  proofHash: string | null
  replayVerified: boolean | null
  latencyTotalMs: number | null
  carbonReductionPct: number | null
  waterDeltaLiters: number | null
  confidence: number | null
}

export interface HalogridGlobeThemeView {
  stormMode: boolean
  healthy: boolean
  degradedReason: string | null
}

export interface HalogridViewModel {
  title: string
  subtitle: string
  generatedAt: string
  hud: HalogridHudView
  entitlements: HalogridEntitlementView
  regions: HalogridRegionView[]
  flows: HalogridFlowView[]
  providers: HalogridProviderView[]
  frames: CommandCenterDecisionItem[]
  selectedFrameId: string | null
  selectedDecision: HalogridDecisionView | null
  alarms: HalogridAlarmView[]
  stale: boolean
  degradedReason: string | null
  globe: HalogridGlobeThemeView
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function toLatLng(x: number, y: number) {
  return {
    lat: (0.5 - y / 100) * 180,
    lng: x * 3.6 - 180,
  }
}

function formatFreshness(value: number | null) {
  if (value == null) return 'n/a'
  if (value < 60) return `${value}s`
  if (value < 3600) return `${Math.round(value / 60)}m`
  return `${Math.round(value / 3600)}h`
}

function formatConfidence(value: number | null) {
  if (value == null) return '--'
  return `${Math.round(value * 100)}%`
}

function derivePressure(node: WorldRegionState) {
  if (node.state === 'blocked') return 88
  if (node.state === 'marginal') return 62
  if (node.action === 'reroute') return 54
  return 34
}

function buildHud(snapshot: CommandCenterSnapshot, live: LiveSystemSnapshot): HalogridHudView {
  const active = snapshot.world.nodes.filter((node) => node.state === 'active').length
  const marginal = snapshot.world.nodes.filter((node) => node.state === 'marginal').length
  const blocked = snapshot.world.nodes.filter((node) => node.state === 'blocked').length
  const threatPercentage = Math.round((blocked / Math.max(snapshot.world.nodes.length, 1)) * 100)

  const pressureValues = snapshot.world.nodes.map((node) => derivePressure(node))
  const recentFrames = snapshot.decisionCore.recentDecisions.filter(
    (frame) => Date.now() - new Date(frame.createdAt).getTime() <= 15 * 60_000,
  )
  const verifiedDatasets = live.providers.datasets.filter(
    (dataset) => dataset.verificationStatus === 'verified',
  ).length

  return {
    active,
    marginal,
    blocked,
    carbonPressure: Math.round(average(pressureValues)),
    threatPercentage,
    decisionVelocity: Math.round((recentFrames.length / 15) * 10) / 10,
    queue: Math.max(0, Math.round((marginal + blocked) * 1.4)),
    verifiedDatasets,
    totalDatasets: Math.max(live.providers.datasets.length, 4),
  }
}

function providerDetail(provider: ControlSurfaceProviderNode) {
  const freshness =
    typeof provider.freshnessSec === 'number'
      ? `${provider.freshnessSec}s freshness`
      : 'freshness unavailable'
  const confidence =
    typeof provider.confidence === 'number'
      ? `${Math.round(provider.confidence * 100)}% confidence`
      : 'confidence unavailable'
  return `${provider.status} | ${freshness} | ${confidence}`
}

function buildProviders(snapshot: CommandCenterSnapshot): HalogridProviderView[] {
  return snapshot.health.providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    providerType: provider.providerType,
    status: provider.status,
    provenanceStatus: provider.provenanceStatus ?? null,
    degradedReason: provider.degradedReason ?? null,
    freshnessSec: provider.freshnessSec,
    freshnessLabel: formatFreshness(provider.freshnessSec),
    confidence: provider.confidence,
    confidenceLabel: formatConfidence(provider.confidence),
    detail: providerDetail(provider),
  }))
}

function buildRegions(snapshot: CommandCenterSnapshot): HalogridRegionView[] {
  return snapshot.world.nodes.map((node) => {
    const { lat, lng } = toLatLng(node.x, node.y)
    const pressurePct = derivePressure(node)

    return {
      id: node.region,
      label: node.label,
      x: node.x,
      y: node.y,
      lat,
      lng,
      state: node.state,
      action: node.action,
      frameId: node.decisionFrameId,
      reasonCode: node.reasonCode,
      pressurePct,
      emphasis: pressurePct / 100,
    }
  })
}

function buildFlows(
  snapshot: CommandCenterSnapshot,
  regions: HalogridRegionView[],
): HalogridFlowView[] {
  const byId = new Map(regions.map((region) => [region.id, region]))
  return snapshot.world.flows.map((flow) => ({
    id: flow.id,
    from: byId.get(flow.fromRegion) ?? null,
    to: byId.get(flow.toRegion) ?? null,
    mode: flow.mode,
    stroke: flow.mode === 'blocked' ? 0.7 : 1.1,
    altitude: flow.mode === 'blocked' ? 0.13 : 0.2,
    dashLength: flow.mode === 'blocked' ? 0.16 : 0.46,
    dashGap: flow.mode === 'blocked' ? 0.12 : 0.18,
    dashAnimateTime: flow.mode === 'blocked' ? 4200 : 2600,
  }))
}

function buildAlarms(
  snapshot: CommandCenterSnapshot,
  live: LiveSystemSnapshot,
): HalogridAlarmView[] {
  const alarms: HalogridAlarmView[] = []

  snapshot.world.nodes
    .filter((node) => node.state === 'blocked')
    .slice(0, 4)
    .forEach((node) => {
      alarms.push({
        id: `blocked-${node.region}`,
        severity: 'critical',
        title: `${node.label} blocked`,
        detail: node.reasonCode ?? 'Execution is blocked in this lane.',
        createdAt: snapshot.generatedAt,
      })
    })

  snapshot.health.providers
    .filter((provider) => provider.status !== 'healthy')
    .slice(0, 4)
    .forEach((provider) => {
      alarms.push({
        id: `provider-${provider.id}`,
        severity: provider.status === 'offline' ? 'critical' : 'warning',
        title: `${provider.label} ${provider.status}`,
        detail:
          provider.degradedReason ??
          provider.statusLabel ??
          'Provider health requires review.',
        createdAt: snapshot.generatedAt,
      })
    })

  if (live.governance.active === false) {
    alarms.push({
      id: 'governance-inactive',
      severity: 'warning',
      title: 'SAIQ inactive',
      detail: `Policy state is ${live.governance.policyState ?? 'NONE'}.`,
      createdAt: live.generatedAt,
    })
  }

  if (
    live.providers.available &&
    live.providers.datasets.some(
      (dataset) =>
        dataset.verificationStatus === 'mismatch' ||
        dataset.verificationStatus === 'unverified',
    )
  ) {
    alarms.push({
      id: 'water-provenance',
      severity: 'critical',
      title: 'Water provenance degraded',
      detail: 'One or more water datasets failed verification.',
      createdAt: live.generatedAt,
    })
  }

  return alarms.slice(0, 8)
}

function deriveDecisionMetrics(
  frame: CommandCenterDecisionItem,
  trace: DecisionTraceRawRecord | null,
  replay: ReplayBundle | null,
): HalogridDecisionMetrics {
  const replayRoute = replay?.replay ?? replay?.persisted ?? null
  const candidate =
    trace?.payload.inputSignals.resolvedCandidates.find(
      (item) => item.region === frame.selectedRegion,
    ) ?? null
  const proof = trace?.payload.proof

  return {
    carbonReductionPct: replayRoute?.savings.carbonReductionPct ?? null,
    waterDeltaLiters: replayRoute?.savings.waterImpactDeltaLiters ?? null,
    confidence:
      replayRoute?.signalConfidence ??
      candidate?.waterAuthority.confidence ??
      null,
    carbonIntensity:
      replayRoute?.selected.carbonIntensity ?? candidate?.carbonIntensity ?? null,
    waterImpactLiters:
      replayRoute?.selected.waterImpactLiters ??
      candidate?.waterImpactLiters ??
      null,
    waterStressIndex:
      replayRoute?.water.stressIndex ??
      candidate?.waterSignal.waterStressIndex ??
      null,
    baselineRegion: replayRoute?.baseline.region ?? null,
    proofRefs: proof?.datasetReferences.length ?? 0,
    evidenceRefs: proof?.evidenceRefs.length ?? 0,
    providerRefs: proof?.providerSnapshotRefs.length ?? 0,
    replayVerified: replay?.deterministicMatch ?? null,
  }
}

function pickSelectedDecision(
  snapshot: CommandCenterSnapshot,
  selectedFrameId: string | null,
  trace: DecisionTraceRawRecord | null,
  replay: ReplayBundle | null,
): HalogridDecisionView | null {
  const frame =
    snapshot.decisionCore.recentDecisions.find(
      (item) => item.decisionFrameId === selectedFrameId,
    ) ?? snapshot.decisionCore.selectedDecision

  if (!frame) return null

  const effectiveTrace =
    frame.decisionFrameId === snapshot.decisionCore.selectedDecision?.decisionFrameId
      ? trace ?? snapshot.decisionCore.selectedTrace
      : trace

  const effectiveReplay =
    frame.decisionFrameId === snapshot.decisionCore.selectedDecision?.decisionFrameId
      ? replay ?? snapshot.decisionCore.selectedReplay
      : replay

  return {
    frame,
    trace: effectiveTrace,
    replay: effectiveReplay,
    metrics: deriveDecisionMetrics(frame, effectiveTrace, effectiveReplay),
  }
}

export function buildHalogridHoverCard(
  region: HalogridRegionView,
  decision: HalogridDecisionView | null,
): HalogridHoverCardView {
  return {
    region,
    headline: region.reasonCode ?? 'Binding decision available',
    actionLabel: (region.action ?? region.state).replace(/_/g, ' ').toUpperCase(),
    proofHash: decision?.frame.proofHash ?? null,
    replayVerified: decision?.metrics.replayVerified ?? null,
    latencyTotalMs: decision?.frame.latencyTotalMs ?? null,
    carbonReductionPct: decision?.metrics.carbonReductionPct ?? null,
    waterDeltaLiters: decision?.metrics.waterDeltaLiters ?? null,
    confidence: decision?.metrics.confidence ?? null,
  }
}

export function buildHalogridViewModel(args: {
  snapshot: CommandCenterSnapshot
  live: LiveSystemSnapshot
  selectedFrameId: string | null
  trace: DecisionTraceRawRecord | null
  replay: ReplayBundle | null
  tier: HalogridTier
}): HalogridViewModel {
  const { snapshot, live, selectedFrameId, trace, replay, tier } = args
  const regions = buildRegions(snapshot)
  const flows = buildFlows(snapshot, regions)

  const degradedReason = !live.recentDecisions.available
    ? snapshot.runtime.degradedReason ?? live.recentDecisions.error
    : snapshot.runtime.degradedReason ??
      (!live.providers.available
        ? live.providers.error
        : live.governance.active === false
          ? 'Governance is inactive in the live engine.'
          : null)

  const hud = buildHud(snapshot, live)

  return {
    title: 'HalOGrid',
    subtitle: 'CO2 Router Command Center',
    generatedAt: snapshot.generatedAt,
    hud,
    entitlements: {
      tier,
      canInspect: tier !== 'freeview',
      canOpenManual: tier === 'elite',
      canUseElite: tier === 'elite',
    },
    regions,
    flows,
    providers: buildProviders(snapshot),
    frames: snapshot.decisionCore.recentDecisions,
    selectedFrameId,
    selectedDecision: pickSelectedDecision(snapshot, selectedFrameId, trace, replay),
    alarms: buildAlarms(snapshot, live),
    stale:
      snapshot.runtime.stale ||
      snapshot.runtime.mode === 'read_only_degraded' ||
      Boolean(degradedReason) ||
      live.providers.datasets.some(
        (dataset) => dataset.verificationStatus === 'mismatch',
      ),
    degradedReason: degradedReason ?? null,
    globe: {
      stormMode: hud.blocked >= 4 || hud.threatPercentage >= 45,
      healthy:
        snapshot.runtime.mode === 'live' && Boolean(snapshot.header.systemActive),
      degradedReason: degradedReason ?? null,
    },
  }
}
