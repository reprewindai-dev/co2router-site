'use client'

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, MessageSquare, Mic, X } from 'lucide-react'

import type { TeamChatMessage } from '@/types/control-surface'

type ThemeLike = {
  surface: string
  border: string
  text: string
  muted: string
  primary: string
}

export default function InlineTeamChat({
  isOpen,
  toggleOpen,
  theme,
  messages,
  operatorName,
  onSend,
  sending,
}: {
  isOpen: boolean
  toggleOpen: () => void
  theme: ThemeLike
  messages: TeamChatMessage[]
  operatorName: string
  onSend?: (body: string) => void
  sending?: boolean
}) {
  const [val, setVal] = useState('')
  const latestMessages = useMemo(() => messages.slice(-8), [messages])

  function handleSend() {
    const body = val.trim()
    if (!body || !onSend) return
    onSend(body)
    setVal('')
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="flex h-[400px] w-80 flex-col rounded-xl border font-sans shadow-2xl backdrop-blur-xl"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        >
          <div className="flex items-center justify-between border-b p-3" style={{ borderColor: theme.border }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
              NOC Comm-Link
            </span>
            <button onClick={toggleOpen} className="transition-opacity hover:opacity-80" aria-label="Close team chat">
              <X size={16} color={theme.muted} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {latestMessages.length === 0 ? (
              <div className="mt-10 text-center text-xs" style={{ color: theme.muted }}>
                Comm-link established for {operatorName}.
              </div>
            ) : null}
            {latestMessages.map((message) => (
              <div key={message.id} className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                    {message.operatorName}
                  </span>
                  <span className="text-[10px]" style={{ color: theme.muted }}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs" style={{ color: theme.text }}>
                  {message.body}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-b-xl border-t bg-black/20 p-3" style={{ borderColor: theme.border }}>
            <Mic size={16} color={theme.muted} />
            <input
              type="text"
              value={val}
              onChange={(event) => setVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSend()
              }}
              placeholder="Transmit message..."
              className="flex-1 rounded-md border bg-transparent px-3 py-2 text-xs outline-none"
              style={{ borderColor: theme.border, color: theme.text }}
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="rounded-md p-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}
              aria-label="Send team chat message"
            >
              <Check size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleOpen}
          className="relative rounded-full border p-3.5 shadow-lg backdrop-blur-md"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          aria-label="Open team chat"
        >
          <MessageSquare size={20} color={theme.primary} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
