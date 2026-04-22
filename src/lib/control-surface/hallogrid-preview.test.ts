import assert from 'node:assert/strict'
import test from 'node:test'

import type { HallOGridSnapshot } from '../../types/control-surface'
import {
  mergePreviewNode,
  previewFrameId,
  previewReasonLabel,
  redactPreviewSnapshot,
  softenPreviewNode,
  softenPreviewRuntimeState,
  toPreviewTimestamp,
} from './hallogrid-preview'

function buildSnapshot(): HallOGridSnapshot {
  return {
    generatedAt: '2026-04-09T15:27:45.000Z',
    selectedFrameId: 'frame-0001-us-west-2',
    title: 'HalOGrid',
    subtitle: 'Powered by CO2 Router',
    access: {
      tenantId: 'tenant-alpha',
      entitlements: ['public_preview'],
      role: 'viewer',
      mode: 'public_preview',
      label: 'HalOGrid Freeview',
      isReadOnlyPreview: true,
      canViewOperatorConsole: false,
      canAccessControls: false,
      canManageDoctrine: false,
      canViewCompliance: false,
      redactionDelayMinutes: 7,
      upgradePrompts: [],
      proHighlights: [],
      upgradeUrl: '/upgrade',
    },
    mirror: {
      tenantId: 'tenant-alpha',
      generatedAt: '2026-04-09T15:27:45.000Z',
      sourceFreshnessSec: 42,
      freshnessBudgetSec: 120,
      safeDelayWindowSec: 5400,
      mirrorMode: 'hot',
      degraded: true,
      degradedReason: 'Source freshness exceeded budget.',
      laneBudgets: {
        hotP95Ms: 100,
        warmP95Ms: 250,
        coldQueued: true,
      },
      metrics: {
        decisionP50Ms: 18,
        decisionP95Ms: 31,
        decisionP99Ms: 44,
        consoleSnapshotP50Ms: 18,
        consoleSnapshotP95Ms: 31,
        providerRefreshAgeSec: 42,
        mirrorGenerationMs: 12.4,
        replayGenerationMs: null,
        exportQueueDepth: 0,
      },
    },
    projection: {
      dataStatus: 'live',
      projectionLagSec: 2,
      quality: { suspectCount: 0, invalidCount: 0 },
      outbox: { pending: 0, failed: 0 },
    },
    selectedFrame: null,
    frames: [
      {
        id: 'frame-0001-us-west-2',
        createdAt: '2026-04-09T15:27:45.000Z',
        action: 'delay',
        region: 'us-west-2',
        reasonCode: 'SEKED_POLICY_RED_ZONE',
        reasonLabel: 'SEKED POLICY RED ZONE',
        workloadClass: 'batch',
        proofState: 'available',
        replayState: 'verified',
        traceState: 'locked',
        governanceSource: 'SEKED_INTERNAL_V1',
        explanation: {
          headline: 'Delay | us-west-2',
          dominantConstraint: 'water',
          counterfactual: 'reroute available',
        },
        trust: {
          tier: 'medium',
          freshnessLabel: 'fresh',
          replayability: 'trace-backed',
          degraded: false,
          summary: 'stable',
        },
        metrics: {
          totalLatencyMs: 15,
          computeLatencyMs: 10,
          carbonReductionPct: 22,
          waterImpactDeltaLiters: -12,
          signalConfidence: 0.62,
        },
        runtime: {
          signalMode: 'marginal',
          accountingMethod: 'marginal',
          waterAuthorityMode: 'basin',
          fallbackUsed: false,
          systemState: 'blocked',
        },
      },
    ],
    world: {
      nodes: [
        {
          region: 'us-west-2',
          label: 'US West 2',
          x: 10,
          y: 30,
          state: 'blocked',
          decisionFrameId: 'frame-0001-us-west-2',
          action: 'delay',
          reasonCode: 'SEKED_POLICY_RED_ZONE',
          confidenceTier: 'medium',
          freshnessState: 'degraded',
          pressureLevel: 'high',
          signalConfidence: 0.62,
          decisionState: 'blocked',
          providerHealth: { healthy: 1, degraded: 2, offline: 0 },
          selected: true,
          lastChangedAt: '2026-04-09T15:27:45.000Z',
          routePressure: 3,
          blockedFocusLanes: 1,
        },
        {
          region: 'us-west-3',
          label: 'US West 3',
          x: 30,
          y: 50,
          state: 'active',
          decisionFrameId: 'frame-0002-us-west-3',
          action: 'run_now',
          reasonCode: 'ALLOW',
          confidenceTier: 'high',
          freshnessState: 'fresh',
          pressureLevel: 'low',
          signalConfidence: 0.94,
          decisionState: 'run',
          providerHealth: { healthy: 3, degraded: 0, offline: 0 },
          selected: false,
          lastChangedAt: '2026-04-09T15:28:10.000Z',
          routePressure: 1,
          blockedFocusLanes: 0,
        },
        {
          region: 'us-east-1',
          label: 'US East 1',
          x: 70,
          y: 20,
          state: 'blocked',
          decisionFrameId: 'frame-0003-us-east-1',
          action: 'run_now',
          reasonCode: 'FALLBACK_SIGNAL',
          confidenceTier: 'low',
          freshnessState: 'stale',
          pressureLevel: 'medium',
          signalConfidence: 0.41,
          decisionState: 'blocked',
          providerHealth: { healthy: 0, degraded: 1, offline: 2 },
          selected: false,
          lastChangedAt: '2026-04-09T15:29:20.000Z',
          routePressure: 5,
          blockedFocusLanes: 2,
        },
      ],
      flows: [
        { id: 'flow-1', fromRegion: 'us-west-2', toRegion: 'us-east-1', mode: 'route' },
        { id: 'flow-2', fromRegion: 'us-west-3', toRegion: 'us-east-1', mode: 'blocked' },
        { id: 'flow-3', fromRegion: 'us-west-2', toRegion: 'us-west-3', mode: 'route' },
      ],
    },
    governance: {
      frameworkLabel: 'SAIQ',
      source: 'SEKED_INTERNAL_V1',
      active: true,
      strict: true,
      enforcementMode: 'binding',
      selectedScore: 0.72,
      thresholds: { amberMin: 0.45, redMin: 0.7 },
      weights: { carbon: 0.4, water: 0.35, latency: 0.15, cost: 0.1 },
      impact: {
        carbonReductionPct: 22,
        waterImpactDeltaLiters: -12,
        signalConfidence: 0.62,
        constraintsApplied: 4,
        cacheHit: true,
      },
    },
    traceStream: {
      items: [
        {
          decisionFrameId: 'frame-0001-us-west-2',
          createdAt: '2026-04-09T15:27:45.000Z',
          action: 'delay',
          region: 'us-west-2',
          reasonCode: 'SEKED_POLICY_RED_ZONE',
          proofAvailable: true,
          traceAvailable: true,
          governanceSource: 'SEKED_INTERNAL_V1',
          replayVerified: true,
        },
      ],
    },
    health: {
      service: {
        status: 'healthy',
        proofPosture: 'assurance_ready',
        detail: 'healthy',
      },
      latency: {
        available: true,
        error: null,
        samples: 12,
        p95TotalMs: 31,
        p95ComputeMs: 22,
        budgetTotalP95Ms: 100,
        budgetComputeP95Ms: 50,
        withinBudget: { total: true, compute: true },
      },
      provenance: {
        available: true,
        error: null,
        datasets: [],
      },
      providers: [],
    },
    transport: {
      mode: 'snapshot+stream',
      streamHealthy: true,
      snapshotUrl: '/api/control-surface/hallogrid',
      streamUrl: '/api/control-surface/hallogrid/stream',
      adapters: [],
    },
  }
}

