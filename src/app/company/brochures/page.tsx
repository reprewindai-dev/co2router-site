import type { Metadata } from 'next'

import { InformationPageShell } from '@/components/site/InformationPageShell'
import { createPageMetadata } from '@/lib/seo'

const brochureVariants = [
  {
    title: 'Cinematic 3D Render',
    subtitle: 'Launch graphics, keynote slides, social banners',
    audience: 'Executive launches and paid campaigns',
    useCases: [
      'Hero image for announcements and investor events',
      'Social post art for high-attention distribution',
      'Trade show and conference display assets',
    ],
    tone: 'Dark, premium, high-contrast, motion-heavy, and engineered to signal control-plane depth.',
  },
  {
    title: 'Investor-Level Diagram',
    subtitle: 'Pitch decks, diligence rooms, partner briefings',
    audience: 'Operators, investors, and technical buyers',
    useCases: [
      'One-slide architecture explanation for fundraising',
      'Due-diligence friendly control-plane narrative',
      'System overview for stakeholder walkthroughs',
    ],
    tone: 'Structured, explicit, and designed to explain the stack without losing rigor.',
  },
  {
    title: 'Public Easy-to-Understand',
    subtitle: 'Blog posts, homepage tiles, public education',
    audience: 'Buyers, press, and non-technical readers',
    useCases: [
      'Blog header or explainer graphic',
      'Homepage proof of concept for public visitors',
      'Sales follow-up asset for broad sharing',
    ],
    tone: 'Plain-language visual summary focused on trust, clarity, and fast comprehension.',
  },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Brochures',
  description:
    'Three CO2 Router brochure variants for different audiences: cinematic, investor-level, and public-friendly.',
  path: '/company/brochures',
  keywords: ['CO2 Router brochures', 'brand assets', 'architecture diagram', 'company resources'],
})

export default function CompanyBrochuresPage() {
  return (
    <InformationPageShell
      eyebrow="Company / Brochures"
      title="Three brochure variants, each built for a different job."
      summary="These layouts are intentionally separate assets, not a single composite. Use the version that matches the audience: a cinematic launch render, an investor-grade diagram, or a public-facing explainer."
      primaryHref="/contact"
      primaryLabel="Request a custom asset"
      secondaryHref="/company/about"
      secondaryLabel="About CO2 Router"
    >
      <section className="grid gap-6 lg:grid-cols-3">
        {brochureVariants.map((variant, index) => (
          <article
            key={variant.title}
            className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
                Version 0{index + 1}
              </div>
              <div className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {variant.audience}
              </div>
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">
              {variant.title}
            </h2>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              {variant.subtitle}
            </p>
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Best used for
              </div>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
                {variant.useCases.map((useCase) => (
                  <li key={useCase} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-sm leading-7 text-slate-300">{variant.tone}</p>
          </article>
        ))}
      </section>
    </InformationPageShell>
  )
}
