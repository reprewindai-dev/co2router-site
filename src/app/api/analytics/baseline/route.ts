import { NextResponse } from 'next/server'

import { fetchEngineJson } from '@/lib/engine-fetch'

type BaselineDecision = Record<string, any>

const BASELINE_CACHE_TTL_MS = 5 * 60 * 1000
const DEFAULT_SAMPLE_RECORDS = 500
let baselineCache: { at: number; body: unknown } | null = null

function baselineCacheHeaders() {
  return {
    // Cache at the Vercel edge to prevent expensive recompute timeouts.
    'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
  }
}

function safeNumber(value: unknown) {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function pickTimestampMs(decision: BaselineDecision) {
  const raw =
    decision?.createdAt ??
    decision?.timestamp ??
    decision?.metadata?.response?.proofRecord?.timestamp ??
    decision?.metadata?.response?.decisionEnvelope?.timestamp ??
    decision?.decisionEnvelope?.timestamp ??
    decision?.decisionFrame?.request?.timestamp ??
    null
  if (!raw) return null
  const ms = Date.parse(String(raw))
  return Number.isFinite(ms) ? ms : null
}

function pickAction(decision: BaselineDecision) {
  const raw = String(decision?.action ?? decision?.decisionAction ?? 'run')
  return raw.toLowerCase()
}

function pickBaselineCarbonIntensity(decision: BaselineDecision) {
  return (
    safeNumber(decision?.baselineCarbonIntensity) ??
    safeNumber(decision?.baseline) ??
    safeNumber(decision?.proofEnvelope?.baseline?.carbonIntensity) ??
    safeNumber(decision?.decisionFrame?.baseline?.carbonIntensity) ??
    null
  )
}

function pickSelectedCarbonIntensity(decision: BaselineDecision) {
  return (
    safeNumber(decision?.carbonIntensity) ??
    safeNumber(decision?.selectedCarbonIntensity) ??
    safeNumber(decision?.proofEnvelope?.selected?.carbonIntensity) ??
    safeNumber(decision?.decisionFrame?.selected?.carbonIntensity) ??
    null
  )
}

function pickBaselineWaterLiters(decision: BaselineDecision) {
  return (
    safeNumber(decision?.waterBaselineLiters) ??
    safeNumber(decision?.proofEnvelope?.baseline?.waterImpactLiters) ??
    safeNumber(decision?.decisionFrame?.baseline?.waterImpactLiters) ??
    null
  )
}

function pickSelectedWaterLiters(decision: BaselineDecision) {
  return (
    safeNumber(decision?.waterImpactLiters) ??
    safeNumber(decision?.proofEnvelope?.selected?.waterImpactLiters) ??
    safeNumber(decision?.decisionFrame?.selected?.waterImpactLiters) ??
    null
  )
}

function pickBaselineWaterScarcity(decision: BaselineDecision) {
  return (
    safeNumber(decision?.decisionFrame?.waterBaselineScarcityImpact) ??
    safeNumber(decision?.proofEnvelope?.baseline?.waterScarcityImpact) ??
    safeNumber(decision?.decisionFrame?.baseline?.waterScarcityImpact) ??
    null
  )
}

function pickSelectedWaterScarcity(decision: BaselineDecision) {
  return (
    safeNumber(decision?.decisionFrame?.waterScarcityImpact) ??
    safeNumber(decision?.proofEnvelope?.selected?.waterScarcityImpact) ??
    safeNumber(decision?.decisionFrame?.selected?.waterScarcityImpact) ??
    null
  )
}

function pickEstimatedEnergyKwh(decision: BaselineDecision) {
  return (
    safeNumber(decision?.estimatedEnergyKwh) ??
    safeNumber(decision?.decisionEnvelope?.estimatedEnergyKwh) ??
    safeNumber(decision?.decisionFrame?.request?.estimatedEnergyKwh) ??
    safeNumber(decision?.telemetryBridge?.estimatedEnergyKwh) ??
    null
  )
}

function pickSelectedRegion(decision: BaselineDecision) {
  const raw = decision?.selectedRegion ?? decision?.decisionFrame?.selected?.region ?? null
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

function computeBaseline(decisions: BaselineDecision[]) {
  const actions = new Map<string, number>()
  const regionAgg = new Map<
    string,
    { decisions: number; carbonBaselineSum: number; carbonSelectedSum: number; carbonCount: number; waterBaselineSum: number; waterSelectedSum: number; waterCount: number }
  >()

  let minTs: number | null = null
  let maxTs: number | null = null

  let baselineCarbonSum = 0
  let selectedCarbonSum = 0
  let carbonCount = 0

  let baselineCarbonWeightedG = 0
  let selectedCarbonWeightedG = 0
  let carbonWeightedCount = 0

  let baselineWaterL = 0
  let selectedWaterL = 0
  let waterCount = 0

  let baselineScarcity = 0
  let selectedScarcity = 0
  let scarcityCount = 0

  for (const decision of decisions) {
    const action = pickAction(decision)
    actions.set(action, (actions.get(action) ?? 0) + 1)

    const ts = pickTimestampMs(decision)
    if (ts !== null) {
      minTs = minTs === null ? ts : Math.min(minTs, ts)
      maxTs = maxTs === null ? ts : Math.max(maxTs, ts)
    }

    const baselineCarbon = pickBaselineCarbonIntensity(decision)
    const selectedCarbon = pickSelectedCarbonIntensity(decision)
    if (baselineCarbon !== null && selectedCarbon !== null) {
      baselineCarbonSum += baselineCarbon
      selectedCarbonSum += selectedCarbon
      carbonCount += 1
    }

    const estimatedEnergyKwh = pickEstimatedEnergyKwh(decision)
    if (estimatedEnergyKwh !== null && baselineCarbon !== null && selectedCarbon !== null) {
      baselineCarbonWeightedG += baselineCarbon * estimatedEnergyKwh
      selectedCarbonWeightedG += selectedCarbon * estimatedEnergyKwh
      carbonWeightedCount += 1
    }

    const baselineWater = pickBaselineWaterLiters(decision)
    const selectedWater = pickSelectedWaterLiters(decision)
    if (baselineWater !== null && selectedWater !== null) {
      baselineWaterL += baselineWater
      selectedWaterL += selectedWater
      waterCount += 1
    }

    const region = pickSelectedRegion(decision)
    if (region) {
      const agg =
        regionAgg.get(region) ??
        {
          decisions: 0,
          carbonBaselineSum: 0,
          carbonSelectedSum: 0,
          carbonCount: 0,
          waterBaselineSum: 0,
          waterSelectedSum: 0,
          waterCount: 0,
        }
      agg.decisions += 1
      if (baselineCarbon !== null && selectedCarbon !== null) {
        agg.carbonBaselineSum += baselineCarbon
        agg.carbonSelectedSum += selectedCarbon
        agg.carbonCount += 1
      }
      if (baselineWater !== null && selectedWater !== null) {
        agg.waterBaselineSum += baselineWater
        agg.waterSelectedSum += selectedWater
        agg.waterCount += 1
      }
      regionAgg.set(region, agg)
    }

    const baselineWsi = pickBaselineWaterScarcity(decision)
    const selectedWsi = pickSelectedWaterScarcity(decision)
    if (baselineWsi !== null && selectedWsi !== null) {
      baselineScarcity += baselineWsi
      selectedScarcity += selectedWsi
      scarcityCount += 1
    }
  }

  const carbonAvoided = baselineCarbonSum - selectedCarbonSum
  const carbonAvoidedPct = baselineCarbonSum > 0 ? (carbonAvoided / baselineCarbonSum) * 100 : 0

  const carbonWeightedAvoidedG = baselineCarbonWeightedG - selectedCarbonWeightedG
  const carbonWeightedAvoidedPct =
    baselineCarbonWeightedG > 0 ? (carbonWeightedAvoidedG / baselineCarbonWeightedG) * 100 : 0

  const waterAvoided = baselineWaterL - selectedWaterL
  const waterAvoidedPct = baselineWaterL > 0 ? (waterAvoided / baselineWaterL) * 100 : 0

  const scarcityAvoided = baselineScarcity - selectedScarcity
  const scarcityAvoidedPct = baselineScarcity > 0 ? (scarcityAvoided / baselineScarcity) * 100 : 0

  return {
    sampleSize: decisions.length,
    window: {
      minTimestamp: minTs ? new Date(minTs).toISOString() : null,
      maxTimestamp: maxTs ? new Date(maxTs).toISOString() : null,
    },
    actions: Object.fromEntries(Array.from(actions.entries()).sort((a, b) => b[1] - a[1])),
    carbonIntensity: {
      count: carbonCount,
      baselineSum: baselineCarbonSum,
      selectedSum: selectedCarbonSum,
      avoided: carbonAvoided,
      avoidedPct: carbonAvoidedPct,
      baselineAvg: carbonCount ? baselineCarbonSum / carbonCount : null,
      selectedAvg: carbonCount ? selectedCarbonSum / carbonCount : null,
    },
    carbonWeightedByEnergy: {
      count: carbonWeightedCount,
      baselineG: baselineCarbonWeightedG,
      selectedG: selectedCarbonWeightedG,
      avoidedG: carbonWeightedAvoidedG,
      avoidedPct: carbonWeightedAvoidedPct,
    },
    waterLiters: {
      count: waterCount,
      baselineL: baselineWaterL,
      selectedL: selectedWaterL,
      avoidedL: waterAvoided,
      avoidedPct: waterAvoidedPct,
    },
    waterScarcity: {
      count: scarcityCount,
      baseline: baselineScarcity,
      selected: selectedScarcity,
      avoided: scarcityAvoided,
      avoidedPct: scarcityAvoidedPct,
    },
    byRegion: Array.from(regionAgg.entries())
      .map(([region, agg]) => ({
        region,
        decisions: agg.decisions,
        avgCarbonBaseline: agg.carbonCount ? agg.carbonBaselineSum / agg.carbonCount : null,
        avgCarbonSelected: agg.carbonCount ? agg.carbonSelectedSum / agg.carbonCount : null,
        avgWaterBaselineL: agg.waterCount ? agg.waterBaselineSum / agg.waterCount : null,
        avgWaterSelectedL: agg.waterCount ? agg.waterSelectedSum / agg.waterCount : null,
      }))
      .sort((a, b) => (b.decisions ?? 0) - (a.decisions ?? 0)),
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const refresh = url.searchParams.get('refresh') === '1'
  const now = Date.now()
  const requestedSample = Number(url.searchParams.get('sampleSize') ?? DEFAULT_SAMPLE_RECORDS)
  const sampleSize = Number.isFinite(requestedSample)
    ? Math.min(Math.max(Math.trunc(requestedSample), 1), DEFAULT_SAMPLE_RECORDS)
    : DEFAULT_SAMPLE_RECORDS

  if (!refresh && baselineCache && now - baselineCache.at < BASELINE_CACHE_TTL_MS) {
    return NextResponse.json(baselineCache.body, { headers: baselineCacheHeaders() })
  }

  const exportMaxRecords = sampleSize
  const legacyMaxRecords = sampleSize
  const pageSize = sampleSize
  const decisions: BaselineDecision[] = []
  let exportUsed = false

  try {
    let cursor: string | null = null
    for (let i = 0; i < 1000; i += 1) {
      const qs = new URLSearchParams()
      qs.set('limit', String(pageSize))
      if (cursor) qs.set('cursor', cursor)

      const payload = await fetchEngineJson<{
        decisions: BaselineDecision[]
        hasMore: boolean
        nextCursor: string | null
      }>(`/ci/decisions/export?${qs.toString()}`, { internal: true })

      const page = payload?.decisions ?? []
      decisions.push(...page)

      if (page.length > 0) exportUsed = true
      if (decisions.length >= exportMaxRecords) break
      cursor = payload?.nextCursor ?? null
      if (!payload?.hasMore || !cursor || page.length === 0) break
    }

    if (decisions.length === 0) {
      const legacyPageSize = Math.min(sampleSize, 200)
      for (let offset = 0; offset < legacyMaxRecords; offset += legacyPageSize) {
        const fallback = await fetchEngineJson<{ decisions: BaselineDecision[] }>(
          `/ci/decisions?limit=${legacyPageSize}&offset=${offset}`,
          { internal: true }
        )
        const page = fallback?.decisions ?? []
        if (page.length === 0) break
        decisions.push(...page)
        if (decisions.length >= legacyMaxRecords) break
      }
    }

    const baseline = computeBaseline(decisions)

    const body = {
      ok: true,
      baseline,
      generatedAt: new Date(now).toISOString(),
      source: {
        type:
          exportUsed && decisions.length > 0
            ? 'export-backed-sample'
            : 'sampled-production-window',
        sampleSize: decisions.length,
        note:
          exportUsed && decisions.length > 0
            ? `Baseline computed from the export endpoint using the current ${decisions.length}-decision sample.`
            : `Baseline computed from the public decisions endpoint using the current ${decisions.length}-decision sampled window.`,
      },
    }

    baselineCache = { at: now, body }
    return NextResponse.json(body, { headers: baselineCacheHeaders() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        error: 'Baseline computation failed.',
        detail: message,
      },
      { status: 503 }
    )
  }
}