test('softenPreviewRuntimeState downgrades blocked delay and fallback states', () => {
  assert.equal(softenPreviewRuntimeState('blocked', 'delay', 'SEKED_POLICY_RED_ZONE'), 'marginal')
  assert.equal(softenPreviewRuntimeState('blocked', 'run_now', 'fallback_signal'), 'marginal')
  assert.equal(softenPreviewRuntimeState('active', 'run_now', 'ALLOW'), 'active')
})

test('softenPreviewNode turns guarded blocks into marginal nodes', () => {
  const snapshot = buildSnapshot()
  const softened = softenPreviewNode(snapshot.world.nodes[0]!)
  assert.equal(softened.state, 'marginal')
  assert.equal(softened.decisionState, 'guarded')
})

test('toPreviewTimestamp applies minute redaction and strips seconds', () => {
  assert.equal(toPreviewTimestamp('2026-04-09T15:27:45.000Z', 7), '2026-04-09T15:20:00.000Z')
  assert.equal(toPreviewTimestamp('not-a-date', 7), 'not-a-date')
})

test('preview helpers produce stable operator-safe labels', () => {
  assert.equal(previewFrameId('frame-0001-us-west-2', 3), 'FRAME-04-ST-2')
  assert.equal(previewReasonLabel('SEKED POLICY RED ZONE'), 'Governed Governed Governed')
})

