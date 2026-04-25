import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CommercialHomePage } from '@/components/landing/CommercialHomePage'
import { TechnicalHomePage } from '@/components/landing/TechnicalHomePage'
import { getAudienceForHost } from '@/lib/site-host'
import { createPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const audience = getAudienceForHost(headerList.get('x-forwarded-host') ?? headerList.get('host'))

  if (audience === 'technical') {
    return createPageMetadata({
      title: 'CO2 Router Technical Overview',
      description:
        'CO2 Router console, architecture, proof, replay, provenance, and developer entrypoints for the technical surface.',
      path: '/',
      keywords: ['CO2 Router', 'technical overview', 'console', 'replay', 'architecture'],
    })
  }

  return createPageMetadata({
    title: 'CO2 Router | Live execution authority',
    description:
      'CO2 Router routes workloads with live proof, replay, governance, and routing signals before execution.',
    path: '/',
    keywords: ['CO2 Router', 'live control plane', 'routing', 'proof', 'replay'],
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
