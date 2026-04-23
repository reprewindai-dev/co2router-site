import Link from 'next/link'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { getAudienceForHost } from '@/lib/site-host'

export function InformationPageShell({
  eyebrow,
  title,
  summary,
  children,
  primaryHref = '/console',
  primaryLabel = 'Open Control Surface',
  secondaryHref = '/status',
  secondaryLabel = 'View Status',
}: {
  eyebrow: string
  title: string
  summary: string
  children: ReactNode
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  const headerList = headers()
  const audience = getAudienceForHost(headerList.get('x-forwarded-host') ?? headerList.get('host'))
  const resolvedPrimaryHref =
    primaryHref === '/console' && audience !== 'technical' ? '/live' : primaryHref
  const resolvedPrimaryLabel =
    primaryLabel === 'Open Control Surface' && audience !== 'technical'
      ? 'Open Live Demo'
      : primaryLabel

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_36%),linear-gradient(180deg,rgba(5,10,20,0.96),rgba(2,8,18,0.98))] p-6 sm:p-8 lg:p-10">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">{eyebrow}</div>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">{summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={resolvedPrimaryHref}
              className="rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950"
            >
              {resolvedPrimaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      {children}
    </div>
  )
}