test('mergePreviewNode preserves the riskiest posture while anonymizing selection', () => {
  const snapshot = buildSnapshot()
  const merged = mergePreviewNode(
    softenPreviewNode(snapshot.world.nodes[0]!),
    softenPreviewNode(snapshot.world.nodes[1]!)
  )

  assert.equal(merged.state, 'marginal')
  assert.equal(merged.confidenceTier, 'medium')
  assert.equal(merged.freshnessState, 'degraded')
  assert.equal(merged.pressureLevel, 'high')
  assert.equal(merged.signalConfidence, 0.62)
  assert.equal(merged.selected, false)
  assert.equal(merged.providerHealth?.healthy, 3)
  assert.equal(merged.providerHealth?.degraded, 2)
})

test('redactPreviewSnapshot anonymizes regions, deduplicates flows, and strips selected frame detail', () => {
  const preview = redactPreviewSnapshot(buildSnapshot())

  assert.equal(preview.title, 'HalOGrid Freeview')
  assert.equal(preview.subtitle, 'Public proof surface for HalOGrid, powered by CO2 Router')
  assert.equal(preview.mirror.tenantId, 'public-preview')
  assert.equal(preview.mirror.degradedReason, 'Freshness or provider posture exceeded the safe mirror window.')
  assert.equal(preview.selectedFrame, null)
  assert.equal(preview.selectedFrameId, 'FRAME-01-ST-2')
  assert.equal(preview.generatedAt, '2026-04-09T15:20:00.000Z')

  assert.equal(preview.frames[0]?.region, 'US-WEST')
  assert.equal(preview.frames[0]?.runtime.systemState, 'marginal')
  assert.equal(preview.frames[0]?.reasonLabel, 'Governed Governed Governed')
  assert.match(preview.frames[0]?.explanation.headline ?? '', /Governed delay \| US West/)

  assert.equal(preview.world.nodes.length, 2)
  assert.deepEqual(
    preview.world.nodes.map((node) => node.region).sort(),
    ['US-EAST', 'US-WEST']
  )
  assert.deepEqual(
    preview.world.flows.map((flow) => `${flow.fromRegion}->${flow.toRegion}:${flow.mode}`).sort(),
    ['US-WEST->US-EAST:blocked']
  )
  assert.equal(preview.traceStream.items[0]?.decisionFrameId, 'FRAME-01-ST-2')
  assert.equal(preview.traceStream.items[0]?.reasonCode, 'GOVERNED_PREVIEW')
})
