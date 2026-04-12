import type { Metadata } from 'next'

import CO2ControlPanel from '@/components/command-center/co2-control-panel'
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

export default function ConsolePage() {
  return <CO2ControlPanel />
}
