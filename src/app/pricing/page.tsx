import Link from 'next/link'

import { masterDistributionDoctrine } from '@/content/master-distribution'
import { pricingTiers } from '@/lib/pricing'

export default function PricingPage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="surface-card-strong p-8">
        <div className="eyebrow">Pricing</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Charge for control, enforcement, and proof.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          CO2 Router is sold as the {masterDistributionDoctrine.authorityLine.toLowerCase()}. The
          commercial surface is tied to binding decisions, enforcement, proof, and governance
          depth, not to seat-count reporting software.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {pricingTiers.map((tier) => (
          <div key={tier.name} className="surface-card flex h-full flex-col p-6">
            <div className="eyebrow">{tier.name}</div>
            <div className="mt-4 text-3xl font-semibold text-white">{tier.price}</div>
            <div className="mt-4 text-sm font-semibold leading-6 text-slate-100">{tier.entry}</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{tier.description}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">{tier.scale}</div>
            <div className="mt-5 space-y-3">
              {tier.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-3 text-sm leading-7 text-slate-300">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[rgba(109,225,255,0.95)]" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
            <Link
              href="/access"
              className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              {tier.ctaLabel}
            </Link>
          </div>
        ))}
      </section>

      <section className="surface-card p-8">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="eyebrow">Commercial model</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Package the control plane around decisions and governance depth.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300">
              <div className="text-base font-semibold text-white">Entry path</div>
              Start with one live decision loop, one control point, and one quality-tiered
              governance lease your team can inspect under real conditions.
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300">
              <div className="text-base font-semibold text-white">Scaling logic</div>
              Commercial expansion follows decision volume, enforcement coverage, adapter depth, and governance requirements rather than seats.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
