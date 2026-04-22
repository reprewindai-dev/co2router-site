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
      title: 'CO2 Grid Overview',
      description:
        'CO2 Grid, architecture, proof, replay, provenance, and developer entrypoints for the CO2 Router technical surface.',
      path: '/',
      keywords: ['CO2 Grid', 'technical overview', 'control surface', 'replay', 'architecture'],
    })
  }

  return createPageMetadata({
    title: 'Overview',
    description:
      'CO2 Router authorizes compute before execution using carbon, water, and policy constraints, then attaches proof, trace, replay, and provenance to every decision.',
    path: '/',
    keywords: ['CO2 Router', 'environmental execution control plane', 'carbon-aware routing'],
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
