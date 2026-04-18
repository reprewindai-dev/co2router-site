'use client'

import { useState } from 'react'

import type { AdvisorPayload, AdvisorStatus } from '@/lib/halogrid/types'

function badgeLabel(status: AdvisorStatus | 'idle') {
  switch (status) {
    case 'optimal':
      return 'Optimal'
    case 'recommend':
      return 'Recommend'
    case 'warning':
      return 'Watch'
    case 'trace':
      return 'Trace'
    case 'info':
      return 'Info'
    default:
      return 'Idle'
  }
}

function badgeClass(status: AdvisorStatus) {
  switch (status) {
    case 'optimal':
      return { color: '#4ade80', background: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.18)' }
    case 'recommend':
      return { color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.18)' }
    case 'warning':
      return { color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.2)' }
    case 'trace':
      return { color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.18)' }
    default:
      return { color: '#cbd5e1', background: 'rgba(255,255,255,0.08)', border: 'rgba(148,163,184,0.14)' }
  }
}

export function SmartAdvisor({ advisor }: { advisor: AdvisorPayload }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(56,189,248,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono tracking-[0.22em]" style={{ color: 'rgba(56,189,248,0.75)' }}>
            SMARTADVISOR
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-100">Copilot recommendations</div>
        </div>
        <div
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: '#38bdf8', boxShadow: '0 0 12px rgba(56, 189, 248, 0.65)' }}
        />
      </div>

      <div className="mt-3 text-[11px] leading-5 text-slate-300">{advisor.headline}</div>

      <div className="mt-3 space-y-2">
        {advisor.suggestions.length > 0 ? (
          advisor.suggestions.map((suggestion) => {
            const isOpen = openId === suggestion.id
            const tone = badgeClass(suggestion.status)

            return (
              <article
                key={suggestion.id}
                className="rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${tone.border}` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-1 text-[9px] font-mono uppercase tracking-[0.18em]"
                    style={{ color: tone.color, background: tone.background }}
                  >
                    {badgeLabel(suggestion.status)}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] font-mono tracking-[0.16em] text-slate-400 transition-colors hover:text-sky-300"
                    onClick={() => setOpenId(isOpen ? null : suggestion.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'HIDE' : 'WHY?'}
                  </button>
                </div>
                <div className="mt-3 text-[12px] font-semibold text-slate-100">{suggestion.title}</div>
                <div className="mt-1 text-[11px] leading-5 text-slate-400">{suggestion.summary}</div>
                {isOpen && suggestion.reasons.length > 0 ? (
                  <ul className="mt-3 space-y-1 pl-4 text-[10px] leading-5 text-slate-500">
                    {suggestion.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-5 text-slate-400">
            No recommendations right now. The advisor is monitoring for route quality changes.
          </div>
        )}
      </div>
    </div>
  )
}
