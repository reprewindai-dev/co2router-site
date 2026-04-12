export type SiteAudience = 'commercial' | 'technical'

export const commercialSiteUrl = 'https://co2router.com'
export const technicalSiteUrl = 'https://co2router.tech'

const technicalHosts = new Set(['co2router.tech', 'www.co2router.tech'])
const commercialHosts = new Set(['co2router.com', 'www.co2router.com'])

export function normalizeHost(rawHost: string | null | undefined) {
  return (rawHost ?? '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
}

export function getAudienceForHost(rawHost: string | null | undefined): SiteAudience {
  const host = normalizeHost(rawHost)
  if (technicalHosts.has(host)) return 'technical'
  if (commercialHosts.has(host)) return 'commercial'
  if (host.endsWith('.tech')) return 'technical'
  return 'commercial'
}

export function getSiteUrlForAudience(audience: SiteAudience) {
  return audience === 'technical' ? technicalSiteUrl : commercialSiteUrl
}

export function getSiteUrlForHost(rawHost: string | null | undefined) {
  return getSiteUrlForAudience(getAudienceForHost(rawHost))
}
