'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  ShieldCheck,
  X,
  Activity,
  Zap,
} from 'lucide-react'
import type { IntelligenceReport } from './intelligence'
import type { HaloTheme } from './theme'
import { glassStyle } from './theme'

function sevColor(theme: HaloTheme, s: string) { return s === 'critical' ? theme.rose : s === 'warning' ? theme.amber : theme.sky }
function sevIcon(s: string) {
  if (s === 'critical') return AlertOctagon
  if (s === 'warning') return AlertTriangle
  return Activity
}
function trendIcon(theme: HaloTheme, t: string) {
  if (t === 'improving') return <TrendingDown className="h-3.5 w-3.5" style={{ color: theme.green }} />
  if (t === 'degrading') return <TrendingUp className="h-3.5 w-3.5" style={{ color: theme.rose }} />
  return <Minus className="h-3.5 w-3.5" style={{ color: theme.muted }} />
}

export function SmartAdvisor({ report, onClose, theme }: { report: IntelligenceReport | null; onClose: () => void; theme: HaloTheme }) {
  const [expanded, setExpanded] = useState(true)
  if (!report) return null

  const healthColor = report.healthScore >= 75 ? theme.green : report.healthScore >= 45 ? theme.amber : theme.rose
  const riskColor = report.riskLevel === 'critical' ? theme.rose : report.riskLevel === 'elevated' ? theme.amber : theme.green
  const criticalCount = report.insights.filter((i) => i.severity === 'critical').length
  const warningCount = report.insights.filter((i) => i.severity === 'warning').length
  const headerGlow = report.riskLevel === 'critical' ? `0 0 32px ${theme.rose}22` : report.riskLevel === 'elevated' ? `0 0 24px ${theme.amber}18` : 'none'

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.95 }}
      className="w-[340px] rounded-[20px] overflow-hidden"
      style={glassStyle(theme, { boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 48px ${theme.sky}0a, ${headerGlow}` })}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${theme.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${riskColor}18`, border: `0.5px solid ${riskColor}33` }}>
            <Brain className="h-3.5 w-3.5" style={{ color: riskColor }} />
            {report.riskLevel === 'critical' && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full animate-pulse" style={{ background: theme.rose, boxShadow: `0 0 6px ${theme.rose}` }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold" style={{ color: theme.textStrong }}>Smart Advisor</span>
              {criticalCount > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[7px] font-black tracking-[0.08em]" style={{ background: `${theme.rose}20`, color: theme.rose }}>
                  {criticalCount} CRITICAL
                </span>
              )}
            </div>
            <div className="text-[8px] tracking-[0.15em]" style={{ color: theme.muted }}>CARBON ROUTING DOCTRINE</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setExpanded((v) => !v)} className="rounded-full p-1" style={{ border: `0.5px solid ${theme.border}` }}>
            {expanded ? <ChevronDown className="h-3 w-3" style={{ color: theme.muted }} /> : <ChevronUp className="h-3 w-3" style={{ color: theme.muted }} />}
          </button>
          <button type="button" onClick={onClose} className="rounded-full p-1" style={{ border: `0.5px solid ${theme.border}` }}>
            <X className="h-3 w-3" style={{ color: theme.muted }} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-px" style={{ background: theme.border }}>
        <div className="px-3 py-2.5 text-center" style={{ background: theme.glass }}>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: theme.dim }}>HEALTH</div>
          <div className="mt-0.5 text-lg font-black" style={{ color: healthColor }}>{report.healthScore}%</div>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ background: theme.glass }}>
          {trendIcon(theme, report.carbonTrend)}
          <div>
            <div className="text-[8px] tracking-[0.12em]" style={{ color: theme.dim }}>CARBON</div>
            <div className="text-[10px] font-bold" style={{ color: theme.textStrong }}>{report.carbonTrend}</div>
          </div>
        </div>
        <div className="px-3 py-2.5 text-center" style={{ background: theme.glass }}>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: theme.dim }}>DENY</div>
          <div className="mt-0.5 text-lg font-black" style={{ color: report.denyRate > 0.3 ? theme.rose : report.denyRate > 0.15 ? theme.amber : theme.green }}>{(report.denyRate * 100).toFixed(0)}%</div>
        </div>
        <div className="px-3 py-2.5 text-center" style={{ background: theme.glass }}>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: theme.dim }}>RISK</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: riskColor }}>{report.riskLevel}</div>
          <div className="mt-0.5 text-[8px] font-bold" style={{ color: report.fallbackRate > 0.2 ? theme.amber : theme.dim }}>{Math.round(report.fallbackRate * 100)}% fallback</div>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            {/* Operator Brief */}
            <div className="space-y-2 px-3 pt-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${theme.border}` }}>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3" style={{ color: riskColor }} />
                  <span className="text-[8px] font-bold tracking-[0.14em]" style={{ color: theme.dim }}>OPERATOR BRIEF</span>
                </div>
                <div className="mt-1.5 text-[10px] leading-5" style={{ color: theme.textStrong }}>{report.operatorBrief}</div>
                {report.priorityAction ? (
                  <div className="mt-2 rounded-lg px-2.5 py-2 text-[9px] font-semibold leading-4" style={{ background: `${riskColor}12`, color: riskColor, border: `0.5px solid ${riskColor}22` }}>
                    ▸ {report.priorityAction}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Insights */}
            <div className="max-h-[280px] space-y-1.5 overflow-y-auto p-3 pt-2">
              {report.insights.length === 0 && report.confirmedClear.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <ShieldCheck className="h-4 w-4" style={{ color: theme.green }} />
                  <div className="text-[11px]" style={{ color: theme.textStrong }}>Fleet nominal. All systems clear.</div>
                </div>
              ) : (
                <>
                  {report.insights.map((insight) => {
                    const Icon = sevIcon(insight.severity)
                    const color = sevColor(theme, insight.severity)
                    return (
                      <div key={insight.id} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${theme.border}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3 w-3 shrink-0" style={{ color }} />
                            <span className="text-[11px] font-bold leading-4" style={{ color: theme.textStrong }}>{insight.title}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {insight.metric ? (
                              <span className="rounded px-1 py-0.5 text-[7px] font-black tracking-[0.06em]" style={{ background: `${color}14`, color }}>{insight.metric}</span>
                            ) : null}
                            <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold tracking-[0.1em]" style={{ background: `${color}14`, color }}>{insight.severity.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] leading-5" style={{ color: theme.muted }}>{insight.detail}</div>
                        {insight.recommendedAction ? (
                          <div className="mt-1.5 rounded-lg px-2 py-1.5 text-[9px] font-semibold leading-4" style={{ background: `${color}10`, color, border: `0.5px solid ${color}18` }}>
                            ▸ {insight.recommendedAction}
                          </div>
                        ) : null}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${insight.confidence * 100}%`, background: color }} />
                          </div>
                          <span className="text-[8px] font-bold" style={{ color: theme.dim }}>{(insight.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Confirmed clear items */}
                  {report.confirmedClear.length > 0 && (
                    <div className="mt-1 rounded-xl p-2.5" style={{ background: `${theme.green}06`, border: `0.5px solid ${theme.green}18` }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle className="h-3 w-3" style={{ color: theme.green }} />
                        <span className="text-[8px] font-bold tracking-[0.14em]" style={{ color: theme.green }}>CONFIRMED CLEAR</span>
                      </div>
                      {report.confirmedClear.map((item, i) => (
                        <div key={i} className="text-[10px] leading-5" style={{ color: theme.muted }}>
                          ✓ {item}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="text-[8px]" style={{ color: theme.dim }}>
                {new Date(report.analyzedAt).toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2 text-[8px]" style={{ color: theme.dim }}>
                {criticalCount > 0 && <span style={{ color: theme.rose }}>{criticalCount} critical</span>}
                {warningCount > 0 && <span style={{ color: theme.amber }}>{warningCount} warning</span>}
                {report.insights.length - criticalCount - warningCount > 0 && (
                  <span>{report.insights.length - criticalCount - warningCount} info</span>
                )}
                {report.insights.length === 0 && <span style={{ color: theme.green }}>all clear</span>}
                <span>· v2</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

