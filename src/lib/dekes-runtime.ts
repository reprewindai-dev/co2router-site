import axios from 'axios'

import type {
  DashboardDecision,
  DekesHandoff,
  DekesIntegrationEventsResponse,
  DekesIntegrationMetricsResponse,
  DekesIntegrationSummaryResponse,
} from '@/types'
import { deriveQualityTier, getDecisionSource, isDecisionDelayed } from '@/lib/decisions'
import { getServerBrokerBaseUrl } from '@/lib/broker-url'
import { getInternalApiKey } from '@/lib/internal-api-key'

type CiDecisionFeed = {
  decisions: Array<{
    id: string
    createdAt: string
    decisionFrameId?: string
    selectedRegion: string
    carbonIntensity: number | null
    baseline: number | null
    reasonCode: string
    fallbackUsed: boolean
    latencyMs?: {
      total?: number | null
      compute?: number | null
    } | null
    decisionAction?: string | null
    action?: string | null
    metadata?: Record<string, unknown>
    jobType?: string | null
    policyTrace?: Record<string, unknown>
  }>
}

type EngineSystemStatus = {
  status?: string
  timestamp?: string
  uptime?: {
    seconds?: number
    formatted?: string
  }
}

type DekesRuntimeReadModel = {
  summary: DekesIntegrationSummaryResponse
  metrics: DekesIntegrationMetricsResponse
  events: DekesIntegrationEventsResponse
}

function getSettledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null
}

function getMcpBrokerBaseUrl() {
  return getServerBrokerBaseUrl()
}

async function fetchMcpJson<T>(path: string, useInternalKey = false): Promise<T | null> {
  const baseUrl = getMcpBrokerBaseUrl()
  if (!baseUrl) {
    throw new Error('Control-plane bridge is unavailable')
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
    'accept-encoding': 'identity',
  }

  if (useInternalKey) {
    const internalKey = getInternalApiKey()
    if (!internalKey) return null
    headers.authorization = `Bearer ${internalKey}`
    headers['x-ecobe-internal-key'] = internalKey
    headers['x-api-key'] = internalKey
  }

  const requestConfig = {
    url: `${baseUrl}${path}`,
    method: 'GET',
    headers,
    responseType: 'arraybuffer',
    timeout: 8_000,
    decompress: false,
    validateStatus: () => true,
  } as any

  const response = await axios.request<ArrayBuffer>(requestConfig)

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`MCP broker request failed for ${path} (${response.status})`)
  }

  const rawBody = Buffer.from(response.data).toString('utf8')
  return JSON.parse(rawBody) as T
}

function getDekesDecisions(decisions: DashboardDecision[]) {
  return decisions.filter((decision) => getDecisionSource(decision) === 'DEKES')
}

function toKg(value: number | null | undefined) {
  return value == null ? 0 : value / 1000
}

function getEventType(decision: DashboardDecision) {
  if (decision.fallbackUsed) return 'LOW_CONFIDENCE_REGION'
  if (isDecisionDelayed(decision)) return 'POLICY_DELAY'

  const baseline = decision.carbonIntensityBaselineGPerKwh ?? null
  const chosen = decision.carbonIntensityChosenGPerKwh ?? null
  if (baseline != null && chosen != null && baseline - chosen >= 100) {
    return 'CLEAN_WINDOW_OPPORTUNITY'
  }
  if (chosen != null && chosen >= 400) {
    return 'HIGH_CARBON_PATTERN'
  }
  return 'ROUTING_POLICY_INSIGHT'
}

function getEventStatus(decision: DashboardDecision): 'success' | 'error' {
  return decision.fallbackUsed ? 'error' : 'success'
}

function getEventMessage(decision: DashboardDecision) {
  const delta =
    decision.carbonIntensityBaselineGPerKwh != null &&
    decision.carbonIntensityChosenGPerKwh != null
      ? decision.carbonIntensityBaselineGPerKwh - decision.carbonIntensityChosenGPerKwh
      : null

  return {
    selectedRegion: decision.chosenRegion,
    baselineRegion: decision.baselineRegion,
    carbonIntensity: decision.carbonIntensityChosenGPerKwh,
    carbonDeltaGPerKwh: delta,
    qualityTier: deriveQualityTier(decision),
    reason: decision.reason,
  }
}

function getPolicyAction(decision: DashboardDecision): string | null {
  const actionTaken = decision.meta?.actionTaken
  return typeof actionTaken === 'string' && actionTaken.length > 0 ? actionTaken : null
}

function getQualityScore(decision: DashboardDecision) {
  const chosen = decision.carbonIntensityChosenGPerKwh ?? null
  const baseline = decision.carbonIntensityBaselineGPerKwh ?? null

  if (chosen == null || baseline == null || baseline <= 0) return 0

  const rawScore = (baseline - chosen) / baseline
  return Number.isFinite(rawScore) ? Math.max(0, Math.min(1, rawScore)) : 0
}

