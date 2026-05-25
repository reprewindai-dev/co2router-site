export interface PricingTier {
  name: 'Pilot' | 'Operator' | 'Governance' | 'Assurance'
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
    name: 'Pilot',
    price: 'From $1,000/mo',
    entry: 'Prove the first decision loop.',
    description:
      'For teams evaluating CO2 Router on one workload path before wider rollout.',
    scale: 'Includes up to 25k decisions per month and one sandbox or production-adjacent path.',
    highlights: [
      'One sandbox or production-adjacent decision path',
      'CI/CD or HTTP integration',
      'Decision API v1 and proof preview',
      'Basic decision storage and pilot onboarding',
    ],
    ctaLabel: 'Start pilot',
  },
  {
    name: 'Operator',
    price: 'From $2,500/mo',
    entry: 'One production control point.',
    description:
      'For teams ready to put CO2 Router in front of a real cloud or AI workload path.',
    scale: 'Includes up to 250k decisions per month, one production enforcement path, and one control surface.',
    highlights: [
      'Decision API v1 and control-surface access',
      'CI/CD or HTTP rollout',
      'Canonical decision storage',
      'Proof visibility and replay references',
      'Production onboarding',
    ],
    ctaLabel: 'Request access',
    highlightOnLanding: true,
  },
  {
    name: 'Governance',
    price: 'From $8,000/mo',
    entry: 'Multi-team enforcement and proof.',
    description:
      'For organizations standardizing workload decision control across multiple workloads, regions, and owners.',
    scale: 'Built for high-volume decisioning, multi-team governance, and regulated operating environments.',
    highlights: [
      'Multi-team policy governance and approval controls',
      'Enhanced proof export and replay visibility',
      'Kubernetes, queue, and webhook adapter coverage',
      'Operational support for regulated workload posture',
    ],
    ctaLabel: 'Request access',
  },
  {
    name: 'Assurance',
    price: 'Custom',
    entry: 'Enterprise proof and control programs.',
    description:
      'For enterprises that need governed evidence workflows, signed exports, and controlled rollout design.',
    scale:
      'Scoped to assurance requirements, private deployment boundaries, governance depth, and controlled rollout design.',
    highlights: [
      'Controlled assurance workflows',
      'Signed proof and export chains',
      'Replay routing design',
      'Dedicated architecture review',
      'Custom deployment boundaries',
    ],
    ctaLabel: 'Talk to sales',
  },
]
