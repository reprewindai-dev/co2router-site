import Link from 'next/link'

const tiers = [
  {
    name: 'Pilot Access',
    price: '$3,500',
    cadence: '30 days',
    entry: 'Pilot-scoped CO2 Grid Pro for one governed workflow.',
    description:
      'Request Pilot Access to prove one real workflow with pre-execution enforcement, replay, and audit-grade proof.',
    highlights: [
      '1 workflow',
      'pre-execution enforcement (run / delay / reroute / deny)',
      'full decision card + HUD',
      'trace + replay + provenance',
      'onboarding + support',
    ],
    cta: 'Request Pilot Access',
  },
  {
    name: 'Operator',
    price: 'From $7,500/month',
    cadence: '',
    entry: 'CO2 Grid Pro for production decisioning.',
    description:
      'Continuous decisioning with the full operator surface for one serious workflow or multiple governed flows.',
    highlights: [
      'multiple workflows',
      'continuous enforcement',
      'production integration',
      'full CO2 Grid Pro operator surface',
      'SLA-backed decisioning',
    ],
    cta: 'Request Pilot Access',
  },
  {
    name: 'Governance',
    price: 'From $18,000/month',
    cadence: '',
    entry: 'CO2 Grid Elite for governance operations.',
    description:
      'Alarming, policy tuning, enforcement export, anomaly detection, and team operations for enterprise infrastructure teams.',
    highlights: [
      'alarm queue + operator workflows',
      'policy tuning',
      'enforcement export',
      'anomaly detection',
    ],
    cta: 'Request Pilot Access',
  },
  {
    name: 'Assurance',
    price: 'Custom',
    cadence: '',
    entry: 'CO2 Grid Elite plus custom overlays.',
    description:
      'Custom governance, doctrine alignment, enterprise reporting integration, and higher-touch assurance support.',
    highlights: [
      'regulatory alignment',
      'custom doctrine/policy frameworks',
      'dedicated infra + support',
      'direct integration with compliance systems',
    ],
    cta: 'Request Pilot Access',
  },
]

export default function PricingPage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="surface-card-strong p-8">
        <div className="eyebrow">Pricing</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
          Price the control plane like infrastructure
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          CO2 Router is priced like infrastructure control, not software. The commercial
          surface is tied to decisioning, enforcement scope, proof, and governance depth.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
          <span>CO2 Grid Freeview = public/live preview</span>
          <span>CO2 Grid Pro = Pilot + Operator surface</span>
          <span>CO2 Grid Elite = Governance + Assurance surface</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <div key={tier.name} className="surface-card flex h-full flex-col p-6">
            <div className="eyebrow">{tier.name}</div>
            <div className="mt-4 text-3xl font-semibold text-white">{tier.price}</div>
            {tier.cadence ? (
              <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{tier.cadence}</div>
            ) : null}
            <div className="mt-4 text-sm font-semibold leading-6 text-slate-100">{tier.entry}</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{tier.description}</p>
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
              {tier.cta}
            </Link>
          </div>
        ))}
      </section>

      <section className="surface-card p-8">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="eyebrow">Commercial model</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              You are buying control, enforcement, and proof.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300">
              <div className="text-base font-semibold text-white">Pilot Access</div>
              Controlled pilot entry, not a trial. One governed workflow on CO2 Grid Pro with one enforced path and one proof trail.
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300">
              <div className="text-base font-semibold text-white">Scaling logic</div>
              Commercial expansion follows operator surface depth, governance scope, decision volume, and proof requirements rather than seats.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
