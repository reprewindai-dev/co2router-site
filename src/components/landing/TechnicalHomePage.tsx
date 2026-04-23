import Link from 'next/link'

export function TechnicalHomePage() {
  const consoleUrl = 'https://console.co2router.com'
  const panels = [
    {
      eyebrow: 'Flagship Surface',
      title: 'CO2 Grid command center',
      body: 'Inspect live execution authority, operator context, proof posture, and decision-state rendering in the canonical technical control surface.',
      href: consoleUrl,
      cta: 'Open CO2 Grid',
    },
    {
      eyebrow: 'Architecture',
      title: 'Deterministic decision chain',
      body: 'Signals, SAIQ governance, doctrine order, proof, and replay presented as one coherent execution system.',
      href: '/developers/architecture',
      cta: 'View architecture',
    },
    {
      eyebrow: 'Replay Credibility',
      title: 'Trace and replay posture',
      body: 'Use trace-backed replay and provenance pages to verify that the same stored frame produces the same result.',
      href: '/system/replay',
      cta: 'Inspect replay',
    },
  ] as const

  const sections = [
    {
      title: 'Technical surfaces',
      links: [
        { href: consoleUrl, label: 'CO2 Grid / Control Surface' },
        { href: '/status', label: 'Operational status' },
        { href: '/system/decision-engine', label: 'Decision engine' },
        { href: '/system/provenance', label: 'Provenance' },
      ],
    },
    {
      title: 'Developer docs',
      links: [
        { href: '/developers/quickstart', label: 'Quickstart' },
        { href: '/developers/api', label: 'API' },
        { href: '/developers/adapters', label: 'Adapters' },
        { href: '/developers/architecture', label: 'Architecture' },
      ],
    },
  ] as const

  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-[36px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_34%),linear-gradient(180deg,rgba(3,7,18,0.98),rgba(2,8,23,0.98))] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-4xl">
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
              Technical Overview
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              CO2 Grid is the technical interface for CO2 Router.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
              This domain is the system-facing surface: CO2 Grid, architecture, doctrine order,
              proof, replay, provenance, and developer entry points. It exists to prove how the
              control plane works, not to retell the commercial story.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={consoleUrl}
                className="rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950"
              >
                Open CO2 Grid
              </Link>
              <Link
                href="/developers/quickstart"
                className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
              >
                Quickstart
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              Technical Focus
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
                Hostname: <span className="font-semibold text-white">console.co2router.com</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
                Canonical CO2 Grid source: <span className="font-semibold text-white">console.co2router.com</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
                Core evidence: architecture, trace, replay, provenance, live control data, and
                developer docs.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {panels.map((panel) => (
          <article
            key={panel.title}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
              {panel.eyebrow}
            </div>
            <h2 className="mt-3 text-2xl font-bold text-white">{panel.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">{panel.body}</p>
            <Link
              href={panel.href}
              className="mt-6 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100"
            >
              {panel.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
              {section.title}
            </div>
            <div className="mt-4 grid gap-3">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
