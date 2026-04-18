'use client'

import { BookOpenText, Globe, Pause, Play, RotateCcw, Shield, Zap } from 'lucide-react'

import type { SystemMetrics, Tier } from '@/lib/halogrid/types'

const TIER_CFG: { id: Tier; label: string; icon: typeof Shield }[] = [
  { id: 'freeview', label: 'Freeview', icon: Globe },
  { id: 'core', label: 'Core', icon: Zap },
  { id: 'elite', label: 'Elite', icon: Shield },
]

export function TopBar({
  metrics,
  tier,
  paused,
  onToggle,
  onRefresh,
  onTierChange,
  onBlogNavigate,
  time,
}: {
  metrics: SystemMetrics
  tier: Tier
  paused: boolean
  onToggle: () => void
  onRefresh: () => void
  onTierChange: (tier: Tier) => void
  onBlogNavigate: () => void
  time: number
}) {
  const timeLabel = new Date(time).toLocaleTimeString('en-CA', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <header
      className="flex flex-shrink-0 items-center justify-between px-5 py-2.5"
      style={{
        borderBottom: '1px solid rgba(56,189,248,0.07)',
        background: 'rgba(6,13,24,0.92)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-label="HaloGrid">
          <circle cx="16" cy="16" r="14" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
          <circle cx="16" cy="16" r="9" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.55" />
          <circle cx="16" cy="16" r="4" fill="#38bdf8" />
          <line x1="16" y1="2" x2="16" y2="7" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          <line x1="16" y1="25" x2="16" y2="30" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          <line x1="2" y1="16" x2="7" y2="16" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          <line x1="25" y1="16" x2="30" y2="16" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
        </svg>
        <div>
          <div className="text-sm font-bold tracking-wide text-slate-200" style={{ letterSpacing: '0.06em' }}>
            HALOGRID
          </div>
          <div className="text-[9px] font-mono tracking-widest text-sky-300/60">CO2 ROUTER CONTROL PLANE</div>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        {[
          { label: 'AVOIDED', value: `${metrics.totalSavingsKg.toFixed(1)} kg`, color: '#4ade80' },
          { label: 'DECISIONS', value: `${metrics.decisionsToday}`, color: '#38bdf8' },
          { label: 'AVG CO2', value: `${metrics.avgCarbon} g`, color: '#fbbf24' },
          { label: 'UPTIME', value: `${metrics.uptimePct}%`, color: '#4ade80' },
          {
            label: 'ALERTS',
            value: `${metrics.alertCount}`,
            color: metrics.alertCount > 0 ? '#f87171' : '#4ade80',
          },
        ].map((metric) => (
          <div key={metric.label} className="text-center">
            <div className="text-[9px] font-mono tracking-widest text-slate-500">{metric.label}</div>
            <div className="text-sm font-bold tabular-nums" style={{ color: metric.color }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="mr-2 flex gap-0.5 rounded-xl bg-white/[0.03] p-0.5">
          <button
            type="button"
            className="rounded-[10px] px-3 py-1 text-[9px] font-mono uppercase tracking-widest"
            style={{
              background: 'rgba(45,212,191,0.16)',
              color: '#2dd4bf',
              boxShadow: '0 0 8px rgba(45,212,191,0.2)',
            }}
          >
            Control
          </button>
          <button
            type="button"
            onClick={onBlogNavigate}
            className="rounded-[10px] px-3 py-1 text-[9px] font-mono uppercase tracking-widest transition-all"
            style={{ color: '#64748b' }}
          >
            <span className="inline-flex items-center gap-1">
              <BookOpenText size={11} />
              Blog
            </span>
          </button>
        </div>

        <div className="mr-2 flex gap-0.5 rounded-xl bg-white/[0.03] p-0.5">
          {TIER_CFG.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTierChange(id)}
              className="rounded-[10px] px-3 py-1 text-[9px] font-mono uppercase tracking-widest transition-all"
              style={{
                background: tier === id ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: tier === id ? '#38bdf8' : '#64748b',
                boxShadow: tier === id ? '0 0 8px rgba(56,189,248,0.2)' : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {paused ? <Play size={13} color="#38bdf8" /> : <Pause size={13} color="#64748b" />}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RotateCcw size={13} color="#64748b" />
        </button>
        <div className="ml-2 text-[10px] font-mono tabular-nums text-slate-500">{timeLabel}</div>
      </div>
    </header>
  )
}
