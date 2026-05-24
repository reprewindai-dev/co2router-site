'use client'

import Link from 'next/link'
import { useState } from 'react'

import { commercialDoctrinePoints, masterDistributionDoctrine } from '@/content/master-distribution'
import { LiveRoutingDemo } from '@/components/landing/LiveRoutingDemo'

export function CommercialHomePage() {
  const [demoRunSignal, setDemoRunSignal] = useState(0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 pt-3 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/8 bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-sm font-black text-emerald-200">
            CO2
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
            {masterDistributionDoctrine.eyebrow}
          </div>

          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
            {masterDistributionDoctrine.commercialHeroTitle}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            {masterDistributionDoctrine.commercialHeroBody}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDemoRunSignal((value) => value + 1)}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition duration-200 hover:translate-y-[-1px] hover:brightness-105"
            >
              Run governed decision
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {commercialDoctrinePoints.slice(0, 3).map((point) => (
              <span
                key={point}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200"
              >
                {point}
              </span>
            ))}
          </div>
        </div>

        <LiveRoutingDemo externalRunSignal={demoRunSignal} />
      </section>

      <section className="grid gap-4 rounded-[28px] border border-white/8 bg-white/[0.025] px-6 py-5 sm:grid-cols-2 sm:px-8 xl:grid-cols-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Category</div>
          <p className="mt-2 text-sm leading-7 text-slate-300">{masterDistributionDoctrine.category}</p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Doctrine</div>
          <p className="mt-2 text-sm leading-7 text-slate-300">{masterDistributionDoctrine.doctrineLine}</p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Proof</div>
          <p className="mt-2 text-sm leading-7 text-slate-300">{masterDistributionDoctrine.proofLine}</p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Operator Contract</div>
          <p className="mt-2 text-sm leading-7 text-slate-300">{masterDistributionDoctrine.bindingLine}</p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">HaloGrid governance surfaces</h2>
          <p className="mt-2 text-slate-400">{masterDistributionDoctrine.authorityLine}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-b from-slate-900/50 to-slate-950 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20">
                <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">HaloGrid Classic</h3>
                <p className="text-sm text-cyan-400">Grid Interface</p>
              </div>
            </div>
            <p className="mb-6 text-slate-400">
              The classic operator view for deterministic pre-execution governance. Inspect signal
              posture, binding actions, and proof status in one tight control surface.
            </p>
            <ul className="mb-6 space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Five binding actions on the live decision stream
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Lowest Defensible Signal Doctrine in operator view
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Governance lease posture and degraded-state visibility
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                SHA-256 ProofHash on every frame
              </li>
            </ul>
            <Link
              href="/live"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/20 px-6 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/30"
            >
              Open Classic Grid
            </Link>
          </div>

          <div className="rounded-[28px] border border-purple-400/20 bg-gradient-to-b from-slate-900/50 to-slate-950 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/20">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">HaloGrid 3D</h3>
                <p className="text-sm text-purple-400">Globe Interface</p>
              </div>
            </div>
            <p className="mb-6 text-slate-400">
              The 3D globe view is being hardened against the same broker-backed runtime contract.
              Until every globe label is backend-sourced, it opens the truthful live surface.
            </p>
            <ul className="mb-6 space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Broker-backed command state only
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                No simulated lanes, labels, or proof frames
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Real-time broker health and decision availability
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Proof and replay posture shown only when the backend exposes it
              </li>
            </ul>
            <Link
              href="/live"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-400/20 px-6 text-sm font-semibold text-purple-300 transition hover:bg-purple-400/30"
            >
              Open Live Surface
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
