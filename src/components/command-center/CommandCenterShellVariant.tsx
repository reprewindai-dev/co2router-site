'use client'

import { useMemo } from 'react'

import { CommandCenterShell } from './CommandCenterShell'
import { WrappedRecoveredCommandCenterShell } from './RecoveredCommandCenterShell'
import CO2ControlPanel from './co2-control-panel'

type CommandCenterVariant = 'map' | 'recovered' | 'mission-control'

function normalizeVariant(value: string | null | undefined): CommandCenterVariant {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'recovered' || normalized === 'legacy') return 'recovered'
  if (normalized === 'mission-control' || normalized === 'co2' || normalized === 'control-panel') return 'mission-control'
  return 'map'
}

interface CommandCenterShellVariantProps {
  variant?: string | null
  [key: string]: any
}

export default function CommandCenterShellVariant({ variant, ...props }: CommandCenterShellVariantProps) {
  const selectedVariant = useMemo(() => normalizeVariant(variant), [variant])

  switch (selectedVariant) {
    case 'recovered':
      return <WrappedRecoveredCommandCenterShell {...props} />
    case 'mission-control':
      return <CO2ControlPanel />
    default:
      return <CommandCenterShell {...props} />
  }
}
