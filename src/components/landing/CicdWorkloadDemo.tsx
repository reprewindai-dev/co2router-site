import Link from 'next/link'

import { DecisionCard } from '@/components/landing/DecisionCard'
import { decisionExamples } from '@/lib/demo-data'

export function CicdWorkloadDemo() {
  return (
    <section id="demo" className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Live decision panel</div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          One job. Different conditions. Different outcomes.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          The same job was evaluated under different conditions. Each time, the system made a
          different decision.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
          <div className="space-y-1 text-sm text-slate-300">
            <p>
              Job: <span className="font-semibold text-white">Payment Service Deployment</span>
            </p>
            <p>
              Environment:{' '}
              <span className="font-semibold text-white">Production / Staging / Experiment</span>
            </p>
            <p>
              Policy: <span className="font-semibold text-white">Active</span>
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {decisionExamples.map((decision) => (
              <DecisionCard key={decision.label} {...decision} />
            ))}
          </div>

          <div className="mt-5 text-xs uppercase tracking-[0.22em] text-slate-500">
            Decision time: 280ms
          </div>
        </div>

        <div className="flex h-full flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">What you see</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>Production runs now because it meets policy.</p>
              <p>Staging is delayed because it is lower priority.</p>
              <p>Experiment is blocked because policy rejects it.</p>
              <p>Over limit is blocked because the thresholds are exceeded.</p>
              <p>Approval is waiting because a human must approve it.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/access"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/40"
            >
              Try your own scenario
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-105"
            >
              Get early access
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
