'use client'

import { useMemo, useState } from 'react'

import { ecobeApi, type GreenRoutingRequest } from '@/lib/api'
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
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoResult | null>(null)

  async function runDemo() {
    setError(null)
    setIsRunning(true)

    try {
      const response = await ecobeApi.routeGreen(SAMPLE_REQUEST)
      setResult(response)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to run live routing decision')
    } finally {
      setIsRunning(false)
    }
  }

  const headline = useMemo(() => {
    if (!result) return 'No live result loaded yet.'
    if (isPolicyDelay(result)) return 'Live policy delay returned.'
    return 'Live route returned.'
  }, [result])

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Live sandbox</div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          Run the broker-backed decision.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          This demo executes a real routing request through the brokered engine API. It does not
          prefill the page with invented results or staged lane states.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={runDemo}
          disabled={isRunning}
          className="h-12 rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRunning ? 'Running live decision...' : result ? 'Run again' : 'Run live demo'}
        </button>
        <span className="text-sm text-slate-400">{headline}</span>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
                  Decision outcome
                </div>
                <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">
                  {isPolicyDelay(result) ? 'Delay' : result.selectedRegion}
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                {isPolicyDelay(result) ? 'policy hold' : result.qualityTier}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {!isPolicyDelay(result) ? (
                <>
                  <Metric label="Carbon intensity" value={`${result.carbonIntensity} gCO2/kWh`} />
                  <Metric label="Latency" value={formatLatency(result.estimatedLatency)} />
                  <Metric label="Confidence" value={result.assurance?.confidenceLabel ?? 'n/a'} />
                  <Metric label="Lease" value={result.lease_id ?? 'n/a'} />
                </>
              ) : (
                <>
                  <Metric label="Retry after" value={`${result.retryAfterMinutes} min`} />
                  <Metric
                    label="Current best"
                    value={`${result.currentBest.region} / ${result.currentBest.carbonIntensity} gCO2/kWh`}
                  />
                  <Metric label="Policy" value={result.policy.requireGreenRouting ? 'green routing required' : 'policy hold'} />
                  <Metric label="Message" value={result.message} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Live proof</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <div>
                Decision frame:{' '}
                <span className="font-mono text-white">
                  {isPolicyDelay(result) ? 'policy-delay' : result.decisionFrameId ?? 'n/a'}
                </span>
              </div>
              <div>
                Source:{' '}
                <span className="font-mono text-white">
                  {isPolicyDelay(result) ? 'policy gate' : result.source_used ?? 'n/a'}
                </span>
              </div>
              <div>
                Fallback used:{' '}
                <span className="font-mono text-white">
                  {isPolicyDelay(result) ? 'n/a' : result.fallback_used ? 'yes' : 'no'}
                </span>
              </div>
              <div>
                Explanation:{' '}
                <span className="text-white">{isPolicyDelay(result) ? result.message : result.explanation}</span>
              </div>
            </div>

            {!isPolicyDelay(result) && result.alternatives.length ? (
              <div className="mt-6 space-y-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Alternatives
                </div>
                {result.alternatives.slice(0, 3).map((item) => (
                  <div
                    key={item.region}
                    className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"
                  >
                    {item.region} — {item.carbonIntensity} gCO2/kWh
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-[28px] border border-dashed border-white/12 bg-slate-950/45 p-6 text-sm leading-7 text-slate-300">
          The live sandbox is idle. Click the button to fetch a real decision from the broker.
        </div>
      )}
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
