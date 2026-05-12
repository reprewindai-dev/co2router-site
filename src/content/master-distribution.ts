export const bindingActions = ['run_now', 'reroute', 'delay', 'throttle', 'deny'] as const

export const masterDistributionDoctrine = {
  category: 'The Deterministic Environmental Execution Control Plane',
  eyebrow: 'Deterministic Pre-Execution Governance',
  authorityLine: 'Decision authority + proof layer',
  actionLine: 'Five binding actions: run_now, reroute, delay, throttle, deny',
  doctrineLine: 'Lowest Defensible Signal Doctrine',
  proofLine: 'SHA-256 ProofHash — tamper-evident, replayable',
  leaseLine: 'Quality-tiered governance lease',
  bindingLine: 'Not a recommendation. A binding governance decision.',
  summary:
    'CO2 Router governs whether compute runs, where it runs, and under what environmental conditions before execution begins.',
  commercialHeroTitle: 'Decision authority before execution.',
  commercialHeroBody:
    'CO2 Router is the Deterministic Environmental Execution Control Plane. It applies the Lowest Defensible Signal Doctrine, returns one binding governance action, and seals the result with a replayable SHA-256 ProofHash.',
  technicalHeroBody:
    'The technical surface exists to prove doctrine order, governance outcomes, proof integrity, and replayability under live execution conditions.',
  publicDescription:
    'CO2 Router is the Deterministic Environmental Execution Control Plane: deterministic pre-execution governance, five binding actions, and replayable proof before workloads run.',
  methodologyDescription:
    'How CO2 Router establishes deterministic pre-execution governance through the Lowest Defensible Signal Doctrine, five binding actions, and replayable proof.',
  prohibitedPhrases: [
    'carbon routing',
    'sustainability tool',
    'scheduling optimization',
    'AI-powered',
  ],
} as const

export const commercialDoctrinePoints = [
  masterDistributionDoctrine.actionLine,
  masterDistributionDoctrine.doctrineLine,
  masterDistributionDoctrine.proofLine,
  masterDistributionDoctrine.leaseLine,
  masterDistributionDoctrine.bindingLine,
] as const
