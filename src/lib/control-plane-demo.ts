import { getBrokerBaseUrl } from '@/lib/broker-url'
import type { GreenRoutingResult, PolicyDelayResponse } from '@/types'

export type DemoRouteRequest = {
  scenario?: string
}

function normalizeScenario(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : 'nightly_analytics_batch'
}

function scenarioRequest(scenario: string): GreenRoutingRequest {
  const preferredRegionsByScenario: Record<string, string[]> = {
    nightly_analytics_batch: ['us-east-1', 'us-west-2', 'eu-west-1'],
    daytime_sync: ['us-east-1', 'us-west-2'],
    eu_compliance_check: ['eu-west-1', 'eu-central-1', 'us-east-1'],
    carbon_sensitive_batch: ['eu-west-1', 'ca-central-1', 'us-east-1'],
  }

  return {
    preferredRegions: preferredRegionsByScenario[scenario] ?? ['us-east-1', 'us-west-2', 'eu-west-1'],
    maxCarbonGPerKwh: 450,
    carbonWeight: 0.6,
    latencyWeight: 0.25,
    costWeight: 0.15,
    mode: 'optimize',
    policyMode: 'default',
    durationMinutes: 60,
  }
}

type GreenRoutingRequest = {
  preferredRegions: string[]
  maxCarbonGPerKwh?: number
  latencyMsByRegion?: Record<string, number>
  costIndexByRegion?: Record<string, number>
  carbonWeight?: number
  latencyWeight?: number
  costWeight?: number
  mode?: 'optimize' | 'assurance'
  policyMode?: 'default' | 'sec_disclosure_strict' | 'eu_24x7_ready'
  targetTime?: string
  durationMinutes?: number
}

async function getMcpJson<T>(path: string, body: GreenRoutingRequest): Promise<T> {
  const baseUrl = getBrokerBaseUrl()
  if (!baseUrl) {
    throw new Error('Broker base URL is not configured')
  }

  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Broker request failed (${response.status})`)
  }

  return (await response.json()) as T
}

export async function buildDemoRoutingDecision(
  input: DemoRouteRequest
): Promise<GreenRoutingResult | PolicyDelayResponse> {
  const scenario = normalizeScenario(input.scenario)

  return getMcpJson<GreenRoutingResult | PolicyDelayResponse>('/api/v1/route/green', scenarioRequest(scenario))
}
