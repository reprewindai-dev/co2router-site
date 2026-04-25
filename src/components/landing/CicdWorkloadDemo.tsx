'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { ecobeApi, type GreenRoutingRequest } from '@/lib/api'
import { DecisionCard } from '@/components/landing/DecisionCard'
import { decisionExamples } from '@/lib/demo-data'
import type { GreenRoutingResult, PolicyDelayResponse } from '@/types'

const SAMPLE_REQUEST: GreenRoutingRequest = {
  preferredRegions: ['us-east-1', 'eu-west-1', 'eu-central-1'],
  maxCarbonGPerKwh: 400,
  carbonWeight: 0.5,
  latencyWeight: 0.2,
  costWeight: 0.3,
  mode: 'assurance',
  policyMode: 'sec_disclosure_strict',
}

type DemoResult = GreenRoutingResult | PolicyDelayResponse

function isPolicyDelay(result: DemoResult): result is PolicyDelayResponse {
  return 'action' in result && result.action === 'delay'
}

function formatLatency(value: number | undefined | null) {
  if (value == null) return 'n/a'
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(2)}s`
}

export function CicdWorkloadDemo() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadMs, setLoadMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoResult | null>(null)

  useEffect(() => {
    let isMounted = true

    async function runLiveDecision() {
      const startedAt = performance.now()

      try {
        const response = await ecobeApi.routeGreen(SAMPLE_REQUEST)
        if (!isMounted) return
        setResult(response)
        setLoadMs(Math.round(performance.now() - startedAt))
      } catch (cause) {
        if (!isMounted) return
        setError(cause instanceof Error ? cause.message : 'Failed to fetch live routing decision')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void runLiveDecision()

    return () => {
      isMounted = false
    }
  }, [])

  const liveSummary = useMemo(() => {
    if (error) return 'Live broker unavailable'
    if (isLoading) return 'Fetching live decision...'
    if (!result) return 'Live demo idle'
    if (isPolicyDelay(result)) {
      return `${result.action === 'delay' ? 'Delayed' : 'Live policy result'} • ${result.retryAfterMinutes} min retry`
    }
    return `${result.selectedRegion} • ${result.carbonIntensity} gCO2/kWh • ${formatLatency(result.estimatedLatency)}`
  }, [error, isLoading, result])

  return (
    <section id="demo" className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Live decision panel</div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          One job. Different conditions. Different outcomes.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          The panel loads a live broker result automatically, then shows the same job under
          different execution conditions.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
          <div className="space-y-1 text-sm text-slate-300">
            <p>
              Job: <span className="font-semibold text-white">Payment Service Deployment</span>
            </p>
            <p>
              Environment:{' '}
              <span className="font-semibold text-white">Production / Staging / Experiment</span>
            </p>
            <p>
              Policy: <span className="font-semibold text-white">Active</span>
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <span className="font-semibold text-white">Live:</span> {liveSummary}
          </div>

          {result && !isPolicyDelay(result) ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric label="Decision time" value={loadMs ? `${loadMs} ms` : 'n/a'} />
              <Metric label="Selected region" value={result.selectedRegion} />
              <Metric label="Carbon intensity" value={`${result.carbonIntensity} gCO2/kWh`} />
              <Metric label="Confidence" value={result.assurance?.confidenceLabel ?? result.qualityTier} />
            </div>
          ) : null}

          {result && isPolicyDelay(result) ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric label="Decision time" value={loadMs ? `${loadMs} ms` : 'n/a'} />
              <Metric label="Retry after" value={`${result.retryAfterMinutes} min`} />
              <Metric label="Current best" value={`${result.currentBest.region} / ${result.currentBest.carbonIntensity} gCO2/kWh`} />
              <Metric label="Policy" value={result.policy.requireGreenRouting ? 'green routing required' : 'policy hold'} />
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {decisionExamples.map((decision) => (
              <DecisionCard key={decision.label} {...decision} />
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">What you see</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>Production runs now because it meets policy.</p>
              <p>Staging is delayed because it is lower priority.</p>
              <p>Experiment is blocked because policy rejects it.</p>
              <p>Over limit is blocked because the thresholds are exceeded.</p>
              <p>Approval is waiting because a human must approve it.</p>
            </div>
          </div>

          {error ? (
            <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/access"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/40"
            >
              Try your own scenario
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-105"
            >
              Get early access
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">{value}</div>
    </div>
  )
}
