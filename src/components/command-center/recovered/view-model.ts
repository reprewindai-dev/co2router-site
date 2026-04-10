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

export interface HalogridRegionView {
  id: string
  label: string
  x: number
  y: number
  state: WorldRegionState['state']
  action: string | null
  frameId: string | null
  reasonCode: string | null
}

export interface HalogridFlowView {
  id: string
  from: HalogridRegionView | null
  to: HalogridRegionView | null
  mode: WorldRoutingFlow['mode']
}

export interface HalogridProviderView {
  id: string
  label: string
  providerType: ControlSurfaceProviderNode['providerType']
  status: ControlSurfaceProviderNode['status']
  freshnessSec: number | null
  confidence: number | null
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
}

export interface HalogridAlarmView {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  createdAt: string
}

export interface HalogridDecisionView {
  frame: CommandCenterDecisionItem
  trace: DecisionTraceRawRecord | null
  replay: ReplayBundle | null
}

export interface HalogridViewModel {
  title: string
  subtitle: string
  tier: HalogridTier
  generatedAt: string
  hud: HalogridHudView
  regions: HalogridRegionView[]
  flows: HalogridFlowView[]
  providers: HalogridProviderView[]
  frames: CommandCenterDecisionItem[]
  selectedFrameId: string | null
  selectedDecision: HalogridDecisionView | null
  alarms: HalogridAlarmView[]
  stale: boolean
  degradedReason: string | null
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildHud(snapshot: CommandCenterSnapshot): HalogridHudView {
  const active = snapshot.world.nodes.filter((node) => node.state === 'active').length
  const marginal = snapshot.world.nodes.filter((node) => node.state === 'marginal').length
  const blocked = snapshot.world.nodes.filter((node) => node.state === 'blocked').length
  const threatPercentage = Math.round((blocked / Math.max(snapshot.world.nodes.length, 1)) * 100)

  const pressureValues = snapshot.world.nodes.map((node) => {
    if (node.state === 'blocked') return 90
    if (node.state === 'marginal') return 58
    return 24
  })

  const recentFrames = snapshot.decisionCore.recentDecisions.filter(
    (frame) => Date.now() - new Date(frame.createdAt).getTime() <= 15 * 60_000,
  )

  return {
    active,
    marginal,
    blocked,
    carbonPressure: Math.round(average(pressureValues)),
    threatPercentage,
    decisionVelocity: Math.round((recentFrames.length / 15) * 10) / 10,
    queue: 5,
  }
}

function providerDetail(provider: ControlSurfaceProviderNode) {
  const freshness =
    typeof provider.freshnessSec === 'number' ? `${provider.freshnessSec}s freshness` : 'freshness unavailable'
  const confidence =
    typeof provider.confidence === 'number' ? `${Math.round(provider.confidence * 100)}% confidence` : 'confidence unavailable'
  return `${provider.status} | ${freshness} | ${confidence}`
}

function buildProviders(snapshot: CommandCenterSnapshot): HalogridProviderView[] {
  return snapshot.health.providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    providerType: provider.providerType,
    status: provider.status,
    freshnessSec: provider.freshnessSec,
    confidence: provider.confidence,
    detail: providerDetail(provider),
  }))
}

function buildRegions(snapshot: CommandCenterSnapshot): HalogridRegionView[] {
  return snapshot.world.nodes.map((node) => ({
    id: node.region,
    label: node.label,
    x: node.x,
    y: node.y,
    state: node.state,
    action: node.action,
    frameId: node.decisionFrameId,
    reasonCode: node.reasonCode,
  }))
}

function buildFlows(snapshot: CommandCenterSnapshot, regions: HalogridRegionView[]): HalogridFlowView[] {
  const byId = new Map(regions.map((region) => [region.id, region]))
  return snapshot.world.flows.map((flow) => ({
    id: flow.id,
    from: byId.get(flow.fromRegion) ?? null,
    to: byId.get(flow.toRegion) ?? null,
    mode: flow.mode,
  }))
}

function buildAlarms(snapshot: CommandCenterSnapshot, live: LiveSystemSnapshot): HalogridAlarmView[] {
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
        detail: provider.degradedReason ?? provider.statusLabel ?? 'Provider health requires review.',
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
      (dataset) => dataset.verificationStatus === 'mismatch' || dataset.verificationStatus === 'unverified',
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

function pickSelectedDecision(
  snapshot: CommandCenterSnapshot,
  selectedFrameId: string | null,
  trace: DecisionTraceRawRecord | null,
  replay: ReplayBundle | null,
): HalogridDecisionView | null {
  const frame =
    snapshot.decisionCore.recentDecisions.find((item) => item.decisionFrameId === selectedFrameId) ??
    snapshot.decisionCore.selectedDecision

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
    ? live.recentDecisions.error
    : !live.providers.available
      ? live.providers.error
      : live.governance.active === false
        ? 'Governance is inactive in the live engine.'
        : null

  return {
    title: 'HalOGrid',
    subtitle: 'CO2 Router Command Center',
    tier,
    generatedAt: snapshot.generatedAt,
    hud: buildHud(snapshot),
    regions,
    flows,
    providers: buildProviders(snapshot),
    frames: snapshot.decisionCore.recentDecisions,
    selectedFrameId,
    selectedDecision: pickSelectedDecision(snapshot, selectedFrameId, trace, replay),
    alarms: buildAlarms(snapshot, live),
    stale:
      Boolean(degradedReason) ||
      live.providers.datasets.some((dataset) => dataset.verificationStatus === 'mismatch'),
    degradedReason: degradedReason ?? null,
  }
}
