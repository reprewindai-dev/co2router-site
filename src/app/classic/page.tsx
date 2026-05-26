import type { Metadata } from 'next'

import { ClassicHaloGrid } from '@/components/classic/ClassicHaloGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'HaloGrid Classic',
  description:
    'Broker-backed 2D CO2 Router operator grid for live route posture, decision stream, proof, and replay status.',
}

export default function ClassicPage() {
  return <ClassicHaloGrid />
}
