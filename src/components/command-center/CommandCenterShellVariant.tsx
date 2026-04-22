'use client'

import { useMemo } from 'react'

import { HaloGridShell as HaloGridShellOpus } from './recovered/HaloGridShell'
import { HaloGridShell as HaloGridShellGooglePro } from './variants/google-pro/HaloGridShell'

type CommandCenterVariant = 'opus' | 'google-pro'

function normalizeVariant(value: string | null): CommandCenterVariant {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'google-pro' || normalized === 'google' || normalized === 'pro') return 'google-pro'
  return 'opus'
}

export function CommandCenterShellVariant(props: { variant?: string | null }) {
  const variant = useMemo(() => normalizeVariant(props.variant ?? null), [props.variant])

  return variant === 'google-pro' ? <HaloGridShellGooglePro /> : <HaloGridShellOpus />
}

