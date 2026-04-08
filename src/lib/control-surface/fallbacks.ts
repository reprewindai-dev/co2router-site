import type {
  CommandCenterSnapshot,
  ControlSurfaceOverview,
  HallOGridSnapshot,
  LandingSnapshot,
  LiveSystemSnapshot,
} from '@/types/control-surface'

const UNAVAILABLE_DATASETS: LiveSystemSnapshot['providers']['datasets'] = [
  { name: 'aqueduct', verificationStatus: 'unavailable', datasetVersion: null, manifestHash: null, computedHash: null },
  { name: 'aware', verificationStatus: 'unavailable', datasetVersion: null, manifestHash: null, computedHash: null },
  { name: 'wwf', verificationStatus: 'unavailable', datasetVersion: null, manifestHash: null, computedHash: null },
  { name: 'nrel', verificationStatus: 'unavailable', datasetVersion: null, manifestHash: null, computedHash: null },
]

export const FALLBACK_LIVE_SYSTEM_SNAPSHOT: LiveSystemSnapshot = {
  generatedAt: 'Shell ready',
  recentDecisions: {
    available: false,
    error: 'Live decision frames are hydrating.',
    items: [],
  },
  traceLedger: {
    available: false,
    error: 'Trace posture will attach when the live frame resolves.',
    traceAvailable: false,
    traceHash: null,
    inputSignalHash: null,
    sequenceNumber: null,
    proofAvailable: false,
    replayConsistent: null,
  },
  governance: {
    available: false,
    error: 'SAIQ state will attach when live governance resolves.',
    frameworkLabel: 'SAIQ',
    active: null,
    policyState: null,
    latestDecisionAction: null,
    latestReasonCode: null,
  },
  providers: {
    available: false,
    error: 'Verified provider posture is hydrating.',
    datasets: UNAVAILABLE_DATASETS,
  },
  latency: {
    available: false,
    error: 'Live latency data is hydrating.',
    samples: null,
    p95TotalMs: null,
    p95ComputeMs: null,
    budgetTotalP95Ms: null,
    budgetComputeP95Ms: null,
    withinBudget: {
      total: null,
      compute: null,
    },
  },
}

export const FALLBACK_COMMAND_CENTER_SNAPSHOT: CommandCenterSnapshot = {
  generatedAt: 'Shell ready',
  selectedDecisionFrameId: null,
  projection: {
    dataStatus: 'broken',
    projectionLagSec: null,
    latestProjectionAt: null,
    latestCanonicalAt: null,
    quality: { suspectCount: 0, invalidCount: 0 },
    outbox: null,
  },
  header: {
    systemActive: null,
    systemStatus: 'shell-ready',
    saiqEnforced: null,
    traceLocked: null,
    replayVerified: null,
    detail: 'Command-center structure is live. Decision data attaches as the current frame resolves.',
  },
  world: {
    nodes: [],
    flows: [],
  },
  decisionCore: {
    recentDecisions: [],
    selectedDecision: null,
    selectedTrace: null,
    selectedReplay: null,
  },
  governance: {
    frameworkLabel: 'SAIQ',
    source: null,
    active: null,
    strict: null,
    enforcementMode: null,
    selectedScore: null,
    thresholds: null,
    weights: null,
    impact: {
      carbonReductionPct: null,
      waterImpactDeltaLiters: null,
      signalConfidence: null,
      constraintsApplied: 0,
      cacheHit: null,
    },
  },
  traceStream: {
    items: [],
  },
  health: {
    service: {
      status: 'shell-ready',
      proofPosture: 'Proof posture attaches with the live frame.',
      detail: 'Latency, provenance, and provider state will populate without replacing the command center shell.',
    },
    latency: FALLBACK_LIVE_SYSTEM_SNAPSHOT.latency,
    provenance: FALLBACK_LIVE_SYSTEM_SNAPSHOT.providers,
    providers: [],
  },
}

