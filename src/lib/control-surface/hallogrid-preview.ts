import type { HallOGridSnapshot } from '../../types/control-surface'

export const SNAPSHOT_CACHE_CONTROL = 'public, max-age=0, s-maxage=5, stale-while-revalidate=10'

export type PreviewNode = HallOGridSnapshot['world']['nodes'][number]

export function softenPreviewRuntimeState(
  systemState: HallOGridSnapshot['frames'][number]['runtime']['systemState'],
  action: HallOGridSnapshot['frames'][number]['action'],
  reasonCode: string
) {
  const normalizedReason = reasonCode.toUpperCase()
  if (systemState === 'blocked' && (action === 'delay' || action === 'throttle')) {
    return 'marginal'
  }

  if (systemState === 'blocked' && normalizedReason.includes('FALLBACK')) {
    return 'marginal'
  }

  return systemState
}

export function softenPreviewNode(node: PreviewNode): PreviewNode {
  const normalizedReason = (node.reasonCode ?? '').toUpperCase()
  const softenedState =
    node.state === 'blocked' &&
    (node.action === 'delay' || node.action === 'throttle' || normalizedReason.includes('FALLBACK'))
      ? 'marginal'
      : node.state

  return {
    ...node,
    state: softenedState,
    decisionState: softenedState === 'blocked' ? 'blocked' : softenedState === 'marginal' ? 'guarded' : 'run',
  }
}

export function toPreviewTimestamp(value: string, redactionDelayMinutes: number) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  parsed.setMinutes(parsed.getMinutes() - redactionDelayMinutes)
  parsed.setSeconds(0, 0)
  return parsed.toISOString()
}

export function previewFrameId(frameId: string, index: number) {
  const suffix = frameId.slice(-4).toUpperCase()
  return `FRAME-${String(index + 1).padStart(2, '0')}-${suffix}`
}

export function previewReasonLabel(label: string) {
  if (!label) return 'Governed execution posture'
  return label.replace(/\b(SEKED|POLICY|RED ZONE|HOOK)\b/gi, 'Governed')
}

export function previewHeadline(region: string, action: string) {
  return `Governed ${action.replace(/_/g, ' ')} | ${region} | delayed mirror`
}

function stateRank(state: PreviewNode['state']) {
  switch (state) {
    case 'blocked':
      return 2
    case 'marginal':
      return 1
    default:
      return 0
  }
}

function confidenceTierRank(tier: PreviewNode['confidenceTier']) {
  switch (tier) {
    case 'low':
      return 0
    case 'medium':
      return 1
    default:
      return 2
  }
}

function freshnessRank(state: PreviewNode['freshnessState']) {
  switch (state) {
    case 'stale':
      return 2
    case 'degraded':
      return 1
    default:
      return 0
  }
}

function pressureRank(level: PreviewNode['pressureLevel']) {
  switch (level) {
    case 'high':
      return 2
    case 'medium':
      return 1
    default:
      return 0
  }
}

