'use client'

import { CommandCenterErrorBoundary } from './CommandCenterErrorBoundary'
import { HaloGridShell } from './recovered/HaloGridShell'

export function CommandCenterShell() {
  return (
    <CommandCenterErrorBoundary>
      <HaloGridShell />
    </CommandCenterErrorBoundary>
  )
}
