'use client'

import { useLiveSystemSnapshot } from '@/lib/hooks/control-surface'
import { GovernancePanel } from './GovernancePanel'
import { LatencyPanel } from './LatencyPanel'
import { ProviderVerificationPanel } from './ProviderVerificationPanel'
import { RecentDecisionsList } from './RecentDecisionsList'
import { TraceLedgerPanel } from './TraceLedgerPanel'

export function LiveSystemSection() {
  const liveSystemQuery = useLiveSystemSnapshot()
  const snapshot = liveSystemQuery.data ?? null

  if (!snapshot) {
    return (
      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Live System</div>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Real execution authority. Real trace. Real replay.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            Live control-plane data is connecting. The page stays truthful instead of substituting
            fabricated state.
          </p>
        </div>
        <div className="mt-8 rounded-[28px] border border-dashed border-white/10 bg-slate-950/45 p-6 text-sm leading-7 text-slate-300">
          {liveSystemQuery.isError
            ? 'Live system data is reconnecting right now. The surface stays visible while fresh execution data reattaches.'
            : 'Waiting for the live system snapshot to attach.'}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Live System</div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          Real execution authority. Real trace. Real replay.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          This section is bound to live engine outputs. It exposes recent decisions, trace and
          replay posture, SAIQ governance state, verified water datasets, and the current p95
          latency window.
        </p>
        {liveSystemQuery.error ? (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            Live system data is reconnecting. The section shell stays visible while fresh trace,
            latency, and provenance state reattach.
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentDecisionsList decisions={snapshot.recentDecisions} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TraceLedgerPanel traceLedger={snapshot.traceLedger} />
          <GovernancePanel governance={snapshot.governance} />
          <ProviderVerificationPanel providers={snapshot.providers} />
          <LatencyPanel latency={snapshot.latency} />
        </div>
      </div>
    </section>
  )
}
