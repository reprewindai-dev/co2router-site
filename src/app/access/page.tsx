import Link from 'next/link'

export default function AccessPage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="surface-card-strong p-8">
        <div className="eyebrow">Access / Free Trial</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Try the live decision flow without a sales gate.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Start with a free sandbox flow, watch a real decision frame move through the brokered
          control path, and confirm the proof chain before you expand to a paid plan.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="eyebrow">What you get</div>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Decision API access, one enforced path, proof visibility, and a live control-surface
            review tied to a non-production demo workload.
          </p>
        </div>
        <div className="surface-card p-6">
          <div className="eyebrow">Who should try it</div>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Platform engineering, infrastructure governance, CI owners, Kubernetes teams, and
            regulated buyers that want to verify the system before any purchase discussion.
          </p>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="eyebrow">Next step</div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/live" className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
            Open live demo
          </Link>
          <Link href="/pricing" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5">
            Review pricing
          </Link>
        </div>
      </section>
    </div>
  )
}
