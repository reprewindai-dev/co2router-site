export type Tier = 'freeview' | 'core' | 'elite'

export type RegionState = 'green' | 'yellow' | 'red'

export type RouterAction =
  | 'SHIFT_REGION'
  | 'DEFER_JOB'
  | 'THROTTLE'
  | 'HOLD'
  | 'PASS'

export interface Region {
  id: string
  name: string
  code: string
  lat: number
  lng: number
  carbon: number
  renewable: number
  load: number
  waterStress: number
  state: RegionState
  lastDecision: RouterAction
  trend: 'up' | 'down' | 'flat'
  provider: string
}

export interface Decision {
  id: string
  regionId: string
  regionName: string
  action: RouterAction
  reason: string
  carbon: number
  reductionPct: number
  timestamp: number
  confidence: number
  proofHash: string
}

export interface TraceFrame {
  id: string
  regionName: string
  action: RouterAction
  proofHash: string
  timestamp: number
}

export interface SystemMetrics {
  totalSavingsKg: number
  decisionsToday: number
  avgCarbon: number
  uptimePct: number
  activeRegions: number
  alertCount: number
}

export interface BackendBuildInfo {
  revision: string
  branch: string
  serviceId: string
  serviceName: string
  instanceId: string
  runtimeRoot: string
  nestedDuplicatePathDetected: boolean
}

export interface BackendWaterArtifactChecks {
  bundlePresent: boolean
  manifestPresent: boolean
  schemaCompatible: boolean
  regionCount: number
  sourceCount: number
  datasetHashesPresent: boolean
}

export interface BackendChecks {
  database: boolean
  redis: boolean
  waterArtifacts?: BackendWaterArtifactChecks
}

export interface BackendDependencies {
  database: boolean
  redis: boolean
}

export interface BackendHealth {
  status: string
  engine: string
  router: boolean
  fingrid: boolean
  providers: Record<string, boolean>
  providerModes?: Record<string, string>
  build: BackendBuildInfo
  timestamp: string
  checks: BackendChecks
  dependencies: BackendDependencies
  waterArtifactErrors: string[]
}

export type AdvisorStatus = 'optimal' | 'recommend' | 'warning' | 'trace' | 'info'

export interface AdvisorSuggestion {
  id: string
  status: AdvisorStatus
  title: string
  summary: string
  reasons: string[]
}

export interface AdvisorPayload {
  headline: string
  status: AdvisorStatus | 'idle'
  suggestions: AdvisorSuggestion[]
}

export interface SignalProvider {
  name: string
  type: 'carbon' | 'water'
  authority: string
  status: 'healthy' | 'degraded' | 'offline'
  freshness: number
}

export interface HaloGridConsoleSnapshot {
  fetchedAt: string
  backendHealth: BackendHealth | null
  regions: Region[]
  decisions: Decision[]
  traces: TraceFrame[]
  metrics: SystemMetrics
  signalProviders: SignalProvider[]
}
