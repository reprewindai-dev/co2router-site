'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type {
  CommandCenterDecisionItem,
  CommandCenterSnapshot,
  LiveSystemSnapshot,
  WorldRegionState,
} from '@/types/control-surface'

type ClassicPayload = {
  command: CommandCenterSnapshot
  live: LiveSystemSnapshot
}

const STATE_META = {
  active: { label: 'ACTIVE', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  marginal: { label: 'MARGINAL', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  blocked: { label: 'BLOCKED', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
} as const

function actionLabel(action: string | null | undefined) {
  if (!action) return 'UNKNOWN'
  return action.replace(/_/g, ' ').toUpperCase()
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

function statusCounts(nodes: WorldRegionState[]) {
  return nodes.reduce(
    (counts, node) => {
      counts[node.state] += 1
      return counts
    },
    { active: 0, marginal: 0, blocked: 0 },
  )
}

function RegionCard({
  region,
  decision,
}: {
  region: WorldRegionState
  decision: CommandCenterDecisionItem | null
}) {
  const meta = STATE_META[region.state]
  const carbon =
    typeof region.carbonIntensityGPerKwh === 'number'
      ? `${Math.round(region.carbonIntensityGPerKwh)} gCO2/kWh`
      : 'no current signal'

  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">{region.label}</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {region.region}
          </p>
        </div>
        <span
          className="rounded-full px-2 py-1 font-mono text-[9px] font-bold"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Signal</div>
          <div className="mt-1 font-mono text-slate-200">{carbon}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Source</div>
          <div className="mt-1 truncate font-mono text-slate-200">
            {region.signalSource ?? 'registered'}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.04] p-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-bold text-cyan-200">
            {actionLabel(decision?.action ?? region.action)}
          </span>
          <span className="font-mono text-[9px] text-slate-500">
            {formatTime(decision?.createdAt)}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] text-slate-400">
          {decision?.reasonCode ?? region.reasonCode ?? 'No current backend decision frame'}
        </p>
        <p className="mt-1 truncate font-mono text-[9px] text-cyan-300/60">
          {decision?.proofHash ?? region.decisionFrameId ?? 'proof pending'}
        </p>
      </div>
    </article>
  )
}

export function ClassicHaloGrid() {
  const [payload, setPayload] = useState<ClassicPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await fetchClassicPayload()
        if (cancelled) return
        setPayload(next)
        setError(null)
      } catch (caught) {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'Classic HaloGrid fetch failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
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
  const decisionByFrame = useMemo(
    () => new Map(decisions.map((decision) => [decision.decisionFrameId, decision])),
    [decisions],
  )
  const nodes = payload?.command.world.nodes ?? []
  const counts = statusCounts(nodes)
  const latest = decisions[0] ?? null
  const verifiedDatasets =
    payload?.live.providers.datasets.filter((dataset) => dataset.verificationStatus === 'verified')
      .length ?? 0

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/95 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 font-black text-cyan-200">
              HG
            </div>
            <div>
              <h1 className="text-lg font-black tracking-normal text-white">HaloGrid Classic</h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                CO2 Router 2D command surface
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/live"
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:border-purple-300/40 hover:text-purple-200"
            >
              3D Globe
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
            >
              Site
            </Link>
          </nav>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[320px_1fr_380px]">
        <aside className="border-b border-white/10 bg-slate-950/70 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Backend Regions
            </span>
            <span className="font-mono text-xs text-cyan-300">{nodes.length}</span>
          </div>
          <div className="grid gap-3">
            {nodes.slice(0, 16).map((node) => {
              const meta = STATE_META[node.state]
              return (
                <div key={node.region} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-bold text-white">{node.label}</span>
                    <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-500">
                    <span>{node.region}</span>
                    <span>{node.signalSource ?? 'registered'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="p-5">
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            {(['active', 'marginal', 'blocked'] as const).map((state) => {
              const meta = STATE_META[state]
              return (
                <div key={state} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {meta.label}
                  </div>
                  <div className="mt-2 text-3xl font-black" style={{ color: meta.color }}>
                    {counts[state]}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mb-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
                  Latest backend frame
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  {latest ? `${actionLabel(latest.action)} ${latest.selectedRegion}` : 'No frame yet'}
                </div>
              </div>
              <div className="font-mono text-xs text-slate-400">
                {loading ? 'loading broker' : error ? 'broker degraded' : 'broker live'} | updated{' '}
                {formatAge(payload?.command.generatedAt)}
              </div>
            </div>
            {(error || payload?.command.runtime.degradedReason) && (
              <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                {error ?? payload?.command.runtime.degradedReason}
              </p>
            )}
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {nodes.map((node) => (
              <RegionCard
                key={node.region}
                region={node}
                decision={
                  node.decisionFrameId ? decisionByFrame.get(node.decisionFrameId) ?? null : null
                }
              />
            ))}
          </div>
        </section>

        <aside className="border-t border-white/10 bg-slate-950/70 p-4 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Decision Stream
            </span>
            <span className="font-mono text-xs text-cyan-300">{decisions.length} frames</span>
          </div>
          <div className="space-y-3">
            {decisions.map((decision) => (
              <article key={decision.decisionFrameId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-purple-300">
                    {actionLabel(decision.action)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {formatTime(decision.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{decision.selectedRegion}</p>
                <p className="mt-1 text-xs text-slate-400">{decision.reasonCode}</p>
                <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px]">
                  <span className="min-w-0 truncate text-cyan-300">{decision.proofHash ?? 'proof pending'}</span>
                  <span className={decision.traceAvailable ? 'text-emerald-300' : 'text-amber-300'}>
                    {decision.traceAvailable ? 'TRACE' : 'NO TRACE'}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Proof posture
            </div>
            <div className="mt-2 text-sm text-slate-200">
              {payload?.live.traceLedger.available ? 'Trace hash attached' : 'Trace details pending'} |{' '}
              {payload?.live.traceLedger.replayConsistent === true
                ? 'replay verified'
                : 'replay pending'}{' '}
              | {verifiedDatasets}/4 water datasets verified
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
