'use client'

import Link from 'next/link'

import { ActionStrip } from '@/components/landing/ActionStrip'
import { CicdWorkloadDemo } from '@/components/landing/CicdWorkloadDemo'
import { FinalCTASection } from '@/components/landing/FinalCTASection'
import { HeroMotionSurface } from '@/components/landing/HeroMotionSurface'
import { LiveSystemSection } from '@/components/landing/LiveSystemSection'
import { PricingOrControlSection } from '@/components/landing/PricingOrControlSection'
import { ProofMoatSection } from '@/components/landing/ProofMoatSection'
import { SignalDoctrineSection } from '@/components/landing/SignalDoctrineSection'
import { useControlSurfaceOverview } from '@/lib/hooks/control-surface'

export function CommercialHomePage() {
  const overviewQuery = useControlSurfaceOverview()
  const overview = overviewQuery.data ?? null
  const liveDecision = overview?.decisions[0] ?? null
  const replay = overview?.replay ?? null
  const actionDistribution = overview?.actionDistribution ?? []
  const providers = overview?.providers ?? []

  const statusLabel = overview
    ? overview.service.status
    : overviewQuery.isError
      ? 'live data unavailable'
      : 'live data connecting'

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Live control plane
            </span>
            <span>Real routing, proof, replay, and provenance.</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200">
              {statusLabel}
            </span>
            <Link
              href="/pricing"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>

      <HeroMotionSurface liveDecision={liveDecision} />

      <section className="space-y-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Routing mix</div>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            The decision mix is live, not staged.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            This strip reflects the current distribution returned by the control plane. No static
            marketing percentages, no invented run states.
          </p>
        </div>
        <ActionStrip distribution={actionDistribution} />
      </section>

      <LiveSystemSection />

      <SignalDoctrineSection providers={providers} />

      <ProofMoatSection replay={replay} />

      <PricingOrControlSection />

      <CicdWorkloadDemo />

      <FinalCTASection />
    </div>
  )
}
