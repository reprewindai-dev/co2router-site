import Link from 'next/link'

import { CicdWorkloadDemo } from '@/components/landing/CicdWorkloadDemo'

export function CommercialHomePage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="grid gap-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Live execution authority
          </div>
          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
            Decide if your jobs run — before they run
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            One job. Different conditions. Different outcomes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#demo"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-105"
            >
              Run the demo
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/40"
            >
              Get early access
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-500">No setup. Takes 2 seconds.</p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">What it does</div>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <p>Looks at the job before execution.</p>
            <p>Applies the active policy to the current environment.</p>
            <p>Returns a clear action: run, delay, block, or wait.</p>
            <p>Shows the result in language operators understand immediately.</p>
          </div>
        </div>
      </section>

      <CicdWorkloadDemo />

      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="max-w-3xl text-center sm:text-left">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
            What just happened
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            The same job was evaluated under different conditions. Each time, the system made a
            different decision.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            Works anywhere compute runs.
          </p>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_36%),linear-gradient(180deg,rgba(5,10,20,0.96),rgba(2,8,18,0.98))] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Conversion</div>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Want this controlling your jobs?
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/access"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90"
            >
              Try your own scenario
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-transparent px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-slate-950"
            >
              Get early access
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
