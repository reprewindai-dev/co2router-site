import type { Metadata } from 'next'

import { InformationPageShell } from '@/components/site/InformationPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Mirrored Signal Stack',
  description:
    'How CO2 Router mirrors carbon and water telemetry, labels degraded state, and binds deterministic workload decisions to replayable proof.',
  path: '/developers/mirrored-signal-stack',
  keywords: [
    'mirrored signal stack',
    'carbon aware computing audit',
    'water aware routing',
    'deterministic replay',
    'proof hash',
  ],
})

const proofFields = [
  'decision timestamp and policy version',
  'provider, metric, location, value, unit, source timestamp, fetch time, and age',
  'mode: live, forecast, degraded, fallback, or baseline',
  'confidence score and fallback reason',
  'grid-region and watershed mapping',
  'append-only log reference and proof hash',
]

const loops = [
  {
    title: 'Fast loop',
    body:
      'Carbon telemetry is refreshed at operational cadence and used for workload placement, delay, and reroute decisions. Stale data is never hidden; it is labeled and scored defensively.',
  },
  {
    title: 'Slow loop',
    body:
      'Water scarcity, watershed risk, and long-horizon siting constraints update on their own cadence. They gate eligibility and shape penalties without pretending to be five-minute telemetry.',
  },
  {
    title: 'Replay loop',
    body:
      'Every governed decision references the exact signal snapshot and deterministic policy version so the frame can be replayed without rebuilding history from live providers.',
  },
]

const sourceClasses = [
  ['EIA-930', 'US balancing-authority fuel mix converted with documented fuel factors.'],
  ['RTE eCO2mix / ODRE', 'France national carbon intensity from the public RTE open-data mirror.'],
  ['GB Carbon Intensity API', 'Great Britain current and forecast carbon intensity.'],
  ['Energi Data Service', 'Denmark DK1 and DK2 carbon signal feeds.'],
  ['IESO and Hydro-Quebec', 'Canada provincial public operator and open-data feeds.'],
  ['WRI/Aqueduct and water bundle', 'Slow-loop water stress and watershed risk evidence.'],
]

export default function MirroredSignalStackPage() {
  return (
    <InformationPageShell
      eyebrow="Developers / Mirrored Signal Stack"
      title="Signals are mirrored before they become authority."
      summary="CO2 Router does not treat external telemetry as a disposable API call. Carbon and water signals are mirrored, versioned, freshness-scored, and bound to deterministic decision frames so every route can be replayed and audited."
      primaryHref="/live"
      primaryLabel="Open Console"
      secondaryHref="/developers/api"
      secondaryLabel="View API"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {loops.map((item) => (
          <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              {item.title}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Deterministic Proof Package
          </div>
          <h2 className="mt-3 text-2xl font-black text-white">One decision, one snapshot, one proof frame.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            A workload decision is not complete until the selected action, source mode, provider snapshot,
            policy version, and proof hash can be inspected together. The proof verifies integrity and
            provenance; the verifier still applies its own business rules to decide whether the claim is acceptable.
          </p>
          <div className="mt-6 grid gap-3">
            {proofFields.map((field) => (
              <div key={field} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
                {field}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Degraded Mode
          </div>
          <h2 className="mt-3 text-2xl font-black text-white">Outages become visible decision state.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            If a provider is unavailable or stale, CO2 Router can use last-known-good or structural baseline
            posture, but it labels the frame as degraded or fallback. This prevents silent success paths and
            keeps operators from treating stale telemetry as live authority.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
            Route coverage promotes only fresh source-backed samples to active. Last-known-good records are
            retained for safety, but they are not presented as current live routes.
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Mirrored Sources
        </div>
        <h2 className="mt-3 text-2xl font-black text-white">Current feeds are separated from baselines.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {sourceClasses.map(([name, detail]) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-bold text-white">{name}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </InformationPageShell>
  )
}
