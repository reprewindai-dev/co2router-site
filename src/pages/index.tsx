import Head from 'next/head'
import Link from 'next/link'
import { Clock3, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react'

import { PublicSiteShell } from '@/components/public/PublicSiteShell'

const pillars = [
  {
    icon: Clock3,
    title: 'Execution-time policy',
    body: 'CO2 Router evaluates carbon policy when a workload is ready to run, not after the fact.',
  },
  {
    icon: FileCheck2,
    title: 'Recorded decision',
    body: 'Each live decision is written down with the action, proof reference, and timestamp attached.',
  },
  {
    icon: ShieldCheck,
    title: 'Sandbox-safe demo',
    body: 'The public demo uses demo jobs only and routes through ecobe-mvp, never private customer data.',
  },
] as const

export default function IndexPage() {
  return (
    <PublicSiteShell>
      <Head>
        <title>CO2 Router | Carbon policy at execution time</title>
        <meta
          name="description"
          content="CO2 Router evaluates carbon policy at execution time and records the decision. Public traffic stays brokered through ecobe-mvp, with a real live demo in sandbox mode."
        />
      </Head>

      <div className="space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.92),rgba(3,8,20,0.98))] p-6 shadow-2xl shadow-cyan-950/10 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
            <Sparkles className="h-4 w-4" />
            Public website
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
              Live demo included
            </span>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-7xl">
                CO2 Router evaluates carbon policy at execution time and records the decision.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                The public site explains the product, the pricing model, and the live demo. The demo
                is real: it sends sandbox jobs to ecobe-mvp, receives the backend decision, and shows
                the resulting action and proof trail.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/live"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                >
                  Open live demo
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  View pricing
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Positioning</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/8 px-4 py-3">
                  <div className="text-sm font-semibold text-emerald-100">Timing matters</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    The system decides at the moment execution is about to happen.
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/8 px-4 py-3">
                  <div className="text-sm font-semibold text-cyan-100">Proof matters</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    The decision is recorded with a proof identifier and a visible timestamp.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-sm font-semibold text-white">Public demo only</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Sandbox jobs only. No private customer data. No direct engine access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/10"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                <Icon className="h-5 w-5 text-cyan-200" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">What buyers get</div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
              <p>
                A public explanation of how execution-time carbon policy works, why proof matters,
                and how the system avoids private data exposure in the demo.
              </p>
              <p>
                The public site keeps the product framing clean. It shows the commercial offer and the
                live proof surface without exposing internal engine-only controls.
              </p>
            </div>
          </article>

          <article className="rounded-[28px] border border-cyan-300/15 bg-cyan-300/8 p-6">
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Current path</div>
            <div className="mt-4 text-2xl font-semibold text-white">
              Public site to live demo to ecobe-mvp
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              The site never talks to ecobe-engine-claude. The live demo posts demo jobs to the local
              app route, which proxies to ecobe-mvp and renders the real response.
            </p>
          </article>
        </section>
      </div>
    </PublicSiteShell>
  )
}
