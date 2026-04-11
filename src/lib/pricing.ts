export interface PricingTier {
  name: 'Operator' | 'Governance' | 'Assurance'
  price: string
  entry: string
  description: string
  scale: string
  highlights: readonly string[]
  ctaLabel: string
  highlightOnLanding?: boolean
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Operator',
    price: 'From $2,500/mo',
    entry: 'One live control point for a single team.',
    description:
      'For buyers who need one production decision loop with canonical decision storage, proof visibility, and a real enforcement wedge.',
    scale: 'Best for teams running up to 250k decisions per month.',
    highlights: [
      'Decision API v1 and control-surface access',
      'CI/CD or HTTP control-point rollout',
      'Canonical decision storage and replay references',
      'Pilot onboarding with one production runtime path',
    ],
    ctaLabel: 'Request access',
  },
  {
    name: 'Governance',
    price: 'From $8,000/mo',
    entry: 'Multi-team governance with production enforcement depth.',
    description:
      'For organizations standardizing policy, proof, and runtime control across multiple workloads, regions, and entry points.',
    scale:
      'Built for high-volume decisioning, additional adapters, and regulated operating environments.',
    highlights: [
      'Multi-team policy governance and approval controls',
      'Enhanced proof export and replay visibility',
      'Kubernetes, queue, and webhook adapter coverage',
      'Operational support for regulated workload posture',
    ],
    ctaLabel: 'Request access',
    highlightOnLanding: true,
  },
  {
    name: 'Assurance',
    price: 'Custom',
    entry: 'Assurance-driven deployment for enterprise control programs.',
    description:
      'For enterprises that need governed evidence workflows, signed export chains, and controlled operational trust boundaries.',
    scale:
      'Scoped to assurance requirements, governance depth, and controlled rollout design.',
    highlights: [
      'Controlled assurance and proof export workflows',
      'Signed chain delivery and replay routing design',
      'Dedicated architecture review for internal control teams',
      'Commercial packaging aligned to governance scope',
    ],
    ctaLabel: 'Talk to sales',
  },
]
