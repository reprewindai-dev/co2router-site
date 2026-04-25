'use client'

import { useMemo, useState, type FormEvent } from 'react'

type DemoLane = 'prod' | 'staging' | 'experiments' | 'overline' | 'needs_two_keys'

type DemoOutcome = 'run_now' | 'run_later' | 'rejected' | 'needs_override'

type DemoRouteResponse = {
  run_id: string
  scenario: string
  lanes: Array<{
    lane: DemoLane
    label: string
    outcome: DemoOutcome
    region: string | null
    scheduled_time: string | null
    reasons: string[]
    hard_stops_triggered: string[]
    override_required: boolean
    decision_id: string | null
    latency_ms: number | null
  }>
}

type CardState = 'idle' | 'loading' | 'result'

const SAMPLE_SCENARIO = 'nightly_analytics_batch'

const LANE_ORDER: DemoLane[] = ['prod', 'staging', 'experiments', 'overline', 'needs_two_keys']

const LANE_COPY: Record<DemoLane, { title: string; idle: string; pending: string }> = {
  prod: {
    title: 'Production',
    idle: 'Ready to check production rules.',
    pending: 'Checking production rules.',
  },
  staging: {
    title: 'Staging',
    idle: 'Ready to compare placement.',
    pending: 'Comparing placement.',
  },
  experiments: {
    title: 'Experiment',
    idle: 'Ready to test the edge.',
    pending: 'Testing the edge.',
  },
  overline: {
    title: 'Over limit',
    idle: 'Ready to test the limit.',
    pending: 'Testing the limit.',
  },
  needs_two_keys: {
    title: 'Approval',
    idle: 'Ready to check approval.',
    pending: 'Checking approval.',
  },
}

const IDLE_LANES = LANE_ORDER.map((lane) => ({
  lane,
  label: LANE_COPY[lane].title,
  outcome: 'run_now' as DemoOutcome,
  region: null,
  scheduled_time: null,
  reasons: [LANE_COPY[lane].idle],
  hard_stops_triggered: [],
  override_required: false,
  decision_id: null,
  latency_ms: null,
}))