export function mergePreviewNode(current: PreviewNode, incoming: PreviewNode): PreviewNode {
  const currentStateRank = stateRank(current.state)
  const incomingStateRank = stateRank(incoming.state)
  const primary = incomingStateRank > currentStateRank ? incoming : current
  const latestChangedAt = [current.lastChangedAt, incoming.lastChangedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

  return {
    ...primary,
    label: current.label,
    x: Math.round((current.x + incoming.x) / 2),
    y: Math.round((current.y + incoming.y) / 2),
    decisionFrameId: null,
    confidenceTier:
      confidenceTierRank(incoming.confidenceTier) < confidenceTierRank(current.confidenceTier)
        ? incoming.confidenceTier
        : current.confidenceTier,
    freshnessState:
      freshnessRank(incoming.freshnessState) > freshnessRank(current.freshnessState)
        ? incoming.freshnessState
        : current.freshnessState,
    pressureLevel:
      pressureRank(incoming.pressureLevel) > pressureRank(current.pressureLevel)
        ? incoming.pressureLevel
        : current.pressureLevel,
    signalConfidence:
      current.signalConfidence == null
        ? incoming.signalConfidence
        : incoming.signalConfidence == null
          ? current.signalConfidence
          : Math.min(current.signalConfidence, incoming.signalConfidence),
    providerHealth: current.providerHealth || incoming.providerHealth
      ? {
          healthy: Math.max(current.providerHealth?.healthy ?? 0, incoming.providerHealth?.healthy ?? 0),
          degraded: Math.max(current.providerHealth?.degraded ?? 0, incoming.providerHealth?.degraded ?? 0),
          offline: Math.max(current.providerHealth?.offline ?? 0, incoming.providerHealth?.offline ?? 0),
        }
      : undefined,
    lastChangedAt: latestChangedAt,
    routePressure: Math.max(current.routePressure ?? 0, incoming.routePressure ?? 0) || undefined,
    blockedFocusLanes:
      Math.max(current.blockedFocusLanes ?? 0, incoming.blockedFocusLanes ?? 0) || undefined,
    selected: false,
  }
}

export function redactPreviewSnapshot(snapshot: HallOGridSnapshot): HallOGridSnapshot {
  const regionMap = new Map<string, string>()
  const labelMap = new Map<string, string>()
  const previewNodesByRegion = new Map<string, PreviewNode>()

  snapshot.world.nodes.forEach((node) => {
    const abstractRegion = node.region
      .replace(/-\d+$/g, '')
      .replace(/\b(ap|eu|us)-/g, (match) => match.toUpperCase())
      .toUpperCase()
    const abstractLabel = node.label
      .replace(/\b\d+\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    regionMap.set(node.region, abstractRegion)
    labelMap.set(node.region, abstractLabel)
    const previewNode = softenPreviewNode({
      ...node,
      region: abstractRegion,
      label: abstractLabel,
      decisionFrameId: null,
      lastChangedAt: node.lastChangedAt
        ? toPreviewTimestamp(node.lastChangedAt, snapshot.access.redactionDelayMinutes)
        : undefined,
      selected: false,
    })
    const current = previewNodesByRegion.get(abstractRegion)
    previewNodesByRegion.set(
      abstractRegion,
      current ? mergePreviewNode(current, previewNode) : previewNode
    )
  })

  const previewFrames = snapshot.frames.map((frame, index) => {
    const previewRegion = regionMap.get(frame.region) ?? frame.region
    const previewLabel = labelMap.get(frame.region) ?? frame.region
    const previewCreatedAt = toPreviewTimestamp(frame.createdAt, snapshot.access.redactionDelayMinutes)

    return {
      ...frame,
      id: previewFrameId(frame.id, index),
      createdAt: previewCreatedAt,
      region: previewRegion,
      reasonLabel: previewReasonLabel(frame.reasonLabel),
      explanation: {
        headline: previewHeadline(previewLabel, frame.action),
        dominantConstraint: 'No safe immediate execution path satisfied doctrine and environmental integrity.',
        counterfactual: 'Counterfactual branches and full replay stay inside HallOGrid Pro.',
      },
      runtime: {
        ...frame.runtime,
        systemState: softenPreviewRuntimeState(frame.runtime.systemState, frame.action, frame.reasonCode),
      },
    }
  })

  return {
    ...snapshot,
    generatedAt: toPreviewTimestamp(snapshot.generatedAt, snapshot.access.redactionDelayMinutes),
    title: 'HalOGrid Freeview',
    subtitle: 'Public proof surface for HalOGrid, powered by CO2 Router',
    mirror: {
      ...snapshot.mirror,
      tenantId: 'public-preview',
      generatedAt: toPreviewTimestamp(snapshot.mirror.generatedAt, snapshot.access.redactionDelayMinutes),
      degradedReason: snapshot.mirror.degraded ? 'Freshness or provider posture exceeded the safe mirror window.' : null,
    },
    selectedFrameId: previewFrames[0]?.id ?? null,
    selectedFrame: null,
    frames: previewFrames,
    world: {
      nodes: Array.from(previewNodesByRegion.values()),
      flows: Array.from(
        snapshot.world.flows.reduce((deduped, flow) => {
          const fromRegion = regionMap.get(flow.fromRegion) ?? flow.fromRegion
          const toRegion = regionMap.get(flow.toRegion) ?? flow.toRegion
          if (fromRegion === toRegion) return deduped

          const key = `${fromRegion}->${toRegion}`
          const current = deduped.get(key)
          deduped.set(key, {
            id: current?.id ?? `preview:${key}`,
            fromRegion,
            toRegion,
            mode:
              current?.mode === 'blocked' || flow.mode === 'blocked' ? 'blocked' : 'route',
          })
          return deduped
        }, new Map<string, HallOGridSnapshot['world']['flows'][number]>()).values()
      ),
    },
    traceStream: {
      items: snapshot.traceStream.items.map((item, index) => ({
        ...item,
        decisionFrameId: previewFrameId(item.decisionFrameId, index),
        createdAt: toPreviewTimestamp(item.createdAt, snapshot.access.redactionDelayMinutes),
        region: regionMap.get(item.region) ?? item.region,
        reasonCode: 'GOVERNED_PREVIEW',
      })),
    },
  }
}
