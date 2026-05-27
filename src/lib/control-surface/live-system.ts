import 'server-only'

import { fetchEngineJson, hasInternalApiKey } from './engine'
import type {
  LiveSystemDatasetStatus,
  LiveSystemSnapshot,
  LiveSystemTraceLedger,
  LiveSystemReplayResponse,
  LiveSystemTraceResponse,
} from '@/types/control-surface'

type DecisionFeedResponse = {
  decisions: Array<{
    decisionFrameId: string
    createdAt: string
    action?: string
    decisionAction?: string
    reasonCode: string
    selectedRegion: string
    proofHash?: string | null
    traceAvailable?: boolean
    governanceSource?: string | null
    traceHash?: string | null
  }>
}

type CarbonLedgerDecisionFeed = {
  decisions: Array<{
    decisionFrameId: string
    createdAt: string
    baselineRegion: string | null
    chosenRegion: string | null
    baselineCarbonGPerKwh: number | null
    chosenCarbonGPerKwh: number | null
    confidenceScore: number | null
    fallbackUsed: boolean | null
    sourceUsed: string | null
    estimatedFlag: boolean | null
    syntheticFlag: boolean | null
  }>
}

type WaterProvenanceResponse = {
  bundleSchemaVersion?: string
  manifestSchemaVersion?: string
  checkedAt: string
  datasets: Array<{
    name: string
    datasetVersion: string | null
    sourceUrl?: string | null
    manifestHash: string | null
    computedHash: string | null
    verificationStatus: LiveSystemDatasetStatus
  }>
  summary: {
    verified: number
    unverified: number
    missingSource: number
    mismatch: number
  }
}

type SloResponse = {
  samples: number
  p95: {
    totalMs: number
    computeMs: number
  }
  budget: {
    totalP95Ms: number
    computeP95Ms: number
  }
  withinBudget: {
    total: boolean
    compute: boolean
  }
}

const REQUIRED_DATASETS = ['aqueduct', 'aware', 'wwf', 'nrel'] as const
const FAST_DECISION_FEED_TIMEOUT_MS = 4_000

function unavailableTraceLedger(error: string): LiveSystemTraceLedger {
  return {
    available: false,
    error,
    traceAvailable: false,
    traceHash: null,
    inputSignalHash: null,
    sequenceNumber: null,
    proofAvailable: false,
    replayConsistent: null,
  }
}

