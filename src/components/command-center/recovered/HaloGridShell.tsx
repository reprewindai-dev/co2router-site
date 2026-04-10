'use client'

import dynamic from 'next/dynamic'
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  Brain,
  ChevronDown,
  Expand,
  Layers3,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  MoonStar,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Radar,
  ScanSearch,
  Settings2,
  Shield,
  Sparkles,
  X,
} from 'lucide-react'

import { ACTION_META } from '@/components/control-surface/action-styles'
import {
  useCommandCenterSnapshot,
  useDecisionTrace,
  useLiveSystemSnapshot,
  useReplayBundle,
} from '@/lib/hooks/control-surface'
import type {
  CommandCenterDecisionItem,
  DecisionTraceRawRecord,
  ReplayBundle,
} from '@/types/control-surface'
import { analyzeFleet, SelfHealingWatchdog, type IntelligenceReport } from './intelligence'
import {
  HALOGRID_MANUAL_SECTIONS,
  type HalogridManualSection,
} from './manual-content'
import { SmartAdvisor } from './SmartAdvisor'
import {
  buildHalogridHoverCard,
  buildHalogridViewModel,
  type HalogridConsoleMode,
  type HalogridDecisionView,
  type HalogridHoverCardView,
  type HalogridTier,
} from './view-model'
import {
  THEMES,
  type DisplayMode,
  type HaloTheme,
  actionTone,
  glassStyle,
  nextDisplayMode,
  stateTone,
} from './theme'

const Globe3D = dynamic(() => import('./Globe3D').then((mod) => mod.Globe3D), {
  ssr: false,
})

