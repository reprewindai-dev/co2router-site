export interface PricingTier {
  name: 'Starter Pilot' | 'Validation' | 'Operator' | 'Governance' | 'Assurance'
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
    name: 'Starter Pilot',
    price: '$250/mo',
    entry: 'Test the first decision loop.',
    description:
      'For small teams or early evaluators who want to prove the broker and decision loop before committing to a production rollout.',
    scale: 'Includes 10k decisions per month and one lightweight production-adjacent path.',
    highlights: [
      'Sandbox plus one lightweight production-adjacent path',
      'Decision API access and basic decision logs',
      'Basic proof hash visibility',
      'HTTP or CI/CD integration with email support',
    ],
    ctaLabel: 'Start pilot',
  },
  {
    name: 'Validation',
    price: '$750/mo',
    entry: 'Put one real workload under control.',
    description:
      'For teams validating CO2 Router against one real workload path with canonical decisions and proof visibility.',
    scale: 'Includes 50k decisions per month and one production control point.',
    highlights: [
      'CI/CD or HTTP enforcement path',
      'Canonical decision storage',
      'Proof visibility and basic replay references',
      'Onboarding support for the first workload',
    ],
    ctaLabel: 'Request access',
  },
  {
    name: 'Operator',
    price: '$1,500/mo',
    entry: 'Run one production decision layer.',
    description:
      'For a team using CO2 Router in a real operating path with control-surface access, history, and policy controls.',
    scale: 'Includes 250k decisions per month and one production runtime path.',
    highlights: [
      'Decision API v1 and control-surface access',
      'Proof visibility and decision history',
      'Basic policy controls',
      'Priority support',
    ],
    ctaLabel: 'Request operator access',
    highlightOnLanding: true,
  },
  {
    name: 'Governance',
    price: '$3,500/mo',
    entry: 'Multi-workload policy and proof.',
    description:
      'For organizations standardizing policy, proof, and runtime control across multiple workloads, regions, and entry points.',
    scale: 'Includes 1M decisions per month, multiple workloads, and multi-team policy controls.',
    highlights: [
      'Multi-team policy governance and approval controls',
      'Enhanced proof export and replay visibility',
      'Kubernetes, queue, and webhook adapter coverage',
      'Operational support for regulated workload posture',
    ],
    ctaLabel: 'Talk to us',
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