export const FALLBACK_HALLOGRID_SNAPSHOT: HallOGridSnapshot = {
  generatedAt: 'Shell ready',
  selectedFrameId: null,
  title: 'CO2 Router Console',
  subtitle: 'Powered by HallOGrid',
  access: {
    tenantId: 'public-preview',
    entitlements: ['public_preview'],
    role: 'viewer',
    mode: 'public_preview',
    label: 'Live Mirror',
    isReadOnlyPreview: true,
    canViewOperatorConsole: false,
    canAccessControls: false,
    canManageDoctrine: false,
    canViewCompliance: false,
    redactionDelayMinutes: 15,
    upgradePrompts: ['Unlock operator console', 'View proof workspace'],
    proHighlights: ['trace replay', 'counterfactual analysis', 'doctrine controls'],
    upgradeUrl: '/pricing',
  },
  mirror: {
    tenantId: 'public-preview',
    generatedAt: 'Shell ready',
    sourceFreshnessSec: null,
    freshnessBudgetSec: 120,
    safeDelayWindowSec: 5400,
    mirrorMode: 'hot',
    degraded: true,
    degradedReason: 'HallOGrid is reconnecting. The mirror shell remains visible while live state reattaches.',
    laneBudgets: {
      hotP95Ms: 100,
      warmP95Ms: 250,
      coldQueued: true,
    },
    metrics: {
      decisionP50Ms: null,
      decisionP95Ms: null,
      decisionP99Ms: null,
      consoleSnapshotP50Ms: null,
      consoleSnapshotP95Ms: null,
      providerRefreshAgeSec: null,
      mirrorGenerationMs: null,
      replayGenerationMs: null,
      exportQueueDepth: 0,
    },
  },
  projection: FALLBACK_COMMAND_CENTER_SNAPSHOT.projection,
  selectedFrame: null,
  frames: [],
  world: FALLBACK_COMMAND_CENTER_SNAPSHOT.world,
  governance: FALLBACK_COMMAND_CENTER_SNAPSHOT.governance,
  traceStream: FALLBACK_COMMAND_CENTER_SNAPSHOT.traceStream,
  health: FALLBACK_COMMAND_CENTER_SNAPSHOT.health,
  transport: {
    mode: 'snapshot+stream',
    streamHealthy: false,
    snapshotUrl: '/api/control-surface/hallogrid',
    streamUrl: '/api/control-surface/hallogrid/stream',
    adapters: [
      {
        id: 'canonical-rest',
        label: 'Canonical CO2 Router mirror',
        kind: 'canonical',
        enabled: true,
        notes: 'Fallback shell is active while the live mirror reconnects.',
      },
      {
        id: 'polling-fallback',
        label: 'Polling fallback adapter',
        kind: 'polling',
        enabled: true,
        notes: 'Snapshot polling resumes when the live stream recovers.',
      },
    ],
  },
}

export const FALLBACK_OVERVIEW: Pick<
  ControlSurfaceOverview,
  'actionDistribution' | 'providers' | 'replay'
> = {
  actionDistribution: [],
  providers: [],
  replay: null,
}

export const FALLBACK_LANDING_SNAPSHOT: LandingSnapshot = {
  generatedAt: 'Shell ready',
  liveStatus: {
    visible: true,
    generatedAt: 'Shell ready',
    lastUpdatedLabel: 'reconnecting',
    detail: 'Landing snapshot is reconnecting. The public shell stays stable while fresh live excerpts attach.',
  },
  overview: {
    actionDistribution: [],
    providers: [],
    featuredDecision: null,
    liveStrip: [],
    proofContext: {
      proofRef: null,
      governance: 'Policy-first control posture',
      traceRef: null,
      replay: 'public live mirror',
      provenance: 'Verified provider posture reattaches when the landing snapshot refreshes.',
    },
  },
  liveSystem: FALLBACK_LIVE_SYSTEM_SNAPSHOT,
}
