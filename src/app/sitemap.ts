import type { MetadataRoute } from 'next'

import { coreSitePaths, siteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes = coreSitePaths.map((path) => ({
    url: path === '/' ? siteUrl : `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/console' || path === '/methodology' ? 0.9 : 0.7,
  })) satisfies MetadataRoute.Sitemap

  return staticRoutes
}
