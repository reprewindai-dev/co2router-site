import type { CSSProperties } from 'react'

export type DisplayMode = 'night' | 'day' | 'focus'

export interface HaloTheme {
  mode: DisplayMode
  label: string
  background: string
  shellBackdrop: string
  shellNoise: string
  surface: string
  glass: string
  glassHeavy: string
  border: string
  text: string
  textStrong: string
  muted: string
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

export const THEMES: Record<DisplayMode, HaloTheme> = {
  night: {
    mode: 'night',
    label: 'NIGHT',
    background: '#030711',
    shellBackdrop:
      'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.08), transparent 34%), radial-gradient(circle at 82% 14%, rgba(167,139,250,0.08), transparent 28%), linear-gradient(180deg, #030711 0%, #040812 55%, #02050c 100%)',
    shellNoise: 'rgba(255,255,255,0.02)',
    surface: 'rgba(4, 9, 19, 0.92)',
    glass: 'rgba(7, 12, 22, 0.74)',
    glassHeavy: 'rgba(4, 8, 18, 0.92)',
    border: 'rgba(148, 163, 184, 0.18)',
    text: '#d8e5f7',
    textStrong: '#ffffff',
    muted: '#90a2bf',
    dim: '#54657f',
    sky: '#58c7ff',
    green: '#7cff9a',
    amber: '#ffd166',
    rose: '#ff8a80',
    violet: '#b39bff',
    globeTexture: '/halogrid/earth-night.jpg',
    globeBump: '/halogrid/earth-topology.png',
    starfield: '/halogrid/night-sky.png',
    globeSphere: '#0a1526',
    globeCountry: 'rgba(88,199,255,0.12)',
    globeAtmosphere: '#58c7ff',
    globeGrid: '#20304e',
    starCount: 4200,
    bloomStrength: 1.18,
    vignetteOffset: 0.22,
    vignetteDarkness: 0.84,
  },
  day: {
    mode: 'day',
    label: 'DAY',
    background: '#eef4fb',
    shellBackdrop:
      'radial-gradient(circle at 20% 20%, rgba(2,132,199,0.12), transparent 30%), radial-gradient(circle at 75% 15%, rgba(124,58,237,0.08), transparent 20%), linear-gradient(180deg, #eef4fb 0%, #dae7f5 48%, #edf4fb 100%)',
    shellNoise: 'rgba(15, 23, 42, 0.02)',
    surface: 'rgba(255, 255, 255, 0.88)',
    glass: 'rgba(255, 255, 255, 0.7)',
    glassHeavy: 'rgba(255, 255, 255, 0.9)',
    border: 'rgba(15, 23, 42, 0.12)',
    text: '#18314d',
    textStrong: '#081220',
    muted: '#5f7390',
    dim: '#93a2b7',
    sky: '#0284c7',
    green: '#159947',
    amber: '#c97b00',
    rose: '#d64b4b',
    violet: '#7c3aed',
    globeTexture: '/halogrid/earth-day.jpg',
    globeBump: '/halogrid/earth-topology.png',
    starfield: '/halogrid/night-sky.png',
    globeSphere: '#c8d9ea',
    globeCountry: 'rgba(2,132,199,0.12)',
    globeAtmosphere: '#0284c7',
    globeGrid: '#7b90a7',
    starCount: 600,
    bloomStrength: 0.42,
    vignetteOffset: 0.15,
    vignetteDarkness: 0.38,
  },
  focus: {
    mode: 'focus',
    label: 'FOCUS',
    background: '#18120e',
    shellBackdrop:
      'radial-gradient(circle at 22% 18%, rgba(212,165,116,0.09), transparent 30%), radial-gradient(circle at 82% 16%, rgba(176,139,191,0.08), transparent 24%), linear-gradient(180deg, #18120e 0%, #1d1712 58%, #100d09 100%)',
    shellNoise: 'rgba(255,255,255,0.015)',
    surface: 'rgba(23, 18, 14, 0.92)',
    glass: 'rgba(28, 22, 16, 0.76)',
    glassHeavy: 'rgba(24, 19, 14, 0.92)',
    border: 'rgba(212, 165, 116, 0.14)',
    text: '#dfd2bc',
    textStrong: '#fff3de',
    muted: '#9a8b76',
    dim: '#6f6253',
    sky: '#d4a574',
    green: '#b9d17c',
    amber: '#f3b562',
    rose: '#c8665f',
    violet: '#be96d1',
    globeTexture: '/halogrid/earth-night.jpg',
    globeBump: '/halogrid/earth-topology.png',
    starfield: '/halogrid/night-sky.png',
    globeSphere: '#201711',
    globeCountry: 'rgba(212,165,116,0.08)',
    globeAtmosphere: '#d4a574',
    globeGrid: '#4a392d',
    starCount: 2400,
    bloomStrength: 0.72,
    vignetteOffset: 0.24,
    vignetteDarkness: 0.72,
  },
}

export const DISPLAY_MODE_ORDER: DisplayMode[] = ['night', 'day', 'focus']

export function nextDisplayMode(current: DisplayMode): DisplayMode {
  const currentIndex = DISPLAY_MODE_ORDER.indexOf(current)
  return DISPLAY_MODE_ORDER[(currentIndex + 1) % DISPLAY_MODE_ORDER.length]
}

export function glassStyle(theme: HaloTheme, extra?: CSSProperties): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${theme.glassHeavy}, ${theme.glass})`,
    border: `1px solid ${theme.border}`,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)',
    ...extra,
  }
}

export function actionTone(
  theme: HaloTheme,
  action: string | null | undefined,
): string {
  switch (action) {
    case 'deny':
    case 'blocked':
      return theme.rose
    case 'delay':
      return theme.amber
    case 'throttle':
      return theme.violet
    case 'reroute':
    case 'route':
      return theme.sky
    default:
      return theme.green
  }
}

export function stateTone(
  theme: HaloTheme,
  state: string | null | undefined,
): string {
  switch (state) {
    case 'blocked':
      return theme.rose
    case 'marginal':
      return theme.amber
    default:
      return theme.green
  }
}

