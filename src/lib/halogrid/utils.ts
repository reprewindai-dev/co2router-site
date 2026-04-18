import type { RegionState, RouterAction } from './types'

export function stateColor(state: RegionState): string {
  return state === 'green' ? '#4ade80' : state === 'yellow' ? '#fbbf24' : '#f87171'
}

export function actionColor(action: RouterAction): string {
  const map: Record<RouterAction, string> = {
    SHIFT_REGION: '#38bdf8',
    DEFER_JOB: '#a78bfa',
    THROTTLE: '#fbbf24',
    HOLD: '#f87171',
    PASS: '#4ade80',
  }
  return map[action]
}

export function actionLabel(action: RouterAction): string {
  const map: Record<RouterAction, string> = {
    SHIFT_REGION: 'SHIFT',
    DEFER_JOB: 'DEFER',
    THROTTLE: 'THROT',
    HOLD: 'HOLD',
    PASS: 'PASS',
  }
  return map[action]
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-CA', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatHash(hash: string, len = 8): string {
  return `${hash.slice(0, len)}...`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function humanizeMode(mode?: string): string {
  if (!mode) return 'direct'
  return mode.replace(/_/g, ' ')
}

export function shortRevision(revision: string): string {
  return revision.slice(0, 8)
}
