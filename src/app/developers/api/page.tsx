import type { Metadata } from 'next'

import { InformationPageShell } from '@/components/site/InformationPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'API Catalog',
  description:
    'Marketplace-facing reference for the public control plane and the brokered engine endpoints that power ECOBE.',
  path: '/developers/api',
  keywords: ['API catalog', 'decision API', 'brokered engine API', 'replay API'],
})

const publicApiGroups = [
  {
    title: 'Health and readiness',
    lines: ['/api/v1/health', '/api/v1/ready', '/api/v1/bootstrap'],
  },
  {
    title: 'Runs and replay',
    lines: ['/api/v1/runs', '/api/v1/runs/:id', '/api/v1/runs/:id/events'],
  },
  {
    title: 'Policies and approvals',
    lines: ['/api/v1/policies', '/api/v1/approvals', '/api/v1/approvals/:id'],
  },
  {
    title: 'Billing and access',
    lines: [
      '/api/v1/billing/checkout',
      '/api/v1/billing/public-checkout',
      '/api/v1/billing/portal',
      '/api/v1/billing/status',
      '/api/v1/keys',
      '/api/v1/service-accounts',
    ],
  },
  {
    title: 'Compliance and operations',
    lines: [
      '/api/v1/compliance/reports',
      '/api/v1/audit/exports',
      '/api/v1/alerts',
      '/api/v1/methodology/providers',
      '/api/v1/webhooks',
    ],
  },
]

const brokeredGroups = [
  {
    title: 'Routing',
    lines: ['/api/v1/route/green', '/api/v1/route', '/api/v1/route-simple'],
  },
  {
    title: 'Grid intelligence',
    lines: [
      '/api/v1/intelligence/grid/hero-metrics',
      '/api/v1/intelligence/grid/summary',
      '/api/v1/intelligence/grid/opportunities',
      '/api/v1/intelligence/grid/region/:region',
      '/api/v1/intelligence/grid/import-leakage',
      '/api/v1/intelligence/grid/audit/:region',
      '/api/v1/intelligence/grid/structural-profile/:region',
    ],
  },
  {
    title: 'Dashboard and CI/CD',
    lines: ['/api/v1/dashboard/metrics', '/api/v1/dashboard/regions', '/api/v1/ci/authorize'],
  },
]

export default function DevelopersApiPage() {
  return (
    <InformationPageShell
      eyebrow="Developers / API"
      title="Marketplace-ready API catalog."
      summary="This page lists the exposed public control-plane surface and the brokered engine endpoints. Use the public API for customer integrations and the brokered engine surface for authorized routing, replay, and grid intelligence."
      secondaryHref="/developers/quickstart"
      secondaryLabel="Open Quickstart"
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Use it correctly</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <p>Use JSON requests with `content-type: application/json`.</p>
            <p>Protected routes require org auth or broker auth. `401` and `403` are expected when access is missing.</p>
            <p>Brokered engine endpoints never go direct from the client. They go through the runtime bridge.</p>
            <p>Nulls, estimated values, fallback states, and disagreement flags are part of the contract and should be rendered.</p>
          </div>
        </article>
        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Broker boundary</div>
          <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-slate-200">
              <code>{`Public SaaS API -> runtime /api/v1/*
Brokered engine API -> runtime /api/v1/* allowlist
Direct engine URLs are not for client use`}</code>
            </pre>
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white">Public API</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {publicApiGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">{group.title}</div>
                {group.lines.map((line) => (
                  <div key={line} className="rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200">
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white">Brokered Engine API</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {brokeredGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">{group.title}</div>
                {group.lines.map((line) => (
                  <div key={line} className="rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200">
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>
      </section>
    </InformationPageShell>
  )
}
