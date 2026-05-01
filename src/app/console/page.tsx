import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Console',
  description: 'Choose your CO2 Router console tier — Freeview, Pro, or Elite.',
}

const tiers = [
  {
    id: 'freeview',
    name: 'Freeview',
    badge: null,
    badgeColor: null,
    price: 'Free',
    tagline: 'Live decision flow. No signup required.',
    description:
      'Watch the CO2 Router engine make real binding decisions in real time. See regions, carbon intensity, decision actions, and the proof strip — no account needed.',
    features: [
      'Live region grid with carbon / load / state',
      'Real-time decision stream (RUN, REROUTE, DELAY, THROTTLE, DENY)',
      'Latest decision frame with proof hash',
      'Carbon pressure bar and decision velocity',
      'System health footer',
    ],
    locked: false,
    cta: 'Open Freeview console',
    href: '/live',
    borderColor: 'rgba(56,189,248,0.2)',
    glowColor: 'rgba(56,189,248,0.05)',
    accentColor: '#38bdf8',
    badgeBg: '',
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Operator plan',
    price: 'From $2,500/mo',
    tagline: 'Signal feeds, policy editor, full replay.',
    description:
      'Full decision history, signal provider feeds (carbon + water), policy rule editor, multi-region replay, and export. One production control point with canonical proof storage.',
    features: [
      'Everything in Freeview',
      'Signal provider feed panel (carbon + water sources)',
      'Full decision history — 30 day rolling',
      'Policy rule editor with live enforcement preview',
      'Replay any decision frame from stored proof',
      'CSV / JSON decision export',
    ],
    locked: true,
    cta: 'Request Pro access',
    href: '/access',
    borderColor: 'rgba(251,191,36,0.2)',
    glowColor: 'rgba(251,191,36,0.04)',
    accentColor: '#fbbf24',
    badgeBg: 'rgba(251,191,36,0.1)',
  },
  {
    id: 'elite',
    name: 'Elite',
    badge: 'Assurance plan',
    price: 'Custom',
    tagline: 'Trace rail, audit exports, SAIQ editor, Ghost Mode.',
    description:
      'Full operational assurance surface. Trace rail on every decision, signed audit export chain, SAIQ weight editor, compliance reports, and Ghost Mode for shadow-run analysis.',
    features: [
      'Everything in Pro',
      'Live trace rail per decision frame',
      'Signed audit export chain (PDF + JSON)',
      'SAIQ governance weight editor',
      'Compliance report generation',
      'Ghost Mode — shadow run without enforcement',
      'Dedicated architecture review',
    ],
    locked: true,
    cta: 'Talk to sales',
    href: '/contact',
    borderColor: 'rgba(167,139,250,0.2)',
    glowColor: 'rgba(167,139,250,0.04)',
    accentColor: '#a78bfa',
    badgeBg: 'rgba(167,139,250,0.1)',
  },
] as const

export default function ConsolePage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <section className="surface-card-strong p-8">
        <div className="eyebrow">Console</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
          Choose your control surface.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          The CO2 Router console is tiered by operational depth — from live public Freeview to
          full assurance-grade Elite. Every tier runs against the same real engine.
        </p>
      </section>

      {/* Tier cards */}
      <section className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="relative flex flex-col rounded-[28px] p-6"
            style={{
              border: `1px solid ${tier.borderColor}`,
              background: `radial-gradient(circle at top left, ${tier.glowColor}, transparent 60%), linear-gradient(180deg, rgba(13,17,28,0.97), rgba(5,8,16,0.99))`,
            }}
          >
            {/* Lock badge */}
            {tier.locked && (
              <div
                className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.22em]"
                style={{ background: tier.badgeBg, color: tier.accentColor }}
              >
                🔒 {tier.badge}
              </div>
            )}

            {/* Tier name */}
            <div
              className="text-[11px] uppercase tracking-[0.28em]"
              style={{ color: tier.accentColor }}
            >
              {tier.name}
            </div>

            <div className="mt-3 text-2xl font-bold text-white">{tier.price}</div>
            <div className="mt-1 text-sm font-semibold" style={{ color: tier.accentColor }}>
              {tier.tagline}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{tier.description}</p>

            {/* Features */}
            <ul className="mt-5 flex-1 space-y-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: tier.accentColor }}
                  />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={tier.href}
              className="mt-7 inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] transition-all duration-200"
              style={
                !tier.locked
                  ? {
                      background: `linear-gradient(135deg, ${tier.accentColor}cc, ${tier.accentColor}88)`,
                      color: '#050505',
                    }
                  : {
                      border: `1px solid ${tier.borderColor}`,
                      background: 'rgba(255,255,255,0.03)',
                      color: tier.accentColor,
                    }
              }
            >
              {!tier.locked ? '→ ' : '🔒 '}
              {tier.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* Compare note */}
      <section className="surface-card p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="eyebrow">All tiers. Same engine.</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Freeview, Pro, and Elite all run against the live CO2 Router engine on Coolify.
              The difference is operational depth — how much of the decision surface you can
              inspect, replay, and govern. Start with Freeview to verify it works, then upgrade
              when you need enforcement in production.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-shrink-0">
            <Link
              href="/live"
              className="rounded-full bg-cyan-300 px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-cyan-200"
            >
              Open Freeview now
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
