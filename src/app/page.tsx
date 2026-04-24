'use client'

import { HeroMotionSurface } from '@/components/landing/HeroMotionSurface'
import { ActionStrip } from '@/components/landing/ActionStrip'
import { DecisionExampleCard } from '@/components/landing/DecisionExampleCard'
import { CategoryDifferenceSection } from '@/components/landing/CategoryDifferenceSection'
import { DecisionFlowDiagram } from '@/components/DecisionFlowDiagram'
import { ProofMoatSection } from '@/components/landing/ProofMoatSection'
import { SignalDoctrineSection } from '@/components/landing/SignalDoctrineSection'
import { PricingOrControlSection } from '@/components/landing/PricingOrControlSection'
import { FinalCTASection } from '@/components/landing/FinalCTASection'
import { LiveSystemSection } from '@/components/landing/LiveSystemSection'
import { CicdWorkloadDemo } from '@/components/landing/CicdWorkloadDemo'
import { FALLBACK_OVERVIEW } from '@/lib/control-surface/fallbacks'
import { useControlSurfaceOverview } from '@/lib/hooks/control-surface'

const hallogridSurfaces = [
  {
    title: 'CO2 Grid Freeview',
    detail: 'Public live preview and proof surface. Visitors see the governed mirror without operator control.',
  },
  {
    title: 'CO2 Grid Pro',
    detail: 'Operator surface for Pilot Access and Operator plans, with full decision card, HUD, trace, replay, and workload authority.',
  },
  {
    title: 'CO2 Grid Elite',
    detail: 'Governance and assurance surface with alarms, policy tuning, enforcement export, anomaly detection, and team operations.',
  },
] as const

