'use client'

import Link from 'next/link'

export function PricingOrControlSection() {
  const plans = [
    {
      name: 'Pilot Access',
      price: '$3,500',
      cadence: '30 days',
      pitch: 'Includes a pilot-scoped deployment of CO2 Grid Pro for one governed workflow.',
      features: ['1 workflow', 'full decision card', 'HUD + trace + replay', 'onboarding + support'],
      highlight: false,
      cta: 'Request Pilot Access',
    },
    {
      name: 'Operator',
      price: 'From $7,500',
      cadence: '/month',
      pitch: 'Includes CO2 Grid Pro for production decisioning and operator use.',
      features: ['multiple workflows', 'continuous enforcement', 'full operator surface', 'SLA-backed decisioning'],
      highlight: true,
      cta: 'Request Pilot Access',
    },
    {
      name: 'Governance',
      price: 'From $18,000',
      cadence: '/month',
      pitch: 'Includes CO2 Grid Elite for alarming, policy tuning, enforcement export, and team operations.',
      features: ['alarm queue', 'policy tuning', 'enforcement export', 'anomaly detection'],
      highlight: false,
      cta: 'Request Pilot Access',
    },
    {
      name: 'Assurance',
      price: 'Custom',
      cadence: '',
      pitch: 'Includes CO2 Grid Elite plus custom governance, doctrine alignment, and assurance support.',
      features: ['custom governance overlays', 'doctrine alignment', 'enterprise assurance support', 'reporting integrations'],
      highlight: false,
      cta: 'Request Pilot Access',
    },
  ]

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300">Pricing</div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          Price the control plane like infrastructure
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          CO2 Router is priced around control, enforcement, proof, and governance depth.
          It is not priced like seats, dashboards, or generic software.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
          <span>CO2 Grid Freeview = public proof surface</span>
          <span>CO2 Grid Pro = operator surface</span>
          <span>CO2 Grid Elite = governance and assurance surface</span>
        </div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-[28px] border p-6 ${
              plan.highlight
                ? 'border-cyan-300/24 bg-cyan-300/8 shadow-[0_18px_80px_rgba(34,211,238,0.12)]'
                : 'border-white/8 bg-slate-950/55'
            }`}
          >
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {plan.name}
            </div>
            <div className="mt-4 text-4xl font-black tracking-[-0.05em] text-white">
              {plan.price}
              {plan.cadence && <span className="text-lg font-semibold text-slate-500">{plan.cadence}</span>}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{plan.pitch}</p>
            <div className="mt-6 space-y-2 text-sm text-slate-200">
              {plan.features.map((feature) => (
                <div key={feature} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
                  {feature}
                </div>
              ))}
            </div>
            <Link
              href="/access"
              className="mt-6 inline-flex rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