export async function getLiveSystemSnapshot(): Promise<LiveSystemSnapshot> {
  const [decisionsResult, ledgerDecisionsResult, provenanceResult, sloResult] = await Promise.allSettled([
    fetchEngineJson<DecisionFeedResponse>('/ci/decisions?limit=5', undefined, {
      timeoutMs: FAST_DECISION_FEED_TIMEOUT_MS,
    }),
    fetchEngineJson<CarbonLedgerDecisionFeed>('/dashboard/carbon-ledger-decisions?limit=5'),
    fetchEngineJson<WaterProvenanceResponse>('/water/provenance'),
    fetchEngineJson<SloResponse>('/ci/slo'),
  ])

  const ciDecisions =
    decisionsResult.status === 'fulfilled'
      ? decisionsResult.value.decisions.map((decision) => ({
          decisionFrameId: decision.decisionFrameId,
          createdAt: decision.createdAt,
          action: decision.action ?? decision.decisionAction ?? 'unknown',
          reasonCode: decision.reasonCode,
          selectedRegion: decision.selectedRegion,
          proofHash: decision.proofHash ?? null,
          traceAvailable: Boolean(decision.traceAvailable),
          governanceSource: decision.governanceSource ?? null,
          traceHash: decision.traceHash ?? null,
        }))
      : []
  const ledgerDecisions =
    ledgerDecisionsResult.status === 'fulfilled'
      ? ledgerDecisionsResult.value.decisions
          .filter((decision) => Boolean(decision.decisionFrameId && decision.chosenRegion))
          .map((decision) => {
            const baseline = decision.baselineRegion ?? decision.chosenRegion ?? 'unknown'
            const chosen = decision.chosenRegion ?? baseline
            const rerouted = baseline !== chosen
            return {
              decisionFrameId: decision.decisionFrameId,
              createdAt: decision.createdAt,
              action: rerouted ? 'reroute' : 'run_now',
              reasonCode: rerouted ? 'CARBON_LEDGER_REROUTE_FRAME' : 'CARBON_LEDGER_RUN_FRAME',
              selectedRegion: chosen,
              proofHash: null,
              traceAvailable: false,
              governanceSource: 'CARBON_LEDGER',
              traceHash: null,
            }
          })
      : []
  const recentDecisions = ciDecisions.length > 0 ? ciDecisions : ledgerDecisions

  if (decisionsResult.status === 'rejected') {
    if (ledgerDecisions.length === 0) {
      throw decisionsResult.reason instanceof Error
        ? decisionsResult.reason
        : new Error('Live decision feed is unavailable.')
    }
  }

  const latestDecision = recentDecisions[0] ?? null

  const traceResult =
    latestDecision &&
    latestDecision.traceAvailable &&
    hasInternalApiKey()
      ? await Promise.allSettled([
          fetchEngineJson<LiveSystemTraceResponse>(
            `/ci/decisions/${encodeURIComponent(latestDecision.decisionFrameId)}/trace`,
            undefined,
            { internal: true, timeoutMs: 4_000 }
          ),
          fetchEngineJson<LiveSystemReplayResponse>(
            `/ci/decisions/${encodeURIComponent(latestDecision.decisionFrameId)}/replay`,
            undefined,
            { internal: true, timeoutMs: 4_000 }
          ),
        ])
      : null

  const traceResponse =
    traceResult?.[0]?.status === 'fulfilled' ? traceResult[0].value : null
  const replayResponse =
    traceResult?.[1]?.status === 'fulfilled' ? traceResult[1].value : null

  const traceError =
    !latestDecision
      ? 'No recent decision is available for trace inspection.'
      : latestDecision.governanceSource === 'CARBON_LEDGER'
        ? 'Latest frame is from the carbon ledger; trace/replay is not attached to this record yet.'
      : !latestDecision.traceAvailable
        ? 'Trace details are not attached to the latest live decision yet.'
      : !hasInternalApiKey()
        ? latestDecision.traceHash
          ? 'Deep trace details require the internal broker key; public trace hash is attached.'
          : 'Trace details are unavailable for this snapshot.'
        : traceResult?.[0]?.status === 'rejected'
          ? traceResult[0].reason instanceof Error
            ? traceResult[0].reason.message
            : 'Failed to load trace data.'
          : null

  const replayError =
    !latestDecision
      ? 'No recent decision is available for replay verification.'
      : latestDecision.governanceSource === 'CARBON_LEDGER'
        ? 'Replay verification is waiting for the CI trace envelope for this carbon-ledger frame.'
      : !latestDecision.traceAvailable
        ? 'Replay verification is waiting for a persisted trace frame.'
      : !hasInternalApiKey()
        ? 'Replay verification requires the internal broker key.'
        : traceResult?.[1]?.status === 'rejected'
          ? traceResult[1].reason instanceof Error
            ? traceResult[1].reason.message
            : 'Failed to load replay data.'
          : null

  const provenanceDatasets =
    provenanceResult.status === 'fulfilled'
      ? REQUIRED_DATASETS.map((datasetName) => {
          const match = provenanceResult.value.datasets.find(
            (dataset) => dataset.name.toLowerCase() === datasetName
          )
          return {
            name: datasetName,
            verificationStatus: match?.verificationStatus ?? 'unavailable',
            datasetVersion: match?.datasetVersion ?? null,
            manifestHash: match?.manifestHash ?? null,
            computedHash: match?.computedHash ?? null,
          }
        })
      : REQUIRED_DATASETS.map((datasetName) => ({
          name: datasetName,
          verificationStatus: 'unavailable' as const,
          datasetVersion: null,
          manifestHash: null,
          computedHash: null,
        }))

  const traceLedger = traceResponse
    ? {
        available: true,
        error: replayError,
        traceAvailable: Boolean(traceResponse.traceAvailable),
        traceHash: traceResponse.traceHash ?? null,
        inputSignalHash: traceResponse.inputSignalHash ?? null,
        sequenceNumber: traceResponse.sequenceNumber ?? null,
        proofAvailable: Boolean(traceResponse.proofHash),
        replayConsistent:
          replayResponse?.deterministicMatch ?? replayResponse?.consistent ?? null,
      }
    : latestDecision?.traceAvailable
      ? {
          available: Boolean(latestDecision.traceHash ?? latestDecision.proofHash),
          error: traceError,
          traceAvailable: true,
          traceHash: latestDecision.traceHash ?? null,
          inputSignalHash: null,
          sequenceNumber: null,
          proofAvailable: Boolean(latestDecision.proofHash),
          replayConsistent: null,
        }
      : unavailableTraceLedger(traceError ?? 'Trace is unavailable.')

  return {
    generatedAt: new Date().toISOString(),
    recentDecisions: {
      available: decisionsResult.status === 'fulfilled' || ledgerDecisions.length > 0,
      error: recentDecisions.length === 0 ? 'No recent public decisions are available yet.' : null,
      items: recentDecisions,
    },
    traceLedger,
    governance: {
      available: Boolean(traceResponse) || Boolean(latestDecision?.governanceSource),
      error: traceError,
      frameworkLabel: 'SAIQ',
      active: traceResponse
        ? traceResponse.governanceSource !== 'NONE'
        : latestDecision?.governanceSource
          ? latestDecision.governanceSource !== 'NONE'
          : null,
      policyState: traceResponse?.governanceSource ?? latestDecision?.governanceSource ?? null,
      latestDecisionAction: traceResponse?.action ?? latestDecision?.action ?? null,
      latestReasonCode: traceResponse?.reasonCode ?? latestDecision?.reasonCode ?? null,
    },
    providers: {
      available: provenanceResult.status === 'fulfilled',
      error:
        provenanceResult.status === 'rejected'
          ? provenanceResult.reason instanceof Error
            ? provenanceResult.reason.message
            : 'Failed to load provenance status.'
          : null,
      datasets: provenanceDatasets,
    },
    latency: {
      available: sloResult.status === 'fulfilled',
      error:
        sloResult.status === 'rejected'
          ? sloResult.reason instanceof Error
            ? sloResult.reason.message
            : 'Failed to load latency metrics.'
          : null,
      samples: sloResult.status === 'fulfilled' ? sloResult.value.samples : null,
      p95TotalMs: sloResult.status === 'fulfilled' ? sloResult.value.p95.totalMs : null,
      p95ComputeMs: sloResult.status === 'fulfilled' ? sloResult.value.p95.computeMs : null,
      budgetTotalP95Ms:
        sloResult.status === 'fulfilled' ? sloResult.value.budget.totalP95Ms : null,
      budgetComputeP95Ms:
        sloResult.status === 'fulfilled' ? sloResult.value.budget.computeP95Ms : null,
      withinBudget:
        sloResult.status === 'fulfilled'
          ? {
              total: sloResult.value.withinBudget.total,
              compute: sloResult.value.withinBudget.compute,
            }
          : {
              total: null,
              compute: null,
            },
    },
  }
}
