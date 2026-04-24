'use client'

import { useState } from 'react'

type WorkloadType = 'build' | 'test'

type DemoRouteResponse = {
  workloadType: 'build' | 'test' | 'batch' | 'inference' | 'etl'
  baselineRegion: string
  baselineCarbonIntensity: number
  baselineEstimatedCost: number
  selectedRegion: string
  selectedCarbonIntensity: number
  selectedEstimatedCost: number
  carbonSavingsPct: number
  costSavingsPct: number
  recommendedDelaySeconds: number
  recommendedDelayWindow: { startTime: string; endTime: string } | null
  confidence: number
  explanation: string
  policyMode: 'optimize'
  providers: {
    sourceUsed: string | null
    validationSource: string | null
    fallbackUsed: boolean
    qualityTier: 'high' | 'medium' | 'low'
  }
  alternatives: Array<{
    region: string
    carbonIntensity: number
    estimatedCost: number
    score: number
  }>
  decisionId: string | null
  generatedAt: string
}

const DEFAULT_REGIONS = 'us-east-1, us-west-2, eu-west-1'

function parseRegions(value: string) {
  return value
    .split(',')
    .map((region) => region.trim())
    .filter(Boolean)
}

function formatMinutes(seconds: number) {
  if (seconds <= 0) return 'run now'
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `delay ${minutes} min`
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

export function CicdWorkloadDemo() {
  const [workloadType, setWorkloadType] = useState<WorkloadType>('build')
  const [candidateRegions, setCandidateRegions] = useState(DEFAULT_REGIONS)
  const [baselineRegion, setBaselineRegion] = useState('us-east-1')
  const [canDelay, setCanDelay] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoRouteResponse | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
          workloadType,
          candidateRegions: parseRegions(candidateRegions),
          baselineRegion: baselineRegion.trim() || undefined,
          canDelay,
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

  return (
    <section className="rounded-[32px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(2,8,23,0.88),rgba(15,23,42,0.82))] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
          Make it or break it demo
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          Submit one workload and watch the engine decide.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          This is the make it or break it demo wedge. Pick a CI/CD workload, choose the candidate
          regions, and CO2 Router returns the decision, the recommended delay window, and the
          proof-backed explanation from the live routing path.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">workload input</div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              CI/CD workload
              <select
                value={workloadType}
                onChange={(event) => setWorkloadType(event.target.value as WorkloadType)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none ring-0 transition focus:border-cyan-300/30"
              >
                <option value="build">Build pipeline</option>
                <option value="test">Test matrix</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-slate-300">
              Candidate regions
              <input
                value={candidateRegions}
                onChange={(event) => setCandidateRegions(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none ring-0 transition focus:border-cyan-300/30"
                placeholder="us-east-1, us-west-2, eu-west-1"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-300">
              Baseline region
              <input
                value={baselineRegion}
                onChange={(event) => setBaselineRegion(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none ring-0 transition focus:border-cyan-300/30"
                placeholder="us-east-1"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              <span>Allow delay recommendation</span>
              <input
                type="checkbox"
                checked={canDelay}
                onChange={(event) => setCanDelay(event.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Running engine...' : 'Run workload'}
          </button>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </form>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">engine result</div>
              <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                {result ? result.selectedRegion : 'waiting for submission'}
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              {result ? (result.recommendedDelaySeconds > 0 ? 'defer' : 'run now') : 'idle'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Decision" value={result ? formatMinutes(result.recommendedDelaySeconds) : 'submit workload'} />
            <Metric label="Selected carbon" value={result ? `${result.selectedCarbonIntensity.toFixed(1)} gCO2/kWh` : 'waiting'} />
            <Metric label="Carbon savings" value={result ? `${result.carbonSavingsPct.toFixed(1)}%` : 'waiting'} />
            <Metric label="Confidence" value={result ? `${(result.confidence * 100).toFixed(0)}%` : 'waiting'} />
            <Metric label="Quality tier" value={result ? result.providers.qualityTier.toUpperCase() : 'waiting'} />
            <Metric label="Decision ID" value={result?.decisionId ?? 'waiting'} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">why the engine chose it</div>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              {result
                ? result.explanation
                : 'Run a workload to see the engine-backed recommendation, the suggested delay window, and the proof-aware explanation.'}
            </p>
          </div>

          <div className="mt-5 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
            <div>Baseline: {result ? result.baselineRegion : baselineRegion}</div>
            <div>Policy mode: optimize</div>
            <div>Engine source: {result ? result.providers.sourceUsed ?? 'real routing' : 'real routing'}</div>
            <div>Validation: {result ? result.providers.validationSource ?? 'attached at runtime' : 'attached at runtime'}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-500">
        Real backend route: <span className="text-cyan-200">POST /api/demo/route</span>. No fake decision generator. CI/CD only.
      </div>
    </section>
  )
}
