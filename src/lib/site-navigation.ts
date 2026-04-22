export interface SiteLink {
  href: string
  label: string
}

export interface SiteLinkSection {
  title: string
  links: SiteLink[]
}

const commercialPrimaryNavLinks: SiteLink[] = [
  { href: '/', label: 'Overview' },
  { href: '/design-partners', label: 'Design Partners' },
  { href: '/assurance', label: 'Assurance' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/company/about', label: 'Company' },
  { href: '/contact', label: 'Contact' },
]

const technicalPrimaryNavLinks: SiteLink[] = [
  { href: '/', label: 'Technical Overview' },
  { href: '/console', label: 'CO2 Grid' },
  { href: '/developers/architecture', label: 'Architecture' },
  { href: '/system/replay', label: 'Replay' },
  { href: '/developers/quickstart', label: 'Quickstart' },
  { href: '/developers/api', label: 'API' },
]

const commercialFooterLinkSections: SiteLinkSection[] = [
  {
    title: 'Product',
    links: [
      { href: '/', label: 'Overview' },
      { href: '/design-partners', label: 'Design Partners' },
      { href: '/assurance', label: 'Assurance' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/methodology', label: 'Methodology' },
      { href: '/status', label: 'Status' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { href: '/company/security', label: 'Security' },
      { href: '/assurance', label: 'Assurance' },
      { href: '/status', label: 'Status' },
      { href: '/methodology', label: 'Methodology' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/company/about', label: 'About' },
      { href: '/company/roadmap', label: 'Roadmap' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Technical',
    links: [
      { href: '/console', label: 'CO2 Grid' },
      { href: '/developers/quickstart', label: 'Quickstart' },
      { href: '/developers/api', label: 'API' },
      { href: '/developers/architecture', label: 'Architecture' },
    ],
  },
]

const technicalFooterLinkSections: SiteLinkSection[] = [
  {
    title: 'CO2 Grid',
    links: [
      { href: '/', label: 'Technical Overview' },
      { href: '/console', label: 'Control Surface' },
      { href: '/console/compare', label: 'Compare Builds' },
      { href: '/status', label: 'Status' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { href: '/developers/api', label: 'API' },
      { href: '/developers/adapters', label: 'Adapters' },
      { href: '/developers/architecture', label: 'Architecture' },
      { href: '/developers/quickstart', label: 'Quickstart' },
    ],
  },
  {
    title: 'System',
    links: [
      { href: '/system/decision-engine', label: 'Decision Engine' },
      { href: '/system/saiq-governance', label: 'SAIQ Governance' },
      { href: '/system/trace-ledger', label: 'Trace Ledger' },
      { href: '/system/replay', label: 'Replay' },
      { href: '/system/provenance', label: 'Provenance' },
    ],
  },
  {
    title: 'Commercial',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/company/about', label: 'About' },
      { href: '/company/security', label: 'Security' },
      { href: '/contact', label: 'Contact' },
    ],
  },
]

export function getPrimaryNavLinks(audience: 'commercial' | 'technical'): SiteLink[] {
  return audience === 'technical' ? technicalPrimaryNavLinks : commercialPrimaryNavLinks
}

export function getFooterLinkSections(audience: 'commercial' | 'technical'): SiteLinkSection[] {
  return audience === 'technical' ? technicalFooterLinkSections : commercialFooterLinkSections
}

export function getHeaderSubtitle(audience: 'commercial' | 'technical') {
  return audience === 'technical'
    ? 'Technical Control Plane Interface'
    : 'Decision Infrastructure Interface'
}

export function getFooterTagline(audience: 'commercial' | 'technical') {
  return audience === 'technical'
    ? 'Inspect CO2 Grid, proof, replay, and deterministic execution authority.'
    : 'Authorize compute before it runs. Prove every decision.'
}

export const primaryNavLinks: SiteLink[] = commercialPrimaryNavLinks

export const footerLinkSections: SiteLinkSection[] = commercialFooterLinkSections

export const legacyProductLinks: SiteLink[] = [
  { href: '/', label: 'Overview' },
  { href: '/design-partners', label: 'Design Partners' },
  { href: '/console', label: 'Control Surface' },
  { href: '/assurance', label: 'Assurance' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/status', label: 'Status' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/blog', label: 'Blog' },
]

export const legalResourceLinks: SiteLink[] = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/acceptable-use', label: 'Acceptable Use' },
  { href: '/refund-policy', label: 'Refund Policy' },
]
