'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle, X } from 'lucide-react'
import type { IntelligenceReport } from './intelligence'

const C = { sky: '#38bdf8', green: '#4ade80', amber: '#fbbf24', rose: '#f87171', muted: '#64748b', dim: '#475569', border: 'rgba(255,255,255,0.07)', glass: 'rgba(2,8,23,0.92)' }

function glass(extra?: React.CSSProperties): React.CSSProperties {
  return { background: `linear-gradient(180deg,rgba(3,12,29,0.97),${C.glass})`, border: `0.6px solid ${C.border}`, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', ...extra }
}

function sevColor(s: string) { return s === 'critical' ? C.rose : s === 'warning' ? C.amber : C.sky }
function trendIcon(t: string) {
  if (t === 'improving') return <TrendingDown className="h-3.5 w-3.5" style={{ color: C.green }} />
  if (t === 'degrading') return <TrendingUp className="h-3.5 w-3.5" style={{ color: C.rose }} />
  return <Minus className="h-3.5 w-3.5" style={{ color: C.muted }} />
}

export function SmartAdvisor({ report, onClose }: { report: IntelligenceReport | null; onClose: () => void }) {
  const [expanded, setExpanded] = useState(true)
  if (!report) return null

  const healthColor = report.healthScore >= 75 ? C.green : report.healthScore >= 45 ? C.amber : C.rose

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.95 }}
      className="w-[320px] rounded-[20px] overflow-hidden"
      style={glass({ boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 48px ${C.sky}0a` })}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${C.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${C.sky}18`, border: `0.5px solid ${C.sky}33` }}>
            <Brain className="h-3.5 w-3.5" style={{ color: C.sky }} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-white">AI Advisor</div>
            <div className="text-[8px] tracking-[0.15em]" style={{ color: C.muted }}>OFFLINE INTELLIGENCE</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setExpanded((v) => !v)} className="rounded-full p-1" style={{ border: `0.5px solid ${C.border}` }}>
            {expanded ? <ChevronDown className="h-3 w-3" style={{ color: C.muted }} /> : <ChevronUp className="h-3 w-3" style={{ color: C.muted }} />}
          </button>
          <button type="button" onClick={onClose} className="rounded-full p-1" style={{ border: `0.5px solid ${C.border}` }}>
            <X className="h-3 w-3" style={{ color: C.muted }} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-px" style={{ background: C.border }}>
        <div className="px-3 py-2.5 text-center" style={{ background: C.glass }}>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: C.dim }}>HEALTH</div>
          <div className="mt-0.5 text-lg font-black" style={{ color: healthColor }}>{report.healthScore}%</div>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ background: C.glass }}>
          {trendIcon(report.carbonTrend)}
          <div>
            <div className="text-[8px] tracking-[0.12em]" style={{ color: C.dim }}>CARBON</div>
            <div className="text-[10px] font-bold text-white">{report.carbonTrend}</div>
          </div>
        </div>
        <div className="px-3 py-2.5 text-center" style={{ background: C.glass }}>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: C.dim }}>DENY</div>
          <div className="mt-0.5 text-lg font-black" style={{ color: report.denyRate > 0.3 ? C.rose : report.denyRate > 0.15 ? C.amber : C.green }}>{(report.denyRate * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Insights */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="max-h-[280px] space-y-1.5 overflow-y-auto p-3">
              {report.insights.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <CheckCircle className="h-4 w-4" style={{ color: C.green }} />
                  <div className="text-[11px] text-white">Fleet nominal. No anomalies detected.</div>
                </div>
              ) : report.insights.map((insight) => (
                <div key={insight.id} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${C.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: sevColor(insight.severity) }} />
                      <span className="text-[11px] font-bold text-white">{insight.title}</span>
                    </div>
                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-bold tracking-[0.1em]" style={{ background: `${sevColor(insight.severity)}14`, color: sevColor(insight.severity) }}>{insight.severity.toUpperCase()}</span>
                  </div>
                  <div className="mt-1 text-[10px] leading-5" style={{ color: C.muted }}>{insight.detail}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${insight.confidence * 100}%`, background: sevColor(insight.severity) }} />
                    </div>
                    <span className="text-[8px] font-bold" style={{ color: C.dim }}>{(insight.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 pb-2.5 text-[8px]" style={{ color: C.dim }}>
              Analyzed {new Date(report.analyzedAt).toLocaleTimeString()} - {report.insights.length} insight{report.insights.length !== 1 ? 's' : ''} - 100% offline
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

