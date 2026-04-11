'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckSquare, X } from 'lucide-react'

type ThemeLike = {
  surface: string
  border: string
  text: string
  muted: string
  primary: string
  success: string
}

export default function AlarmQueuePanel({
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
          initial={{ x: 350, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 350, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-24 right-20 top-20 z-[50] flex w-[320px] flex-col rounded-xl border p-4 font-sans shadow-2xl backdrop-blur-xl pointer-events-auto"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <Bell size={16} color={theme.primary} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.primary }}>
                Alarm Queue
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 transition-colors hover:bg-white/5"
              style={{ color: theme.muted }}
              aria-label="Close alarm queue"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            <div className="flex h-full flex-col items-center justify-center opacity-60">
              <CheckSquare size={24} color={theme.success} className="mb-2" />
              <span className="text-[10px] uppercase tracking-widest" style={{ color: theme.muted }}>
                Queue Clear
              </span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
