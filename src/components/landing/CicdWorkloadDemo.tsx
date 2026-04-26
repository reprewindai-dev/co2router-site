'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { heroScenarioOrder, heroScenarios, type HeroScenarioId } from '@/lib/hero-scenarios'

const scenarioTimings = [0, 1000, 2500, 4500, 6500, 8000, 10000, 11500, 13000]

const toneClasses: Record<HeroScenarioId, string> = {
  'run-now': 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100',
  reroute: 'border-sky-300/35 bg-sky-300/12 text-sky-100',
  delay: 'border-amber-300/35 bg-amber-300/12 text-amber-100',
  throttle: 'border-orange-300/35 bg-orange-300/12 text-orange-100',
  deny: 'border-rose-300/35 bg-rose-300/12 text-rose-100',
}

const toneGlows: Record<HeroScenarioId, string> = {
  'run-now': 'shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_40px_rgba(110,231,183,0.08)]',
  reroute: 'shadow-[0_0_0_1px_rgba(125,211,252,0.22),0_0_40px_rgba(125,211,252,0.08)]',
  delay: 'shadow-[0_0_0_1px_rgba(252,211,77,0.22),0_0_40px_rgba(252,211,77,0.08)]',
  throttle: 'shadow-[0_0_0_1px_rgba(251,146,60,0.22),0_0_40px_rgba(251,146,60,0.08)]',
  deny: 'shadow-[0_0_0_1px_rgba(251,113,133,0.22),0_0_40px_rgba(251,113,133,0.08)]',
}

type CicdWorkloadDemoProps = {
  externalRunSignal?: number
}

export function CicdWorkloadDemo({ externalRunSignal = 0 }: CicdWorkloadDemoProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<HeroScenarioId>('reroute')
  const [phase, setPhase] = useState(0)

  const scenario = heroScenarios[activeScenarioId]

  useEffect(() => {
    const timers = scenarioTimings.slice(1).map((delay, index) =>
      window.setTimeout(() => {
        setPhase(index + 1)
      }, delay)
    )

    setPhase(0)

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [activeScenarioId])

  const phaseLabel = useMemo(() => {
    if (phase < 1) return 'Live indicator'
    if (phase < 2) return 'Incoming workload'
    if (phase < 4) return 'Signal evaluation'
    if (phase < 5) return 'Decision chamber'
    if (phase < 6) return 'Impact and proof'
    return 'Ready'
  }, [phase])

  const impactIsVisible = phase >= 6
  const proofIsVisible = phase >= 6
  const controlsEnabled = phase >= 8

  const runNextScenario = useCallback(() => {
    const currentIndex = heroScenarioOrder.indexOf(activeScenarioId)
    const nextScenario = heroScenarioOrder[(currentIndex + 1) % heroScenarioOrder.length]
    setActiveScenarioId(nextScenario)
  }, [activeScenarioId])

  useEffect(() => {
    if (externalRunSignal <= 0) return
    runNextScenario()
  }, [externalRunSignal, runNextScenario])

  return (
    <section id="hero-live-demo" className="lg:min-h-[760px]">
      <div
        className={`h-full rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_34%),linear-gradient(180deg,rgba(13,17,24,0.96),rgba(4,6,12,0.98))] p-4 transition-all duration-700 ${toneGlows[activeScenarioId]} sm:p-6`}
      >
        <div className="flex h-full flex-col rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                LIVE DECISION FLOW
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.55)] animate-pulse" />
                active
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              {phaseLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <div
              className={`rounded-[28px] border border-white/10 bg-slate-950/70 p-4 transition-all duration-700 ${
                phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
                    Incoming workload
                  </div>
                  <div className="text-xl font-semibold tracking-[-0.04em] text-white">
                    {scenario.workloadType}
                  </div>
                  <div className="text-sm text-slate-300">{scenario.jobName}</div>
                </div>
                <div className="space-y-2 text-right text-sm text-slate-300">
                  <p>
                    Source: <span className="text-white">{scenario.source}</span>
                  </p>
                  <p>
                    Requested region: <span className="text-white">{scenario.requestedRegion}</span>
                  </p>
                  {scenario.environment ? (
                    <p>
                      Environment: <span className="text-white">{scenario.environment}</span>
                    </p>
                  ) : null}
                  {scenario.scale ? (
                    <p>
                      Scale: <span className="text-white">{scenario.scale}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {scenario.signals.map((signal, index) => {
                const resolved = phase >= 2

                return (
                  <SignalCard
                    key={signal.label}
                    label={signal.label}
                    value={signal.value}
                    resolved={resolved}
                    delayMs={index * 110}
                  />
                )
              })}
            </div>

            <div
              className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,15,23,0.95),rgba(5,8,14,0.98))] p-5 transition-all duration-700 ${
                phase >= 5 ? 'scale-[1.01] opacity-100' : 'opacity-80'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Central decision chamber
                  </div>
                  <div className="mt-2 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
                    {scenario.action}
                  </div>
                  <div className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    {scenario.reason}
                  </div>
                </div>

                <div className={`rounded-2xl border px-4 py-3 text-right ${toneClasses[scenario.id]}`}>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-current/70">
                    Active action
                  </div>
                  <div className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-current">
                    {scenario.action}
                  </div>
                </div>
              </div>

              {impactIsVisible ? (
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-slate-200">
                  {scenario.impact}
                  {scenario.routeHint ? <span className="block text-slate-400">{scenario.routeHint}</span> : null}
                </div>
              ) : null}
            </div>

            <div
              className={`grid gap-3 rounded-[26px] border border-emerald-300/15 bg-emerald-300/8 p-4 transition-all duration-700 ${
                proofIsVisible ? 'opacity-100' : 'opacity-75'
              } sm:grid-cols-[1.05fr_0.95fr]`}
            >
              <div className="text-[11px] uppercase tracking-[0.26em] text-emerald-200">
                Proof strip
              </div>
              <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-4">
                {scenario.proof.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/8 bg-white/[0.03] p-3">
              {heroScenarioOrder.map((scenarioId) => {
                const item = heroScenarios[scenarioId]
                const isActive = scenarioId === activeScenarioId
                const activeTone = toneClasses[scenarioId]

                return (
                  <button
                    key={scenarioId}
                    type="button"
                    onClick={() => setActiveScenarioId(scenarioId)}
                    aria-pressed={isActive}
                    className={[
                      'rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300 transition duration-200 hover:border-white/20',
                      isActive ? activeTone : 'hover:text-white',
                    ].join(' ')}
                  >
                    {item.action}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={runNextScenario}
                disabled={!controlsEnabled}
                className="ml-auto rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-45"
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

function SignalCard({
  label,
  value,
  resolved,
  delayMs,
}: {
  label: string
  value: string
  resolved: boolean
  delayMs: number
}) {
  return (
    <div
      className={`rounded-[22px] border border-white/10 bg-white/[0.03] p-4 transition-all duration-700 ${
        resolved ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-75'
      }`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">{value}</div>
    </div>
  )
}
