'use client'

import { useState, type FormEvent } from 'react'

type DemoLane = 'prod' | 'staging' | 'experiments' | 'overline' | 'needs_two_keys'

type DemoRouteResponse = {
  run_id: string
  scenario: string
  lanes: Array<{
    lane: DemoLane
    label: string
    outcome: 'run_now' | 'run_later' | 'rejected' | 'needs_override'
    region: string | null
    scheduled_time: string | null
    reasons: string[]
    hard_stops_triggered: string[]
    override_required: boolean
    decision_id: string | null
    latency_ms: number | null
  }>
}

const SAMPLE_SCENARIO = 'nightly_analytics_batch'

const LANE_ORDER: DemoLane[] = ['prod', 'staging', 'experiments', 'overline', 'needs_two_keys']

const LANE_LABELS: Record<DemoLane, string> = {
  prod: 'Lane 1 - Production',
  staging: 'Lane 2 - Staging',
  experiments: 'Lane 3 - Experiments',
  overline: 'Lane 4 - Over the line',
  needs_two_keys: 'Lane 5 - Needs two keys',
}

const LOADING_PLACEHOLDER: DemoRouteResponse = {
  run_id: 'pending',
  scenario: SAMPLE_SCENARIO,
  lanes: LANE_ORDER.map((lane) => ({
    lane,
    label: LANE_LABELS[lane],
    outcome: 'run_now',
    region: null,
    scheduled_time: null,
    reasons: ['Waiting for the sample run.'],
    hard_stops_triggered: [],
    override_required: false,
    decision_id: null,
    latency_ms: null,
  })),
}

function toOutcomeLabel(lane: DemoLane, outcome: DemoRouteResponse['lanes'][number]['outcome']) {
  if (outcome === 'run_later') return 'Delayed'
  if (outcome === 'rejected') return 'Blocked'
  if (outcome === 'needs_override') return 'Needs approval'
  if (lane === 'staging') return 'Runs elsewhere'
  return 'Runs now'
}

function toOutcomeTone(outcome: string) {
  if (outcome === 'Blocked') return 'border-rose-400/20 bg-rose-400/10 text-rose-100'
  if (outcome === 'Delayed') return 'border-amber-400/20 bg-amber-400/10 text-amber-100'
  if (outcome === 'Needs approval') return 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100'
  if (outcome === 'Runs elsewhere') return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
  return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
}

export function CicdWorkloadDemo() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoRouteResponse | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch('/api/demo/route', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scenario: SAMPLE_SCENARIO,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Demo request failed with ${response.status}`)
      }

      const data = (await response.json()) as DemoRouteResponse
      setResult(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to run demo')
      setResult(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const lanes = result?.lanes ?? LOADING_PLACEHOLDER.lanes

  return (
    <section id="demo" className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,18,0.94),rgba(10,15,25,0.88))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.32em] text-cyan-300">Live demo</div>
        <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
          Decide if your jobs run — before they run
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
          Run a job. See what happens.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
          Sandbox mode
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
          Real decisions
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
          5 outcomes
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Running the demo...' : result ? 'Run the demo again' : 'Run the demo'}
        </button>
        <span className="text-sm text-slate-400">No setup. Just click.</span>
      </form>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {lanes.map((lane) => {
          const outcome = isSubmitting ? 'Running...' : toOutcomeLabel(lane.lane, lane.outcome)
          const reason = isSubmitting
            ? 'Waiting for the sample run.'
            : lane.reasons[0] ?? 'Waiting for the sample run.'

          return (
            <article
              key={lane.lane}
              className="min-h-[220px] rounded-[28px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{lane.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {lane.region ?? 'Waiting'}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toOutcomeTone(outcome)}`}
                >
                  {outcome}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Reason</div>
                  <div className="mt-1 leading-6 text-slate-100">{reason}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Decision ID</span>
                    <span className="font-mono text-xs text-slate-100">{lane.decision_id ?? 'pending'}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Latency</span>
                    <span className="text-slate-100">{lane.latency_ms != null ? `${lane.latency_ms} ms` : 'pending'}</span>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
          One job goes in. Five outcomes come back.
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
          CI pipelines, background jobs, automation, anything that runs.
        </div>
      </div>

      <div className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-500">
        {result ? 'Run the demo again' : 'Run the demo'} to see the live result stream.
      </div>
    </section>
  )
}
