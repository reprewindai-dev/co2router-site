'use client'

import { motion } from 'framer-motion'

import type { HaloTheme } from './theme'

export default function HaloGridHUD(props: {
  isVisible: boolean
  theme: HaloTheme
  hud: {
    active: number
    marginal: number
    blocked: number
    threatPercentage: number
  }
  showArcs: boolean
  showNodes: boolean
  showRadar: boolean
  onToggleLayer: (layer: 'arcs' | 'nodes' | 'radar') => void
}) {
  if (!props.isVisible) return null

  const layerButtons: Array<['ARCS' | 'NODES' | 'RADAR', boolean, 'arcs' | 'nodes' | 'radar']> = [
    ['ARCS', props.showArcs, 'arcs'],
    ['NODES', props.showNodes, 'nodes'],
    ['RADAR', props.showRadar, 'radar'],
  ]

  return (
    <div className="pointer-events-none absolute inset-0 z-[25] flex flex-col justify-between p-6 font-sans">
      <div className="mt-14 flex items-start justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
          <div
            className="flex items-center gap-4 rounded-xl border px-4 py-2 shadow-lg backdrop-blur-md"
            style={{ backgroundColor: props.theme.surface, borderColor: props.theme.border }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: props.theme.success }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: props.theme.success }}>
                {props.hud.active} ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: props.theme.warning }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: props.theme.warning }}>
                {props.hud.marginal} MARGINAL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: props.theme.danger }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: props.theme.danger }}>
                {props.hud.blocked} BLOCKED
              </span>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex w-36 flex-col items-center rounded-2xl border p-4 shadow-lg backdrop-blur-md"
          style={{ backgroundColor: props.theme.surface, borderColor: props.theme.border }}
        >
          <div className="relative mb-2 h-12 w-24 overflow-hidden">
            <div className="absolute left-0 top-0 h-24 w-24 rounded-full border-[4px] border-white/5" />
            <div className="absolute left-0 top-0 h-24 w-24 rotate-45 rounded-full border-[4px] border-l-emerald-400 border-t-emerald-400 border-transparent" />
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <span className="text-lg font-black leading-none" style={{ color: props.theme.success }}>
                {props.hud.threatPercentage}%
              </span>
              <span className="mt-0.5 text-[7px] uppercase tracking-[0.2em]" style={{ color: props.theme.muted }}>
                Threat
              </span>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="mb-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border p-1.5 backdrop-blur-md"
          style={{ backgroundColor: props.theme.surface, borderColor: props.theme.border }}
        >
          {layerButtons.map(([label, active, key]) => (
            <button
              key={label}
              type="button"
              onClick={() => props.onToggleLayer(key as 'arcs' | 'nodes' | 'radar')}
              className="rounded-lg border px-3 py-1 text-[9px] font-bold tracking-widest transition-colors hover:opacity-80"
              style={{
                backgroundColor: active ? `${props.theme.primary}16` : 'transparent',
                color: active ? props.theme.primary : props.theme.muted,
                borderColor: active ? `${props.theme.primary}30` : props.theme.border,
              }}
            >
              {label}
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
