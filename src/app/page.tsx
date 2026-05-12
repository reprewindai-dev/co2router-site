import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { CommercialHomePage } from '@/components/landing/CommercialHomePage'
import { TechnicalHomePage } from '@/components/landing/TechnicalHomePage'
import { masterDistributionDoctrine } from '@/content/master-distribution'
import { getAudienceForHost } from '@/lib/site-host'
import { createPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const audience = getAudienceForHost(headerList.get('x-forwarded-host') ?? headerList.get('host'))

  if (audience === 'technical') {
    return createPageMetadata({
      title: 'CO2 Router Technical Overview',
      description:
        'CO2 Router doctrine, proof, replay, provenance, and developer entrypoints for the technical surface.',
      path: '/',
      keywords: ['CO2 Router', 'technical overview', 'governance', 'replay', 'architecture'],
    })
  }

  return createPageMetadata({
    title: 'CO2 Router | Deterministic pre-execution governance',
    description: masterDistributionDoctrine.publicDescription,
    path: '/',
    keywords: [
      'CO2 Router',
      'deterministic pre-execution governance',
      'environmental execution control plane',
      'binding governance decision',
      'replayable proof',
    ],
  })
}

export default async function LandingPage() {
  const headerList = await headers()
  const audience = getAudienceForHost(headerList.get('x-forwarded-host') ?? headerList.get('host'))

  if (audience === 'technical') {
    return <TechnicalHomePage />
  }

  return <CommercialHomePage />
}
