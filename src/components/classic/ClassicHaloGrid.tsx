'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type {
  CommandCenterDecisionItem,
  CommandCenterSnapshot,
  LiveSystemSnapshot,
  WorldExecutionState,
  WorldRegionState,
} from '@/types/control-surface'

type ClassicPayload = {
  command: CommandCenterSnapshot
  live: LiveSystemSnapshot
}

type ProjectedRegion = WorldRegionState & {
  px: number
  py: number
  groupLabel: string
  groupColor: string
  signalLabel: string
}

const STATE_META: Record<WorldExecutionState, { label: string; color: string; bg: string }> = {
  active: { label: 'ACTIVE', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  marginal: { label: 'MARGINAL', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  blocked: { label: 'BLOCKED', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'AF-ZA': { lat: -26.2, lng: 28.0 },
  'AP-AU-NSW': { lat: -33.9, lng: 151.2 },
  'AP-AU-QLD': { lat: -27.5, lng: 153.0 },
  'AP-AU-SA': { lat: -34.9, lng: 138.6 },
  'AP-AU-VIC': { lat: -37.8, lng: 145.0 },
  'AP-IN-SOUTH': { lat: 13.1, lng: 80.3 },
  'AP-IN-WEST': { lat: 19.1, lng: 72.9 },
  'AP-JP-OSAKA': { lat: 34.7, lng: 135.5 },
  'AP-JP-TOKYO': { lat: 35.7, lng: 139.7 },
  'AP-KR': { lat: 37.6, lng: 127.0 },
  'AP-SG': { lat: 1.35, lng: 103.8 },
  'AP-TW': { lat: 25.0, lng: 121.6 },
  'CA-BC': { lat: 49.3, lng: -123.1 },
  'CA-ON': { lat: 43.7, lng: -79.4 },
  'CA-QC': { lat: 45.5, lng: -73.6 },
  'EU-AT': { lat: 48.2, lng: 16.4 },
  'EU-BE': { lat: 50.9, lng: 4.4 },
  'EU-CH': { lat: 47.4, lng: 8.5 },
  'EU-DE': { lat: 50.1, lng: 8.7 },
  'EU-DK1': { lat: 56.2, lng: 9.5 },
  'EU-DK2': { lat: 55.7, lng: 12.6 },
  'EU-ES': { lat: 40.4, lng: -3.7 },
  'EU-FI': { lat: 60.2, lng: 24.9 },
  'EU-FR': { lat: 48.9, lng: 2.4 },
  'EU-GB': { lat: 51.5, lng: -0.1 },
  'EU-IT': { lat: 45.5, lng: 9.2 },
  'EU-NL': { lat: 52.4, lng: 4.9 },
  'EU-NO': { lat: 59.9, lng: 10.8 },
  'EU-PL': { lat: 52.2, lng: 21.0 },
  'EU-PT': { lat: 38.7, lng: -9.1 },
  'EU-SE': { lat: 59.3, lng: 18.1 },
  'ME-AE': { lat: 24.5, lng: 54.4 },
  'SA-BR-S': { lat: -25.4, lng: -49.3 },
  'SA-BR-SE': { lat: -23.6, lng: -46.6 },
  'SA-CL-SEN': { lat: -33.4, lng: -70.7 },
  'SA-CO': { lat: 4.7, lng: -74.1 },
  'US-CAL-CISO': { lat: 37.8, lng: -122.4 },
  'US-MIDA-PJM': { lat: 39.0, lng: -77.0 },
  'US-MIDW-MISO': { lat: 41.9, lng: -87.6 },
  'US-NE-ISNE': { lat: 42.4, lng: -71.1 },
  'US-NW-BPAT': { lat: 45.5, lng: -122.7 },
  'US-TEX-ERCO': { lat: 32.8, lng: -96.8 },
  sfo1: { lat: 37.8, lng: -122.4 },
  'us-west1': { lat: 45.5, lng: -122.7 },
  'us-west-1': { lat: 37.8, lng: -122.4 },
  'us-west-2': { lat: 45.5, lng: -122.7 },
  'us-east-1': { lat: 39.0, lng: -77.0 },
  'us-east-2': { lat: 40.4, lng: -83.0 },
  'eu-west-1': { lat: 53.3, lng: -6.3 },
  'eu-central-1': { lat: 50.1, lng: 8.7 },
  'eu-north-1': { lat: 59.3, lng: 18.1 },
  'ap-southeast-1': { lat: 1.35, lng: 103.8 },
  'ap-northeast-1': { lat: 35.7, lng: 139.7 },
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function actionLabel(action: string | null | undefined) {
  switch (action) {
    case 'run_now':
      return 'RUN'
    case 'reroute':
      return 'REROUTE'
    case 'delay':
      return 'DELAY'
    case 'throttle':
      return 'THROTTLE'
    case 'deny':
      return 'DENY'
    default:
      return 'UNKNOWN'
  }
}

function actionColor(action: string | null | undefined) {
  switch (action) {
    case 'run_now':
      return '#4ade80'
    case 'reroute':
      return '#38bdf8'
    case 'delay':
      return '#a78bfa'
    case 'throttle':
      return '#fbbf24'
    case 'deny':
      return '#f87171'
    default:
      return '#94a3b8'
  }
}

function routeSignalLabel(region: WorldRegionState) {
  if (region.decisionFrameId) return actionLabel(region.action)
  if (region.reasonCode === 'REGION_STRUCTURAL_BASELINE') return 'BASELINE'
  if (typeof region.carbonIntensityGPerKwh === 'number') return region.signalEstimated ? 'ESTIMATED' : 'LIVE'
  return 'NO SIGNAL'
}

function routeSignalColor(region: WorldRegionState) {
  if (region.decisionFrameId) return actionColor(region.action)
  if (region.reasonCode === 'REGION_STRUCTURAL_BASELINE') return '#67e8f9'
  if (typeof region.carbonIntensityGPerKwh === 'number') return '#4ade80'
  return '#fbbf24'
}

function routeSignalSourceLabel(region: WorldRegionState) {
  if (!region.signalSource) return 'registered'
  return region.signalSource.replace(/_/g, ' ').toLowerCase()
}

function formatTime(value: string | null | undefined) {
  if (!value) return '--:--:--'
  return new Date(value).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatAge(value: string | null | undefined) {
  if (!value) return 'never'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'unavailable'
  const ageMs = Math.max(0, Date.now() - timestamp)
  if (ageMs < 60_000) return `${Math.max(1, Math.round(ageMs / 1000))}s ago`
  if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m ago`
  return `${Math.round(ageMs / 3_600_000)}h ago`
}

function statusCounts(nodes: WorldRegionState[]) {
  return nodes.reduce(
    (counts, node) => {
      counts[node.state] += 1
      return counts
    },
    { active: 0, marginal: 0, blocked: 0 },
  )
}

function regionGroup(regionCode: string): { label: string; color: string } {
  const normalized = regionCode.toUpperCase()

  if (normalized.startsWith('US-') || normalized.startsWith('SFO') || normalized.startsWith('US_')) {
    return { label: 'United States', color: '#5b8cff' }
  }
  if (normalized.startsWith('CA-')) return { label: 'Canada', color: '#22d3ee' }
  if (normalized.startsWith('EU-')) return { label: 'Europe', color: '#b56cff' }
  if (normalized.startsWith('AP-')) return { label: 'Asia Pacific', color: '#ff7ac8' }
  if (normalized.startsWith('SA-')) return { label: 'South America', color: '#ff8f5a' }
  if (normalized.startsWith('AF-')) return { label: 'Africa', color: '#2dd4bf' }
  if (normalized.startsWith('ME-')) return { label: 'Middle East', color: '#f0abfc' }

  return { label: 'Cloud edge', color: '#cbd5e1' }
}

function resolveCoords(region: WorldRegionState) {
  const direct =
    REGION_COORDS[region.region] ??
    REGION_COORDS[region.region.toUpperCase()] ??
    REGION_COORDS[region.region.toLowerCase()]

  if (direct) return direct

  return {
    lat: 90 - region.y * 1.8,
    lng: region.x * 3.6 - 180,
  }
}

function projectRegion(region: WorldRegionState, index: number): ProjectedRegion {
  const coords = resolveCoords(region)
  const group = regionGroup(region.region)
  const rowOffset = ((index % 4) - 1.5) * 0.9
  const colOffset = (((index * 7) % 5) - 2) * 0.7
  const px = clamp(((coords.lng + 180) / 360) * 100 + colOffset, 3.5, 96.5)
  const py = clamp(((90 - coords.lat) / 180) * 100 + rowOffset, 5.5, 94.5)

  return {
    ...region,
    px,
    py,
    groupLabel: group.label,
    groupColor: group.color,
    signalLabel: routeSignalLabel(region),
  }
}

function decisionForRegion(
  region: WorldRegionState,
  decisions: CommandCenterDecisionItem[],
) {
  return (
    decisions.find((decision) => decision.decisionFrameId === region.decisionFrameId) ??
    decisions.find((decision) => decision.selectedRegion === region.region) ??
    null
  )
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${path} returned ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`)
  }
  return (await response.json()) as T
}

async function fetchClassicPayload(): Promise<ClassicPayload> {
  const [command, live] = await Promise.all([
    fetchJson<CommandCenterSnapshot>('/api/control-surface/command-center'),
    fetchJson<LiveSystemSnapshot>('/api/control-surface/live-system'),
  ])
  return { command, live }
}

function RegionRail({
  nodes,
  selectedRegionId,
  onSelect,
}: {
  nodes: ProjectedRegion[]
  selectedRegionId: string | null
  onSelect: (region: ProjectedRegion) => void
}) {
  return (
    <aside className="flex min-h-0 flex-col border-b border-white/10 bg-slate-950/70 p-4 lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Backend Regions
        </span>
        <span className="font-mono text-xs text-cyan-300">{nodes.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {nodes.map((node) => (
          <button
            key={node.region}
            onClick={() => onSelect(node)}
            className="w-full rounded-xl px-3 py-2.5 text-left transition"
            style={{
              background:
                selectedRegionId === node.region ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.025)',
              border:
                selectedRegionId === node.region
                  ? '1px solid rgba(56,189,248,0.28)'
                  : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{
                    background: STATE_META[node.state].color,
                    boxShadow: `0 0 8px ${STATE_META[node.state].color}`,
                  }}
                />
                <span className="truncate text-xs font-semibold text-slate-100">{node.label}</span>
              </div>
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase"
                style={{
                  color: routeSignalColor(node),
                  background: `${routeSignalColor(node)}18`,
                }}
              >
                {node.signalLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500">
              <span className="truncate">{node.region}</span>
              <span className="truncate" style={{ color: node.groupColor }}>
                {node.groupLabel}
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}

function FlatTopologyMap({
  nodes,
  command,
  decisions,
  selectedRegion,
  hoveredRegion,
  onSelect,
  onHover,
}: {
  nodes: ProjectedRegion[]
  command: CommandCenterSnapshot
  decisions: CommandCenterDecisionItem[]
  selectedRegion: ProjectedRegion | null
  hoveredRegion: ProjectedRegion | null
  onSelect: (region: ProjectedRegion) => void
  onHover: (region: ProjectedRegion | null) => void
}) {
  const nodeByRegion = useMemo(() => new Map(nodes.map((node) => [node.region, node])), [nodes])
  const selectedOrHovered = hoveredRegion ?? selectedRegion
  const flowSegments = command.world.flows.flatMap((flow) => {
    const from = nodeByRegion.get(flow.fromRegion)
    const to = nodeByRegion.get(flow.toRegion)
    if (!from || !to) return []
    return [{ ...flow, from, to }]
  })
  const detailStyle = selectedOrHovered
    ? {
        ...(selectedOrHovered.px > 58
          ? { right: `${clamp(100 - selectedOrHovered.px + 2, 2, 52)}%` }
          : { left: `${clamp(selectedOrHovered.px + 2, 2, 54)}%` }),
        ...(selectedOrHovered.py > 54
          ? { bottom: `${clamp(100 - selectedOrHovered.py + 2, 2, 42)}%` }
          : { top: `${clamp(selectedOrHovered.py + 2, 4, 54)}%` }),
      }
    : undefined

  return (
    <section className="relative min-h-[520px] flex-1 overflow-hidden border-x border-cyan-300/10 bg-[#050b14]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.055) 1px, transparent 1px), radial-gradient(circle at 50% 45%, rgba(56,189,248,0.12), transparent 48%)',
          backgroundSize: '48px 48px, 48px 48px, 100% 100%',
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[20, 40, 60, 80].map((x) => (
          <line key={`lon-${x}`} x1={x} x2={x} y1="0" y2="100" stroke="rgba(148,163,184,0.08)" strokeWidth="0.08" />
        ))}
        {[22, 38, 54, 70].map((y) => (
          <line key={`lat-${y}`} x1="0" x2="100" y1={y} y2={y} stroke="rgba(148,163,184,0.08)" strokeWidth="0.08" />
        ))}
        {flowSegments.map((flow) => (
          <line
            key={flow.id}
            x1={flow.from.px}
            y1={flow.from.py}
            x2={flow.to.px}
            y2={flow.to.py}
            stroke={flow.mode === 'route' ? '#38bdf8' : '#f87171'}
            strokeWidth="0.24"
            strokeDasharray={flow.mode === 'route' ? '1.2 0.8' : '0.6 0.7'}
            opacity="0.72"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="absolute left-5 top-4 z-10 rounded-full border border-cyan-300/15 bg-slate-950/80 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300/70 backdrop-blur">
        Flat projection - equirectangular
      </div>

      <div className="absolute right-5 top-4 z-10 flex flex-wrap justify-end gap-2">
        {[
          ['US', '#5b8cff'],
          ['CA', '#22d3ee'],
          ['EU', '#b56cff'],
          ['AP', '#ff7ac8'],
          ['SA', '#ff8f5a'],
          ['AF/ME', '#2dd4bf'],
        ].map(([label, color]) => (
          <div
            key={label}
            className="rounded-full border border-white/10 bg-slate-950/75 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur"
          >
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {flowSegments.length === 0 && (
        <div className="absolute bottom-4 left-5 z-10 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">
          No backend route edge returned yet. Nodes remain live/registered from the broker.
        </div>
      )}

      {nodes.map((node) => {
        const selected = selectedRegion?.region === node.region
        const hovered = hoveredRegion?.region === node.region
        const nodeColor = STATE_META[node.state].color
        const size = selected || hovered ? 30 : 24
        const decision = decisionForRegion(node, decisions)

        return (
          <button
            key={node.region}
            onClick={() => onSelect(node)}
            onMouseEnter={() => onHover(node)}
            onMouseLeave={() => onHover(null)}
            className="absolute z-20 grid place-items-center rounded-full transition"
            style={{
              left: `${node.px}%`,
              top: `${node.py}%`,
              width: size,
              height: size,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(2,6,23,0.82)',
              border: `3px solid ${node.groupColor}`,
              boxShadow: selected
                ? `0 0 0 8px ${node.groupColor}24, 0 0 22px ${nodeColor}55`
                : `0 0 0 5px ${node.groupColor}16, 0 0 12px ${nodeColor}33`,
            }}
            aria-label={`${node.label} ${node.signalLabel}`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{
                background: nodeColor,
                boxShadow: `0 0 10px ${nodeColor}`,
              }}
            />
            {decision?.traceAvailable && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-slate-950 bg-emerald-300" />
            )}
          </button>
        )
      })}

      {selectedOrHovered && (
        <div
          className="absolute z-30 w-[320px] rounded-2xl border border-cyan-300/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl"
          style={detailStyle}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: selectedOrHovered.groupColor }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
                  {selectedOrHovered.groupLabel}
                </span>
              </div>
              <div className="mt-1 truncate text-base font-black text-white">{selectedOrHovered.label}</div>
              <div className="mt-1 truncate font-mono text-[10px] text-slate-500">
                {selectedOrHovered.region}
              </div>
            </div>
            <span
              className="rounded-full px-2 py-1 font-mono text-[8px] font-bold uppercase"
              style={{
                color: routeSignalColor(selectedOrHovered),
                background: `${routeSignalColor(selectedOrHovered)}18`,
              }}
            >
              {selectedOrHovered.signalLabel}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              [
                'Carbon',
                typeof selectedOrHovered.carbonIntensityGPerKwh === 'number'
                  ? `${Math.round(selectedOrHovered.carbonIntensityGPerKwh)}g/kWh`
                  : 'unavailable',
                routeSignalColor(selectedOrHovered),
              ],
              ['State', selectedOrHovered.state, STATE_META[selectedOrHovered.state].color],
              ['Source', routeSignalSourceLabel(selectedOrHovered), '#67e8f9'],
              ['Action', actionLabel(selectedOrHovered.action), actionColor(selectedOrHovered.action)],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <div className="text-[8px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
                <div className="mt-1 truncate text-[11px] font-bold" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[8px] uppercase tracking-[0.16em] text-slate-500">Backend frame</div>
            <div className="mt-1 truncate font-mono text-[10px] text-cyan-300/70">
              {selectedOrHovered.decisionFrameId ?? 'No decision frame bound to this route'}
            </div>
            <div className="mt-1 text-[10px] leading-4 text-slate-400">
              {selectedOrHovered.reasonCode ?? 'Registered route awaiting current provider signal.'}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function DecisionStream({
  decisions,
}: {
  decisions: CommandCenterDecisionItem[]
}) {
  return (
    <aside className="flex min-h-0 flex-col border-t border-white/10 bg-slate-950/70 p-4 lg:border-l lg:border-t-0">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Decision Stream
        </span>
        <span className="font-mono text-xs text-cyan-300">{decisions.length} frames</span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {decisions.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-center text-[10px] text-slate-500">
            No backend decisions returned.
          </div>
        )}
        {decisions.map((decision, index) => (
          <article
            key={decision.decisionFrameId}
            className="rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid ${index === 0 ? `${actionColor(decision.action)}33` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold" style={{ color: actionColor(decision.action) }}>
                {actionLabel(decision.action)}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {formatTime(decision.createdAt)}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-white">{decision.selectedRegion}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{decision.reasonCode}</p>
            <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px]">
              <span className="min-w-0 truncate text-cyan-300/70">
                {decision.proofHash ?? decision.decisionFrameId}
              </span>
              <span className={decision.traceAvailable ? 'text-emerald-300' : 'text-amber-300'}>
                {decision.traceAvailable ? 'TRACE' : 'NO TRACE'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </aside>
  )
}

function TopStatus({
  command,
  live,
  loading,
  error,
}: {
  command: CommandCenterSnapshot | null
  live: LiveSystemSnapshot | null
  loading: boolean
  error: string | null
}) {
  const counts = statusCounts(command?.world.nodes ?? [])
  const verifiedDatasets =
    live?.providers.datasets.filter((dataset) => dataset.verificationStatus === 'verified').length ?? 0

  return (
    <div className="border-b border-white/[0.04] bg-[#060d18]/90 px-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          {(['active', 'marginal', 'blocked'] as const).map((state) => (
            <div key={state} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: STATE_META[state].color,
                  boxShadow: `0 0 8px ${STATE_META[state].color}`,
                }}
              />
              <span
                className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: STATE_META[state].color }}
              >
                {counts[state]} {STATE_META[state].label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3 font-mono text-[9px] text-slate-400">
          <span className="uppercase tracking-[0.18em] text-cyan-300/60">
            Broker {command?.runtime.mode ?? (loading ? 'loading' : 'unavailable')}
          </span>
          <span>updated {formatAge(command?.generatedAt)}</span>
          <span>{verifiedDatasets}/{live?.providers.datasets.length ?? 0} water datasets verified</span>
          {error && <span className="text-amber-300">degraded: {error.slice(0, 80)}</span>}
        </div>
      </div>
    </div>
  )
}

export function ClassicHaloGrid() {
  const [payload, setPayload] = useState<ClassicPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await fetchClassicPayload()
        if (cancelled) return
        setPayload(next)
        setError(null)
        setSelectedRegionId((current) =>
          current && next.command.world.nodes.some((node) => node.region === current) ? current : null,
        )
      } catch (caught) {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'Classic HaloGrid fetch failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const interval = window.setInterval(load, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const decisions = useMemo(
    () => payload?.command.decisionCore.recentDecisions ?? [],
    [payload?.command.decisionCore.recentDecisions],
  )
  const nodes = useMemo(
    () => (payload?.command.world.nodes ?? []).map(projectRegion),
    [payload?.command.world.nodes],
  )
  const selectedRegion = nodes.find((node) => node.region === selectedRegionId) ?? null
  const hoveredRegion = nodes.find((node) => node.region === hoveredRegionId) ?? null

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#060d18] font-mono text-slate-100">
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950/95 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
            <circle cx="16" cy="16" r="9" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.55" />
            <circle cx="16" cy="16" r="4" fill="#38bdf8" />
          </svg>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-normal text-white">HaloGrid Classic</h1>
            <p className="truncate text-[9px] uppercase tracking-[0.22em] text-cyan-300/60">
              Broker-backed 2D route topology
            </p>
          </div>
        </div>
        <nav className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/live"
            className="rounded-xl border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-400 hover:border-purple-300/40 hover:text-purple-200"
          >
            3D Globe
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-400 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            Site
          </Link>
        </nav>
      </header>

      <TopStatus command={payload?.command ?? null} live={payload?.live ?? null} loading={loading} error={error} />

      {!payload ? (
        <section className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-6 text-sm text-slate-300">
            {error ?? 'Loading CO2 Router Classic topology from ecobe-mvp...'}
          </div>
        </section>
      ) : (
        <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_360px]">
          <RegionRail
            nodes={nodes}
            selectedRegionId={selectedRegionId}
            onSelect={(region) => setSelectedRegionId(region.region)}
          />
          <FlatTopologyMap
            nodes={nodes}
            command={payload.command}
            decisions={decisions}
            selectedRegion={selectedRegion}
            hoveredRegion={hoveredRegion}
            onSelect={(region) => setSelectedRegionId(region.region)}
            onHover={(region) => setHoveredRegionId(region?.region ?? null)}
          />
          <DecisionStream decisions={decisions} />
        </section>
      )}

      <footer className="flex flex-shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#060d18]/90 px-5 py-2 text-[9px] uppercase tracking-[0.18em] text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            Frames: <span className="text-slate-300">{decisions.length}</span>
          </span>
          <span>
            Routes: <span className="text-slate-300">{nodes.length}</span>
          </span>
          <span>
            Last success:{' '}
            <span className="text-slate-300">{formatAge(payload?.command.runtime.lastSuccessfulAt)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: payload?.command.runtime.mode === 'live' ? '#4ade80' : '#fbbf24' }}
          />
          <span style={{ color: payload?.command.runtime.mode === 'live' ? '#4ade80' : '#fbbf24' }}>
            {payload?.command.runtime.mode === 'live' ? 'Broker live' : 'Broker degraded'}
          </span>
        </div>
      </footer>
    </main>
  )
}
