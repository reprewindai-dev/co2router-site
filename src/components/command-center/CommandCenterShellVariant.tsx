'use client'

import { useMemo } from 'react'

import { HaloGridShell as HaloGridShellOpus } from './recovered/HaloGridShell'
import { HaloGridShell as HaloGridShellGooglePro } from './variants/google-pro/HaloGridShell'
import { CO2ControlPanel } from '@/components/co2-control-panel'

type CommandCenterVariant = 'opus' | 'google-pro' | 'mission-control'

function normalizeVariant(value: string | null): CommandCenterVariant {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'google-pro' || normalized === 'google' || normalized === 'pro') return 'google-pro'
  if (normalized === 'mission-control' || normalized === 'co2' || normalized === 'v2' || normalized === 'new') return 'mission-control'
  return 'opus'
}

export function CommandCenterShellVariant(props: { variant?: string | null }) {
  const variant = useMemo(() => normalizeVariant(props.variant ?? null), [props.variant])
  
  if (variant === 'mission-control') {
    return <CO2ControlPanel />
  }
  
  return variant === 'google-pro' ? <HaloGridShellGooglePro /> : <HaloGridShellOpus />
}

