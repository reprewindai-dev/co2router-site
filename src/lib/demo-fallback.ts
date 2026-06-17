/**
 * Demo Fallback — provides realistic computed demo responses when the
 * real engine backend (co2router.tech / ecobe-mvp) is unreachable.
 *
 * This ensures co2router.com stays functional even when the engine is
 * temporarily unavailable. Responses are clearly marked with
 * `fallback_used: true` and `syntheticFlag: true`.
 */

import type { GreenRoutingResult } from '@/types'

interface RegionData {
  region: string
  carbonBase: number
  variance: number
  latency: number
  renewable: number
  balancingAuthority: string
}

const REGION_DATA: RegionData[] = [
  { region: 'ca-central-1', carbonBase: 14, variance: 8, latency: 45, renewable: 97, balancingAuthority: 'IESO' },
  { region: 'us-west-2', carbonBase: 82, variance: 30, latency: 35, renewable: 91, balancingAuthority: 'BPA' },
  { region: 'eu-west-1', carbonBase: 205, variance: 80, latency: 85, renewable: 72, balancingAuthority: 'EirGrid' },
  { region: 'us-east-1', carbonBase: 110, variance: 50, latency: 25, renewable: 54, balancingAuthority: 'PJM' },
  { region: 'us-east-2', carbonBase: 128, variance: 40, latency: 30, renewable: 48, balancingAuthority: 'PJM' },
  { region: 'eu-central-1', carbonBase: 280, variance: 90, latency: 90, renewable: 62, balancingAuthority: 'TenneT' },
  { region: 'ap-southeast-1', carbonBase: 480, variance: 60, latency: 180, renewable: 12, balancingAuthority: 'EMA' },
  { region: 'ap-northeast-1', carbonBase: 390, variance: 70, latency: 150, renewable: 28, balancingAuthority: 'TEPCO' },
]

function jitter(base: number, variance: number): number {
  return Math.max(1, Math.round(base + (Math.random() - 0.5) * variance))
}

function scoreRegion(carbon: number, latency: number, weights: { carbon: number; latency: number; cost: number }): number {
  const maxCarbon = 600
  const maxLatency = 200
  const carbonScore = 1 - carbon / maxCarbon
  const latencyScore = 1 - latency / maxLatency
  const costScore = 0.8
  return Number(
    (carbonScore * weights.carbon + latencyScore * weights.latency + costScore * weights.cost).toFixed(4)
  )
}

export function buildFallbackDecision(
  preferredRegions: string[],
  weights: { carbon: number; latency: number; cost: number } = { carbon: 0.6, latency: 0.25, cost: 0.15 }
): GreenRoutingResult {
  const candidates = REGION_DATA.filter(
    (r) => preferredRegions.length === 0 || preferredRegions.includes(r.region)
  )

  const scored = candidates.map((r) => {
    const carbon = jitter(r.carbonBase, r.variance)
    const latency = jitter(r.latency, 10)
    return {
      ...r,
      carbon,
      latency,
      score: scoreRegion(carbon, latency, weights),
    }
  })

  scored.sort((a, b) => b.score - a.score)

  const best = scored[0] ?? {
    region: 'us-east-1',
    carbon: 110,
    latency: 25,
    score: 0.72,
    balancingAuthority: 'PJM',
    renewable: 54,
  }

  const alternatives = scored.slice(1).map((r) => ({
    region: r.region,
    carbonIntensity: r.carbon,
    score: r.score,
    reason: r.carbon > best.carbon ? 'Higher carbon intensity' : 'Lower composite score',
  }))

  const qualityTier = best.score >= 0.7 ? 'high' : best.score >= 0.4 ? 'medium' : 'low'

  const baselineCarbon = scored.reduce((sum, r) => sum + r.carbon, 0) / scored.length

  return {
    selectedRegion: best.region,
    carbonIntensity: best.carbon,
    estimatedLatency: best.latency,
    score: best.score,
    mode: 'optimize',
    policyMode: 'default',
    qualityTier,
    explanation: `Demo: Routed to ${best.region} (${best.carbon} gCO₂/kWh, ${best.renewable}% renewable). Fallback response — engine temporarily unavailable.`,
    carbon_delta_g_per_kwh: Math.round(baselineCarbon - best.carbon),
    forecast_stability: 'stable',
    provider_disagreement: { flag: false, pct: null },
    alternatives,
    forecastAvailable: false,
    confidenceBand: { low: best.carbon * 0.85, mid: best.carbon, high: best.carbon * 1.15, empirical: false },
    dataResolutionMinutes: 5,
    predicted_clean_window: null,
    balancingAuthority: best.balancingAuthority,
    demandRampPct: Number((Math.random() * 8 - 2).toFixed(1)),
    carbonSpikeProbability: Number((Math.random() * 0.15).toFixed(3)),
    curtailmentProbability: Number((Math.random() * 0.1).toFixed(3)),
    importCarbonLeakageScore: Number((Math.random() * 0.3).toFixed(3)),
    estimatedFlag: false,
    syntheticFlag: true,
    source_used: 'demo-fallback',
    validation_source: null,
    fallback_used: true,
    weights,
  }
}
