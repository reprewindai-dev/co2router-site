import type { CSSProperties } from 'react'

export type ThemeMode = 'night' | 'daylight' | 'cayenne'
export type DisplayMode = ThemeMode

type ThemeCore = {
  bg: string
  surface: string
  card: string
  border: string
  text: string
  muted: string
  primary: string
  success: string
  warning: string
  danger: string
}

export type HaloTheme = ThemeCore & {
  mode: ThemeMode
  label: string
  shellBackdrop: string
  shellNoise: string
  glass: string
  glassHeavy: string
  textStrong: string
  dim: string
  sky: string
  green: string
  amber: string
  rose: string
  violet: string
  globeTexture: string
  globeBump: string
  starfield: string
  globeSphere: string
  globeCountry: string
  globeAtmosphere: string
  globeGrid: string
  starCount: number
  bloomStrength: number
  vignetteOffset: number
  vignetteDarkness: number
}

function buildTheme(mode: ThemeMode, core: ThemeCore): HaloTheme {
  return {
    ...core,
    mode,
    label: mode === 'daylight' ? 'DAYLIGHT' : mode.toUpperCase(),
    shellBackdrop:
      mode === 'daylight'
        ? 'radial-gradient(circle at 20% 20%, rgba(2,132,199,0.08), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        : mode === 'cayenne'
          ? 'radial-gradient(circle at 20% 20%, rgba(251,146,60,0.12), transparent 28%), linear-gradient(180deg, #140a08 0%, #1b0f0b 100%)'
          : 'radial-gradient(circle at 18% 18%, rgba(56,189,248,0.12), transparent 28%), linear-gradient(180deg, #020617 0%, #061225 100%)',
    shellNoise: mode === 'daylight' ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.02)',
    glass: core.surface,
    glassHeavy: core.card,
    textStrong: core.text,
    dim: core.muted,
    sky: core.primary,
    green: core.success,
    amber: core.warning,
    rose: core.danger,
    violet: core.primary,
    globeTexture: mode === 'daylight' ? '/halogrid/earth-day.jpg' : '/halogrid/earth-night.jpg',
    globeBump: '/halogrid/earth-topology.png',
    starfield: '/halogrid/night-sky.png',
    globeSphere: mode === 'daylight' ? '#b7d2ef' : '#091627',
    globeCountry: mode === 'daylight' ? 'rgba(2,132,199,0.12)' : 'rgba(56,189,248,0.12)',
    globeAtmosphere: core.primary,
    globeGrid: mode === 'daylight' ? '#6b8daf' : '#18314d',
    starCount: mode === 'daylight' ? 350 : 1600,
    bloomStrength: 0,
    vignetteOffset: 0,
    vignetteDarkness: 0,
  }
}

export const THEMES: Record<ThemeMode, HaloTheme> = {
  night: buildTheme('night', {
    bg: '#020617',
    surface: 'rgba(4,12,30,0.82)',
    card: 'rgba(5,14,35,0.94)',
    border: 'rgba(56,189,248,0.15)',
    text: '#f1f5f9',
    muted: '#64748b',
    primary: '#38bdf8',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
  }),
  daylight: buildTheme('daylight', {
    bg: '#f8fafc',
    surface: 'rgba(255,255,255,0.88)',
    card: 'rgba(255,255,255,0.95)',
    border: 'rgba(15,23,42,0.10)',
    text: '#0f172a',
    muted: '#64748b',
    primary: '#0284c7',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  }),
  cayenne: buildTheme('cayenne', {
    bg: '#140a08',
    surface: 'rgba(28,14,12,0.86)',
    card: 'rgba(34,17,14,0.95)',
    border: 'rgba(251,146,60,0.15)',
    text: '#fed7aa',
    muted: '#9a3412',
    primary: '#fb923c',
    success: '#84cc16',
    warning: '#f59e0b',
    danger: '#ef4444',
  }),
}

export function glassStyle(theme: HaloTheme, extra?: CSSProperties): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${theme.card}, ${theme.surface})`,
    border: `1px solid ${theme.border}`,
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.32)',
    ...extra,
  }
}

export function actionTone(theme: HaloTheme, action: string | null | undefined) {
  const normalized = (action ?? '').toLowerCase()
  if (normalized === 'deny' || normalized === 'blocked') return theme.rose
  if (normalized === 'delay') return theme.amber
  if (normalized === 'throttle') return theme.violet
  if (normalized === 'reroute' || normalized === 'route') return theme.sky
  return theme.green
}

export function stateTone(theme: HaloTheme, state: string | null | undefined) {
  const normalized = (state ?? '').toLowerCase()
  if (normalized === 'blocked') return theme.rose
  if (normalized === 'marginal') return theme.amber
  return theme.green
}
