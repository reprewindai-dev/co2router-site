export type HeroScenarioId = 'run-now' | 'reroute' | 'delay' | 'throttle' | 'deny'

export type HeroSignalState = {
  label: 'Carbon' | 'Water' | 'Cost' | 'Latency' | 'Policy'
  value: string
}

export type HeroScenario = {
  id: HeroScenarioId
  action: string
  workloadType: string
  jobName: string
  source: string
  requestedRegion: string
  environment?: string
  scale?: string
  signals: HeroSignalState[]
  reason: string
  impact: string
  proof: string[]
  routeHint?: string
}

export const heroScenarioOrder: HeroScenarioId[] = ['run-now', 'reroute', 'delay', 'throttle', 'deny']

export const heroScenarios: Record<HeroScenarioId, HeroScenario> = {
  'run-now': {
    id: 'run-now',
    action: 'RUN NOW',
    workloadType: 'CI Pipeline',
    jobName: 'deploy-prod / main',
    source: 'GitHub Actions',
    requestedRegion: 'ca-central',
    environment: 'production',
    signals: [
      { label: 'Carbon', value: 'Low' },
      { label: 'Water', value: 'Low' },
      { label: 'Cost', value: 'Within threshold' },
      { label: 'Latency', value: 'SLA safe' },
      { label: 'Policy', value: 'Compliant' },
    ],
    reason: 'All policy and runtime conditions satisfied',
    impact: 'Execution approved immediately; no SLA impact',
    proof: ['SHA-256 ProofHash', 'Replayable frame', 'Quality-tiered lease', '77ms p95'],
  },
  reroute: {
    id: 'reroute',
    action: 'REROUTE',
    workloadType: 'GPU Training Job',
    jobName: 'train-vision-v4',
    source: 'API request',
    requestedRegion: 'us-east',
    signals: [
      { label: 'Carbon', value: 'High' },
      { label: 'Water', value: 'Moderate' },
      { label: 'Cost', value: 'Over target' },
      { label: 'Latency', value: 'Acceptable' },
      { label: 'Policy', value: 'Alternate region allowed' },
    ],
    reason: 'Lower-risk compliant region available under the same governance lease',
    impact: 'Redirecting to ca-central; lower-intensity and lower-cost lane selected inside policy',
    routeHint: 'Switching from us-east to ca-central',
    proof: ['SHA-256 ProofHash', 'Replayable frame', 'Quality-tiered lease', '77ms p95'],
  },
  delay: {
    id: 'delay',
    action: 'DELAY',
    workloadType: 'Batch Compute Job',
    jobName: 'nightly-analytics-rollup',
    source: 'Scheduled workflow',
    requestedRegion: 'eu-west',
    signals: [
      { label: 'Carbon', value: 'Currently high' },
      { label: 'Water', value: 'Acceptable' },
      { label: 'Cost', value: 'Within threshold' },
      { label: 'Latency', value: 'Not critical' },
      { label: 'Policy', value: 'Delay permitted' },
    ],
    reason: 'Lower-intensity execution window predicted in 14 minutes',
    impact: 'Execution deferred; no user-facing SLA impact',
    proof: ['SHA-256 ProofHash', 'Replayable frame', 'Quality-tiered lease', '77ms p95'],
  },
  throttle: {
    id: 'throttle',
    action: 'THROTTLE',
    workloadType: 'Inference Batch',
    jobName: 'embedding-refresh-queue',
    source: 'Internal service',
    requestedRegion: 'global',
    scale: '100% parallelism',
    signals: [
      { label: 'Carbon', value: 'Moderate' },
      { label: 'Water', value: 'Moderate' },
      { label: 'Cost', value: 'Approaching ceiling' },
      { label: 'Latency', value: 'Non-critical' },
      { label: 'Policy', value: 'Throughput guard active' },
    ],
    reason: 'Budget and load guard triggered',
    impact: 'Reducing concurrency to 40%; cost ceiling protected',
    proof: ['SHA-256 ProofHash', 'Replayable frame', 'Quality-tiered lease', '77ms p95'],
  },
  deny: {
    id: 'deny',
    action: 'DENY',
    workloadType: 'Deployment Job',
    jobName: 'release-prod-eu',
    source: 'CI trigger',
    requestedRegion: 'disallowed-region-x',
    signals: [
      { label: 'Carbon', value: 'Unknown / low confidence' },
      { label: 'Water', value: 'Unknown / low confidence' },
      { label: 'Cost', value: 'Unknown' },
      { label: 'Latency', value: 'Not evaluated' },
      { label: 'Policy', value: 'Region disallowed' },
    ],
    reason: 'Policy violation: requested region is not authorized',
    impact: 'Execution blocked before run',
    proof: ['SHA-256 ProofHash', 'Replayable frame', 'Quality-tiered lease', '77ms p95'],
  },
}
