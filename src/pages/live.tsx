import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, BadgeCheck, RefreshCcw } from 'lucide-react'

import { PublicSiteShell } from '@/components/public/PublicSiteShell'

type DemoResponse = Record<string, unknown> & {
  job_id?: string
  jobId?: string
  timestamp?: string
  carbon_value?: number | string
  carbonValue?: number | string
  carbon_intensity?: number | string
  carbonIntensity?: number | string
  action?: string
  decision?: string
  proof_id?: string
  proofId?: string
  proof_hash?: string
  proofHash?: string
}

type FeedStatus = 'RUN' | 'DEFER'

type FeedRow = {
  label: string
  value: string
  time: string
}

type LiveRun = {
  id: string
  jobId: string
  timestamp: string
  status: FeedStatus
  carbonValue: string
  action: string
  proofId: string
  rows: FeedRow[]
  error?: string
}

const MAX_RUNS = 16

function createJobId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `demo-${crypto.randomUUID()}`
  }
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function readFirstString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return 'unavailable'
}

function normalizeStatus(action: string) {
  const normalized = action.trim().toLowerCase()
  return normalized === 'run_now' || normalized === 'run' || normalized === 'execute' ? 'RUN' : 'DEFER'
}

async function postDemoDecision(job: { job_id: string; timestamp: string; workload_type: 'demo' }) {
  const response = await fetch('/api/decision', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(job),
  })

  const text = await response.text()
  let payload: DemoResponse = {}

  if (text.trim().length > 0) {
    try {
      payload = JSON.parse(text) as DemoResponse
    } catch {
      payload = {}
    }
  }

  if (!response.ok) {
    const detail =
      readFirstString(payload.error, payload.message, payload.detail) !== 'unavailable'
        ? readFirstString(payload.error, payload.message, payload.detail)
        : `Request failed (${response.status})`
    throw new Error(detail)
  }

  return payload
}

function buildRun(job: { job_id: string; timestamp: string }, response: DemoResponse | null, error?: string): LiveRun {
  const action = readFirstString(response?.action, response?.decision)
  const carbonValue = readFirstString(
    response?.carbon_value,
    response?.carbonValue,
    response?.carbon_intensity,
    response?.carbonIntensity,
  )
  const proofId = readFirstString(
    response?.proof_id,
    response?.proofId,
    response?.proof_hash,
    response?.proofHash,
  )
  const status = error ? 'DEFER' : normalizeStatus(action)
  const time = formatTime(job.timestamp)

  return {
    id: `${job.job_id}-${job.timestamp}`,
    jobId: job.job_id,
    timestamp: job.timestamp,
    status,
    carbonValue,
    action,
    proofId,
    error,
    rows: [
      { label: 'job triggered', value: job.job_id, time },
      { label: 'carbon_value', value: carbonValue, time },
      { label: 'action', value: action, time },
      { label: 'proof_id', value: proofId, time },
    ],
  }
}

export default function LivePage() {
  const [runs, setRuns] = useState<LiveRun[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const feedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      const job = {
        job_id: createJobId(),
        timestamp: new Date().toISOString(),
        workload_type: 'demo' as const,
      }

      try {
        const response = await postDemoDecision(job)
        if (cancelled) return
        setIsConnected(true)
        setRuns((current) => [...current, buildRun(job, response)].slice(-MAX_RUNS))
      } catch (error) {
        if (cancelled) return
        setIsConnected(false)
        setRuns((current) =>
          [...current, buildRun(job, null, error instanceof Error ? error.message : 'Backend unavailable')].slice(-MAX_RUNS),
        )
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(tick, 3000)
        }
      }
    }

    void tick()

    return () => {
      cancelled = true
      if (typeof timer === 'number') {
        window.clearTimeout(timer)
      }
    }
  }, [])

  useEffect(() => {
    const node = feedRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [runs])

  const latestRun = runs[runs.length - 1] ?? null
  const statusTone = useMemo(
    () => ({
      RUN: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
      DEFER: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    }),
    [],
  )

  return (
    <PublicSiteShell>
      <Head>
        <title>CO2 Router Live Demo</title>
        <meta
          name="description"
          content="A sandbox-only live demo that posts demo jobs to ecobe-mvp every three seconds and renders the real decision response."
        />
      </Head>

      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.92),rgba(3,8,20,0.98))] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Live demo</div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
                A real-moving decision stream, powered by ecobe-mvp.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                Every 3 seconds the page generates a sandbox demo job, posts it to the local
                backend route, and renders the decision response as a live feed. No fake decision
                generator. No private customer data.
              </p>
            </div>

            <div className="min-w-[280px] rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] ${
                    isConnected ? statusTone.RUN : statusTone.DEFER
                  }`}
                >
                  {isConnected ? 'RUN' : 'DEFER'}
                </span>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Activity className="h-4 w-4 text-cyan-200" />
                  ecobe-mvp connected
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
                  <span className="text-slate-400">Endpoint</span>
                  <span className="font-mono text-slate-100">POST /api/decision</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
                  <span className="text-slate-400">Mode</span>
                  <span className="font-mono text-slate-100">sandbox/demo</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
                  <span className="text-slate-400">Cadence</span>
                  <span className="font-mono text-slate-100">3s</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Decision feed</div>
                <div className="mt-1 text-sm text-slate-300">
                  Latest response appears at the bottom and the feed stays scrolled to the live edge.
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCcw className="h-4 w-4" />
                updates every 3s
              </div>
            </div>

            <div
              ref={feedRef}
              className="mt-4 h-[560px] overflow-y-auto pr-2"
              aria-live="polite"
              aria-label="Live decision feed"
            >
              <div className="space-y-3">
                {runs.length > 0 ? (
                  runs.map((run) => (
                    <article
                      key={run.id}
                      className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                            {formatTime(run.timestamp)} job
                          </div>
                          <div className="mt-1 text-base font-semibold text-white">{run.jobId}</div>
                        </div>
                        <div
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] ${
                            run.status === 'RUN' ? statusTone.RUN : statusTone.DEFER
                          }`}
                        >
                          {run.status}
                        </div>
                      </div>

                      {run.error ? (
                        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
                          {run.error}
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        {run.rows.map((row) => (
                          <div
                            key={`${run.id}-${row.label}`}
                            className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                          >
                            <span className="min-w-[84px] text-[11px] uppercase tracking-[0.22em] text-slate-500">
                              [{row.time}]
                            </span>
                            <div className="flex-1">
                              <div className="text-sm text-slate-100">{row.label}</div>
                              <div className="mt-1 font-mono text-sm text-cyan-100">{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
                    Waiting for the first sandbox job to resolve from ecobe-mvp.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Live summary</div>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Latest status" value={latestRun?.status ?? 'waiting'} />
                <SummaryRow label="Carbon value" value={latestRun?.carbonValue ?? 'unavailable'} />
                <SummaryRow label="Action" value={latestRun?.action ?? 'unavailable'} />
                <SummaryRow label="Proof ID" value={latestRun?.proofId ?? 'unavailable'} />
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan-300/15 bg-cyan-300/8 p-6">
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Safety boundary</div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
                <p>Sandbox/demo only.</p>
                <p>No direct ecobe-engine-claude access.</p>
                <p>No private customer data.</p>
                <p>Real backend decision flow via ecobe-mvp.</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Need the offer</div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The live demo proves the product. The pricing page frames the commercial package.
              </p>
              <Link
                href="/pricing"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                View pricing
                <BadgeCheck className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </PublicSiteShell>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate font-mono text-slate-100">{value}</span>
    </div>
  )
}
