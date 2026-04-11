'use client'

import { motion } from 'framer-motion'
import { Activity, Cpu, Fingerprint, Scale, ShieldAlert } from 'lucide-react'

import type { HaloTheme } from './theme'

const PIPELINE_STAGES = [
  { id: 1, name: 'Signals', icon: Activity },
  { id: 2, name: 'SAIQ', icon: Scale },
  { id: 3, name: 'Policy', icon: ShieldAlert },
  { id: 4, name: 'Decision', icon: Cpu },
  { id: 5, name: 'Proof', icon: Fingerprint },
]

export default function DecisionPipelineRail(props: {
  currentStage?: number
  theme: HaloTheme
}) {
  return (
    <div className="mt-6 w-full font-sans">
      <div className="mb-3 flex items-center gap-2 text-[8px] uppercase tracking-[0.2em]" style={{ color: props.theme.muted }}>
        <span className="h-1 w-1 rounded-full animate-pulse" style={{ backgroundColor: props.theme.primary }} />
        Live Execution Pipeline
      </div>
      <div className="flex w-full items-stretch overflow-hidden rounded-xl border backdrop-blur-md" style={{ borderColor: props.theme.border, backgroundColor: 'rgba(0,0,0,0.2)' }}>
        {PIPELINE_STAGES.map((stage) => {
          const isActive = (props.currentStage ?? 4) === stage.id
          return (
            <div
              key={stage.id}
              className="relative flex-1 border-r p-3 last:border-r-0"
              style={{ borderColor: props.theme.border, backgroundColor: isActive ? `${props.theme.primary}10` : 'transparent' }}
            >
              {isActive ? (
                <motion.div
                  initial={{ top: 0 }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="pointer-events-none absolute left-0 right-0 z-10 h-[1px] shadow-[0_0_8px]"
                  style={{ backgroundColor: props.theme.primary, color: props.theme.primary }}
                />
              ) : null}
              <div className="mb-2 flex justify-between">
                <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: isActive ? props.theme.primary : props.theme.muted }}>
                  S0{stage.id}
                </span>
                <stage.icon size={12} color={isActive ? props.theme.primary : props.theme.muted} />
              </div>
              <div className="text-[10px] font-black tracking-wide" style={{ color: isActive ? props.theme.text : props.theme.muted }}>
                {stage.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