function toDekesHandoff(decision: DashboardDecision): DekesHandoff {
  const eventType = getEventType(decision)
  const qualityTier = deriveQualityTier(decision)
  const carbonIntensity = decision.carbonIntensityChosenGPerKwh ?? 0
  const baselineIntensity = decision.carbonIntensityBaselineGPerKwh ?? carbonIntensity
  const carbonDelta = Math.max(0, baselineIntensity - carbonIntensity)
  const actionTaken = getPolicyAction(decision)
  const severity =
    eventType === 'HIGH_CARBON_PATTERN' || eventType === 'LOW_CONFIDENCE_REGION'
      ? 'high'
      : eventType === 'POLICY_DELAY'
        ? 'medium'
        : 'low'

  return {
    handoffId: decision.id,
    organizationId: decision.organizationId ?? 'ecobe',
    decisionId: decision.id,
    decisionFrameId:
      typeof decision.meta?.decisionFrameId === 'string' ? decision.meta.decisionFrameId : null,
    eventType,
    severity,
    timestamp: decision.createdAt,
    status: decision.fallbackUsed ? 'failed' : 'processed',
    dekesClassification:
      eventType === 'HIGH_CARBON_PATTERN' || eventType === 'LOW_CONFIDENCE_REGION'
        ? 'risk'
        : eventType === 'CLEAN_WINDOW_OPPORTUNITY'
          ? 'opportunity'
          : 'informational',
    dekesActionType: actionTaken,
    dekesActionId:
      typeof decision.meta?.actionId === 'string' && decision.meta.actionId.length > 0
        ? decision.meta.actionId
        : null,
    processedAt: decision.createdAt,
    routing: {
      selectedRegion: decision.chosenRegion,
      baselineRegion: decision.baselineRegion,
      carbonIntensity,
      carbonDeltaGPerKwh: carbonDelta,
      qualityTier,
      forecastStability:
        qualityTier === 'high' ? 'stable' : qualityTier === 'medium' ? 'medium' : 'unstable',
      score: getQualityScore(decision),
    },
    budget: null,
    policy: {
      policyName:
        typeof decision.meta?.policyMode === 'string' ? decision.meta.policyMode : null,
      actionTaken,
    },
    explanation: decision.reason,
    replayUrl:
      typeof decision.meta?.decisionFrameId === 'string'
        ? `/console?tab=routing&decisionFrameId=${encodeURIComponent(decision.meta.decisionFrameId)}`
        : null,
  }
}

function buildHourlyTrend(decisions: DashboardDecision[]) {
  const hourly = new Map<
    string,
    {
      hour: string
      requestCount: number
      totalCO2Kg: number
    }
  >()

  for (const decision of decisions) {
    const date = new Date(decision.createdAt)
    const hour = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), 0, 0, 0)
    )
      .toISOString()
      .slice(0, 13)

    const current = hourly.get(hour) ?? { hour, requestCount: 0, totalCO2Kg: 0 }
    current.requestCount += 1
    current.totalCO2Kg += toKg(decision.co2ChosenG)
    hourly.set(hour, current)
  }

  return Array.from(hourly.values())
    .sort((left, right) => left.hour.localeCompare(right.hour))
    .map((point) => ({
      hour: point.hour,
      requestCount: point.requestCount,
      avgCO2: point.requestCount > 0 ? point.totalCO2Kg / point.requestCount : 0,
    }))
}

function toDashboardDecision(decision: CiDecisionFeed['decisions'][number]): DashboardDecision {
  const metadata = decision.metadata ?? {}
  const request = (metadata.request ?? {}) as Record<string, unknown>
  const response = (metadata.response ?? {}) as Record<string, unknown>
  const selectedRegion =
    typeof response.selectedRegion === 'string' && response.selectedRegion.length > 0
      ? response.selectedRegion
      : decision.selectedRegion
  const action =
    typeof decision.action === 'string' && decision.action.length > 0
      ? decision.action
      : typeof decision.decisionAction === 'string' && decision.decisionAction.length > 0
        ? decision.decisionAction
        : 'run_now'

  return {
    id: decision.id,
    createdAt: decision.createdAt,
    organizationId: 'dekes-runtime',
    workloadName:
      typeof request.workloadName === 'string'
        ? request.workloadName
        : typeof request.name === 'string'
          ? request.name
          : `dekes-runtime-${decision.id.slice(0, 8)}`,
    opName: typeof request.opName === 'string' ? request.opName : 'dekes-runtime',
    baselineRegion: selectedRegion,
    chosenRegion: selectedRegion,
    zoneBaseline: null,
    zoneChosen: null,
    carbonIntensityBaselineGPerKwh: decision.baseline ?? decision.carbonIntensity ?? 0,
    carbonIntensityChosenGPerKwh: decision.carbonIntensity ?? decision.baseline ?? 0,
    estimatedKwh:
      typeof request.estimatedEnergyKwh === 'number' ? request.estimatedEnergyKwh : null,
    co2BaselineG: null,
    co2ChosenG: null,
    reason: decision.reasonCode,
    latencyEstimateMs: decision.latencyMs?.total ?? decision.latencyMs?.compute ?? null,
    latencyActualMs: null,
    fallbackUsed: decision.fallbackUsed,
    dataFreshnessSeconds: null,
    requestCount: 1,
    meta: {
      ...metadata,
      source: 'DEKES',
      actionTaken: action,
      decisionFrameId: decision.decisionFrameId ?? null,
    },
  } satisfies DashboardDecision
}

