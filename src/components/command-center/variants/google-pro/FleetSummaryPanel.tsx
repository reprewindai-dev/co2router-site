'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, Server, Wind } from 'lucide-react'

type ThemeLike = {
  surface: string
  border: string
  text: string
  muted: string
  primary: string
  success: string
}

export default function FleetSummaryPanel({
  isOpen,
  theme,
  metrics,
}: {
  isOpen: boolean
  theme: ThemeLike
  metrics?: {
    carbonDiverted: string
    waterPreserved: string
    activeNodes: number
    degradedNodes: number
  }
}) {
  const safeMetrics = metrics ?? {
    carbonDiverted: '--',
    waterPreserved: '--',
    activeNodes: 0,
    degradedNodes: 0,
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-24 left-4 top-20 w-[340px] overflow-y-auto rounded-xl border p-5 font-sans shadow-2xl backdrop-blur-xl pointer-events-auto"
          style={{
            zIndex: 70,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <div className="mb-5 flex items-center gap-2 border-b pb-4" style={{ borderColor: theme.border }}>
            <Server size={18} color={theme.primary} />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide">Fleet Posture</h2>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-3 text-[8px] uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
              Session Impact Delta
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="flex flex-col rounded-lg border p-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: theme.border }}
              >
                <Wind size={12} color={theme.success} className="mb-2" />
                <span className="text-[8px] uppercase tracking-wider" style={{ color: theme.muted }}>
                  Carbon Diverted
                </span>
                <span className="mt-1 text-sm font-black" style={{ color: theme.success }}>
                  {safeMetrics.carbonDiverted}
                </span>
              </div>
              <div
                className="flex flex-col rounded-lg border p-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: theme.border }}
              >
                <Droplets size={12} color={theme.primary} className="mb-2" />
                <span className="text-[8px] uppercase tracking-wider" style={{ color: theme.muted }}>
                  Water Preserved
                </span>
                <span className="mt-1 text-sm font-black" style={{ color: theme.primary }}>
                  {safeMetrics.waterPreserved}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-lg border p-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: theme.border }}
            >
              <div className="text-[8px] uppercase tracking-wider" style={{ color: theme.muted }}>
                Active Nodes
              </div>
              <div className="mt-2 text-xl font-black" style={{ color: theme.success }}>
                {safeMetrics.activeNodes}
              </div>
            </div>
            <div
              className="rounded-lg border p-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: theme.border }}
            >
              <div className="text-[8px] uppercase tracking-wider" style={{ color: theme.muted }}>
                Degraded
              </div>
              <div className="mt-2 text-xl font-black" style={{ color: theme.primary }}>
                {safeMetrics.degradedNodes}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