function shortId(value: string | null) {
  if (!value) return 'pending'
  if (value.length <= 10) return value
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function formatLatency(value: number | null) {
  if (value === null) return 'pending'
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(2)}s`
}

function outcomeLabel(lane: DemoLane, outcome: DemoOutcome, state: CardState) {
  if (state === 'idle') return 'Ready'
  if (state === 'loading') return 'Running'
  if (outcome === 'run_later') return 'Delayed'
  if (outcome === 'rejected') return 'Blocked'
  if (outcome === 'needs_override') return 'Waiting'
  if (lane === 'staging') return 'Runs elsewhere'
  if (lane === 'experiments') return 'Runs with limits'
  return 'Runs now'
}

function outcomeClass(label: string) {
  if (label === 'Blocked') return 'border-[#ff6b6b]/40 bg-[#ff6b6b]/12 text-[#ffd7d7]'
  if (label === 'Delayed') return 'border-[#f7c35f]/40 bg-[#f7c35f]/12 text-[#ffe3a3]'
  if (label === 'Waiting') return 'border-[#caa7ff]/40 bg-[#caa7ff]/12 text-[#eadcff]'
  if (label === 'Runs elsewhere') return 'border-[#68d8d6]/40 bg-[#68d8d6]/12 text-[#d8fffd]'
  if (label === 'Running') return 'border-[#f4f0e8]/20 bg-[#f4f0e8]/10 text-[#f4f0e8]'
  return 'border-[#9be870]/40 bg-[#9be870]/12 text-[#e4ffd8]'
}

function reasonForCard(lane: DemoRouteResponse['lanes'][number], state: CardState) {
  if (state === 'idle') return LANE_COPY[lane.lane].idle
  if (state === 'loading') return LANE_COPY[lane.lane].pending
  return lane.reasons[0] ?? 'Handled by the run.'
}

export function CicdWorkloadDemo() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoRouteResponse | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  const cardState: CardState = isSubmitting ? 'loading' : result ? 'result' : 'idle'
  const lanes = isSubmitting || !result ? IDLE_LANES : result.lanes
  const latestDecision = useMemo(() => result?.lanes.find((lane) => lane.decision_id) ?? null, [result])
  const latestLatency = useMemo(() => {
    const values = result?.lanes
      .map((lane) => lane.latency_ms)
      .filter((value): value is number => typeof value === 'number')
    if (!values?.length) return null
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [result])

  return (
    <main className="min-h-screen bg-[#050505] text-[#f4f0e8]">
      <section className="mx-auto grid min-h-[92vh] w-full max-w-[1600px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.48fr_0.52fr] lg:items-center lg:px-12 xl:px-16">
        <div className="max-w-[620px]">
          <div className="mb-16 flex items-center gap-3 text-sm font-semibold text-[#f4f0e8]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9be870]" />
            CO2Router
          </div>

          <h1 className="text-[clamp(3rem,7vw,7.5rem)] font-black leading-[0.9] text-[#f4f0e8]">
            Decide if your jobs run {'\u2014'} before they run
          </h1>

          <p className="mt-8 max-w-md text-xl leading-8 text-[#c9c3b8]">
            Run a job. See what happens.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-wrap items-center gap-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 rounded-lg bg-[#f4f0e8] px-7 text-base font-bold text-[#050505] transition duration-200 hover:bg-[#9be870] focus:outline-none focus:ring-4 focus:ring-[#9be870]/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Running...' : 'Run the demo'}
            </button>
            <span className="text-sm text-[#938c80]">No setup. Takes 2 seconds.</span>
          </form>

          {error ? (
            <div className="mt-6 max-w-xl rounded-lg border border-[#ff6b6b]/35 bg-[#ff6b6b]/10 px-4 py-3 text-sm leading-6 text-[#ffd7d7]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-10 hidden h-[72%] w-px bg-[#f4f0e8]/10 lg:block" />

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-[#f4f0e8]">Live job run</div>
            <div className="rounded-lg border border-[#f4f0e8]/12 px-3 py-1.5 text-xs text-[#c9c3b8]">
              Sandbox mode
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {lanes.map((lane, index) => {
              const label = outcomeLabel(lane.lane, lane.outcome, cardState)
              const reason = reasonForCard(lane, cardState)

              return (
                <article
                  key={`${lane.lane}-${cardState}-${result?.run_id ?? 'idle'}`}
                  className={`${cardState === 'idle' ? '' : 'co2-demo-card'} min-h-[288px] rounded-lg border p-3 transition duration-300 ${
                    cardState === 'idle'
                      ? 'border-[#f4f0e8]/18 bg-[#f4f0e8]/[0.055] opacity-90'
                      : 'border-[#f4f0e8]/14 bg-[#14110d]'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex min-h-[264px] flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold text-[#f4f0e8]">{LANE_COPY[lane.lane].title}</span>
                        <span className="h-2 w-2 rounded-full bg-[#9be870]" />
                      </div>

                      <div className={`mt-5 rounded-lg border px-2.5 py-2 text-base font-black leading-6 ${outcomeClass(label)}`}>
                        {label}
                      </div>

                      <p className="mt-4 min-h-[104px] text-[13px] leading-5 text-[#c9c3b8]">{reason}</p>
                    </div>

                    <div className="space-y-2 border-t border-[#f4f0e8]/10 pt-4 text-xs text-[#938c80]">
                      <div className="space-y-1">
                        <span>Decision ID</span>
                        <div className="font-mono text-[#f4f0e8]">{shortId(lane.decision_id)}</div>
                      </div>
                      <div className="space-y-1">
                        <span>Latency</span>
                        <div className="font-mono text-[#f4f0e8]">{formatLatency(lane.latency_ms)}</div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[#f4f0e8]/10 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-black text-[#f4f0e8]">What just happened</h2>
          </div>
          <div className="max-w-3xl text-2xl leading-10 text-[#c9c3b8]">
            <p>You ran one job.</p>
            <p>It was handled differently depending on the situation.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#f4f0e8]/10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1500px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['CI pipelines', 'Jobs', 'Automation', 'Anything that runs'].map((item) => (
            <div key={item} className="rounded-lg border border-[#f4f0e8]/10 px-4 py-4 text-lg font-semibold text-[#f4f0e8]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#f4f0e8]/10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 text-sm text-[#c9c3b8]">
          <span className="rounded-lg border border-[#f4f0e8]/10 px-3 py-2">
            Decision ID: <span className="font-mono text-[#f4f0e8]">{shortId(latestDecision?.decision_id ?? null)}</span>
          </span>
          <span className="rounded-lg border border-[#f4f0e8]/10 px-3 py-2">
            Decided in: <span className="font-mono text-[#f4f0e8]">{formatLatency(latestLatency)}</span>
          </span>
          <span className="rounded-lg border border-[#f4f0e8]/10 px-3 py-2">Sandbox mode</span>
          <a
            href="https://co2router.tech"
            className="ml-auto rounded-lg border border-[#f4f0e8]/10 px-3 py-2 text-[#f4f0e8] transition hover:border-[#9be870]/50 hover:text-[#9be870]"
          >
            Technical details
          </a>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-6">
          <div className="text-4xl font-black text-[#f4f0e8]">Try it yourself</div>
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 rounded-lg bg-[#9be870] px-7 text-base font-bold text-[#050505] transition duration-200 hover:bg-[#f4f0e8] focus:outline-none focus:ring-4 focus:ring-[#9be870]/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Running...' : 'Run the demo again'}
            </button>
          </form>
        </div>
      </section>

      <style jsx global>{`
        @keyframes co2-demo-card-in {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .co2-demo-card {
          animation: co2-demo-card-in 420ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .co2-demo-card {
            animation: none;
          }
        }
      `}</style>
    </main>
  )
}
