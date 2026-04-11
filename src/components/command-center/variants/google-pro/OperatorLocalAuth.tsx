'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Fingerprint, Shield } from 'lucide-react'

import type { HaloTheme } from './theme'

export interface OperatorIdentity {
  id: string
  name: string
  clearance: 'Elite'
}

export default function OperatorLocalAuth(props: {
  theme: HaloTheme
  onAuthenticated: (operator: OperatorIdentity) => void
}) {
  const [operatorId, setOperatorId] = useState('')
  const [operatorName, setOperatorName] = useState('')

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault()
    if (!operatorId.trim() || !operatorName.trim()) return
    props.onAuthenticated({
      id: operatorId.trim().toUpperCase(),
      name: operatorName.trim(),
      clearance: 'Elite',
    })
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#020617]/85 backdrop-blur-md font-sans">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex w-[400px] flex-col rounded-2xl border p-8 shadow-2xl"
        style={{ backgroundColor: props.theme.surface, borderColor: props.theme.border }}
      >
        <div className="mb-8 flex items-center gap-3 border-b pb-4" style={{ borderColor: props.theme.border }}>
          <Shield size={24} color={props.theme.primary} />
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: props.theme.text }}>
              HalOGrid Terminal
            </h1>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: props.theme.muted }}>
              Local Authentication
            </p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <input
            type="text"
            value={operatorName}
            onChange={(event) => setOperatorName(event.target.value)}
            placeholder="Operator Name"
            className="w-full rounded-lg border bg-black/20 px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: props.theme.border, color: props.theme.text }}
            required
          />
          <div className="relative">
            <Fingerprint size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={props.theme.muted} />
            <input
              type="text"
              value={operatorId}
              onChange={(event) => setOperatorId(event.target.value)}
              placeholder="ID (e.g. OP-7742)"
              className="w-full rounded-lg border bg-black/20 py-2.5 pl-9 pr-4 text-sm font-mono uppercase outline-none"
              style={{ borderColor: props.theme.border, color: props.theme.primary }}
              required
            />
          </div>
          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-90"
            style={{ backgroundColor: props.theme.primary, color: '#020617' }}
          >
            Authenticate <ChevronRight size={14} />
          </button>
        </form>
      </motion.div>
    </div>
  )
}
