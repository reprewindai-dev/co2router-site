'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { heroScenarioOrder, heroScenarios, type HeroScenarioId } from '@/lib/hero-scenarios'

function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  useEffect(() => { ref.current = fn })
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T
}

const toneConfig: Record<HeroScenarioId, { pill: string; glow: string; badge: string }> = {
  'run-now': {
    pill:  'border-emerald-400/40 bg-emerald-400/12 text-emerald-200',
    glow:  'shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_60px_rgba(52,211,153,0.07)]',
    badge: 'bg-emerald-400/15 text-emerald-200 border border-emerald-400/30',
  },
  reroute: {
    pill:  'border-sky-400/40 bg-sky-400/12 text-sky-200',
    glow:  'shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_60px_rgba(56,189,248,0.07)]',
    badge: 'bg-sky-400/15 text-sky-200 border border-sky-400/30',
  },
  delay: {
    pill:  'border-amber-400/40 bg-amber-400/12 text-amber-200',
    glow:  'shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_60px_rgba(251,191,36,0.07)]',
    badge: 'bg-amber-400/15 text-amber-200 border border-amber-400/30',
  },
  throttle: {
    pill:  'border-orange-400/40 bg-orange-400/12 text-orange-200',
    glow:  'shadow-[0_0_0_1px_rgba(251,146,60,0.18),0_0_60px_rgba(251,146,60,0.07)]',
    badge: 'bg-orange-400/15 text-orange-200 border border-orange-400/30',
  },
  deny: {
    pill:  'border-rose-400/40 bg-rose-400/12 text-rose-200',
    glow:  'shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_0_60px_rgba(251,113,133,0.07)]',
    badge: 'bg-rose-400/15 text-rose-200 border border-rose-400/30',
  },
}

type ApiDecision = {
  action?: string
  reason?: string
  impact?: string
  proofHash?: string
  latencyMs?: number
  routedRegion?: string
  selectedRegion?: string
  explanation?: string
}

type LiveRoutingDemoProps = {
  externalRunSignal?: number
}

