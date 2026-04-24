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
    title: 'Decide if your jobs run — before they run',
    description:
      'Run a job, see what happens, and watch CO2 Router return five outcomes from a live demo.',
    path: '/',
    keywords: ['CO2 Router', 'interactive demo', 'CI/CD', 'job routing'],
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