export default function LandingPage() {
  const overviewQuery = useControlSurfaceOverview()
  const overview = overviewQuery.data

  const decisions = overview?.decisions ?? []
  const providers = overview?.providers ?? FALLBACK_OVERVIEW.providers
  const replay = overview?.replay ?? FALLBACK_OVERVIEW.replay
  const actionDistribution = overview?.actionDistribution ?? FALLBACK_OVERVIEW.actionDistribution
  const liveStrip = [...decisions]
    .sort(
      (a, b) =>
        b.carbonReductionPct + b.waterImpactDeltaLiters - (a.carbonReductionPct + a.waterImpactDeltaLiters)
    )
    .slice(0, 3)
  const heroDecision =
    overview?.featuredDecision &&
    'decisionFrameId' in overview.featuredDecision &&
    !('decision' in overview.featuredDecision)
      ? overview.featuredDecision
      : decisions[0] ?? null
  const featuredDecision =
    overview?.featuredDecision && 'decision' in overview.featuredDecision
      ? overview.featuredDecision
      : overview?.liveDecision ?? null
  const waterProviders = providers.filter((provider) => provider.providerType === 'water')
  const verifiedWaterDatasets = waterProviders.filter(
    (provider) => provider.provenanceStatus === 'verified'
  ).length
  const proofContext = {
    proofRef: featuredDecision?.proofHash ?? null,
    governance:
      featuredDecision && 'policyTrace' in featuredDecision
        ? featuredDecision.policyTrace.profile ??
          featuredDecision.policyTrace.policyVersion ??
          'SAIQ policy trace attached'
        : 'SAIQ policy trace attaches with the live decision frame.',
    traceRef: replay?.decisionFrameId ?? featuredDecision?.decisionFrameId ?? null,
    replay:
      replay == null
        ? 'live proof sample'
        : replay.deterministicMatch
          ? 'deterministic match'
          : 'replay available',
    provenance:
      waterProviders.length > 0
        ? `${verifiedWaterDatasets}/${waterProviders.length} datasets verified`
        : 'verified datasets will attach with live provenance',
  }

  return (
    <div className="space-y-8 pb-8">
      {overviewQuery.error ? (
        <section className="rounded-[24px] border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
          Live control data is temporarily unavailable. The public surface stays resolved while the
          live decision and proof chain reconnect.
        </section>
      ) : null}

      <HeroMotionSurface liveDecision={heroDecision} />

      <section className="rounded-[32px] border border-cyan-300/15 bg-white/[0.03] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">CO2 Grid surface family</div>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Freeview, Pro, and Elite are live now.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            CO2 Grid is the operator surface family for CO2 Router. Freeview is the public proof
            surface. Pro is the operator surface. Elite is the governance and assurance surface.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {hallogridSurfaces.map((surface) => (
            <div key={surface.title} className="rounded-[24px] border border-white/8 bg-slate-950/55 p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">CO2 Grid tier</div>
              <div className="mt-2 text-xl font-semibold text-white">{surface.title}</div>
              <div className="mt-3 text-sm leading-7 text-slate-300">{surface.detail}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/access"
            className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/15 hover:text-white"
          >
            Request Pilot Access
          </a>
          <a
            href="/pricing"
            className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            View CO2 Grid pricing
          </a>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {liveStrip.length > 0
          ? liveStrip.map((decision) => (
              <div
                key={decision.decisionFrameId}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  live decision
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {decision.workloadLabel ?? 'Current execution frame'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-white/[0.04] px-2 py-1">{decision.action}</span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-1">
                    {decision.selectedRegion ?? 'routing region on frame'}
                  </span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-1">
                    {decision.carbonReductionPct != null
                      ? `${decision.carbonReductionPct.toFixed(1)}% carbon delta`
                      : 'carbon delta on frame'}
                  </span>
                </div>
              </div>
            ))
          : [
              {
                title: 'Execution authority',
                detail: 'The shell resolves immediately so visitors understand the control plane before live data attaches.',
              },
              {
                title: 'Proof chain',
                detail: 'Trace, replay, and provenance attach to the same decision frame instead of replacing the page with a loading state.',
              },
              {
                title: 'Governance',
                detail: 'SAIQ and policy state remain visible as product structure while the current live frame attaches.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  stable shell
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{item.title}</div>
                <div className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</div>
              </div>
            ))}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">What it does</div>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            You do not optimize infrastructure anymore.
            <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              You control it.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            A workload asks to run. CO2 Router co-evaluates carbon, water, latency, and cost.
            SAIQ governance and policy constraints return one of five binding actions before
            execution. The executor follows the decision. Proof, trace, replay, and provenance stay
            attached to the same frame.
          </p>
        </div>
        <div className="mt-8">
          <ActionStrip distribution={actionDistribution} />
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300">Real scenarios</div>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Make buyers see themselves in the control plane immediately.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            CO2 Router becomes harder to dismiss when the public surface shows the exact moments where
            teams run blind today: a release pipeline in the wrong window, a batch queue in the wrong
            region, or an audit question with no proof attached.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[
            {
              title: 'Heavy CI run during a carbon spike',
              detail:
                'A release pipeline reaches a high-emissions window under a tight latency envelope. CO2 Router evaluates policy, water, latency, and carbon first, then reroutes or delays before the run burns budget and trust.',
            },
            {
              title: 'Kubernetes batch in a constrained region',
              detail:
                'Batch work is ready to launch, but the region posture is poor. CO2 Router keeps interactive traffic flowing while delaying or rerouting the batch workload under the current policy envelope.',
            },
            {
              title: 'Water-sensitive approval boundary',
              detail:
                'A region looks acceptable on carbon alone, but water guardrails are tighter. The engine blocks or defers because water constraints outrank pure carbon optimization in the doctrine order.',
            },
            {
              title: 'Audit replay after a region decision',
              detail:
                'A reviewer asks why a workload ran where it did. CO2 Router replays the decision frame, exposing trace, replay, proof, and governance metadata instead of forcing the team to reconstruct the answer from logs.',
            },
          ].map((scenario) => (
            <div key={scenario.title} className="rounded-[24px] border border-white/8 bg-slate-950/55 p-5">
              <div className="text-lg font-semibold text-white">{scenario.title}</div>
              <div className="mt-3 text-sm leading-7 text-slate-300">{scenario.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <DecisionFlowDiagram />
      </section>

      <CicdWorkloadDemo />

      <DecisionExampleCard decision={featuredDecision} proofContext={proofContext} />

      <CategoryDifferenceSection />

      <ProofMoatSection replay={replay} />
      <SignalDoctrineSection providers={providers} />
      <PricingOrControlSection />
      <FinalCTASection />
      <LiveSystemSection />
    </div>
  )
}
