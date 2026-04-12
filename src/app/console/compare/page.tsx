import type { Metadata } from 'next'

import { CommandCenterShellVariant } from '@/components/command-center/CommandCenterShellVariant'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  title: 'HaloGrid Compare',
  description: 'Switch between HaloGrid builds (Opus vs Google Pro) for stability and UX review.',
  path: '/console/compare',
  keywords: ['HaloGrid compare', 'command center', 'control surface'],
})

export default async function HaloGridComparePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const normalizeVariant = (value: string | undefined) => {
    const normalized = (value ?? '').trim().toLowerCase()
    if (normalized === 'google-pro' || normalized === 'google' || normalized === 'pro') return 'google-pro'
    return 'opus'
  }

  const searchParams = (await props.searchParams) ?? {}
  const variantValue = searchParams.variant
  const variant = normalizeVariant(Array.isArray(variantValue) ? variantValue[0] : variantValue)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm font-semibold tracking-tight">HaloGrid Compare</div>
          <div className="flex items-center gap-2 text-xs">
            <a
              className={`rounded-full border px-3 py-1 ${
                variant === 'opus'
                  ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/25'
              }`}
              href="/console/compare?variant=opus"
            >
              Opus build
            </a>
            <a
              className={`rounded-full border px-3 py-1 ${
                variant === 'google-pro'
                  ? 'border-amber-300/40 bg-amber-400/10 text-amber-100'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/25'
              }`}
              href="/console/compare?variant=google-pro"
            >
              Google Pro build
            </a>
            <a
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-200 hover:border-white/25"
              href="/console"
            >
              Back to console
            </a>
          </div>
        </div>
      </div>

      <CommandCenterShellVariant variant={variant} />
    </div>
  )
}
