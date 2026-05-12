import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { masterDistributionDoctrine } from '@/content/master-distribution'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'CO2 Control Center | Live Mission Control',
  description:
    'Live governance surface for CO2 Router: deterministic pre-execution governance, five binding actions, doctrine control, and replayable proof.',
  path: '/console',
  keywords: [
    'CO2 Router control center',
    'deterministic pre-execution governance',
    'live mission control',
    'binding governance decision',
    'proof layer',
    masterDistributionDoctrine.category,
  ],
})

export default function ConsolePage() {
  redirect('/live')
}