const TIER_ORDER: HalogridTier[] = ['freeview', 'pro', 'elite']
const CONSOLE_MODES: HalogridConsoleMode[] = ['command', 'focus', 'presentation']

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatRegionLabel(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatActionLabel(action: string | null | undefined) {
  return (action ?? 'active').replace(/_/g, ' ').toUpperCase()
}

function formatTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function severityTone(
  theme: HaloTheme,
  severity: 'info' | 'warning' | 'critical',
) {
  if (severity === 'critical') return theme.rose
  if (severity === 'warning') return theme.amber
  return theme.sky
}

function buildDecisionMetrics(
  frame: CommandCenterDecisionItem,
  trace: DecisionTraceRawRecord | null,
  replay: ReplayBundle | null,
) {
  const replayRoute = replay?.replay ?? replay?.persisted ?? null
  const candidate =
    trace?.payload.inputSignals.resolvedCandidates.find(
      (item) => item.region === frame.selectedRegion,
    ) ?? null
  const proof = trace?.payload.proof

  return {
    carbonReductionPct: replayRoute?.savings.carbonReductionPct ?? null,
    waterDeltaLiters: replayRoute?.savings.waterImpactDeltaLiters ?? null,
    confidence:
      replayRoute?.signalConfidence ??
      candidate?.waterAuthority.confidence ??
      null,
    carbonIntensity:
      replayRoute?.selected.carbonIntensity ?? candidate?.carbonIntensity ?? null,
    waterImpactLiters:
      replayRoute?.selected.waterImpactLiters ??
      candidate?.waterImpactLiters ??
      null,
    waterStressIndex:
      replayRoute?.water.stressIndex ??
      candidate?.waterSignal.waterStressIndex ??
      null,
    baselineRegion: replayRoute?.baseline.region ?? null,
    proofRefs: proof?.datasetReferences.length ?? 0,
    evidenceRefs: proof?.evidenceRefs.length ?? 0,
    providerRefs: proof?.providerSnapshotRefs.length ?? 0,
    replayVerified: replay?.deterministicMatch ?? null,
  }
}

function buildDecisionView(
  frame: CommandCenterDecisionItem | null,
  trace: DecisionTraceRawRecord | null,
  replay: ReplayBundle | null,
): HalogridDecisionView | null {
  if (!frame) return null
  return {
    frame,
    trace,
    replay,
    metrics: buildDecisionMetrics(frame, trace, replay),
  }
}

function TopPill({
  theme,
  label,
  value,
  tone,
}: {
  theme: HaloTheme
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold tracking-[0.22em]"
      style={{
        background: `${tone}14`,
        border: `1px solid ${tone}44`,
        color: tone,
        boxShadow: `0 0 24px ${tone}18`,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
      />
      <span>{label}</span>
      <span style={{ color: theme.textStrong }}>{value}</span>
    </div>
  )
}

function ControlButton({
  theme,
  active,
  disabled,
  compact,
  children,
  onClick,
}: {
  theme: HaloTheme
  active?: boolean
  disabled?: boolean
  compact?: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl ${compact ? 'px-2.5 py-2' : 'px-3 py-2'} text-[11px] font-semibold tracking-[0.18em] transition`}
      style={{
        background: active ? `${theme.sky}16` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${theme.sky}44` : theme.border}`,
        color: disabled ? theme.dim : active ? theme.sky : theme.text,
        opacity: disabled ? 0.42 : 1,
      }}
    >
      {children}
    </button>
  )
}

function DrawerFrame({
  theme,
  title,
  subtitle,
  onClose,
  children,
}: {
  theme: HaloTheme
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[28px] p-4"
      style={glassStyle(theme, {
        boxShadow: '0 32px 90px rgba(0, 0, 0, 0.46)',
      })}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.26em]"
            style={{ color: theme.muted }}
          >
            {subtitle}
          </div>
          <div className="text-lg font-semibold" style={{ color: theme.textStrong }}>
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5"
          style={{ border: `1px solid ${theme.border}`, color: theme.text }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  )
}

function ThreatGauge({
  theme,
  pct,
  velocity,
}: {
  theme: HaloTheme
  pct: number
  velocity: number
}) {
  const tone = pct >= 65 ? theme.rose : pct >= 30 ? theme.amber : theme.green
  const label = pct >= 65 ? 'CRITICAL' : pct >= 30 ? 'ELEVATED' : 'NOMINAL'
  const angle = Math.PI - (pct / 100) * Math.PI
  const nx = 72 + 48 * Math.cos(angle)
  const ny = 82 - 48 * Math.sin(angle)

  return (
    <div className="rounded-[24px] p-4" style={glassStyle(theme)}>
      <svg viewBox="0 0 144 122" className="mx-auto block w-full max-w-[144px]">
        <path
          d="M 24 82 A 48 48 0 0 1 120 82"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path
          d={`M 24 82 A 48 48 0 ${pct > 50 ? 1 : 0} 1 ${nx.toFixed(1)} ${ny.toFixed(1)}`}
          fill="none"
          stroke={tone}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <circle
          cx={nx}
          cy={ny}
          r={4}
          fill={tone}
          style={{ filter: `drop-shadow(0 0 6px ${tone})` }}
        />
        <text x="72" y="64" textAnchor="middle" fill={tone} fontSize={22} fontWeight={900}>
          {pct}%
        </text>
        <text x="72" y="79" textAnchor="middle" fill={theme.muted} fontSize={8} letterSpacing={2}>
          THREAT
        </text>
        <text x="72" y="96" textAnchor="middle" fill={tone} fontSize={10} fontWeight={700} letterSpacing={2}>
          {label}
        </text>
      </svg>
      <div className="mt-3 border-t pt-3 text-center" style={{ borderColor: theme.border }}>
        <div className="text-[10px] tracking-[0.24em]" style={{ color: theme.muted }}>
          DECISION VELOCITY
        </div>
        <div className="mt-1">
          <span className="text-3xl font-black" style={{ color: theme.textStrong }}>
            {velocity.toFixed(1)}
          </span>
          <span className="ml-1 text-sm" style={{ color: theme.muted }}>
            /min
          </span>
        </div>
      </div>
    </div>
  )
}

function PipelineRail({ theme }: { theme: HaloTheme }) {
  const stages = ['Signals', 'SAIQ', 'Policy', 'Decision', 'Proof']
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((stage, index) => (
        <div key={stage} className="flex items-center gap-1.5">
          <div
            className="rounded-full px-2.5 py-1 text-[8px] font-semibold tracking-[0.22em]"
            style={{
              background: `${theme.sky}12`,
              border: `1px solid ${theme.sky}33`,
              color: theme.sky,
            }}
          >
            {stage}
          </div>
          {index < stages.length - 1 && (
            <div className="h-px w-3" style={{ background: `${theme.sky}55` }} />
          )}
        </div>
      ))}
    </div>
  )
}

function MetricGrid({
  theme,
  decision,
}: {
  theme: HaloTheme
  decision: HalogridDecisionView
}) {
  const { metrics } = decision
  const items = [
    {
      label: 'CARBON DELTA',
      value: metrics.carbonReductionPct != null ? `${metrics.carbonReductionPct.toFixed(1)}%` : '--',
      tone: metrics.carbonReductionPct != null && metrics.carbonReductionPct >= 0 ? theme.green : theme.amber,
    },
    {
      label: 'WATER DELTA',
      value: metrics.waterDeltaLiters != null ? `${metrics.waterDeltaLiters.toFixed(1)} L` : '--',
      tone: theme.sky,
    },
    {
      label: 'CONFIDENCE',
      value: metrics.confidence != null ? `${Math.round(metrics.confidence * 100)}%` : '--',
      tone: metrics.confidence != null && metrics.confidence >= 0.8 ? theme.green : theme.amber,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl p-3 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${theme.border}`,
          }}
        >
          <div className="text-[9px] tracking-[0.18em]" style={{ color: theme.dim }}>
            {item.label}
          </div>
          <div className="mt-1 text-base font-black" style={{ color: item.tone }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function ManualSectionCard({
  theme,
  section,
}: {
  theme: HaloTheme
  section: HalogridManualSection
}) {
  return (
    <section
      className="rounded-[24px] p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
    >
      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
        {section.title}
      </div>
      <div className="mt-3 space-y-3">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-[13px] leading-6" style={{ color: theme.text }}>
            {paragraph}
          </p>
        ))}
      </div>
      {section.bullets?.length ? (
        <ul className="mt-3 space-y-2">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 text-[12px] leading-5" style={{ color: theme.muted }}>
              <span style={{ color: theme.sky }}>•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function LegendPanel({ theme }: { theme: HaloTheme }) {
  const regionItems = [
    ['Active lane', theme.green],
    ['Marginal lane', theme.amber],
    ['Blocked lane', theme.rose],
  ]
  const actionItems = [
    ['Run now', theme.green],
    ['Reroute', theme.sky],
    ['Delay', theme.amber],
    ['Throttle', theme.violet],
    ['Deny', theme.rose],
  ]

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] tracking-[0.22em]" style={{ color: theme.muted }}>
          REGION STATES
        </div>
        <div className="mt-2 space-y-2">
          {regionItems.map(([label, tone]) => (
            <div key={label} className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] tracking-[0.22em]" style={{ color: theme.muted }}>
          ACTION COLORS
        </div>
        <div className="mt-2 space-y-2">
          {actionItems.map(([label, tone]) => (
            <div key={label} className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-2xl p-3 text-[12px] leading-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, color: theme.muted }}
      >
        Hover previews are transient. Click a node to pin its decision, fly the camera, and open the full inspector.
      </div>
    </div>
  )
}

function HoverPreview({
  theme,
  hoverCard,
  anchor,
  compact,
}: {
  theme: HaloTheme
  hoverCard: HalogridHoverCardView
  anchor: { x: number; y: number }
  compact?: boolean
}) {
  const tone = stateTone(theme, hoverCard.region.state)
  const actionColor = actionTone(theme, hoverCard.region.action ?? hoverCard.region.state)
  const left = clamp(anchor.x + 18, 16, window.innerWidth - (compact ? 280 : 340))
  const top = clamp(anchor.y + 18, 16, window.innerHeight - (compact ? 140 : 190))

  return (
    <div
      className="pointer-events-none fixed z-[70] w-[320px] rounded-[22px] p-4"
      style={{
        left,
        top,
        ...glassStyle(theme, {
          boxShadow: `0 18px 54px rgba(0, 0, 0, 0.48), 0 0 24px ${tone}18`,
        }),
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone, boxShadow: `0 0 10px ${tone}` }} />
            <span className="text-sm font-semibold" style={{ color: theme.textStrong }}>
              {hoverCard.region.label}
            </span>
          </div>
          <div className="mt-1 text-[10px] tracking-[0.2em]" style={{ color: theme.muted }}>
            {hoverCard.headline}
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em]"
          style={{
            background: `${actionColor}18`,
            border: `1px solid ${actionColor}44`,
            color: actionColor,
          }}
        >
          {hoverCard.actionLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div style={{ color: theme.dim }}>Carbon delta</div>
          <div className="mt-1 font-semibold" style={{ color: theme.textStrong }}>
            {hoverCard.carbonReductionPct != null ? `${hoverCard.carbonReductionPct.toFixed(1)}%` : 'Click for detail'}
          </div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div style={{ color: theme.dim }}>Water delta</div>
          <div className="mt-1 font-semibold" style={{ color: theme.textStrong }}>
            {hoverCard.waterDeltaLiters != null ? `${hoverCard.waterDeltaLiters.toFixed(1)} L` : 'Trace-backed'}
          </div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div style={{ color: theme.dim }}>Confidence</div>
          <div className="mt-1 font-semibold" style={{ color: theme.textStrong }}>
            {hoverCard.confidence != null ? `${Math.round(hoverCard.confidence * 100)}%` : '--'}
          </div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div style={{ color: theme.dim }}>Latency</div>
          <div className="mt-1 font-semibold" style={{ color: theme.textStrong }}>
            {hoverCard.latencyTotalMs != null ? `${hoverCard.latencyTotalMs}ms` : '--'}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: theme.muted }}>
          <span>
            Replay {hoverCard.replayVerified == null ? 'pending' : hoverCard.replayVerified ? 'verified' : 'mismatch'}
          </span>
          <span className="font-mono">
            {(hoverCard.proofHash ?? 'proof unavailable').slice(0, 16)}
          </span>
        </div>
      )}
    </div>
  )
}

function PresentationCard({
  theme,
  decision,
}: {
  theme: HaloTheme
  decision: HalogridDecisionView
}) {
  const actionColor = actionTone(theme, decision.frame.action)

  return (
    <div
      className="w-[360px] rounded-[24px] p-4"
      style={glassStyle(theme, {
        boxShadow: '0 28px 76px rgba(0, 0, 0, 0.48)',
      })}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.24em]" style={{ color: theme.muted }}>
            PRESENT MODE
          </div>
          <div className="mt-1 text-lg font-semibold" style={{ color: theme.textStrong }}>
            {formatRegionLabel(decision.frame.selectedRegion)}
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-[0.18em]"
          style={{
            background: `${actionColor}18`,
            border: `1px solid ${actionColor}44`,
            color: actionColor,
          }}
        >
          {formatActionLabel(decision.frame.action)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div className="text-[9px]" style={{ color: theme.dim }}>Carbon</div>
          <div className="mt-1 text-sm font-black" style={{ color: theme.green }}>
            {decision.metrics.carbonReductionPct != null ? `${decision.metrics.carbonReductionPct.toFixed(1)}%` : '--'}
          </div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div className="text-[9px]" style={{ color: theme.dim }}>Water</div>
          <div className="mt-1 text-sm font-black" style={{ color: theme.sky }}>
            {decision.metrics.waterDeltaLiters != null ? `${decision.metrics.waterDeltaLiters.toFixed(1)}L` : '--'}
          </div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
          <div className="text-[9px]" style={{ color: theme.dim }}>Proof</div>
          <div className="mt-1 text-sm font-black" style={{ color: theme.textStrong }}>
            {(decision.frame.proofHash ?? '--').slice(0, 8)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HaloGridShell() {
  const snapshotQuery = useCommandCenterSnapshot()
  const liveQuery = useLiveSystemSnapshot()
  const [tier, setTier] = useState<HalogridTier>('elite')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('night')
  const [consoleMode, setConsoleMode] = useState<HalogridConsoleMode>('command')
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState({ x: 0, y: 0 })
  const [manualOpen, setManualOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [alarmOpen, setAlarmOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [topCollapsed, setTopCollapsed] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [showArcs, setShowArcs] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const [showRadar, setShowRadar] = useState(true)
  const [showHeat, setShowHeat] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(2)
  const [ghostMode, setGhostMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [advisorPulse, setAdvisorPulse] = useState(false)
  const [aiReport, setAiReport] = useState<IntelligenceReport | null>(null)

  const logoClicks = useRef<number[]>([])
  const pressureHistory = useRef<number[]>([])
  const watchdogRef = useRef<SelfHealingWatchdog | null>(null)

  const theme = THEMES[displayMode]

  useEffect(() => {
    if (!selectedFrameId && snapshotQuery.data?.selectedDecisionFrameId) {
      setSelectedFrameId(snapshotQuery.data.selectedDecisionFrameId)
    }
  }, [selectedFrameId, snapshotQuery.data?.selectedDecisionFrameId])

  useEffect(() => {
    const watchdog = new SelfHealingWatchdog({
      staleThresholdMs: 20_000,
      onHeal: () => snapshotQuery.refetch(),
    })
    watchdogRef.current = watchdog
    watchdog.start()
    return () => watchdog.stop()
  }, [snapshotQuery])

  useEffect(() => {
    if (snapshotQuery.data) watchdogRef.current?.feed()
  }, [snapshotQuery.data])

  const traceQuery = useDecisionTrace(selectedFrameId, {
    enabled: Boolean(selectedFrameId),
  })
  const replayQuery = useReplayBundle(selectedFrameId, {
    enabled: Boolean(selectedFrameId),
  })

  const snapshot = snapshotQuery.data
  const live = liveQuery.data

  const vm = useMemo(() => {
    if (!snapshot || !live) return null
    return buildHalogridViewModel({
      snapshot,
      live,
      selectedFrameId,
      trace: traceQuery.data ?? null,
      replay: replayQuery.data ?? null,
      tier,
    })
  }, [snapshot, live, selectedFrameId, traceQuery.data, replayQuery.data, tier])

  useEffect(() => {
    if (!vm) return
    const tick = () => {
      pressureHistory.current = [
        ...pressureHistory.current.slice(-19),
        vm.hud.carbonPressure,
      ]
      const report = analyzeFleet({
        regions: vm.regions.map((region) => ({
          state: region.state,
          action: region.action,
        })),
        decisions: vm.frames.map((frame) => ({
          action: frame.action,
          latencyTotalMs: frame.latencyTotalMs,
          selectedRegion: frame.selectedRegion,
        })),
        carbonPressure: vm.hud.carbonPressure,
        providers: vm.providers.map((provider) => ({
          status: provider.status,
          freshnessSec: provider.freshnessSec,
        })),
        pressureHistory: pressureHistory.current,
      })
      setAiReport(report)
      if (report.insights.length > 0 && !advisorOpen) setAdvisorPulse(true)
    }
    tick()
    const timer = window.setInterval(tick, 8_000)
    return () => window.clearInterval(timer)
  }, [advisorOpen, vm])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const hoveredRegionIdDeferred = useDeferredValue(hoveredRegionId)
  const hoveredRegion = useMemo(
    () =>
      vm?.regions.find((region) => region.id === hoveredRegionIdDeferred) ?? null,
    [hoveredRegionIdDeferred, vm?.regions],
  )
  const hoveredFrameId =
    hoveredRegion?.frameId && hoveredRegion.frameId !== selectedFrameId
      ? hoveredRegion.frameId
      : null
  const hoverTraceQuery = useDecisionTrace(hoveredFrameId, {
    enabled: Boolean(hoveredFrameId),
  })
  const hoverReplayQuery = useReplayBundle(hoveredFrameId, {
    enabled: Boolean(hoveredFrameId),
  })

  const hoverFrame = useMemo(
    () =>
      hoveredFrameId
        ? vm?.frames.find((frame) => frame.decisionFrameId === hoveredFrameId) ?? null
        : selectedFrameId && hoveredRegion?.frameId === selectedFrameId
          ? vm?.selectedDecision?.frame ?? null
          : null,
    [hoveredFrameId, hoveredRegion?.frameId, selectedFrameId, vm],
  )

  const hoverDecision = useMemo(() => {
    if (!hoveredRegion) return null
    if (hoveredRegion.frameId && hoveredRegion.frameId === selectedFrameId) {
      return vm?.selectedDecision ?? null
    }
    return buildDecisionView(
      hoverFrame,
      hoverTraceQuery.data ?? null,
      hoverReplayQuery.data ?? null,
    )
  }, [
    hoverFrame,
    hoverReplayQuery.data,
    hoverTraceQuery.data,
    hoveredRegion,
    selectedFrameId,
    vm?.selectedDecision,
  ])

  const hoverCard = useMemo(() => {
    if (!hoveredRegion) return null
    return buildHalogridHoverCard(hoveredRegion, hoverDecision)
  }, [hoverDecision, hoveredRegion])

  const handleLogoClick = useCallback(() => {
    if (consoleMode === 'presentation') {
      setGhostMode((value) => !value)
    }
    const now = Date.now()
    logoClicks.current = [...logoClicks.current.filter((value) => now - value < 900), now]
    if (tier === 'elite' && logoClicks.current.length >= 3) {
      setPolicyOpen((value) => !value)
      logoClicks.current = []
    }
  }, [consoleMode, tier])

  const handleHoverRegion = useCallback((payload: { regionId: string; clientX: number; clientY: number } | null) => {
    if (!payload) {
      setHoveredRegionId(null)
      return
    }
    setHoveredRegionId(payload.regionId)
    setHoverAnchor({ x: payload.clientX, y: payload.clientY })
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Browser may block or ignore the request. Presentation mode remains available.
    }
  }, [])

  if (!vm) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: theme.background, color: theme.text }}
      >
        <div className="text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: `${theme.sky}18`, border: `1px solid ${theme.sky}33` }}
          >
            <Shield className="h-5 w-5" style={{ color: theme.sky }} />
          </div>
          <div className="mt-4 text-sm font-semibold">HalOGrid loading...</div>
          <div className="mt-2 text-[10px] tracking-[0.24em]" style={{ color: theme.muted }}>
            COMMAND CENTER HYDRATING
          </div>
        </div>
      </div>
    )
  }

  const selectedDecision = vm.selectedDecision
  const isFreeview = !vm.entitlements.canInspect
  const isElite = vm.entitlements.canUseElite
  const topVisible = !(consoleMode === 'presentation' && ghostMode) && !topCollapsed
  const leftVisible = consoleMode === 'command' && !leftCollapsed
  const rightVisible =
    consoleMode === 'command'
      ? !rightCollapsed
      : consoleMode === 'focus'
        ? !rightCollapsed && Boolean(selectedDecision)
        : false
  const dockVisible = consoleMode !== 'presentation' ? !dockCollapsed : true
  const compactPresentation = consoleMode === 'presentation' && Boolean(selectedDecision)
  const sortedRegions = [...vm.regions].sort((left, right) => right.pressurePct - left.pressurePct)

  const govWeights = snapshot?.governance.weights
  const govImpact = snapshot?.governance.impact
  const waterDatasets = live?.providers.datasets ?? []
  const verifiedDatasets = waterDatasets.filter(
    (dataset) => dataset.verificationStatus === 'verified',
  ).length

  return (
    <div
      className="min-h-screen overflow-hidden"
      style={{
        background: theme.shellBackdrop,
        color: theme.text,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `radial-gradient(${theme.shellNoise} 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.18))',
        }}
      />

      <AnimatePresence>
        {topVisible ? (
          <motion.div
            key="top-rail"
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-4 top-4 z-40"
          >
            <div
              className="flex items-center justify-between gap-4 rounded-[28px] px-4 py-3"
              style={glassStyle(theme)}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className="group flex items-center gap-3 rounded-[22px] px-3 py-2 transition"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      background: `${theme.sky}14`,
                      border: `1px solid ${theme.sky}33`,
                      boxShadow: `0 0 24px ${theme.sky}18`,
                    }}
                  >
                    <Layers3 className="h-5 w-5" style={{ color: theme.sky }} />
                  </div>
                  <div className="text-left">
                    <div
                      className="text-[10px] uppercase tracking-[0.34em]"
                      style={{ color: theme.sky }}
                    >
                      HalOGrid
                    </div>
                    <div
                      className="text-[11px] font-semibold tracking-[0.18em]"
                      style={{ color: theme.textStrong }}
                    >
                      CO2 ROUTER · COMMAND CENTER
                    </div>
                  </div>
                </button>

                <TopPill theme={theme} label="PENDING" value={vm.hud.queue} tone={theme.amber} />

                <ControlButton
                  theme={theme}
                  active
                  onClick={() => setDisplayMode(nextDisplayMode(displayMode))}
                >
                  <span className="flex items-center gap-2">
                    <MoonStar className="h-3.5 w-3.5" />
                    {theme.label}
                  </span>
                </ControlButton>
              </div>

              <div className="hidden items-center gap-2 xl:flex">
                {CONSOLE_MODES.map((mode) => (
                  <ControlButton
                    key={mode}
                    theme={theme}
                    active={consoleMode === mode}
                    onClick={() => setConsoleMode(mode)}
                  >
                    {mode.toUpperCase()}
                  </ControlButton>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {TIER_ORDER.map((value) => (
                  <ControlButton
                    key={value}
                    theme={theme}
                    active={tier === value}
                    onClick={() => setTier(value)}
                  >
                    {value.toUpperCase()}
                  </ControlButton>
                ))}

                <ControlButton theme={theme} onClick={() => setLegendOpen(true)}>
                  <span className="flex items-center gap-2">
                    <Radar className="h-3.5 w-3.5" />
                    LEGEND
                  </span>
                </ControlButton>

                <ControlButton
                  theme={theme}
                  disabled={!vm.entitlements.canOpenManual}
                  onClick={() => setManualOpen(true)}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" />
                    MANUAL
                  </span>
                </ControlButton>

                <ControlButton theme={theme} onClick={toggleFullscreen}>
                  <span className="flex items-center gap-2">
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    {isFullscreen ? 'WINDOW' : 'FULL SCREEN'}
                  </span>
                </ControlButton>

                <div
                  className="rounded-full px-3 py-2 text-[11px] font-semibold tracking-[0.2em]"
                  style={{
                    background: `${vm.stale ? theme.amber : theme.green}14`,
                    border: `1px solid ${vm.stale ? theme.amber : theme.green}33`,
                    color: vm.stale ? theme.amber : theme.green,
                  }}
                >
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-current" />
                  {vm.stale ? 'DEGRADED' : snapshot?.header.systemStatus ?? 'SYSTEM HEALTHY'}
                </div>

                <button
                  type="button"
                  onClick={() => setTopCollapsed(true)}
                  className="rounded-full p-2"
                  style={{ border: `1px solid ${theme.border}`, color: theme.text }}
                >
                  <PanelBottomClose className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="relative flex h-screen gap-4 p-4"
        style={{ paddingTop: topVisible ? 92 : 16 }}
      >
        <AnimatePresence initial={false}>
          {rightVisible ? (
            <motion.aside
              key="right-rail"
              initial={{ x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative z-20 w-[380px] shrink-0"
            >
              <div className="flex h-full flex-col gap-3 rounded-[32px] p-4" style={glassStyle(theme)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] tracking-[0.24em]" style={{ color: theme.muted }}>
                      DECISION INSPECTOR
                    </div>
                    <div className="mt-1 text-xl font-semibold" style={{ color: theme.textStrong }}>
                      {selectedDecision ? formatRegionLabel(selectedDecision.frame.selectedRegion) : 'No node pinned'}
                    </div>
                    <div className="mt-1 text-[12px] leading-5" style={{ color: theme.muted }}>
                      {selectedDecision
                        ? selectedDecision.frame.reasonCode
                        : 'Click a lane to pin its proof, replay, and trace posture.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRightCollapsed(true)}
                    className="rounded-full p-2"
                    style={{ border: `1px solid ${theme.border}`, color: theme.text }}
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </button>
                </div>

                {selectedDecision ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                    <div
                      className="rounded-[24px] p-4"
                      style={{
                        background: `${actionTone(theme, selectedDecision.frame.action)}12`,
                        border: `1px solid ${actionTone(theme, selectedDecision.frame.action)}33`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] tracking-[0.24em]" style={{ color: theme.muted }}>
                            BINDING AUTHORIZATION
                          </div>
                          <div className="mt-1 text-lg font-semibold" style={{ color: theme.textStrong }}>
                            {formatActionLabel(selectedDecision.frame.action)}
                          </div>
                        </div>
                        <span
                          className="rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.18em]"
                          style={{
                            background: `${actionTone(theme, selectedDecision.frame.action)}18`,
                            border: `1px solid ${actionTone(theme, selectedDecision.frame.action)}44`,
                            color: actionTone(theme, selectedDecision.frame.action),
                          }}
                        >
                          {selectedDecision.frame.signalMode ?? 'LIVE'}
                        </span>
                      </div>
                      <div className="mt-4">
                        <PipelineRail theme={theme} />
                      </div>
                    </div>

                    <MetricGrid theme={theme} decision={selectedDecision} />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-[20px] p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                        <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>
                          LATENCY
                        </div>
                        <div className="mt-1 text-base font-black" style={{ color: theme.textStrong }}>
                          {selectedDecision.frame.latencyTotalMs != null ? `${selectedDecision.frame.latencyTotalMs}ms` : '--'}
                        </div>
                      </div>
                      <div className="rounded-[20px] p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                        <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>
                          REPLAY
                        </div>
                        <div className="mt-1 text-base font-black" style={{ color: selectedDecision.metrics.replayVerified ? theme.green : theme.amber }}>
                          {selectedDecision.metrics.replayVerified == null ? 'PENDING' : selectedDecision.metrics.replayVerified ? 'VERIFIED' : 'MISMATCH'}
                        </div>
                      </div>
                      <div className="rounded-[20px] p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                        <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>
                          WATER AUTHORITY
                        </div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: theme.textStrong }}>
                          {selectedDecision.frame.waterAuthorityMode ?? 'UNSPECIFIED'}
                        </div>
                      </div>
                      <div className="rounded-[20px] p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                        <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>
                          PROOF HASH
                        </div>
                        <div className="mt-1 text-sm font-semibold font-mono" style={{ color: theme.textStrong }}>
                          {(selectedDecision.frame.proofHash ?? 'UNAVAILABLE').slice(0, 14)}
                        </div>
                      </div>
                    </div>

                    {isFreeview ? (
                      <div
                        className="rounded-[24px] p-4"
                        style={{ background: `${theme.sky}10`, border: `1px solid ${theme.sky}25` }}
                      >
                        <div className="flex items-center gap-2" style={{ color: theme.sky }}>
                          <Lock className="h-4 w-4" />
                          <span className="text-sm font-semibold">Operator detail locked</span>
                        </div>
                        <div className="mt-2 text-[12px] leading-6" style={{ color: theme.muted }}>
                          Full trace, replay, provenance, and decision forensics are available in Pro and Elite.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="rounded-[24px] p-4"
                          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                        >
                          <div className="text-[10px] tracking-[0.22em]" style={{ color: theme.muted }}>
                            WHY THIS ACTION
                          </div>
                          <div className="mt-2 text-sm font-semibold" style={{ color: theme.textStrong }}>
                            {selectedDecision.frame.reasonCode}
                          </div>
                          <div className="mt-2 text-[12px] leading-6" style={{ color: theme.muted }}>
                            {ACTION_META[selectedDecision.frame.action as keyof typeof ACTION_META]?.simple ??
                              'The engine selected this lane according to the current control posture.'}
                          </div>
                        </div>

                        <div
                          className="rounded-[24px] p-4"
                          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[10px] tracking-[0.22em]" style={{ color: theme.muted }}>
                              PROVENANCE AND REPLAY
                            </div>
                            <div className="text-[10px] font-semibold" style={{ color: theme.sky }}>
                              {selectedDecision.metrics.proofRefs} refs
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}` }}>
                              <div className="text-[8px]" style={{ color: theme.dim }}>Evidence</div>
                              <div className="mt-1 text-sm font-black" style={{ color: theme.textStrong }}>{selectedDecision.metrics.evidenceRefs}</div>
                            </div>
                            <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}` }}>
                              <div className="text-[8px]" style={{ color: theme.dim }}>Providers</div>
                              <div className="mt-1 text-sm font-black" style={{ color: theme.textStrong }}>{selectedDecision.metrics.providerRefs}</div>
                            </div>
                            <div className="rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}` }}>
                              <div className="text-[8px]" style={{ color: theme.dim }}>Baseline</div>
                              <div className="mt-1 text-sm font-black" style={{ color: theme.textStrong }}>{selectedDecision.metrics.baselineRegion ?? '--'}</div>
                            </div>
                          </div>
                        </div>

                        <div
                          className="rounded-[24px] p-4"
                          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                        >
                          <div className="text-[10px] tracking-[0.22em]" style={{ color: theme.muted }}>
                            DECISION FORENSICS
                          </div>
                          <div className="mt-3 space-y-2">
                            {selectedDecision.trace?.payload.normalizedSignals.candidates
                              .slice(0, 5)
                              .map((candidate) => (
                                <div
                                  key={`${candidate.region}-${candidate.score}`}
                                  className="rounded-2xl p-3"
                                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}` }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                                      {formatRegionLabel(candidate.region)}
                                    </div>
                                    <div className="text-[10px] font-semibold" style={{ color: candidate.guardrailBlocked ? theme.rose : theme.sky }}>
                                      {candidate.score.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]" style={{ color: theme.muted }}>
                                    <span>{candidate.carbonIntensity.toFixed(0)} gCO2</span>
                                    <span>{candidate.waterImpactLiters.toFixed(1)} L</span>
                                    <span>{candidate.waterStressIndex.toFixed(2)} stress</span>
                                  </div>
                                  {candidate.guardrailReasons.length ? (
                                    <div className="mt-2 text-[10px]" style={{ color: theme.amber }}>
                                      {candidate.guardrailReasons.join(' · ')}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div
                      className="rounded-[24px] p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                    >
                      <div className="text-[10px] tracking-[0.22em]" style={{ color: theme.muted }}>
                        DECISION STREAM
                      </div>
                      <div className="mt-3 space-y-2">
                        {snapshot?.traceStream.items.slice(0, 6).map((item) => (
                          <button
                            key={item.decisionFrameId}
                            type="button"
                            onClick={() => startTransition(() => setSelectedFrameId(item.decisionFrameId))}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition"
                            style={{
                              background:
                                selectedFrameId === item.decisionFrameId
                                  ? `${theme.sky}10`
                                  : 'rgba(255,255,255,0.025)',
                              border: `1px solid ${
                                selectedFrameId === item.decisionFrameId
                                  ? `${theme.sky}33`
                                  : theme.border
                              }`,
                            }}
                          >
                            <div>
                              <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                                {formatRegionLabel(item.region)}
                              </div>
                              <div className="text-[10px]" style={{ color: theme.muted }}>
                                {item.reasonCode}
                              </div>
                            </div>
                            <div className="text-right text-[10px]" style={{ color: theme.sky }}>
                              <div>{formatActionLabel(item.action)}</div>
                              <div style={{ color: theme.dim }}>
                                {formatTimeLabel(item.createdAt)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed p-6 text-center"
                    style={{ borderColor: theme.border, color: theme.muted }}
                  >
                    Pin a lane from the globe to load its decision card, trace stream, replay posture, and proof references.
                  </div>
                )}
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>

      {!leftVisible ? (
        <button
          type="button"
          onClick={() => setLeftCollapsed(false)}
          className="fixed left-4 top-1/2 z-30 -translate-y-1/2 rounded-full p-3"
          style={glassStyle(theme, { color: theme.textStrong })}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}
      {!rightVisible ? (
        <button
          type="button"
          onClick={() => setRightCollapsed(false)}
          className="fixed right-4 top-1/2 z-30 -translate-y-1/2 rounded-full p-3"
          style={glassStyle(theme, { color: theme.textStrong })}
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      ) : null}
      {!topVisible ? (
        <button
          type="button"
          onClick={() => setTopCollapsed(false)}
          className="fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full p-3"
          style={glassStyle(theme, { color: theme.textStrong })}
        >
          <PanelBottomOpen className="h-4 w-4" />
        </button>
      ) : null}
      {!dockVisible ? (
        <button
          type="button"
          onClick={() => setDockCollapsed(false)}
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full p-3"
          style={glassStyle(theme, { color: theme.textStrong })}
        >
          <PanelBottomOpen className="h-4 w-4" />
        </button>
      ) : null}

      <AnimatePresence>
        {hoverCard && hoveredRegion && hoveredRegion.frameId ? (
          <HoverPreview
            theme={theme}
            hoverCard={hoverCard}
            anchor={hoverAnchor}
            compact={consoleMode === 'presentation'}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {alarmOpen ? (
          <motion.div
            key="alarm-drawer"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            className="fixed right-4 top-24 z-50 w-[min(420px,calc(100vw-2rem))]"
          >
            <DrawerFrame
              theme={theme}
              title="Alarm Queue"
              subtitle="Live derived posture"
              onClose={() => setAlarmOpen(false)}
            >
              <div className="space-y-2">
                {vm.alarms.length ? (
                  vm.alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className="rounded-[22px] p-3"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${severityTone(theme, alarm.severity)}33`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                          {alarm.title}
                        </div>
                        <span
                          className="rounded-full px-2 py-1 text-[9px] font-semibold tracking-[0.16em]"
                          style={{
                            background: `${severityTone(theme, alarm.severity)}14`,
                            color: severityTone(theme, alarm.severity),
                          }}
                        >
                          {alarm.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-2 text-[12px] leading-6" style={{ color: theme.muted }}>
                        {alarm.detail}
                      </div>
                      <div className="mt-2 text-[10px]" style={{ color: theme.dim }}>
                        {formatTimeLabel(alarm.createdAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="rounded-[22px] p-4 text-[13px]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${theme.border}`,
                      color: theme.muted,
                    }}
                  >
                    No live alarms are currently derived from the snapshot.
                  </div>
                )}
              </div>
            </DrawerFrame>
          </motion.div>
        ) : null}

        {legendOpen ? (
          <motion.div
            key="legend-drawer"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed left-1/2 top-24 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2"
          >
            <DrawerFrame
              theme={theme}
              title="Legend"
              subtitle="Scene reference"
              onClose={() => setLegendOpen(false)}
            >
              <LegendPanel theme={theme} />
            </DrawerFrame>
          </motion.div>
        ) : null}

        {manualOpen ? (
          <motion.div
            key="manual-drawer"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            className="fixed right-4 top-24 z-50 h-[calc(100vh-7rem)] w-[min(620px,calc(100vw-2rem))]"
          >
            <DrawerFrame
              theme={theme}
              title="Operator Manual"
              subtitle="Manual-complete parity"
              onClose={() => setManualOpen(false)}
            >
              <div className="h-[calc(100vh-13rem)] space-y-3 overflow-y-auto pr-1">
                {HALOGRID_MANUAL_SECTIONS.map((section) => (
                  <ManualSectionCard key={section.id} theme={theme} section={section} />
                ))}
              </div>
            </DrawerFrame>
          </motion.div>
        ) : null}

        {chatOpen ? (
          <motion.div
            key="chat-drawer"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))]"
          >
            <DrawerFrame
              theme={theme}
              title="Team Chat"
              subtitle="Elite shell"
              onClose={() => setChatOpen(false)}
            >
              <div className="space-y-3">
                <div
                  className="rounded-[22px] p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-center gap-2" style={{ color: theme.amber }}>
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-semibold">Not configured</span>
                  </div>
                  <div className="mt-2 text-[12px] leading-6" style={{ color: theme.muted }}>
                    The premium chat shell is present, but no live communications backend is currently configured for this workspace. No fake operator traffic is generated.
                  </div>
                </div>
              </div>
            </DrawerFrame>
          </motion.div>
        ) : null}

        {policyOpen ? (
          <motion.div
            key="policy-drawer"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed bottom-4 left-4 z-50 w-[min(420px,calc(100vw-2rem))]"
          >
            <DrawerFrame
              theme={theme}
              title="Policy Tuner"
              subtitle="Read-only governance posture"
              onClose={() => setPolicyOpen(false)}
            >
              <div className="space-y-3">
                <div
                  className="rounded-[22px] p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                >
                  <div className="text-[10px] tracking-[0.22em]" style={{ color: theme.muted }}>
                    GOVERNANCE SOURCE
                  </div>
                  <div className="mt-2 text-lg font-semibold" style={{ color: theme.textStrong }}>
                    {snapshot?.governance.source ?? 'No doctrine source'}
                  </div>
                  <div className="mt-2 text-[12px] leading-6" style={{ color: theme.muted }}>
                    This surface is intentionally read-only until a live writable governance path exists.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['carbon', 'water', 'latency', 'cost'] as const).map((key) => (
                    <div
                      key={key}
                      className="rounded-[20px] p-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                    >
                      <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>
                        {key.toUpperCase()}
                      </div>
                      <div className="mt-1 text-base font-black" style={{ color: theme.textStrong }}>
                        {govWeights?.[key] != null ? govWeights[key] : '--'}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="rounded-[22px] p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                >
                  <div className="text-[10px] tracking-[0.22em]" style={{ color: theme.muted }}>
                    LIVE IMPACT
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Carbon</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {govImpact?.carbonReductionPct != null ? `${govImpact.carbonReductionPct.toFixed(1)}%` : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Water</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {govImpact?.waterImpactDeltaLiters != null ? `${govImpact.waterImpactDeltaLiters.toFixed(1)}L` : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Confidence</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {govImpact?.signalConfidence != null ? `${Math.round(govImpact.signalConfidence * 100)}%` : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DrawerFrame>
          </motion.div>
        ) : null}

        {welcomeOpen ? (
          <motion.div
            key="welcome-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.97 }}
              className="w-[min(880px,100%)] rounded-[32px] p-6"
              style={glassStyle(theme)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] tracking-[0.28em]" style={{ color: theme.sky }}>
                    HALOGRID READY
                  </div>
                  <div className="mt-2 text-[clamp(1.8rem,3vw,2.6rem)] font-black leading-tight" style={{ color: theme.textStrong }}>
                    Premium command center restored.
                  </div>
                  <div className="mt-3 max-w-2xl text-[14px] leading-7" style={{ color: theme.muted }}>
                    This console is designed for three operator workflows: monitor the fleet at a glance, investigate a selected authorization deeply, or present the governed system full-screen without losing proof posture.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWelcomeOpen(false)}
                  className="rounded-full p-2"
                  style={{ border: `1px solid ${theme.border}`, color: theme.text }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: 'Monitor',
                    icon: Shield,
                    body: 'Keep all rails visible. Watch active, marginal, blocked, provider, and queue posture simultaneously.',
                  },
                  {
                    title: 'Investigate',
                    icon: ScanSearch,
                    body: 'Pin a lane, review trace, replay, proof, and decision forensics without losing the global map.',
                  },
                  {
                    title: 'Present',
                    icon: Sparkles,
                    body: 'Switch to presentation mode for investors or operators, with hover intelligence and compact pinned cards.',
                  },
                ].map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => {
                      setConsoleMode(card.title.toLowerCase() === 'present' ? 'presentation' : card.title.toLowerCase() === 'investigate' ? 'focus' : 'command')
                      setWelcomeOpen(false)
                    }}
                    className="rounded-[24px] p-4 text-left transition hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                  >
                    <card.icon className="h-5 w-5" style={{ color: theme.sky }} />
                    <div className="mt-4 text-lg font-semibold" style={{ color: theme.textStrong }}>
                      {card.title}
                    </div>
                    <div className="mt-2 text-[13px] leading-6" style={{ color: theme.muted }}>
                      {card.body}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
        <ControlButton theme={theme} compact active={alarmOpen} onClick={() => setAlarmOpen((v) => !v)}>
          <span className="relative flex items-center justify-center">
            <Bell className="h-4 w-4" />
            {vm.alarms.length > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">
                {vm.alarms.length}
              </span>
            ) : null}
          </span>
        </ControlButton>
        <ControlButton theme={theme} compact active={legendOpen} onClick={() => setLegendOpen((v) => !v)}>
          <Radar className="h-4 w-4" />
        </ControlButton>
        <ControlButton theme={theme} compact active={policyOpen} onClick={() => setPolicyOpen((v) => !v)}>
          <Settings2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          theme={theme}
          compact
          active={consoleMode === 'focus'}
          onClick={() => setConsoleMode((mode) => (mode === 'focus' ? 'command' : 'focus'))}
        >
          <ScanSearch className="h-4 w-4" />
        </ControlButton>
      </div>
    </div>
  )
}
