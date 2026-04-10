# HalOGrid Binding Map

This shell now renders from the live control-surface layer only.

## Mock-to-live mapping

- Synthetic `STATE.decisions` -> `CommandCenterSnapshot.decisionCore.recentDecisions`
- Synthetic selected frame -> `CommandCenterSnapshot.selectedDecisionFrameId`
- Synthetic `STATE.metrics` -> `CommandCenterSnapshot.health.latency`
- Synthetic `STATE.impact` -> `CommandCenterSnapshot.impact`
- Hardcoded provider list -> `CommandCenterSnapshot.health.providers`
- `generateCandidates()` -> `DecisionTraceRawRecord.payload.normalizedSignals.candidates`
- Fake proof/trace/replay flags -> `DecisionTraceRawRecord.traceHash`, `DecisionTraceRawRecord.payload.proof`, `ReplayBundle.deterministicMatch`
- Fake world-map region posture -> `CommandCenterSnapshot.world.nodes`
- Fake world-map flows -> `CommandCenterSnapshot.world.flows`

## Removed simulation paths

- `placeholderData` hydration in `useCommandCenterSnapshot`
- `placeholderData` hydration in `useLiveSystemSnapshot`
- HalOGrid watchdog-driven self-heal refetch loop
- Timer-based intelligence recomputation that implied synthetic live updates

## Cumulative vs frame-scoped impact

- `CommandCenterSnapshot.impact` now carries cumulative platform totals for the shell:
  - `totalDecisions`
  - `carbonAvoidedKg`
  - `carbonReductionMultiplier`
  - `waterShiftedLiters`
  - `costOptimizedUsd`
  - `delayedDecisions`
- `CommandCenterSnapshot.governance.impact` remains frame-scoped posture only:
  - `carbonReductionPct`
  - `waterImpactDeltaLiters`
  - `signalConfidence`
  - `constraintsApplied`
  - `cacheHit`
