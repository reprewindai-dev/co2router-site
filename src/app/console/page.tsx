import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Console',
  description: 'Choose your HaloGrid interface — three CO2 Router console packages, all running on the same live engine.',
}

const consoles = [
  {
    id: 'classic',
    version: '01',
    name: 'HaloGrid Classic',
    plan: 'Freeview',
    planColor: '#38bdf8',
    price: 'Free',
    tagline: 'Clean. Fast. Live decision stream.',
    description:
      'The stripped-back command surface. Real-time region grid, live carbon intensity, decision stream with proof hashes, and carbon pressure bar. No account required — open immediately.',
    features: [
      'Live region grid — carbon, load, state per region',
      'Real-time decision stream: RUN · REROUTE · DELAY · THROTTLE · DENY',
      'Carbon pressure bar + decision velocity',
      'Proof hash on every frame',
      'System health footer',
    ],
    locked: false,
    cta: 'Launch HaloGrid Classic',
    href: '/live?tier=freeview',
    border: 'rgba(56,189,248,0.18)',
    glow: 'rgba(56,189,248,0.05)',
    accent: '#38bdf8',
    badge: null,
  },
  {
    id: 'noc',
    version: '02',
    name: 'HaloGrid NOC',
    plan: 'Pro',
    planColor: '#fbbf24',
    price: 'From $2,500/mo',
    tagline: 'Full NOC surface. 3D globe. Alarm queue. Team chat.',
    description:
      'The full network operations center build. Interactive 3D globe with arc routing, alarm queue, SAIQ weight controls, signal provider feeds, team chat, and Ghost Mode. Built for operators who run production workloads.',
    features: [
      'Interactive 3D globe with live arc routing',
      'Alarm queue with severity classification',
      'Signal provider feeds — carbon + water sources',
      'SAIQ governance weight controls',
      'Team chat and manual override panel',
      'Smart Advisor and anomaly detection',
      'Ghost Mode — shadow run without enforcement',
    ],
    locked: false,
    cta: 'Preview NOC',
    href: '/live?tier=pro',
    border: 'rgba(251,191,36,0.18)',
    glow: 'rgba(251,191,36,0.04)',
    accent: '#fbbf24',
    badge: 'Operator plan',
  },
  {
    id: 'elite',
    version: '03',
    name: 'HaloGrid Elite',
    plan: 'Elite',
    planColor: '#a78bfa',
    price: 'From $10,000/mo',
    tagline: 'Mission control. Audit exports. Compliance reports.',
    description:
      'The full mission control surface with trace rail, audit exports, compliance reports, SAIQ weight editor, and Ghost Mode. Built for enterprises that need full observability and governance.',
    features: [
      'Full decision trace rail with replay',
      'Audit exports and compliance reports',
      'SAIQ weight editor with policy controls',
      'Ghost Mode with deterministic replay',
      'Advanced anomaly detection',
      'Custom signal provider integrations',
      'Dedicated support',
    ],
    locked: false,
    cta: 'Preview Elite',
    href: '/live?tier=elite',
    border: 'rgba(167,139,250,0.18)',
    glow: 'rgba(167,139,250,0.04)',
    accent: '#a78bfa',
    badge: 'Enterprise',
  },
] as const

export default function ConsolePage() {
  return (
    <div className="space-y-8 pb-10">

      {/* Hero */}
      <section className="surface-card-strong p-8">
        <div className="eyebrow">Console</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
          Two interfaces. One engine. You choose.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Both HaloGrid packages connect to the same live CO2 Router engine. Pick the interface that matches how you work — simple and fast, or full NOC operations surface.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">All consoles live on the same engine</span>
        </div>
      </section>

      {/* Console cards */}
      <section className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto">
        {consoles.map((c) => (
          <div
            key={c.id}
            className="relative flex flex-col rounded-[28px] p-6"
            style={{
              border: `1px solid ${c.border}`,
              background: `radial-gradient(circle at top left, ${c.glow}, transparent 55%), linear-gradient(180deg, rgba(13,17,28,0.97), rgba(5,8,16,0.99))`,
            }}
          >
            {/* Version + plan badge */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Version {c.version}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] font-semibold"
                style={{ background: `${c.planColor}18`, color: c.planColor }}
              >
                {c.locked ? '🔒 ' : ''}{c.plan}
              </span>
            </div>

            <div className="text-[11px] uppercase tracking-[0.28em] mb-2" style={{ color: c.accent }}>
              {c.name}
            </div>
            <div className="text-2xl font-bold text-white">{c.price}</div>
            <div className="mt-1 text-sm font-semibold" style={{ color: c.accent }}>
              {c.tagline}
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300">{c.description}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {c.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.accent }} />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={c.href}
              className="mt-7 inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] transition-all duration-200 hover:brightness-110"
              style={
                !c.locked
                  ? { background: `linear-gradient(135deg,${c.accent}cc,${c.accent}88)`, color: '#050505' }
                  : { border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.03)', color: c.accent }
              }
            >
              {c.locked ? '🔒 ' : '→ '}{c.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* Bottom note */}
      <section className="surface-card p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="eyebrow">Same engine. Different depth.</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Both HaloGrid Classic and NOC run live against the same CO2 Router engine.
              Start with Classic — free, no signup required, open immediately.
              Upgrade to NOC when your team needs a full operations surface with 3D globe,
              alarm queue, team chat, and Ghost Mode.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-shrink-0">
            <Link
              href="/live"
              className="rounded-full bg-cyan-300 px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-cyan-200"
            >
              Open Classic free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/12 px-6 py-3 text-center text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
            >
              See full pricing
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
