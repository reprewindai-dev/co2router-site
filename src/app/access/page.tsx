import Link from 'next/link'

export default function AccessPage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="surface-card-strong p-8">
        <div className="eyebrow">Pilot Access</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
          Request Pilot Access
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Pilot Access is a controlled pilot, not a trial. It is the paid entry path for
          teams that want one real workflow, CO2 Grid Pro, pre-execution enforcement, live
          signals, and audit-grade proof before broader rollout.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="eyebrow">Pilot package</div>
          <div className="mt-4 text-3xl font-semibold text-white">$3,500</div>
          <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">30 days</div>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <div>1 workflow</div>
            <div>pre-execution enforcement (run / delay / reroute / deny)</div>
            <div>full CO2 Grid Pro decision card + HUD</div>
            <div>trace + replay + provenance</div>
            <div>onboarding + support</div>
          </div>
        </div>
        <div className="surface-card p-6">
          <div className="eyebrow">Who should start here</div>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Platform engineering, infrastructure governance, CI owners, Kubernetes teams,
            and regulated buyers that need one production decision loop proven under real
            conditions before committing to continuous enforcement.
          </p>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="eyebrow">Commercial path</div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            ['Pilot Access', '$3,500 for 30 days with CO2 Grid Pro scoped to one governed workflow.'],
            ['Operator', 'From $7,500/month with CO2 Grid Pro for production decisioning and operator use.'],
            ['Governance', 'From $18,000/month with CO2 Grid Elite for policy tuning, alarms, and enforcement export.'],
            ['Assurance', 'Custom with CO2 Grid Elite plus governance overlays, doctrine alignment, and assurance support.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">{title}</div>
              <div className="mt-3 text-sm leading-7 text-slate-300">{description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="eyebrow">Next action</div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
            Request Pilot Access
          </Link>
          <Link href="/pricing" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5">
            Review pricing
          </Link>
        </div>
      </section>
    </div>
  )
}
