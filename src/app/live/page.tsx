'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { RegionNode, RoutingArc } from '@/components/co2-control-panel/types'
import type {
  CommandCenterDecisionItem,
  CommandCenterSnapshot,
  LiveSystemSnapshot,
  WorldExecutionState,
  WorldRegionState,
} from '@/types/control-surface'

const GlobeZone = dynamic(
  () => import('@/components/co2-control-panel/zones/GlobeZone').then((mod) => mod.GlobeZone),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      </div>
    ),
  },
)

type Tier = 'freeview' | 'pro' | 'elite'

type LivePayload = {
  command: CommandCenterSnapshot
  live: LiveSystemSnapshot
}

type LoadState = {
  data: LivePayload | null
  error: string | null
  loading: boolean
}

const REGION_GLOBE_COORDS: Record<string, { lat: number; lng: number }> = {
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

function resolveGlobeCoords(region: WorldRegionState) {
  const direct =
    REGION_GLOBE_COORDS[region.region] ??
    REGION_GLOBE_COORDS[region.region.toUpperCase()] ??
    REGION_GLOBE_COORDS[region.region.toLowerCase()]
  if (direct) return direct

  return {
    lat: 90 - region.y * 1.8,
    lng: region.x * 3.6 - 180,
  }
}

function globeNodeStatus(region: WorldRegionState): RegionNode['status'] {
  if (region.action === 'deny' || region.state === 'blocked') return 'critical'
  if (region.action === 'delay' || region.action === 'throttle') return 'stressed'

  const intensity = region.carbonIntensityGPerKwh
  if (typeof intensity === 'number') {
    if (intensity <= 100) return 'optimal'
    if (intensity <= 300) return 'acceptable'
    if (intensity <= 500) return 'stressed'
    return 'critical'
  }

  return region.state === 'active' ? 'acceptable' : 'stressed'
}

function globeSignalLabel(region: WorldRegionState) {
  if (typeof region.carbonIntensityGPerKwh === 'number') {
    const signalKind =
      region.reasonCode === 'REGION_STRUCTURAL_BASELINE'
        ? 'structural baseline'
        : region.signalEstimated
          ? 'estimated signal'
          : 'live signal'
    return `${Math.round(region.carbonIntensityGPerKwh)}g/kWh ${signalKind}`
  }
  if (region.action) return `${actionLabel(region.action)} - ${region.reasonCode ?? 'decision frame'}`
  return 'registered route - no current live signal'
}

function globeRegionGroup(regionCode: string): { label: string; color: string } {
  const normalized = regionCode.toUpperCase()

  if (normalized.startsWith('US-')) return { label: 'United States', color: '#5b8cff' }
  if (normalized.startsWith('CA-')) return { label: 'Canada', color: '#22d3ee' }
  if (normalized.startsWith('EU-')) return { label: 'Europe', color: '#b56cff' }
  if (normalized.startsWith('AP-')) return { label: 'Asia Pacific', color: '#ff7ac8' }
  if (normalized.startsWith('SA-')) return { label: 'South America', color: '#ff8f5a' }
  if (normalized.startsWith('AF-')) return { label: 'Africa', color: '#2dd4bf' }
  if (normalized.startsWith('ME-')) return { label: 'Middle East', color: '#f0abfc' }

  if (normalized.includes('US-') || normalized.startsWith('SFO') || normalized.startsWith('US-')) {
    return { label: 'United States', color: '#5b8cff' }
  }

  return { label: 'Cloud edge', color: '#cbd5e1' }
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

function stateColor(state: WorldExecutionState) {
  if (state === 'active') return '#4ade80'
  if (state === 'marginal') return '#fbbf24'
  return '#f87171'
}

function routeSignalLabel(region: WorldRegionState) {
  if (region.decisionFrameId) return actionLabel(region.action)
  if (region.reasonCode === 'REGION_STRUCTURAL_BASELINE') return 'BASELINE'
  if (typeof region.carbonIntensityGPerKwh === 'number') return region.signalEstimated ? 'EST' : 'LIVE'
  return 'NO SIGNAL'
}

function routeSignalColor(region: WorldRegionState) {
  if (region.decisionFrameId) return actionColor(region.action)
  if (region.reasonCode === 'REGION_STRUCTURAL_BASELINE') return '#67e8f9'
  if (typeof region.carbonIntensityGPerKwh === 'number') return '#4ade80'
  return '#fbbf24'
}

function routeSignalSourceLabel(region: WorldRegionState) {
  if (!region.signalSource) return 'not attached'
  return region.signalSource.replace(/_/g, ' ').toLowerCase()
}

function formatTime(value: string | number | null | undefined) {
  if (!value) return 'unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unavailable'
  return date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatAge(value: string | null | undefined) {
  if (!value) return 'never'
  const at = new Date(value).getTime()
  if (!Number.isFinite(at)) return 'unavailable'
  const ageMs = Math.max(0, Date.now() - at)
  if (ageMs < 60_000) return `${Math.max(1, Math.round(ageMs / 1000))}s ago`
  if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m ago`
  return `${Math.round(ageMs / 3_600_000)}h ago`
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
    throw new Error(`${path} returned HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}`)
  }
  return (await response.json()) as T
}

async function fetchLivePayload(): Promise<LivePayload> {
  const [command, live] = await Promise.all([
    fetchJson<CommandCenterSnapshot>('/api/control-surface/command-center'),
    fetchJson<LiveSystemSnapshot>('/api/control-surface/live-system'),
  ])
  return { command, live }
}

function TierLock({ tier, onClose }: { tier: 'pro' | 'elite'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-8">
        <div className="mb-4 text-[10px] uppercase tracking-[0.28em] text-cyan-300">
          {tier === 'pro' ? 'PRO TIER' : 'ELITE TIER'}
        </div>
        <h2 className="mb-4 text-3xl font-black tracking-normal text-white">
          {tier === 'pro' ? 'Unlock Pro access' : 'Unlock Elite access'}
        </h2>
        <p className="mb-6 text-sm leading-7 text-slate-300">
          {tier === 'pro'
            ? 'Pro includes full decision history, provider feeds, policy inspection, and replay posture.'
            : 'Elite adds audit exports, compliance reports, SAIQ weight inspection, and operator manuals.'}
        </p>
        <div className="flex gap-3">
          <Link
            href="/access"
            className="flex-1 rounded-xl bg-cyan-300 px-5 py-3 text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-950"
          >
            Request access
          </Link>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-300"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

function FixedGlobeStatus({
  command,
  live,
  error,
}: {
  command: CommandCenterSnapshot
  live: LiveSystemSnapshot
  error: string | null
}) {
  const active = command.world.nodes.filter((node) => node.state === 'active').length
  const marginal = command.world.nodes.filter((node) => node.state === 'marginal').length
  const blocked = command.world.nodes.filter((node) => node.state === 'blocked').length
  const latest = command.decisionCore.recentDecisions[0] ?? null

  return (
    <div className="absolute left-6 top-6 z-10 w-[330px] rounded-2xl border border-cyan-300/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.24em] text-cyan-300">Globe status</div>
          <div className="mt-1 text-xl font-black tracking-normal text-white">
            {command.header.systemStatus.toUpperCase()}
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.18em]"
          style={{
            color: command.runtime.mode === 'live' ? '#4ade80' : '#fbbf24',
            background:
              command.runtime.mode === 'live'
                ? 'rgba(74,222,128,0.12)'
                : 'rgba(251,191,36,0.12)',
          }}
        >
          {command.runtime.mode}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['Active', active, '#4ade80'],
          ['Marginal', marginal, '#fbbf24'],
          ['Blocked', blocked, '#f87171'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <div className="text-[8px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-black" style={{ color: String(color) }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="text-[8px] uppercase tracking-[0.16em] text-slate-500">Latest backend frame</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: actionColor(latest?.action) }}>
            {actionLabel(latest?.action)}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
            {latest?.selectedRegion ?? 'none'}
          </span>
          <span className="text-[9px] text-slate-500">{formatTime(latest?.createdAt)}</span>
        </div>
        <div className="mt-1 truncate font-mono text-[9px] text-cyan-300/70">
          {latest?.decisionFrameId ?? 'no backend decision frame available'}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-slate-500">
        <span>Replay {command.header.replayVerified === true ? 'verified' : 'pending'}</span>
        <span>Updated {formatAge(live.generatedAt)}</span>
      </div>

      {(error || command.runtime.degradedReason || live.recentDecisions.error) && (
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-2 text-[10px] leading-4 text-amber-100">
          {error ?? command.runtime.degradedReason ?? live.recentDecisions.error}
        </div>
      )}
    </div>
  )
}

function RegionList({
  command,
  selectedRegionId,
  onSelect,
}: {
  command: CommandCenterSnapshot
  selectedRegionId: string | null
  onSelect: (region: WorldRegionState) => void
}) {
  return (
    <aside
      className="flex-shrink-0 overflow-y-auto px-3 py-3"
      style={{
        width: 240,
        borderRight: '1px solid rgba(56,189,248,0.08)',
        background: 'rgba(6,13,24,0.72)',
      }}
    >
      <div className="mb-3 flex items-center justify-between px-1 text-[9px] uppercase tracking-[0.22em] text-slate-500">
        <span>Backend regions</span>
        <span className="font-mono text-cyan-300/70">{command.world.nodes.length}</span>
      </div>
      <div className="space-y-1.5">
        {command.world.nodes.map((region) => (
          <button
            key={region.region}
            onClick={() => onSelect(region)}
            className="w-full rounded-xl px-3 py-2.5 text-left transition"
            style={{
              background:
                selectedRegionId === region.region
                  ? 'rgba(56,189,248,0.1)'
                  : 'rgba(255,255,255,0.025)',
              border:
                selectedRegionId === region.region
                  ? '1px solid rgba(56,189,248,0.25)'
                  : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{
                    background: stateColor(region.state),
                    boxShadow: `0 0 6px ${stateColor(region.state)}`,
                  }}
                />
                <span className="truncate text-xs font-semibold text-slate-100">{region.label}</span>
              </div>
              <span
                className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[8px] uppercase"
                style={{
                  color: routeSignalColor(region),
                  background: `${routeSignalColor(region)}18`,
                }}
              >
                {routeSignalLabel(region)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500">
              <span className="truncate">{region.region}</span>
              <span className="flex-shrink-0 text-slate-400">
                {typeof region.carbonIntensityGPerKwh === 'number'
                  ? `${Math.round(region.carbonIntensityGPerKwh)}g`
                  : 'registered'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}

function DecisionStream({ decisions }: { decisions: CommandCenterDecisionItem[] }) {
  return (
    <aside
      className="flex w-[320px] flex-shrink-0 flex-col overflow-hidden"
      style={{
        borderLeft: '1px solid rgba(56,189,248,0.08)',
        background: 'rgba(6,13,24,0.72)',
      }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-4 pb-2 pt-3"
        style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}
      >
        <span className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Decision stream</span>
        <span className="text-[9px] text-cyan-300/70">{decisions.length} frames</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {decisions.length === 0 && (
          <div className="flex h-40 items-center justify-center text-[10px] text-slate-500">
            No backend decisions returned.
          </div>
        )}
        {decisions.map((decision, index) => (
          <div
            key={decision.decisionFrameId}
            className="rounded-xl px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid ${
                index === 0 ? `${actionColor(decision.action)}33` : 'rgba(255,255,255,0.05)'
              }`,
            }}
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{
                  background: actionColor(decision.action),
                  boxShadow: `0 0 6px ${actionColor(decision.action)}`,
                }}
              />
              <span className="text-[10px] font-bold" style={{ color: actionColor(decision.action) }}>
                {actionLabel(decision.action)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-slate-300">
                {decision.selectedRegion}
              </span>
              <span className="text-[9px] text-slate-500">{formatTime(decision.createdAt)}</span>
            </div>
            <p className="truncate text-[10px] leading-4 text-slate-500">{decision.reasonCode}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="truncate font-mono text-[9px] text-cyan-300/50">
                {decision.decisionFrameId}
              </span>
              {decision.traceAvailable && (
                <span className="text-[9px] uppercase tracking-[0.12em] text-emerald-300">trace</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default function LivePage() {
  const [tier, setTier] = useState<Tier>('freeview')
  const [lockTarget, setLockTarget] = useState<'pro' | 'elite' | null>(null)
  const [loadState, setLoadState] = useState<LoadState>({
    data: null,
    error: null,
    loading: true,
  })
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [clock, setClock] = useState(Date.now())

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLivePayload()
      setLoadState({ data, error: null, loading: false })
      setSelectedRegionId((current) => current ?? data.command.world.nodes[0]?.region ?? null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load CO2 Router backend data.'
      setLoadState((current) => ({
        data: current.data,
        error: message,
        loading: false,
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => {
      void refresh()
    }, 10_000)
    return () => clearInterval(timer)
  }, [paused, refresh])

  const command = loadState.data?.command ?? null
  const live = loadState.data?.live ?? null
  const selectedRegion =
    command?.world.nodes.find((region) => region.region === selectedRegionId) ??
    command?.world.nodes[0] ??
    null
  const selectedDecision =
    selectedRegion && command
      ? decisionForRegion(selectedRegion, command.decisionCore.recentDecisions)
      : null

  const globeRegions = useMemo<RegionNode[]>(() => {
    if (!command) return []

    const decisionCountByRegion = new Map<string, number>()
    for (const decision of command.decisionCore.recentDecisions) {
      decisionCountByRegion.set(decision.selectedRegion, (decisionCountByRegion.get(decision.selectedRegion) ?? 0) + 1)
    }

    return command.world.nodes.map((region) => {
      const coords = resolveGlobeCoords(region)
      const group = globeRegionGroup(region.region)
      return {
        id: region.region,
        name: region.label,
        lat: coords.lat,
        lng: coords.lng,
        carbonIntensity: Math.round(region.carbonIntensityGPerKwh ?? 0),
        renewablePercentage: 0,
        signalLabel: globeSignalLabel(region),
        groupLabel: group.label,
        groupColor: group.color,
        activeDecisions: decisionCountByRegion.get(region.region) ?? (region.decisionFrameId ? 1 : 0),
        totalSaved: 0,
        status: globeNodeStatus(region),
      }
    })
  }, [command])

  const globeArcs = useMemo<RoutingArc[]>(() => {
    if (!command || globeRegions.length === 0) return []

    const regionById = new Map(globeRegions.map((region) => [region.id, region]))
    return command.world.flows.flatMap((flow) => {
      const from = regionById.get(flow.fromRegion)
      const to = regionById.get(flow.toRegion)
      if (!from || !to) return []

      return [
        {
          id: flow.id,
          from,
          to,
          decisions: [],
          totalVolume: 1,
          carbonSaved: flow.mode === 'route' ? 1 : 0,
          animated: true,
        },
      ]
    })
  }, [command, globeRegions])

  const handleTierClick = (nextTier: Tier) => {
    if (nextTier === 'pro' || nextTier === 'elite') {
      setLockTarget(nextTier)
      return
    }
    setTier(nextTier)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#060d18] font-mono text-slate-200">
      {lockTarget && <TierLock tier={lockTarget} onClose={() => setLockTarget(null)} />}

      <header
        className="flex flex-shrink-0 items-center justify-between gap-4 px-5 py-2.5"
        style={{
          borderBottom: '1px solid rgba(56,189,248,0.07)',
          background: 'rgba(6,13,24,0.95)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex flex-shrink-0 items-center gap-3">
          <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
            <circle cx="16" cy="16" r="9" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.55" />
            <circle cx="16" cy="16" r="4" fill="#38bdf8" />
          </svg>
          <div>
            <div className="text-sm font-bold tracking-normal text-slate-100">HaloGrid</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-300/50">
              CO2 Router command center
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          {command &&
            [
              ['ACTIVE', command.world.nodes.filter((node) => node.state === 'active').length, '#4ade80'],
              ['MARGINAL', command.world.nodes.filter((node) => node.state === 'marginal').length, '#fbbf24'],
              ['BLOCKED', command.world.nodes.filter((node) => node.state === 'blocked').length, '#f87171'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: String(color), boxShadow: `0 0 8px ${color}` }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: String(color) }}
                >
                  {String(value)} {String(label)}
                </span>
              </div>
            ))}
          <div className="hidden h-4 w-px bg-white/10 lg:block" />
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-cyan-300/50 lg:block">
            Broker {command?.runtime.mode ?? 'loading'}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="flex gap-0.5 rounded-xl bg-white/[0.03] p-0.5">
            {(['freeview', 'pro', 'elite'] as const).map((item) => (
              <button
                key={item}
                onClick={() => handleTierClick(item)}
                className="rounded-[10px] px-3 py-1 text-[9px] uppercase tracking-[0.16em] transition"
                style={{
                  background: tier === item ? 'rgba(56,189,248,0.15)' : 'transparent',
                  color: tier === item ? '#38bdf8' : '#64748b',
                }}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs text-slate-400"
            aria-label={paused ? 'Resume backend polling' : 'Pause backend polling'}
          >
            {paused ? '>' : '||'}
          </button>
          <span className="ml-1 text-[10px] tabular-nums text-cyan-300/50">{formatTime(clock)}</span>
          <Link
            href="/"
            className="ml-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-400"
          >
            Site
          </Link>
        </div>
      </header>

      <div className="flex-shrink-0 border-b border-white/[0.04] bg-[#060d18]/80 px-5 py-2">
        <div className="flex items-center gap-4">
          <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Proof posture</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: command?.header.replayVerified ? '100%' : command?.header.traceLocked ? '68%' : '34%',
                background: command?.header.replayVerified
                  ? '#4ade80'
                  : command?.header.traceLocked
                    ? '#38bdf8'
                    : '#fbbf24',
              }}
            />
          </div>
          <span className="truncate text-[9px] text-slate-300">
            {command?.header.detail ?? 'Loading backend status'}
          </span>
        </div>
      </div>

      {!command || !live ? (
        <main className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-6 text-sm text-slate-300">
            {loadState.error ?? 'Loading CO2 Router command center from ecobe-mvp...'}
          </div>
        </main>
      ) : (
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <RegionList
            command={command}
            selectedRegionId={selectedRegion?.region ?? null}
            onSelect={(region) => setSelectedRegionId(region.region)}
          />

          <main className="relative flex flex-1 flex-col overflow-hidden" style={{ minHeight: 0 }}>
            <div className="relative flex-1">
              <GlobeZone regions={globeRegions} arcs={globeArcs} />
              <FixedGlobeStatus command={command} live={live} error={loadState.error} />

              {selectedRegion && (
                <div className="absolute bottom-6 left-6 right-6 z-10 rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">
                        Selected backend region
                      </div>
                      <div className="truncate text-xl font-bold text-white">{selectedRegion.label}</div>
                      <div className="mt-1 truncate font-mono text-xs text-slate-500">
                        {selectedRegion.decisionFrameId ?? 'No decision frame bound to this region'}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRegionId(null)}
                      className="text-lg text-slate-500 hover:text-white"
                      aria-label="Clear selected region"
                    >
                      x
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {[
                      ['State', selectedRegion.state, stateColor(selectedRegion.state)],
                      ['Action', actionLabel(selectedRegion.action), actionColor(selectedRegion.action)],
                      [
                        'Carbon',
                        typeof selectedRegion.carbonIntensityGPerKwh === 'number'
                          ? `${Math.round(selectedRegion.carbonIntensityGPerKwh)}g/kWh`
                          : 'unavailable',
                        routeSignalColor(selectedRegion),
                      ],
                      ['Source', routeSignalSourceLabel(selectedRegion), '#67e8f9'],
                      ['Reason', selectedRegion.reasonCode ?? 'unavailable', '#94a3b8'],
                      [
                        'Trace',
                        selectedDecision?.traceAvailable ? 'available' : 'unavailable',
                        selectedDecision?.traceAvailable ? '#4ade80' : '#fbbf24',
                      ],
                    ].map(([label, value, color]) => (
                      <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
                        <div className="truncate text-sm font-bold" style={{ color: String(color) }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>

          <DecisionStream decisions={command.decisionCore.recentDecisions} />
        </div>
      )}

      <footer
        className="flex flex-shrink-0 items-center justify-between px-5 py-2 text-[9px] uppercase tracking-[0.18em] text-slate-500"
        style={{ borderTop: '1px solid rgba(56,189,248,0.06)', background: 'rgba(6,13,24,0.8)' }}
      >
        <div className="flex items-center gap-4">
          <span>
            Frames: <span className="text-slate-300">{command?.decisionCore.recentDecisions.length ?? 0}</span>
          </span>
          <span>
            Last success: <span className="text-slate-300">{formatAge(command?.runtime.lastSuccessfulAt)}</span>
          </span>
          <span>
            Datasets:{' '}
            <span className="text-slate-300">
              {live ? live.providers.datasets.filter((item) => item.verificationStatus === 'verified').length : 0}/
              {live?.providers.datasets.length ?? 0}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: command?.runtime.mode === 'live' ? '#4ade80' : '#fbbf24' }}
          />
          <span style={{ color: command?.runtime.mode === 'live' ? '#4ade80' : '#fbbf24' }}>
            {command?.runtime.mode === 'live' ? 'Broker live' : 'Broker degraded'}
          </span>
        </div>
      </footer>
    </div>
  )
}
