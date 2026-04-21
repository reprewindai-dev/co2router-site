'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { ArrowRight, ShieldCheck, Signal } from 'lucide-react'

import { CO2RouterLogo } from '@/components/CO2RouterLogo'

type PublicSiteShellProps = {
  children: ReactNode
}

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/live', label: 'Live Demo' },
] as const

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PublicSiteShell({ children }: PublicSiteShellProps) {
  const router = useRouter()
  const pathname = router.pathname || '/'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#020817_50%,#02040f_100%)]" />
      <div className="fixed inset-0 -z-10 bg-grid-mesh opacity-[0.35]" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/72 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <Link href="/" className="flex items-center gap-4">
              <CO2RouterLogo size="md" orientation="lockup" animated={false} />
              <div className="hidden min-[780px]:block">
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Public site</div>
                <div className="mt-1 text-xs text-slate-400">Brokered through ecobe-mvp only</div>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      active
                        ? 'bg-white text-slate-950'
                        : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <Link
                href="/live"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/15"
              >
                <Signal className="h-4 w-4" />
                Demo uses live backend
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 py-8 sm:py-10">{children}</main>

        <footer className="border-t border-white/8 py-6 text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Sandbox demo calls run through ecobe-mvp. No private customer data is exposed.</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="transition hover:text-white">
                Pricing
              </Link>
              <Link href="/live" className="inline-flex items-center gap-1 transition hover:text-white">
                Live Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