export async function buildDekesRuntimeReadModel(limit = 96): Promise<DekesRuntimeReadModel> {
  const sampleLimit = Math.min(Math.max(limit, 24), 96)
  const [decisionPayloadResult, ciDecisionPayloadResult, systemStatusResult] = await Promise.allSettled([
    fetchMcpJson<{ decisions: DashboardDecision[] }>(`/api/v1/dashboard/decisions?limit=${sampleLimit}`),
    fetchMcpJson<CiDecisionFeed>(`/api/v1/ci/decisions?limit=${sampleLimit}`),
    fetchMcpJson<EngineSystemStatus>('/api/v1/system/status', true),
  ])

  const decisionPayload = getSettledValue(decisionPayloadResult)
  const ciDecisionPayload = getSettledValue(ciDecisionPayloadResult)
  const systemStatus = getSettledValue(systemStatusResult)

  const dashboardDecisions = getDekesDecisions(decisionPayload?.decisions ?? [])
  const decisions =
    dashboardDecisions.length > 0
      ? dashboardDecisions
      : (ciDecisionPayload?.decisions ?? []).map(toDashboardDecision)
  const totalWorkloads = decisions.length
  const totalCO2Kg = decisions.reduce((sum, decision) => sum + toKg(decision.co2ChosenG), 0)
  const totalEvents = decisions.length
  const avgResponseTimeMs =
    decisions.length > 0
      ? decisions.reduce((sum, decision) => sum + (decision.latencyEstimateMs ?? 0), 0) / decisions.length
      : 0

  const successfulWorkloads = totalWorkloads
  const successRate = totalWorkloads > 0 ? 100 : 0
  const failureRate = totalWorkloads > 0 ? 0 : 0
  const now = systemStatus?.timestamp ?? decisions[0]?.createdAt ?? new Date().toISOString()
  const status =
    systemStatus?.status ??
    (decisions.length > 0 ? 'healthy' : 'degraded')

  const events = decisions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map((decision) => ({
      id: decision.id,
      timestamp: decision.createdAt,
      type: getEventType(decision),
      message: getEventMessage(decision),
      status: getEventStatus(decision),
    }))

  return {
    summary: {
      status,
      integration: 'decision-read-model',
      lastSync: now,
      metrics: {
        totalWorkloads,
        successfulWorkloads,
        successRate,
        totalCO2Kg,
        avgCO2PerWorkload: totalWorkloads > 0 ? totalCO2Kg / totalWorkloads : 0,
        timeRange: 'decision window',
      },
    },
    metrics: {
      integration: 'decision-read-model',
      status,
      timeRange: 'decision window',
      metrics: {
        successRate,
        failureRate,
        totalEvents,
        totalWorkloads,
        avgResponseTimeMs,
        uptime: status === 'healthy' ? 100 : 0,
      },
      hourlyTrend: buildHourlyTrend(decisions),
      lastChecked: now,
    },
    events: {
      source: 'dashboard-read-model',
      timeRange: 'latest decision events',
      total: totalEvents,
      events,
    },
  }
}

export async function getDekesRuntimeHandoffById(handoffId: string): Promise<DekesHandoff | null> {
  const [decisionPayloadResult, ciDecisionPayloadResult] = await Promise.allSettled([
    fetchMcpJson<{ decisions: DashboardDecision[] }>(`/api/v1/dashboard/decisions?limit=400`),
    fetchMcpJson<CiDecisionFeed>(`/api/v1/ci/decisions?limit=400`),
  ])

  const dashboardDecision = getDekesDecisions(getSettledValue(decisionPayloadResult)?.decisions ?? []).find(
    (candidate) => candidate.id === handoffId
  )
  const ciDecision = getSettledValue(ciDecisionPayloadResult)?.decisions.find(
    (candidate) => candidate.id === handoffId
  )
  const decision = dashboardDecision ?? (ciDecision ? toDashboardDecision(ciDecision) : null)

  return decision ? toDekesHandoff(decision) : null
}
