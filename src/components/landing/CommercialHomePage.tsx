'use client'

import Link from 'next/link'
import { useState } from 'react'

import { LiveRoutingDemo } from '@/components/landing/LiveRoutingDemo'

export function CommercialHomePage() {
  const [demoRunSignal, setDemoRunSignal] = useState(0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 pt-3 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/8 bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-sm font-black text-emerald-200">
            CO₂
          </div>
          <div className="text-sm font-semibold tracking-[-0.03em] text-white">CO2 Router</div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/console"
            className="rounded-full border border-cyan-400/25 bg-cyan-400/8 px-4 py-2 text-cyan-200 transition hover:border-cyan-400/40 hover:text-white"
          >
            Console
          </Link>
          <Link
            href="/developers/quickstart"
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-slate-300 transition hover:border-white/15 hover:text-white"
          >
            Docs
          </Link>
          <Link
            href="/access"
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-slate-300 transition hover:border-white/15 hover:text-white"
          >
            Pilot
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-slate-300 transition hover:border-white/15 hover:text-white"
          >
            Contact
          </Link>
        </nav>
      </header>

      <section className="grid gap-8 rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.07),transparent_28%),linear-gradient(180deg,rgba(10,14,22,0.96),rgba(5,7,12,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:p-10">
        <div className="max-w-2xl pt-1">
          <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
            PRE-EXECUTION CONTROL
          </div>

          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
            Decide what runs. Before it runs.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            CO₂ Router evaluates workloads against carbon, water, cost, latency, and policy rules
            before execution — then returns a binding decision with proof.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDemoRunSignal((value) => value + 1)}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition duration-200 hover:translate-y-[-1px] hover:brightness-105"
            >
              Run your own job
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Five binding actions • Replayable proof • Live decisioning
          </p>
        </div>

        <LiveRoutingDemo externalRunSignal={demoRunSignal} />
      </section>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.025] px-6 py-5 text-sm leading-7 text-slate-400 sm:px-8">
        The same workload can run, reroute, delay, throttle, or deny based on live policy and
        resource conditions.
      </section>
    </div>
  )
}
