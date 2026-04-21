import Head from 'next/head'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

import { PublicSiteShell } from '@/components/public/PublicSiteShell'
import { pricingTiers } from '@/lib/pricing'

export default function PricingPage() {
  return (
    <PublicSiteShell>
      <Head>
        <title>CO2 Router Pricing</title>
        <meta
          name="description"
          content="Public pricing structure for CO2 Router. The site presents the commercial packaging while the live demo remains sandbox-only."
        />
      </Head>

      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.92),rgba(3,8,20,0.98))] p-6 sm:p-8 lg:p-10">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Pricing</div>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
            Simple public packaging for a product that is built to be bought.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            Pricing is presented at the commercial layer. The public site does not implement billing
            logic; it shows the offer, the access path, and the sandbox demo that proves the product.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/live"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
            >
              Try the live demo
            </Link>
            <Link
              href="/access"
              className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.06]"
            >
              Request access
            </Link>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-[28px] border p-6 ${
                tier.highlightOnLanding
                  ? 'border-cyan-300/25 bg-cyan-300/10 shadow-xl shadow-cyan-950/10'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{tier.price}</div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{tier.name}</h2>
                  <div className="mt-2 text-sm text-slate-300">{tier.entry}</div>
                </div>
                {tier.highlightOnLanding ? (
                  <div className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs font-medium text-cyan-100">
                    Most chosen
                  </div>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">{tier.description}</p>

              <ul className="mt-5 space-y-3">
                {tier.highlights.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.name === 'Operator' ? '/access' : tier.name === 'Governance' ? '/contact' : '/contact'}
                className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  tier.highlightOnLanding
                    ? 'bg-white text-slate-950 hover:bg-cyan-100'
                    : 'border border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {tier.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Commercial rule</div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Billing and entitlement enforcement stay outside this public site. The website is the
              front door: it explains the product clearly, frames the commercial tiers, and hands
              qualified buyers into the access flow.
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Next step</div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              If you want to evaluate the product first, use the live demo. If you are ready to buy,
              request access and move into the commercial workflow.
            </p>
          </article>
        </section>
      </div>
    </PublicSiteShell>
  )
}