export function LiveRoutingDemo({ externalRunSignal = 0 }: LiveRoutingDemoProps) {
  const [activeId, setActiveId]           = useState<HeroScenarioId>('reroute')
  const [phase, setPhase]                 = useState(0)
  const [liveDecision, setLiveDecision]   = useState<ApiDecision | null>(null)
  const [isLoading, setIsLoading]         = useState(false)
  const abortRef                          = useRef<AbortController | null>(null)
  const activeIdRef                       = useRef(activeId)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const scenario = heroScenarios[activeId]
  const tone     = toneConfig[activeId]

  // Run the animated decision flow for a given scenario
  const runScenario = useStableCallback((id: HeroScenarioId) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    setActiveId(id)
    setPhase(0)
    setLiveDecision(null)
    setIsLoading(true)

    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, p: number) =>
      timers.push(setTimeout(() => { if (!signal.aborted) setPhase(p) }, ms))

    t(280,  1)   // workload card appears
    t(700,  2)   // signal cards appear
    t(1400, 3)   // evaluating...
    t(2100, 4)   // decision chamber starts
    t(2800, 5)   // action text slams in
    t(3400, 6)   // proof strip appears

    fetch('/api/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario: id }),
      signal,
    })
      .then(r => r.json())
      .then((data: ApiDecision) => { if (!signal.aborted) setLiveDecision(data) })
      .catch(() => {
        if (!signal.aborted) {
          setLiveDecision({
            action: heroScenarios[id].action,
            reason: heroScenarios[id].reason,
            impact: heroScenarios[id].impact,
          })
        }
      })
      .finally(() => { if (!signal.aborted) setIsLoading(false) })

    return () => {
      abortRef.current?.abort()
      timers.forEach(clearTimeout)
    }
  })

  // Run on mount with default scenario
  useEffect(() => {
    const cleanup = runScenario('reroute')
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External "Run another job" signal
  const prevSignalRef = useRef(0)
  useEffect(() => {
    if (externalRunSignal <= 0) return
    if (externalRunSignal === prevSignalRef.current) return
    prevSignalRef.current = externalRunSignal
    const currentIndex = heroScenarioOrder.indexOf(activeIdRef.current)
    const next = heroScenarioOrder[(currentIndex + 1) % heroScenarioOrder.length]
    runScenario(next)
  }, [externalRunSignal, runScenario])

  const displayAction = liveDecision?.action?.replace(/_/g, ' ').toUpperCase() || scenario.action
  const displayReason = liveDecision?.reason || liveDecision?.explanation || scenario.reason
  const displayImpact = liveDecision?.impact || scenario.impact
  const displayRegion = liveDecision?.routedRegion || liveDecision?.selectedRegion || scenario.requestedRegion
  const displayLatency = liveDecision?.latencyMs ?? 77

  const statusLabel = phase < 3 ? 'SIGNAL EVALUATION' : phase < 5 ? 'DECISION CHAMBER' : 'READY'

  return (
    <section id="hero-live-demo" className="lg:min-h-[720px]">
      <div className={`h-full rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_32%),linear-gradient(180deg,rgba(13,17,24,0.97),rgba(4,6,12,0.99))] p-4 transition-all duration-700 ${tone.glow} sm:p-5`}>
        <div className="flex h-full flex-col rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] sm:p-5">

          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">LIVE DECISION FLOW</div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] animate-pulse" />
                {isLoading ? 'computing…' : 'active'}
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
              {statusLabel}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-4">

            {/* Incoming workload card */}
            <div className={`rounded-[26px] border border-white/10 bg-slate-950/70 p-4 transition-all duration-600 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Incoming workload</div>
                  <div className="text-xl font-bold tracking-[-0.03em] text-white">{scenario.workloadType}</div>
                  <div className="text-sm text-slate-400">{scenario.jobName}</div>
                </div>
                <div className="space-y-1 text-right text-sm text-slate-400">
                  <div>Source: <span className="text-slate-200">{scenario.source}</span></div>
                  <div>Region: <span className="text-slate-200">{scenario.requestedRegion}</span></div>
                </div>
              </div>
            </div>

            {/* 5 signal cards */}
            <div className="grid grid-cols-5 gap-2">
              {scenario.signals.map((sig, i) => (
                <div
                  key={sig.label}
                  style={{ transitionDelay: `${i * 90}ms` }}
                  className={`rounded-[20px] border border-white/8 bg-white/[0.028] p-3 transition-all duration-600 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
                >
                  <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500">{sig.label}</div>
                  <div className="mt-1.5 text-xs font-semibold leading-5 text-white">{sig.value}</div>
                </div>
              ))}
            </div>

            {/* Central decision chamber */}
            <div className={`rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,15,23,0.96),rgba(5,8,14,0.99))] p-5 transition-all duration-700 ${phase >= 4 ? 'opacity-100 scale-100' : 'opacity-60 scale-[0.99]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Central decision chamber</div>
                  <div className={`mt-2 text-5xl font-black tracking-[-0.06em] text-white transition-all duration-500 sm:text-6xl ${phase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                    {displayAction}
                  </div>
                  <div className="mt-2 max-w-xs text-sm leading-7 text-slate-300">{displayReason}</div>
                </div>
                <div className={`rounded-2xl px-4 py-3 text-right ${tone.badge}`}>
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Active action</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em]">{displayAction}</div>
                </div>
              </div>

              {phase >= 6 && (
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-slate-300">
                  {displayImpact}
                  {displayRegion && activeId === 'reroute' && (
                    <span className="ml-2 text-slate-400">→ {displayRegion}</span>
                  )}
                </div>
              )}
            </div>

            {/* Proof strip */}
            {phase >= 6 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-emerald-400/15 bg-emerald-400/8 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.26em] text-emerald-300">Proof strip</div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-200">
                  {scenario.proof.slice(0, 3).map(p => (
                    <span key={p} className="rounded-xl border border-white/8 bg-slate-950/55 px-2.5 py-1">{p}</span>
                  ))}
                  <span className="rounded-xl border border-white/8 bg-slate-950/55 px-2.5 py-1">{displayLatency}ms p95</span>
                </div>
              </div>
            )}

            {/* Scenario selector + Run another job */}
            <div className="flex flex-wrap items-center gap-2 rounded-[26px] border border-white/8 bg-white/[0.025] p-3">
              {heroScenarioOrder.map(id => {
                const s = heroScenarios[id]
                const isActive = id === activeId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => runScenario(id)}
                    disabled={isLoading}
                    className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-50 ${
                      isActive
                        ? `${toneConfig[id].pill}`
                        : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/18 hover:text-white'
                    }`}
                  >
                    {s.action}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  const currentIndex = heroScenarioOrder.indexOf(activeId)
                  const next = heroScenarioOrder[(currentIndex + 1) % heroScenarioOrder.length]
                  runScenario(next)
                }}
                disabled={isLoading}
                className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Run another job
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
