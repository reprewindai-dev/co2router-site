import { getBrokerBaseUrl } from '@/lib/broker-url'

export type DemoRouteRequest = {
  scenario?: string
}

export type SandboxLaneOutcome = 'run_now' | 'run_later' | 'rejected' | 'needs_override'

export type SandboxLaneResult = {
  lane: 'prod' | 'staging' | 'experiments' | 'overline' | 'needs_two_keys'
  label: string
  outcome: SandboxLaneOutcome
  region: string | null
  scheduled_time: string | null
  reasons: string[]
  hard_stops_triggered: string[]
  override_required: boolean
  decision_id: string | null
  latency_ms: number | null
}

export type SandboxRunResponse = {
  run_id: string
  scenario: string
  lanes: SandboxLaneResult[]
}

export type DemoRouteResponse = {
  run_id: string
  scenario: string
  lanes: SandboxLaneResult[]
}

function getMcpBaseUrl() {
  return getBrokerBaseUrl()
}

function normalizeScenario(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : 'nightly_analytics_batch'
}

async function getMcpJson<T>(path: string, searchParams: Record<string, string>): Promise<T> {
  const url = new URL(`${getMcpBaseUrl()}${path}`)
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`MVP request failed for ${path} (${response.status})`)
  }

  return (await response.json()) as T
}

export async function buildDemoRoutingDecision(
  input: DemoRouteRequest
): Promise<DemoRouteResponse> {
  const scenario = normalizeScenario(input.scenario)

  return getMcpJson<DemoRouteResponse>('/api/v1/sandbox/run', {
    scenario,
  })
}
