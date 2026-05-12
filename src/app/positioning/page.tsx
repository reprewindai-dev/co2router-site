import Link from 'next/link'

import { masterDistributionDoctrine } from '@/content/master-distribution'
import { formatMs, getControlPlaneSnapshot } from '@/lib/ecobe'

const buyerGroups = [
  {
    title: 'Platform control owners',
    body: 'Teams that already control CI, clusters, runtime policies, and regional execution but need one deterministic governance layer before workloads run.',
  },
  {
    title: 'Governance and audit',
    body: 'Operators who need control rights, replayable reasoning, and enforcement artifacts instead of after-the-fact reporting.',
  },
  {
    title: 'Policy and regulated operations',
    body: 'Organizations that need pre-execution evidence, policy traceability, and decision lineage tied directly to runtime control.',
  },
] as const

const strengths = [
  'Deterministic Pre-Execution Governance with one fixed doctrine order',
  'One canonical decision model and one canonical proof model across adapters',
  'Water treated as a hard authorization constraint, not cosmetic scoring',
  'SHA-256 ProofHash, replay, and degraded-state honesty built into the runtime path',
  'CI/CD and Kubernetes enforcement already anchored in the engine',
  'Quality-tiered governance lease carried across HTTP, events, queue/job, and Lambda',
] as const

const limitations = [
  'Operational water authority is real, but full assurance closure is still in progress',
  'The adapter plane exists, but CI/CD and Kubernetes remain the strongest production wedges today',
  'OpenTelemetry alignment is present, but the telemetry layer is not yet a fully mature observability product',
] as const

export default async function PositioningPage() {
  const snapshot = await getControlPlaneSnapshot()
  const assuranceStatus = snapshot.health?.assurance?.status ?? 'operational'

  return (
    <div className="space-y-10 pb-10">
      <section className="surface-card-strong overflow-hidden p-8 sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="eyebrow">Website-ready positioning</div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-white sm:text-6xl">
                {masterDistributionDoctrine.category}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300">
                CO2 Router is the decision authority + proof layer for governed compute. It applies
                the Lowest Defensible Signal Doctrine, returns one binding action, emits
                enforcement artifacts, and persists proof and replay lineage for every decision.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Talk to us
              </Link>
              <Link
                href="/methodology"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                See methodology
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-card p-5">
              <div className="eyebrow">Decision posture</div>
              <div className="metric-value mt-3">Binding</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {masterDistributionDoctrine.actionLine}
              </p>
            </div>
            <div className="surface-card p-5">
              <div className="eyebrow">Assurance posture</div>
              <div className="metric-value mt-3">{assuranceStatus}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Operational today; full source-pin assurance still closing.
              </p>
            </div>
            <div className="surface-card p-5">
              <div className="eyebrow">Runtime wedge</div>
              <div className="metric-value mt-3">CI / K8s</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Most credible enforcement surfaces today.
              </p>
            </div>
            <div className="surface-card p-5">
              <div className="eyebrow">Warm-path latency</div>
              <div className="metric-value mt-3">{formatMs(snapshot.slo?.currentMs.total.p95)}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Latency is part of the envelope, not the primary moat.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="eyebrow">What it is</div>
          <h2 className="mt-3 text-3xl font-semibold text-white">A decision authority + proof layer, not a dashboard.</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <li>It sits before execution, not after it.</li>
            <li>It applies fixed doctrine, not advisory optimization.</li>
            <li>It produces enforcement outputs and proof, not just reporting.</li>
            <li>It decides whether compute is allowed to run and where it should run.</li>
          </ul>
        </div>

        <div className="surface-card p-6">
          <div className="eyebrow">What it is not</div>
          <h2 className="mt-3 text-3xl font-semibold text-white">Governance software, not advisory software.</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <li>Not a passive monitoring dashboard.</li>
            <li>Not a reporting-only suite.</li>
            <li>Not a generic multi-objective scheduler without proof doctrine.</li>
            <li>Not a claims-heavy veneer over normal infrastructure control.</li>
          </ul>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="eyebrow">How it works</div>
        <h2 className="mt-3 text-3xl font-semibold text-white">Fixed-order decisioning with one canonical outcome.</h2>
        <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
          <li>1. A workload request arrives with execution context, constraints, runtime target, and policy metadata.</li>
          <li>2. The engine resolves candidate regions and gathers carbon and water signals.</li>
          <li>3. It applies the Lowest Defensible Signal Doctrine in order: policy overrides, water guardrails, SLA protection, carbon posture inside the allowed envelope, then cost as late influence.</li>
          <li>4. It returns exactly one action: `run_now`, `reroute`, `delay`, `throttle`, or `deny`.</li>
          <li>5. It emits enforcement artifacts for CI/CD and Kubernetes and stores canonical proof metadata, including a SHA-256 ProofHash, for replay and export.</li>
        </ol>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {buyerGroups.map((group) => (
          <div key={group.title} className="surface-card p-6">
            <div className="eyebrow">{group.title}</div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{group.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="eyebrow">What makes it strong</div>
          <div className="mt-5 grid gap-3">
            {strengths.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="eyebrow">What makes it weak today</div>
          <div className="mt-5 grid gap-3">
            {limitations.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="eyebrow">Bottom line</div>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          CO2 Router is the Deterministic Environmental Execution Control Plane.
        </h2>
        <p className="mt-5 max-w-4xl text-base leading-8 text-slate-300">
          {masterDistributionDoctrine.bindingLine} Current external framing: production-grade
          deterministic decisioning and proof, with operational water authority today and full
          assurance closure still in progress.
        </p>
      </section>
    </div>
  )
}
