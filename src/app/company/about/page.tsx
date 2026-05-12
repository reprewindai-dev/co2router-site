import type { Metadata } from 'next'

import { masterDistributionDoctrine } from '@/content/master-distribution'
import { InformationPageShell } from '@/components/site/InformationPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'About',
  description: masterDistributionDoctrine.publicDescription,
  path: '/company/about',
  keywords: ['about CO2 Router', 'execution authority', 'environmentally governed compute'],
})

export default function CompanyAboutPage() {
  return (
    <InformationPageShell
      eyebrow="Company / About"
      title="CO2 Router is built as decision authority + proof layer, not reporting software."
      summary="CO2 Router is building the Deterministic Environmental Execution Control Plane. The product decides whether workloads run, records proof against the same frame, and supports replay and provenance as part of the operating contract."
      secondaryHref="/methodology"
      secondaryLabel="View Methodology"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          'Deterministic pre-execution governance instead of post-hoc reporting.',
          'SHA-256 ProofHash, trace, and replay as part of the product contract.',
          'Water authority as a first-class decision constraint.',
        ].map((line) => (
          <article
            key={line}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-slate-300"
          >
            {line}
          </article>
        ))}
      </section>
    </InformationPageShell>
  )
}
