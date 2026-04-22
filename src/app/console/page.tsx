import type { Metadata } from 'next'

import { CommandCenterShell } from '@/components/command-center/CommandCenterShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'CO2 Grid Freeview',
  description:
    'CO2 Grid Freeview is the public proof surface for CO2 Router, showing governed execution, world state, trace, replay, and proof posture without exposing operator controls.',
  path: '/console',
  keywords: [
    'CO2 Router CO2 Grid Freeview',
    'CO2 Grid public proof surface',
    'execution control plane',
    'trace replay provenance',
    'SAIQ governance',
  ],
})

export default function ConsolePage() {
  return <CommandCenterShell />
}
