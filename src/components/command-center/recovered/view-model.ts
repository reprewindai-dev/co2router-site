import { ACTION_META } from '@/components/control-surface/action-styles'
import { analyzeSmartAdvisor } from '@/lib/control-surface/smart-advisor'
import type {
  ControlSurfaceProviderNode,
  HallOGridConsoleAccess,
  HallOGridFrame,
  HallOGridFrameDetail,
  HallOGridProWorkspace,
  HallOGridSnapshot,
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
  action: HallOGridFrame['action'] | null
  frameId: string | null
  confidenceTier: WorldRegionState['confidenceTier']
  freshnessState: WorldRegionState['freshnessState']
  pressureLevel: WorldRegionState['pressureLevel']
  signalConfidence: number | null
  providerHealth?: WorldRegionState['providerHealth']
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
  mode: string
  description: string
}

export interface HalogridHudView {
  activeRegions: number
  marginalRegions: number
  blockedRegions: number
  carbonPressure: number
  threatPercentage: number
  decisionVelocity: number
  decisionQueue: number
}

export interface HalogridAlarmView {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  frameId: string | null
  region: string | null
  createdAt: string
}

export interface HalogridDecisionView {
  frame: HallOGridFrame
  detail: HallOGridFrameDetail | null
  workspace: HallOGridProWorkspace | null
  actionLabel: string
  actionColor: string
  proofHash: string | null
  candidateCount: number
}

export interface HalogridEntitlementView {
  access: HallOGridConsoleAccess
  tier: HalogridTier
  isPreview: boolean
  canViewOperatorConsole: boolean
  canAccessControls: boolean
  canManageDoctrine: boolean
  canUseElite: boolean
  upgradeUrl: string
}

export interface HalogridViewModel {
  title: string
  subtitle: string
  generatedAt: string
  tier: HalogridTier
  access: HalogridEntitlementView
  hud: HalogridHudView
  regions: HalogridRegionView[]
  flows: HalogridFlowView[]
  providers: HalogridProviderView[]
  frames: HallOGridFrame[]
  selectedFrame: HalogridDecisionView | null
  selectedRegionId: string | null
  alarms: HalogridAlarmView[]
  advisor: ReturnType<typeof analyzeSmartAdvisor>
  stale: boolean
}

const PRESSURE_VALUE: Record<WorldRegionState['pressureLevel'], number> = {
  low: 22,
  medium: 61,
  high: 88,
}

const FRESHNESS_WEIGHT: Record<WorldRegionState['freshnessState'], number> = {
  fresh: 0,
  degraded: 12,
  stale: 24,
}

function toTier(access: HallOGridConsoleAccess): HalogridTier {
  if (access.label === 'CO2 Grid Elite') return 'elite'
  if (access.label === 'CO2 Grid Pro') return 'pro'
  return 'freeview'
}

function providerMode(provider: ControlSurfaceProviderNode) {
  return provider.authorityMode ?? provider.signalAuthority ?? provider.mode ?? 'live'
}

function providerDescription(provider: ControlSurfaceProviderNode) {
  const freshness =
    typeof provider.freshnessSec === 'number' ? `${provider.freshnessSec}s freshness` : 'freshness unavailable'
  const authority = provider.authorityRole ? ` | ${provider.authorityRole}` : ''
  return `${provider.status}${authority} | ${freshness}`
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function computeHud(snapshot: HallOGridSnapshot): HalogridHudView {
  const activeRegions = snapshot.world.nodes.filter((node) => node.state === 'active').length
  const marginalRegions = snapshot.world.nodes.filter((node) => node.state === 'marginal').length
  const blockedRegions = snapshot.world.nodes.filter((node) => node.state === 'blocked').length
  const threatPercentage = Math.round((blockedRegions / Math.max(snapshot.world.nodes.length, 1)) * 100)
  const carbonPressure = Math.round(
    average(
      snapshot.world.nodes.map((node) => PRESSURE_VALUE[node.pressureLevel] + FRESHNESS_WEIGHT[node.freshnessState]),
    ),
  )
  const recentFrames = snapshot.frames.filter((frame) => Date.now() - new Date(frame.createdAt).getTime() <= 15 * 60_000)
  const decisionVelocity = Math.round((recentFrames.length / 15) * 10) / 10
  const decisionQueue = snapshot.projection.outbox?.pending ?? 0

  return {
    activeRegions,
    marginalRegions,
    blockedRegions,
    carbonPressure: Math.min(carbonPressure, 100),
    threatPercentage: Math.min(threatPercentage, 100),
    decisionVelocity,
    decisionQueue,
  }
}

function buildAlarms(
  snapshot: HallOGridSnapshot,
  workspace: HallOGridProWorkspace | null,
  selectedFrameId: string | null,
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
        detail: 'Region is currently outside the safe execution envelope.',
        frameId: node.decisionFrameId,
        region: node.region,
        createdAt: node.lastChangedAt ?? snapshot.generatedAt,
      })
    })

  snapshot.health.providers
    .filter((provider) => provider.status !== 'healthy')
    .slice(0, 3)
    .forEach((provider) => {
      alarms.push({
        id: `provider-${provider.id}`,
        severity: provider.status === 'offline' ? 'critical' : 'warning',
        title: `${provider.label} ${provider.status}`,
        detail: provider.degradedReason ?? providerDescription(provider),
        frameId: selectedFrameId,
        region: null,
        createdAt: snapshot.generatedAt,
      })
    })

  if (snapshot.mirror.degraded) {
    alarms.push({
      id: 'mirror-degraded',
      severity: 'warning',
      title: 'Mirror degraded',
      detail: snapshot.mirror.degradedReason ?? 'The HallOGrid mirror is operating in a guarded state.',
      frameId: selectedFrameId,
      region: null,
      createdAt: snapshot.generatedAt,
    })
  }

  if ((snapshot.projection.projectionLagSec ?? 0) > 120) {
    alarms.push({
      id: 'projection-lag',
      severity: 'warning',
      title: 'Projection lag elevated',
      detail: `Projection lag is ${snapshot.projection.projectionLagSec}s and should be reviewed.`,
      frameId: selectedFrameId,
      region: null,
      createdAt: snapshot.generatedAt,
    })
  }

  workspace?.hazards.slice(0, 4).forEach((hazard) => {
    alarms.push({
      id: `hazard-${hazard.id}`,
      severity: hazard.severity === 'critical' ? 'critical' : hazard.severity === 'warning' ? 'warning' : 'info',
      title: hazard.summary,
      detail: `${hazard.type.replace(/_/g, ' ')} | ${hazard.status.replace(/_/g, ' ')}`,
      frameId: hazard.decisionFrameId,
      region: hazard.region,
      createdAt: hazard.detectedAt,
    })
  })

  return alarms
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)
}

