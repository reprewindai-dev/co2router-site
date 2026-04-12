import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { CommandCenterShellVariant } from '@/components/command-center/CommandCenterShellVariant'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'CO2 Control Center | Live Mission Control',
  description:
    'Real-time carbon-aware compute routing. Five zones, four shock features, one principle: Compute does not run until Earth approves it. Live globe, decision feed, doctrine control, and cryptographic proof.',
  path: '/console',
  keywords: [
    'CO2 Router control center',
    'carbon-aware compute',
    'live mission control',
    'sustainable cloud routing',
    'CSRD compliance',
    'carbon intelligence',
    'green compute dashboard',
  ],
})

export const dynamic = 'force-dynamic'

function resolveDefaultVariant(hostname: string | null): 'opus' | 'google-pro' | 'mission-control' {
  // Default to the new CO2 Control Panel (mission-control)
  return 'mission-control'
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
