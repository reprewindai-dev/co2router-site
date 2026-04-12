// CO2 Control Panel - Type Definitions
// Five zones, one principle: "Compute does not run until Earth approves it."

export interface RoutingDecision {
  id: string
  timestamp: number
  fromRegion: string
  toRegion: string
  workloadType: string
  baselineCarbon: number // kg CO2
  selectedCarbon: number // kg CO2
  delta: number // kg CO2 saved
  proofHash: string
  status: 'active' | 'completed' | 'blocked' | 'marginal'
  latency: number // ms
  cost: number // normalized
  waterUsage: number // liters
}

export interface RegionNode {
  id: string
  name: string
  lat: number
  lng: number
  carbonIntensity: number // g CO2/kWh
  renewablePercentage: number
  activeDecisions: number
  totalSaved: number // kg CO2
  status: 'optimal' | 'acceptable' | 'stressed' | 'critical'
}

export interface RoutingArc {
  id: string
  from: RegionNode
  to: RegionNode
  decisions: RoutingDecision[]
  totalVolume: number
  carbonSaved: number
  animated: boolean
}

export interface DoctrineWeights {
  carbon: number // 0-100
  water: number // 0-100
  latency: number // 0-100
  cost: number // 0-100
}

export interface DoctrinePolicy {
  id: string
  version: string
  name: string
  weights: DoctrineWeights
  maxLatency: number // ms
  maxCost: number // normalized
  minRenewable: number // percentage
  approvedBy?: string
  approvedAt?: number
  status: 'draft' | 'pending' | 'active' | 'archived'
}

export interface CounterfactualResult {
  period: string
  actualEmissions: number // tonnes
  withoutRouter: number // tonnes
  delta: number // tonnes saved
  percentage: number
  workloadCount: number
  topContributors: string[]
}

export interface SimulationResult {
  policy: DoctrinePolicy
  backtestDays: number
  workloadsSimulated: number
  carbonDelta: number
  latencyDelta: number
  costDelta: number
  recommendation: 'deploy' | 'review' | 'reject'
  confidence: number
}

export interface CoPilotSuggestion {
  id: string
  type: 'weight_adjustment' | 'latency_threshold' | 'region_expansion' | 'time_shifting'
  title: string
  description: string
  evidence: string
  estimatedImpact: number // tonnes CO2/year
  confidence: number
  approved: boolean
}

export interface GreenOpsGate {
  repo: string
  prNumber: number
  carbonEstimate: number
  threshold: number
  status: 'pass' | 'warn' | 'block'
  recommendations: string[]
}

export interface CSRDExport {
  reportingPeriod: string
  scope3Category: string
  totalEmissions: number
  avoidanceClaims: number
  proofHashes: string[]
  thirdPartyVerified: boolean
}

export interface VisorStatus {
  posture: 'green' | 'amber' | 'red'
  activeDecisions: number
  carbonSavedToday: number
  waterSavedToday: number
  currentLatency: number
  costIndex: number
  earthApprovalRate: number
}
