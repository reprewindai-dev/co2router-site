import type { Metadata } from 'next'

import KeeperConsoleFrame from '@/components/KeeperConsoleFrame'
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

export default function ConsolePage() {
  return <KeeperConsoleFrame />
}
