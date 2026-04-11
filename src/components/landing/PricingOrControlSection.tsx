'use client'

import Link from 'next/link'

import { pricingTiers } from '@/lib/pricing'

export function PricingOrControlSection() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300">Start with control</div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          Package the control plane like infrastructure.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          The homepage now mirrors the live commercial surface: pricing is tied to decisioning,
          enforcement scope, proof, and governance depth instead of low-friction seat plans.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {pricingTiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-[28px] border p-6 ${
              tier.highlightOnLanding
                ? 'border-cyan-300/24 bg-cyan-300/8 shadow-[0_18px_80px_rgba(34,211,238,0.12)]'
                : 'border-white/8 bg-slate-950/55'
            }`}
          >
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {tier.name}
            </div>
            <div className="mt-4 text-4xl font-black tracking-[-0.05em] text-white">
              {tier.price}
            </div>
            <div className="mt-4 text-sm font-semibold leading-6 text-slate-100">{tier.entry}</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{tier.description}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">
              {tier.scale}
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-200">
              {tier.highlights.slice(0, 3).map((feature) => (
                <div key={feature} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
                  {feature}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950"
        >
          Review full pricing
        </Link>
        <Link
          href="/access"
          className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
        >
          Request access
        </Link>
        <Link
          href="/contact"
          className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
        >
          Contact sales
        </Link>
      </div>
    </section>
  )
}
