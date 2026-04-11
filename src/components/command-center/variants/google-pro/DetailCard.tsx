'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, X } from 'lucide-react'

import DecisionPipelineRail from './DecisionPipelineRail'
import type { HaloTheme } from './theme'

export default function DetailCard({
  node,
  close,
  theme,
}: {
  node: {
    name: string
    baselineIntensity: number
    selectedIntensity: number
    actionLabel: string
    proofRef: string
  } | null
  close: () => void
  theme: HaloTheme
}) {
  const baselineWidth = node ? Math.min(100, Math.max(8, Math.round(node.baselineIntensity / 6))) : 80
  const selectedWidth = node ? Math.min(100, Math.max(8, Math.round(node.selectedIntensity / 6))) : 55

  return (
    <div className="relative flex h-full flex-col font-sans">
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80" />
      <div className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <div className="mb-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
            Binding Authorization
          </div>
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.success, boxShadow: `0 0 10px ${theme.success}` }}
            />
            <h2 className="text-2xl font-black tracking-tight">{node?.name ?? 'Region'}</h2>
          </div>
        </div>
        <button
          onClick={close}
          className="rounded-md border p-1.5 transition-colors hover:bg-white/10"
          style={{ borderColor: theme.border, color: theme.muted }}
          aria-label="Close detail panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-6">
        <div className="mb-3 text-[8px] uppercase tracking-[0.15em]" style={{ color: theme.muted }}>
          Signal Delta · Baseline vs Selected
        </div>
        <div className="mb-2 flex items-center gap-3">
          <span className="w-12 text-[8px]" style={{ color: theme.muted }}>
            Baseline
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${baselineWidth}%` }} className="h-full bg-slate-600 opacity-60" />
          </div>
          <span className="w-10 text-right text-[8px]" style={{ color: theme.muted }}>
            {node?.baselineIntensity ?? 450}g
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 text-[8px]" style={{ color: theme.muted }}>
            Selected
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${selectedWidth}%` }}
              className="h-full opacity-90"
              style={{ backgroundColor: theme.success }}
            />
          </div>
          <span className="w-10 text-right text-[8px]" style={{ color: theme.success }}>
            {node?.selectedIntensity ?? 310}g
          </span>
        </div>
      </div>

      <DecisionPipelineRail theme={theme} currentStage={4} />
      <div className="mt-6 rounded-xl border p-4" style={{ borderColor: theme.border }}>
        <div className="mb-2 text-[8px] uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
          Why This Action
        </div>
        <div className="text-sm font-bold">{node?.actionLabel ?? 'Awaiting command-center selection.'}</div>
      </div>

      <div className="flex-1" />
      <div className="mt-auto flex items-center justify-between border-t pt-4" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-wider" style={{ color: theme.muted }}>
          <ShieldCheck size={10} />
          Powered by HalOGrid
        </div>
        <button className="text-[9px] font-mono transition-colors hover:opacity-80" style={{ color: theme.primary }}>
          {node?.proofRef ?? 'frm-unavailable'}
        </button>
      </div>
    </div>
  )
}
