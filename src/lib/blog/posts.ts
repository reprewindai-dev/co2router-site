import type { SiteAudience } from '@/lib/site-host'

export type BlogPost = {
  slug: string
  audience: SiteAudience
  title: string
  description: string
  publishedAt: string
  readTime: string
  summary: string
  keywords: string[]
  sections: Array<{
    heading: string
    paragraphs: string[]
  }>
  relatedLinks: Array<{
    href: string
    label: string
  }>
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'why-buyers-need-a-pre-execution-control-plane',
    audience: 'commercial',
    title: 'Why buyers need a pre-execution control plane',
    description:
      'A buying guide for teams that need binding environmental control before workloads run, not after the fact.',
    publishedAt: '2026-03-30',
    readTime: '6 min read',
    summary:
      'Dashboards explain what happened. A pre-execution control plane decides whether compute may run, where it may run, and what proof remains attached to the decision. That distinction matters for procurement, policy, and operator trust.',
    keywords: ['buying guide', 'pre-execution control plane', 'policy enforcement', 'proof and replay', 'operator trust'],
    sections: [
      {
        heading: 'Reporting does not change outcomes',
        paragraphs: [
          'Most sustainability software is informative. It shows trends, highlights risk, or suggests better placement. Useful, but still advisory.',
          'A control plane is different. It binds the runtime before execution starts, so the buyer can enforce policy instead of simply observing it.',
        ],
      },
      {
        heading: 'The purchasing question is simple',
        paragraphs: [
          'Can the product make a binding decision before compute starts? Can that decision be reviewed later? Can it be replayed against the same evidence?',
          'If the answer is yes, the system is operational infrastructure. If not, it is reporting with better branding.',
        ],
      },
      {
        heading: 'Proof matters to finance, compliance, and operators',
        paragraphs: [
          'Proof, trace, replay, and provenance are what make the control plane defensible. Without them, policy is hard to audit and hard to trust.',
          'CO2 Router keeps those artifacts attached to the decision frame so commercial teams can show buyers the exact basis for each authorization.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/methodology', label: 'Read the methodology' },
      { href: '/assurance', label: 'See assurance posture' },
      { href: '/pricing', label: 'Review commercial terms' },
    ],
  },
  {
    slug: 'what-operators-should-expect-from-environmental-governance',
    audience: 'commercial',
    title: 'What operators should expect from environmental governance',
    description:
      'An operator-facing view of policy enforcement, live evidence, and the controls that make sustainability operational.',
    publishedAt: '2026-03-30',
    readTime: '5 min read',
    summary:
      'Operators do not need another dashboard. They need a control layer that can authorize workloads, preserve evidence, and expose the operational boundary to the people accountable for spend and policy.',
    keywords: ['operator-facing', 'environmental governance', 'operational boundary', 'proof surface', 'policy controls'],
    sections: [
      {
        heading: 'Control comes before visibility',
        paragraphs: [
          'A dashboard tells you that a workload was expensive, slow, or carbon heavy. An operator needs to decide before that workload starts.',
          'The commercial value is not the chart. It is the ability to bind the workload to a decision before the runtime spends money or emits impact.',
        ],
      },
      {
        heading: 'Evidence closes the deal',
        paragraphs: [
          'Procurement and platform teams want a clear answer to one question: what proof exists for each decision?',
          'That proof has to stay connected to the decision frame. Otherwise the system becomes a narrative layer instead of a control layer.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/overview', label: 'Product overview' },
      { href: '/faq', label: 'Commercial FAQ' },
      { href: '/contact', label: 'Talk to the team' },
    ],
  },
  {
    slug: 'how-proof-creates-procurement-confidence',
    audience: 'commercial',
    title: 'How proof creates procurement confidence',
    description:
      'Why replay, provenance, and decision evidence matter when a buyer evaluates environmental control software.',
    publishedAt: '2026-03-30',
    readTime: '5 min read',
    summary:
      'Buyers do not just buy policy. They buy confidence that the policy can be enforced, reviewed, and explained. Proof is what turns a control plane into something procurement can sponsor.',
    keywords: ['procurement confidence', 'replay', 'provenance', 'decision evidence', 'buyer trust'],
    sections: [
      {
        heading: 'Confidence needs traceability',
        paragraphs: [
          'If a decision cannot be reproduced from stored inputs, it cannot be defended in a review.',
          'Replay and provenance give buyers a way to verify that the product is making the same decision it said it made.',
        ],
      },
      {
        heading: 'Commercial teams need a crisp proof story',
        paragraphs: [
          'The proof story has to be simple enough for procurement, security, and platform leadership to evaluate together.',
          'That story is strongest when the same frame contains the policy, the inputs, the outcome, and the evidence needed to explain it.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/developers/architecture', label: 'View architecture' },
      { href: '/system/provenance', label: 'Inspect provenance' },
      { href: '/system/replay', label: 'Inspect replay' },
    ],
  },
  {
    slug: 'how-deterministic-control-stays-auditable',
    audience: 'technical',
    title: 'How deterministic control stays auditable',
    description:
      'A technical explanation of how bounded signals, governance, and proof keep the control surface auditable.',
    publishedAt: '2026-03-30',
    readTime: '7 min read',
    summary:
      'Deterministic control only matters if the same inputs produce the same decision and the proof stays attached. That requires bounded signal handling, policy traceability, and stable replay behavior.',
    keywords: ['auditable control', 'bounded signals', 'policy traceability', 'stable replay', 'evidence chain'],
    sections: [
      {
        heading: 'Bounded inputs create bounded outcomes',
        paragraphs: [
          'A control system needs a fixed surface area for signals. If the runtime can improvise the shape of its inputs, the decision stops being repeatable.',
          'CO2 Router keeps the input path narrow so the decision can be reconstructed later from the same evidence set.',
        ],
      },
      {
        heading: 'Trace ties policy to outcome',
        paragraphs: [
          'Policy only becomes auditable when it is attached to the outcome that was actually enforced.',
          'The trace record does that work by preserving the policy version, the selected action, and the evidence needed to explain why the result was chosen.',
        ],
      },
      {
        heading: 'Replay has to be stable, not theatrical',
        paragraphs: [
          'A replay feature is valuable only if it can reproduce the same decision when the same frame is reloaded.',
          'The technical bar is not a simulation. It is deterministic reconstruction against stored inputs and stored governance state.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/developers/architecture', label: 'View architecture' },
      { href: '/system/replay', label: 'Inspect replay' },
      { href: '/system/trace-ledger', label: 'Inspect trace ledger' },
    ],
  },
  {
    slug: 'why-dashboards-are-not-enough-from-reporting-to-enforcement',
    audience: 'technical',
    title: 'Why dashboards are not enough: from reporting to enforcement',
    description:
      'Dashboards and telemetry are not enough to govern compute. The missing layer is pre-execution enforcement with proof.',
    publishedAt: '2026-03-30',
    readTime: '6 min read',
    summary:
      'Dashboards make systems visible. They do not decide whether a workload may run. Infrastructure governance requires a control layer that can enforce policy before compute starts.',
    keywords: ['dashboards are not enough', 'reporting versus enforcement', 'control plane vs dashboard', 'carbon dashboards', 'infrastructure enforcement'],
    sections: [
      {
        heading: 'Visibility is not authority',
        paragraphs: [
          'Dashboards are useful because they surface system state. They show carbon signals, cost posture, regional health, and decision history. They are not the layer that binds execution.',
          'If a workload can still run unchanged while the dashboard warns about better options, the operational control point remains elsewhere. Reporting has value, but it does not enforce.',
        ],
      },
      {
        heading: 'Enforcement begins before execution',
        paragraphs: [
          'A control surface becomes meaningful when it sits in front of execution and returns an outcome that downstream systems follow. That outcome has to exist before the workload starts, not after the fact.',
          'For environmental governance, that means carbon, water, and policy constraints must be resolved before the runtime commits to a region or queue.',
        ],
      },
      {
        heading: 'Proof separates infrastructure from presentation',
        paragraphs: [
          'Once a system starts returning binding decisions, it also has to explain them. That is why proof, trace, replay, and provenance are not ornamental features. They are part of the enforcement contract.',
          'A dashboard can display those artifacts, but the artifacts must originate in the decision system itself. Otherwise the presentation layer outruns the truth of the runtime.',
        ],
      },
      {
        heading: 'The new category is operational governance',
        paragraphs: [
          'CO2 Router is not trying to become a better dashboard. It is building a decision authority layer that happens to expose a public control surface. The dashboard exists to reveal the control plane, not to replace it.',
          'That is the transition from reporting to enforcement: from describing infrastructure behavior to governing it before execution.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/console', label: 'Open the control surface' },
      { href: '/assurance', label: 'See assurance posture' },
      { href: '/system/trace-ledger', label: 'Inspect trace ledger' },
    ],
  },
  {
    slug: 'how-deterministic-control-remains-auditable',
    audience: 'technical',
    title: 'How deterministic control remains auditable',
    description:
      'A technical view of bounded signals, governance, and stable replay in the control plane.',
    publishedAt: '2026-03-30',
    readTime: '7 min read',
    summary:
      'Deterministic control remains auditable when every decision can be traced back to bounded inputs, policy state, and stored proof. That is what keeps the control plane defensible.',
    keywords: ['deterministic control', 'auditable decisions', 'bounded inputs', 'stable replay', 'policy state'],
    sections: [
      {
        heading: 'Bounded inputs create reproducible outcomes',
        paragraphs: [
          'The runtime has to consume a fixed input shape if the decision is going to be reproducible later.',
          'That is why CO2 Router constrains the decision frame instead of letting the surrounding application improvise its own structure.',
        ],
      },
      {
        heading: 'Policy state has to travel with the frame',
        paragraphs: [
          'A decision is only audit-ready if the policy version, input snapshot, and chosen action remain attached to the same frame.',
          'That attachment gives operators a way to explain the result without reconstructing the past from loose logs.',
        ],
      },
      {
        heading: 'Replay is a verification tool, not a demo',
        paragraphs: [
          'Replay has to answer a strict question: if we load the same frame again, do we get the same outcome?',
          'If the answer changes, the system is no longer deterministic and the proof chain is weakened.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/developers/architecture', label: 'View architecture' },
      { href: '/system/replay', label: 'Inspect replay' },
      { href: '/system/provenance', label: 'Inspect provenance' },
    ],
  },
]

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null
}
