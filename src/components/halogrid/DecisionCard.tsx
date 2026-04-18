'use client'

import { motion } from 'framer-motion'

import type { Decision, Tier } from '@/lib/halogrid/types'
import { actionColor, actionLabel, formatHash, formatTime } from '@/lib/halogrid/utils'

export function DecisionCard({
  decision,
  tier,
  index,
}: {
  decision: Decision
  tier: Tier
  index: number
}) {
  const color = actionColor(decision.action)

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
      className="mb-1.5 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.018)', border: `1px solid ${color}14` }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ background: color, boxShadow: `0 0 5px ${color}` }}
          />
          <span className="truncate text-[10px] font-medium" style={{ maxWidth: 120 }}>
            {decision.regionName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-mono"
            style={{ background: `${color}18`, color }}
          >
            {actionLabel(decision.action)}
          </span>
          <span className="text-[9px] font-mono text-slate-500">{formatTime(decision.timestamp)}</span>
        </div>
      </div>
      <p className="mb-1.5 text-[9px] leading-relaxed text-slate-400">{decision.reason}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-amber-300">{decision.carbon}g</span>
          <span className="text-[9px] font-mono text-emerald-400">-{decision.reductionPct}%</span>
          {tier !== 'freeview' ? (
            <span className="text-[9px] font-mono text-sky-300">{decision.confidence}%</span>
          ) : null}
        </div>
        {tier === 'elite' ? (
          <span className="text-[8px] font-mono text-slate-500">{formatHash(decision.proofHash, 10)}</span>
        ) : null}
      </div>
    </motion.div>
  )
}
