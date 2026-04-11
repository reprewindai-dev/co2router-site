'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Brain, X, Zap } from 'lucide-react'

type ThemeLike = {
  surface: string
  border: string
  text: string
  muted: string
  primary: string
  success: string
}

export default function SmartAdvisorPanel({
  isOpen,
  onClose,
  theme,
}: {
  isOpen: boolean
  onClose: () => void
  theme: ThemeLike
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-24 right-20 top-20 z-[60] flex w-[340px] flex-col rounded-xl border p-5 font-sans shadow-2xl backdrop-blur-xl pointer-events-auto"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
        >
          <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <Brain size={16} color={theme.primary} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.primary }}>
                Tactical Advisor
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 transition-colors hover:bg-white/5"
              style={{ color: theme.muted }}
              aria-label="Close advisor panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: theme.border }}
            >
              <Activity size={12} className="animate-pulse" color={theme.success} />
              <span className="text-[9px] uppercase tracking-wider" style={{ color: theme.muted }}>
                Telemetry Active
              </span>
            </div>

            <div className="mt-10 flex h-full flex-col items-center justify-center gap-3 text-center opacity-80">
              <Zap size={28} color={theme.muted} />
              <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>
                Monitoring fleet telemetry.
                <br />
                No structural risks detected.
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
