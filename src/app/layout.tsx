import type { Metadata, Viewport } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'

import { SiteChrome } from '@/components/site/SiteChrome'
import {
  defaultDescription,
  defaultOgImage,
  siteName,
  siteTitle,
} from '@/lib/seo'
import { getFooterLinkSections, getFooterTagline, getHeaderSubtitle, getPrimaryNavLinks } from '@/lib/site-navigation'
import { getAudienceForHost, getSiteUrlForHost } from '@/lib/site-host'

import './globals.css'
import { Providers } from './providers'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#050505',
}

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const siteUrl = getSiteUrlForHost(headerList.get('x-forwarded-host') ?? headerList.get('host'))

  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    title: {
      default: `${siteName} | ${siteTitle}`,
      template: `%s | ${siteName}`,
    },
    description: defaultDescription,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      siteName,
      title: `${siteName} | ${siteTitle}`,
      description: defaultDescription,
      url: '/',
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: `${siteName} control surface poster`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} | ${siteTitle}`,
      description: defaultDescription,
      images: [defaultOgImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/co2router-symbol.png',
      shortcut: '/co2router-symbol.png',
      apple: '/co2router-symbol.png',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const audience = getAudienceForHost(host)
  const siteUrl = getSiteUrlForHost(host)
  const primaryNavLinks = getPrimaryNavLinks(audience)
  const footerLinkSections = getFooterLinkSections(audience)
  const headerSubtitle = getHeaderSubtitle(audience)
  const footerTagline = getFooterTagline(audience)
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    description: defaultDescription,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
    },
  }

  return (
    <html lang="en">
      <body className={spaceGrotesk.className}>
        <Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <SiteChrome
            audience={audience}
            footerLinkSections={footerLinkSections}
            footerTagline={footerTagline}
            headerSubtitle={headerSubtitle}
            primaryNavLinks={primaryNavLinks}
          >
            {children}
          </SiteChrome>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
