'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { CO2RouterLogo } from '@/components/CO2RouterLogo'
import type { SiteLinkSection, SiteLink } from '@/lib/site-navigation'

type SiteChromeProps = {
  children: React.ReactNode
  footerLinkSections: SiteLinkSection[]
  footerTagline: string
  headerSubtitle: string
  primaryNavLinks: SiteLink[]
}

export function SiteChrome({
  children,
  footerLinkSections,
  footerTagline,
  headerSubtitle,
  primaryNavLinks,
}: SiteChromeProps) {
  return (
    <div className="min-h-screen bg-slate-950 bg-grid-mesh">
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-6 px-6 py-3">
          <Link href="/" className="group flex flex-col items-start gap-1">
            <CO2RouterLogo size="md" orientation="lockup" />
            <p className="hidden pl-[3.95rem] text-[10px] font-medium uppercase tracking-widest text-slate-500 md:block">
              {headerSubtitle}
            </p>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {primaryNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-all duration-200 hover:bg-cyan-300/5 hover:text-cyan-300"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/status"
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-all duration-200 hover:bg-slate-800/50 hover:text-slate-300"
            >
              Status
            </Link>
            <div className="ml-2 flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
              <div className="pulse-glow h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Live
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">{children}</main>

      <footer className="mt-16 border-t border-slate-800/30">
        <div className="mx-auto w-full max-w-[1500px] px-6 py-8">
          <div className="space-y-2 text-left">
            <div className="text-xl font-black tracking-[-0.04em] text-white">CO2 Router</div>
            <div className="text-sm font-semibold text-slate-200">
              Deterministic Environmental Execution Control Plane
            </div>
            <p className="max-w-xl text-sm text-slate-400">{footerTagline}</p>
          </div>

          <div className="mt-8 grid gap-6 text-left sm:grid-cols-2 xl:grid-cols-4">
            {footerLinkSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  {section.title}
                </div>
                <div className="space-y-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-800/40 pt-4 text-left text-xs text-slate-500">
            &copy; 2026 CO2 Router
          </div>
        </div>
      </footer>
    </div>
  )
}
