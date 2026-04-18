'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Minus, TrendingDown, TrendingUp, X } from 'lucide-react'

import type { Region } from '@/lib/halogrid/types'
import { actionColor, actionLabel, stateColor } from '@/lib/halogrid/utils'

export function RegionDetail({
  region,
  onClose,
}: {
  region: Region | null
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {region ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute bottom-5 left-1/2 z-30 w-80 -translate-x-1/2 overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(6,13,24,0.96)',
            border: `1px solid ${stateColor(region.state)}25`,
            boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${stateColor(region.state)}10`,
          }}
        >
          <div
            className="flex items-start justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: `${stateColor(region.state)}06` }}
          >
            <div>
              <div className="mb-0.5 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: stateColor(region.state), boxShadow: `0 0 8px ${stateColor(region.state)}` }}
                />
                <span className="text-xs font-bold text-slate-100">{region.name}</span>
              </div>
              <div className="ml-4 text-[9px] font-mono text-slate-500">{region.provider} / {region.code}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <X size={11} color="#64748b" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            {[
              { label: 'CARBON', value: `${region.carbon} gCO2/kWh`, color: stateColor(region.state) },
              { label: 'RENEWABLE', value: `${region.renewable}%`, color: '#4ade80' },
              { label: 'LOAD', value: `${region.load}%`, color: '#fbbf24' },
              { label: 'WATER STRESS', value: `${(region.waterStress * 100).toFixed(0)}%`, color: '#38bdf8' },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="mb-0.5 text-[8px] font-mono tracking-widest text-slate-500">{metric.label}</div>
                <div className="text-sm font-bold tabular-nums" style={{ color: metric.color }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 pb-3">
            <div
              className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{
                background: `${actionColor(region.lastDecision)}10`,
                border: `1px solid ${actionColor(region.lastDecision)}20`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono tracking-widest" style={{ color: actionColor(region.lastDecision) }}>
                  LAST ACTION
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold"
                  style={{
                    background: `${actionColor(region.lastDecision)}20`,
                    color: actionColor(region.lastDecision),
                  }}
                >
                  {actionLabel(region.lastDecision)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                {region.trend === 'up' ? (
                  <TrendingUp size={11} color="#f87171" />
                ) : region.trend === 'down' ? (
                  <TrendingDown size={11} color="#4ade80" />
                ) : (
                  <Minus size={11} color="#64748b" />
                )}
                <span className="text-[9px] font-mono">{region.trend}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
