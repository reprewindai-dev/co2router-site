import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { CommandCenterShellVariant } from '@/components/command-center/CommandCenterShellVariant'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Control Surface',
  description:
    'Live execution authority, SAIQ governance, trace, replay, provenance, and proof across the CO2 Router command center.',
  path: '/console',
  keywords: [
    'CO2 Router control surface',
    'execution control plane',
    'trace replay provenance',
    'SAIQ governance',
  ],
})

export const dynamic = 'force-dynamic'

function resolveDefaultVariant(hostname: string | null): 'opus' | 'google-pro' {
  return 'google-pro'
}

export default async function ConsolePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const headerList = headers()
  const rawHost = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const searchParams = (await props.searchParams) ?? {}
  const variantValue = searchParams.variant
  const requestedVariant = Array.isArray(variantValue) ? variantValue[0] : variantValue
  const variant = requestedVariant ?? resolveDefaultVariant(rawHost)

  return <CommandCenterShellVariant variant={variant} />
}
