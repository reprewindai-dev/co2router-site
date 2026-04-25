'use client'

import { useState } from 'react'

type DemoRouteResponse = {
  run_id: string
  scenario: string
  lanes: Array<{
    lane: 'prod' | 'staging' | 'experiments' | 'overline' | 'needs_two_keys'
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

const LANE_ORDER: Array<DemoRouteResponse['lanes'][number]['lane']> = [
  'prod',
  'staging',
  'experiments',
  'overline',
  'needs_two_keys',
]

const LANE_LABELS: Record<DemoRouteResponse['lanes'][number]['lane'], string> = {
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
    reasons: ['Running sample job through the MVP sandbox.'],
    hard_stops_triggered: [],
    override_required: false,
    decision_id: null,
    latency_ms: null,
  })),
}

export function CicdWorkloadDemo() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoRouteResponse | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setError(cause instanceof Error ? cause.message : 'Failed to run demo workload')
      setResult(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const lanes = result?.lanes ?? LOADING_PLACEHOLDER.lanes

  return (
    <section className="rounded-[32px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(2,8,23,0.88),rgba(15,23,42,0.82))] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
          Make it or break it demo
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          Run the sample job and watch the five-lane proof stream.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          The UI sends one sample CI/CD job into the MVP sandbox. The MVP runs five contexts
          against the real engine, normalizes the result, and the cards below render exactly what
          came back. No fake generator. No direct engine access from the browser.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">sandbox input</div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Scenario</div>
            <div className="mt-2 text-lg font-semibold text-white">{SAMPLE_SCENARIO}</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The frontend sends one sample workload. The MVP fans it out into five internal
              decision lanes and returns normalized results for the cards.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Running sample job...' : 'Run the sample job'}
          </button>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs leading-6 text-slate-300">
            Demo endpoint: <span className="text-cyan-200">POST /api/demo/route</span>
            <br />
            MVP endpoint: <span className="text-cyan-200">POST /api/v1/sandbox/run</span>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </form>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">sample run</div>
              <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                {result ? result.run_id : 'waiting for sample job'}
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              {isSubmitting ? 'running' : result ? 'complete' : 'idle'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">scenario</div>
              <div className="mt-2 text-sm font-semibold text-white">{result?.scenario ?? SAMPLE_SCENARIO}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">lanes</div>
              <div className="mt-2 text-sm font-semibold text-white">{lanes.length} internal decisions</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {lanes.map((lane) => (
              <article key={lane.lane} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{lane.label}</div>
                    <h3 className="mt-2 text-lg font-bold text-white">{lane.region ?? 'pending'}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    {isSubmitting ? 'running...' : lane.outcome}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Decision ID</span>
                    <span className="font-mono text-xs text-slate-200">{lane.decision_id ?? 'pending'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Latency</span>
                    <span>{lane.latency_ms != null ? `${lane.latency_ms} ms` : 'pending'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Scheduled</span>
                    <span>{lane.scheduled_time ?? 'none'}</span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                  {(lane.reasons.length > 0 ? lane.reasons : ['Waiting on the sample run.']).slice(0, 2).map((reason) => (
                    <li key={reason} className="rounded-xl border border-white/8 bg-slate-950/55 px-3 py-2">
                      {reason}
                    </li>
                  ))}
                </ul>

                {lane.hard_stops_triggered.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    Hard stops: {lane.hard_stops_triggered.join(', ')}
                  </div>
                ) : null}

                {lane.override_required ? (
                  <div className="mt-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-100">
                    Override required
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
            The browser only ever hits the public demo route. That route calls the MVP sandbox.
            The MVP fans out to the engine and sends back normalized lane results for display.
          </div>
        </div>
      </div>
    </section>
  )
}
