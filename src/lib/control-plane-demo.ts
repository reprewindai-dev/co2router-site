type WorkloadType = 'build' | 'test' | 'batch' | 'inference' | 'etl'

type GreenRoutingResult = {
  selectedRegion: string
  carbonIntensity: number
  qualityTier?: 'high' | 'medium' | 'low'
  explanation: string
  alternatives?: Array<{
    region: string
    carbonIntensity: number
    score: number
    reason?: string
  }>
  decisionFrameId?: string
  source_used?: string | null
  validation_source?: string | null
  fallback_used?: boolean | null
}

type BestWindowResponse = {
  bestWindow?: {
    startTime: string
    endTime: string
    predictedIntensity: number
    confidence: number
    source: string
  } | null
  potentialSavingsPct?: number | null
}

export type DemoRouteRequest = {
  workloadType?: string
  candidateRegions?: string[]
  baselineRegion?: string
  latencySensitivity?: number
  costSensitivity?: number
  carbonSensitivity?: number
  deadlineAt?: string | null
  canDelay?: boolean
}

export type DemoRouteResponse = {
  workloadType: WorkloadType
  baselineRegion: string
  baselineCarbonIntensity: number
  baselineEstimatedCost: number
  selectedRegion: string
  selectedCarbonIntensity: number
  selectedEstimatedCost: number
  carbonSavingsPct: number
  costSavingsPct: number
  recommendedDelaySeconds: number
  recommendedDelayWindow: {
    startTime: string
    endTime: string
  } | null
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

const MCP_BROKER_BASE_URL =
  process.env.MCP_API_URL ||
  process.env.ECOBE_MVP_URL ||
  ''

const DEFAULT_CANDIDATE_REGIONS = ['eastus', 'westus2', 'northeurope', 'norwayeast']

const LOCAL_REGION_CARBON: Record<string, number> = {
  eastus: 386,
  eastus2: 372,
  westus2: 128,
  centralus: 243,
  southcentralus: 277,
  northeurope: 164,
  norwayeast: 72,
  uksouth: 198,
  'us-east-1': 382,
  'us-west-2': 124,
  'eu-west-1': 176,
  'eu-central-1': 292,
}

const WORKLOAD_PROFILES: Record<
  WorkloadType,
  {
    label: string
    durationMinutes: number
    baseCostUsd: number
  }
> = {
  build: { label: 'Build pipeline', durationMinutes: 18, baseCostUsd: 1.0 },
  test: { label: 'Test matrix', durationMinutes: 24, baseCostUsd: 1.35 },
  batch: { label: 'Batch job', durationMinutes: 45, baseCostUsd: 3.2 },
  inference: { label: 'AI inference', durationMinutes: 12, baseCostUsd: 2.4 },
  etl: { label: 'Scheduled ETL', durationMinutes: 60, baseCostUsd: 4.1 },
}

const REGION_COST_INDEX: Record<string, number> = {
  eastus: 1,
  eastus2: 1.01,
  westus2: 0.92,
  centralus: 0.95,
  southcentralus: 0.94,
  northeurope: 0.88,
  norwayeast: 0.84,
  uksouth: 0.9,
  'us-east-1': 1,
  'us-west-2': 0.89,
  'eu-west-1': 0.91,
  'eu-central-1': 0.94,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeWorkloadType(value?: string): WorkloadType {
  if (!value) return 'build'
  if (value in WORKLOAD_PROFILES) return value as WorkloadType
  return 'build'
}

function normalizeCandidateRegions(value?: string[]) {
  const unique = Array.from(new Set((value ?? []).map((region) => region.trim()).filter(Boolean)))
  return unique.length > 0 ? unique : DEFAULT_CANDIDATE_REGIONS
}

function estimateCostUsd(region: string, workloadType: WorkloadType) {
  const profile = WORKLOAD_PROFILES[workloadType]
  const multiplier = REGION_COST_INDEX[region] ?? 1
  return Number((profile.baseCostUsd * multiplier).toFixed(2))
}

function toConfidence(qualityTier: 'high' | 'medium' | 'low' | undefined) {
  if (qualityTier === 'high') return 0.92
  if (qualityTier === 'medium') return 0.74
  return 0.48
}

async function postMcpJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!MCP_BROKER_BASE_URL) {
    throw new Error('Private engine bridge is unavailable')
  }

  const response = await fetch(`${MCP_BROKER_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`MCP broker request failed for ${path} (${response.status})`)
  }

  return (await response.json()) as T
}

function getLocalCarbonIntensity(region: string) {
  const key = region.trim().toLowerCase()
  return LOCAL_REGION_CARBON[key] ?? 260
}

function getLocalQualityTier(carbonIntensity: number): 'high' | 'medium' | 'low' {
  if (carbonIntensity < 180) return 'high'
  if (carbonIntensity < 320) return 'medium'
  return 'low'
}

function buildLocalDemoDecision(input: DemoRouteRequest): DemoRouteResponse {
  const workloadType = normalizeWorkloadType(input.workloadType)
  const candidateRegions = normalizeCandidateRegions(input.candidateRegions)
  const profile = WORKLOAD_PROFILES[workloadType]

  const evaluated = candidateRegions
    .map((region) => {
      const carbonIntensity = getLocalCarbonIntensity(region)
      const cost = estimateCostUsd(region, workloadType)
      const score =
        carbonIntensity * clamp(input.carbonSensitivity ?? 0.65, 0, 1) +
        cost * 10 * clamp(input.costSensitivity ?? 0.15, 0, 1)
      return { region, carbonIntensity, cost, score }
    })
    .sort((left, right) => left.score - right.score)

  const selected = evaluated[0] ?? {
    region: baselineRegionFallback(candidateRegions),
    carbonIntensity: 260,
    cost: estimateCostUsd(baselineRegionFallback(candidateRegions), workloadType),
    score: 260,
  }

  const baselineRegion =
    input.baselineRegion && evaluated.some((entry) => entry.region === input.baselineRegion)
      ? input.baselineRegion
      : candidateRegions[0] ?? selected.region
  const baselineCarbonIntensity = getLocalCarbonIntensity(baselineRegion)
  const baselineEstimatedCost = estimateCostUsd(baselineRegion, workloadType)
  const selectedEstimatedCost = estimateCostUsd(selected.region, workloadType)
  const carbonSavingsPct =
    baselineCarbonIntensity > 0
      ? Number((((baselineCarbonIntensity - selected.carbonIntensity) / baselineCarbonIntensity) * 100).toFixed(1))
      : 0
  const costSavingsPct =
    baselineEstimatedCost > 0
      ? Number((((baselineEstimatedCost - selectedEstimatedCost) / baselineEstimatedCost) * 100).toFixed(1))
      : 0

  const canDelay = Boolean(input.canDelay) && workloadType !== 'inference'
  const recommendedDelaySeconds =
    canDelay && selected.carbonIntensity > 250 ? profile.durationMinutes * 60 : 0

  const recommendedDelayWindow =
    recommendedDelaySeconds > 0
      ? {
          startTime: new Date(Date.now() + recommendedDelaySeconds * 1000).toISOString(),
          endTime: new Date(Date.now() + (recommendedDelaySeconds + 3600) * 1000).toISOString(),
        }
      : null

  const qualityTier = getLocalQualityTier(selected.carbonIntensity)
  const confidence = toConfidence(qualityTier)
  const explanation = `Sandbox demo selected ${selected.region} as the lowest-defensible signal for ${profile.label.toLowerCase()}.`

  return {
    workloadType,
    baselineRegion,
    baselineCarbonIntensity,
    baselineEstimatedCost,
    selectedRegion: selected.region,
    selectedCarbonIntensity: selected.carbonIntensity,
    selectedEstimatedCost,
    carbonSavingsPct,
    costSavingsPct,
    recommendedDelaySeconds,
    recommendedDelayWindow,
    confidence,
    explanation,
    policyMode: 'optimize',
    providers: {
      sourceUsed: 'sandbox-mock',
      validationSource: 'sandbox-mock',
      fallbackUsed: true,
      qualityTier,
    },
    alternatives: evaluated.slice(0, 4).map((entry) => ({
      region: entry.region,
      carbonIntensity: entry.carbonIntensity,
      estimatedCost: entry.cost,
      score: Number(entry.score.toFixed(2)),
    })),
    decisionId: `demo-${workloadType}-${selected.region}`,
    generatedAt: new Date().toISOString(),
  }
}

function baselineRegionFallback(candidateRegions: string[]) {
  return candidateRegions[0] ?? DEFAULT_CANDIDATE_REGIONS[0]
}

async function maybeGetDelayRecommendation(
  selectedRegion: string,
  selectedCarbonIntensity: number,
  canDelay: boolean,
  workloadType: WorkloadType
) {
  if (!canDelay) {
    return {
      recommendedDelaySeconds: 0,
      recommendedDelayWindow: null,
      delayNote: 'Run now.',
    }
  }

  try {
    const bestWindow = await postMcpJson<BestWindowResponse>('/api/v1/intelligence/best-window', {
      region: selectedRegion,
      lookAheadHours: 24,
      workloadType,
    })

    const nextWindow = bestWindow.bestWindow
    if (!nextWindow) {
      return {
        recommendedDelaySeconds: 0,
        recommendedDelayWindow: null,
        delayNote: 'No cleaner forecast window available.',
      }
    }

    const startsAt = new Date(nextWindow.startTime).getTime()
    const secondsUntilWindow = Math.max(0, Math.round((startsAt - Date.now()) / 1000))
    const enoughImprovement = nextWindow.predictedIntensity < selectedCarbonIntensity * 0.92

    if (!enoughImprovement || secondsUntilWindow === 0) {
      return {
        recommendedDelaySeconds: 0,
        recommendedDelayWindow: null,
        delayNote: 'Current window is already near-optimal.',
      }
    }

    return {
      recommendedDelaySeconds: secondsUntilWindow,
      recommendedDelayWindow: {
        startTime: nextWindow.startTime,
        endTime: nextWindow.endTime,
      },
      delayNote: `Delay to ${nextWindow.startTime} for an expected ${bestWindow.potentialSavingsPct ?? 0}% cleaner window.`,
    }
  } catch {
    return {
      recommendedDelaySeconds: 0,
      recommendedDelayWindow: null,
      delayNote: 'Run now; forecast window unavailable.',
    }
  }
}

export async function buildDemoRoutingDecision(
  input: DemoRouteRequest
): Promise<DemoRouteResponse> {
  try {
    const workloadType = normalizeWorkloadType(input.workloadType)
    const candidateRegions = normalizeCandidateRegions(input.candidateRegions)
    const profile = WORKLOAD_PROFILES[workloadType]

    const routing = await postMcpJson<GreenRoutingResult>('/api/v1/route/green', {
      preferredRegions: candidateRegions,
      durationMinutes: profile.durationMinutes,
      carbonWeight: clamp(input.carbonSensitivity ?? 0.65, 0, 1),
      latencyWeight: clamp(input.latencySensitivity ?? 0.2, 0, 1),
      costWeight: clamp(input.costSensitivity ?? 0.15, 0, 1),
    })

    const evaluated = new Map<string, { carbonIntensity: number; score: number }>()
    evaluated.set(routing.selectedRegion, {
      carbonIntensity: routing.carbonIntensity,
      score: 1,
    })

    for (const alternative of routing.alternatives ?? []) {
      evaluated.set(alternative.region, {
        carbonIntensity: alternative.carbonIntensity,
        score: alternative.score,
      })
    }

    const baselineRegion =
      input.baselineRegion && evaluated.has(input.baselineRegion)
        ? input.baselineRegion
        : candidateRegions.find((region) => evaluated.has(region)) ?? routing.selectedRegion

    const baselineCarbonIntensity =
      evaluated.get(baselineRegion)?.carbonIntensity ?? routing.carbonIntensity
    const baselineEstimatedCost = estimateCostUsd(baselineRegion, workloadType)
    const selectedEstimatedCost = estimateCostUsd(routing.selectedRegion, workloadType)
    const carbonSavingsPct =
      baselineCarbonIntensity > 0
        ? Number(
            (((baselineCarbonIntensity - routing.carbonIntensity) / baselineCarbonIntensity) * 100).toFixed(1)
          )
        : 0
    const costSavingsPct =
      baselineEstimatedCost > 0
        ? Number(
            (((baselineEstimatedCost - selectedEstimatedCost) / baselineEstimatedCost) * 100).toFixed(1)
          )
        : 0

    const delay = await maybeGetDelayRecommendation(
      routing.selectedRegion,
      routing.carbonIntensity,
      Boolean(input.canDelay),
      workloadType
    )

    const alternatives = candidateRegions
      .map((region) => {
        const current = evaluated.get(region)
        if (!current) return null
        return {
          region,
          carbonIntensity: current.carbonIntensity,
          estimatedCost: estimateCostUsd(region, workloadType),
          score: current.score,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => left.carbonIntensity - right.carbonIntensity)

    return {
      workloadType,
      baselineRegion,
      baselineCarbonIntensity,
      baselineEstimatedCost,
      selectedRegion: routing.selectedRegion,
      selectedCarbonIntensity: routing.carbonIntensity,
      selectedEstimatedCost,
      carbonSavingsPct,
      costSavingsPct,
      recommendedDelaySeconds: delay.recommendedDelaySeconds,
      recommendedDelayWindow: delay.recommendedDelayWindow,
      confidence: toConfidence(routing.qualityTier),
      explanation: `${routing.explanation} ${delay.delayNote}`.trim(),
      policyMode: 'optimize',
      providers: {
        sourceUsed: routing.source_used ?? null,
        validationSource: routing.validation_source ?? null,
        fallbackUsed: Boolean(routing.fallback_used),
        qualityTier: routing.qualityTier ?? 'low',
      },
      alternatives,
      decisionId: routing.decisionFrameId ?? null,
      generatedAt: new Date().toISOString(),
    }
  } catch {
    return buildLocalDemoDecision(input)
  }
}