function buildDecisionView(
  snapshot: HallOGridSnapshot,
  selectedFrameId: string | null,
  detail: HallOGridFrameDetail | null,
  workspace: HallOGridProWorkspace | null,
): HalogridDecisionView | null {
  const frame = snapshot.frames.find((item) => item.id === selectedFrameId) ?? null
  if (!frame) return null

  const meta = ACTION_META[frame.action]

  return {
    frame,
    detail,
    workspace,
    actionLabel: meta.label,
    actionColor:
      frame.action === 'run_now'
        ? '#34d399'
        : frame.action === 'reroute'
          ? '#38bdf8'
          : frame.action === 'delay'
            ? '#fbbf24'
            : frame.action === 'throttle'
              ? '#a78bfa'
              : '#fb7185',
    proofHash: detail?.evidence.proof.hash ?? null,
    candidateCount: detail?.evidence.trace.candidates.length ?? 0,
  }
}

export function buildHalogridViewModel(
  snapshot: HallOGridSnapshot,
  selectedFrameId: string | null,
  detail: HallOGridFrameDetail | null,
  workspace: HallOGridProWorkspace | null,
): HalogridViewModel {
  const tier = toTier(snapshot.access)
  const selectedFrame = buildDecisionView(snapshot, selectedFrameId, detail, workspace)
  const selectedRegionId = selectedFrame?.frame.region ?? null

  const regions: HalogridRegionView[] = snapshot.world.nodes.map((node) => ({
    id: node.region,
    label: node.label,
    x: node.x,
    y: node.y,
    state: node.state,
    action: (node.action as HallOGridFrame['action'] | null) ?? null,
    frameId: node.decisionFrameId,
    confidenceTier: node.confidenceTier,
    freshnessState: node.freshnessState,
    pressureLevel: node.pressureLevel,
    signalConfidence: node.signalConfidence,
    providerHealth: node.providerHealth,
  }))

  const regionById = new Map(regions.map((region) => [region.id, region]))

  const flows: HalogridFlowView[] = snapshot.world.flows.map((flow) => ({
    id: flow.id,
    from: regionById.get(flow.fromRegion) ?? null,
    to: regionById.get(flow.toRegion) ?? null,
    mode: flow.mode,
  }))

  const providers: HalogridProviderView[] = snapshot.health.providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    providerType: provider.providerType,
    status: provider.status,
    freshnessSec: provider.freshnessSec,
    confidence: provider.confidence,
    mode: providerMode(provider),
    description: providerDescription(provider),
  }))

  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    generatedAt: snapshot.generatedAt,
    tier,
    access: {
      access: snapshot.access,
      tier,
      isPreview: snapshot.access.isReadOnlyPreview,
      canViewOperatorConsole: snapshot.access.canViewOperatorConsole,
      canAccessControls: snapshot.access.canAccessControls,
      canManageDoctrine: snapshot.access.canManageDoctrine,
      canUseElite: tier === 'elite',
      upgradeUrl: snapshot.access.upgradeUrl,
    },
    hud: computeHud(snapshot),
    regions,
    flows,
    providers,
    frames: snapshot.frames,
    selectedFrame,
    selectedRegionId,
    alarms: buildAlarms(snapshot, workspace, selectedFrameId),
    advisor: analyzeSmartAdvisor({
      generatedAt: snapshot.generatedAt,
      frames: snapshot.frames,
      nodes: snapshot.world.nodes,
      providers: snapshot.health.providers,
      streamHealthy: snapshot.transport.streamHealthy,
    }),
    stale:
      snapshot.mirror.degraded ||
      (snapshot.mirror.sourceFreshnessSec != null &&
        snapshot.mirror.sourceFreshnessSec > snapshot.mirror.freshnessBudgetSec),
  }
}
