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
  Check,
  CheckCheck,
  ChevronDown,
  Expand,
  Layers3,
  Lock,
  Maximize2,
  MessageSquare,
  Mic,
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
  RotateCcw,
  ScanSearch,
  Settings2,
  Shield,
  Smartphone,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react'

import { ACTION_META } from '@/components/control-surface/action-styles'
import {
  useCommandCenterSnapshot,
  useDecisionTrace,
  useLiveSystemSnapshot,
  useReplayBundle,
  useSendTeamChatMessage,
  useTeamChat,
} from '@/lib/hooks/control-surface'
import type {
  CommandCenterSnapshot,
  CommandCenterDecisionItem,
  DecisionTraceRawRecord,
  LiveSystemSnapshot,
  ReplayBundle,
} from '@/types/control-surface'
import { analyzeFleet, type IntelligenceReport } from './intelligence'
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

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures and keep the session in-memory.
  }
}

function createOperatorId() {
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return generated.slice(0, 12)
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

function buildFallbackLiveSnapshot(
  snapshot: CommandCenterSnapshot,
): LiveSystemSnapshot {
  return {
    generatedAt: snapshot.generatedAt,
    recentDecisions: {
      available: false,
      error: snapshot.runtime.degradedReason ?? 'Live decision feed unavailable.',
      items: snapshot.decisionCore.recentDecisions.map((decision) => ({
        decisionFrameId: decision.decisionFrameId,
        createdAt: decision.createdAt,
        action: decision.action,
        reasonCode: decision.reasonCode,
        selectedRegion: decision.selectedRegion,
        proofHash: decision.proofHash,
        traceAvailable: decision.traceAvailable,
        governanceSource: decision.governanceSource,
      })),
    },
    traceLedger: {
      available: Boolean(snapshot.decisionCore.selectedTrace),
      error:
        snapshot.decisionCore.selectedTrace == null
          ? 'Live trace unavailable in degraded mode.'
          : null,
      traceAvailable: Boolean(snapshot.decisionCore.selectedTrace),
      traceHash: snapshot.decisionCore.selectedTrace?.traceHash ?? null,
      inputSignalHash:
        snapshot.decisionCore.selectedTrace?.inputSignalHash ?? null,
      sequenceNumber:
        snapshot.decisionCore.selectedTrace?.sequenceNumber ?? null,
      proofAvailable: Boolean(snapshot.decisionCore.selectedDecision?.proofHash),
      replayConsistent:
        snapshot.decisionCore.selectedReplay?.deterministicMatch ??
        snapshot.decisionCore.selectedReplay?.consistent ??
        null,
    },
    governance: {
      available: snapshot.governance.source != null,
      error: snapshot.runtime.degradedReason,
      frameworkLabel: 'SAIQ',
      active: snapshot.governance.active,
      policyState: snapshot.governance.enforcementMode,
      latestDecisionAction: snapshot.decisionCore.selectedDecision?.action ?? null,
      latestReasonCode:
        snapshot.decisionCore.selectedDecision?.reasonCode ?? null,
    },
    providers: {
      available: true,
      error: snapshot.health.provenance.error,
      datasets: snapshot.health.provenance.datasets,
    },
    latency: snapshot.health.latency,
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
  const [leftCollapsed, setLeftCollapsed] = useState(true)
  const [rightCollapsed, setRightCollapsed] = useState(true)
  const [topCollapsed, setTopCollapsed] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(true)
  const [showArcs, setShowArcs] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const [showRadar, setShowRadar] = useState(true)
  const [showHeat, setShowHeat] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1)
  const [ghostMode, setGhostMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [advisorPulse, setAdvisorPulse] = useState(false)
  const [chatTeamId, setChatTeamId] = useState('co2-router-ops')
  const [chatOperatorId, setChatOperatorId] = useState('')
  const [chatOperatorName, setChatOperatorName] = useState('')
  const [chatDraft, setChatDraft] = useState('')
  const [chatLastSeenCount, setChatLastSeenCount] = useState(0)
  const [ackedAlarms, setAckedAlarms] = useState<Set<string>>(new Set())
  const [dismissedAlarms, setDismissedAlarms] = useState<Set<string>>(new Set())
  const [isPortrait, setIsPortrait] = useState(false)

  const logoClicks = useRef<number[]>([])
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const theme = THEMES[displayMode]

  const traceQuery = useDecisionTrace(selectedFrameId, {
    enabled: Boolean(selectedFrameId),
  })
  const replayQuery = useReplayBundle(selectedFrameId, {
    enabled: Boolean(selectedFrameId),
  })

  const snapshot = snapshotQuery.data
  const live = liveQuery.data
  const effectiveLive = useMemo(() => {
    if (live) return live
    if (snapshot) return buildFallbackLiveSnapshot(snapshot)
    return null
  }, [live, snapshot])
  const chatQuery = useTeamChat(chatTeamId)
  const sendChatMessage = useSendTeamChatMessage()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedTeamId = readStoredValue('halogrid-team-id')
    const storedOperatorId = readStoredValue('halogrid-operator-id')
    const storedOperatorName = readStoredValue('halogrid-operator-name')

    if (storedTeamId) {
      setChatTeamId(storedTeamId)
    }

    if (storedOperatorId) {
      setChatOperatorId(storedOperatorId)
    } else {
      const generated = createOperatorId()
      setChatOperatorId(generated)
      writeStoredValue('halogrid-operator-id', generated)
    }

    if (storedOperatorName) {
      setChatOperatorName(storedOperatorName)
    } else {
      const generatedName = `Operator ${new Date().getHours().toString().padStart(2, '0')}${new Date()
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
      setChatOperatorName(generatedName)
      writeStoredValue('halogrid-operator-name', generatedName)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (chatTeamId) {
      writeStoredValue('halogrid-team-id', chatTeamId)
    }
  }, [chatTeamId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (chatOperatorName) {
      writeStoredValue('halogrid-operator-name', chatOperatorName)
    }
  }, [chatOperatorName])

  useEffect(() => {
    if (!chatOpen || !chatQuery.data?.messages.length) return
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [chatOpen, chatQuery.data?.messages.length])

  const vm = useMemo(() => {
    if (!snapshot || !effectiveLive) return null
    return buildHalogridViewModel({
      snapshot,
      live: effectiveLive,
      selectedFrameId,
      trace: traceQuery.data ?? null,
      replay: replayQuery.data ?? null,
      tier,
    })
  }, [effectiveLive, snapshot, selectedFrameId, traceQuery.data, replayQuery.data, tier])

  const aiReport = useMemo<IntelligenceReport | null>(() => {
    if (!vm) return null
    return analyzeFleet({
      regions: vm.regions.map((region) => ({
        id: region.id,
        label: region.label,
        state: region.state,
        action: region.action,
        reasonCode: region.reasonCode,
      })),
      decisions: vm.frames.map((frame) => ({
        action: frame.action,
        latencyTotalMs: frame.latencyTotalMs,
        selectedRegion: frame.selectedRegion,
        reasonCode: frame.reasonCode,
        fallbackUsed: frame.fallbackUsed,
        governanceSource: frame.governanceSource,
        signalMode: frame.signalMode,
        waterAuthorityMode: frame.waterAuthorityMode,
        createdAt: frame.createdAt,
        systemState: frame.systemState,
        accountingMethod: frame.accountingMethod,
      })),
      carbonPressure: vm.hud.carbonPressure,
      providers: vm.providers.map((provider) => ({
        status: provider.status,
        freshnessSec: provider.freshnessSec,
        providerType: provider.providerType,
        provenanceStatus: provider.provenanceStatus,
        degradedReason: provider.degradedReason,
      })),
      pressureHistory: [
        ...vm.frames
          .slice(0, 6)
          .map((frame) =>
            frame.systemState === 'blocked'
              ? 88
              : frame.systemState === 'marginal'
                ? 62
                : frame.action === 'reroute'
                  ? 54
                  : 34,
          ),
        vm.hud.carbonPressure,
      ],
      datasetSummary: {
        verifiedDatasets: vm.hud.verifiedDatasets,
        totalDatasets: vm.hud.totalDatasets,
      },
      hud: {
        active: vm.hud.active,
        marginal: vm.hud.marginal,
        blocked: vm.hud.blocked,
        threatPercentage: vm.hud.threatPercentage,
        decisionVelocity: vm.hud.decisionVelocity,
        queue: vm.hud.queue,
      },
      governance: snapshot ? {
        source: snapshot.governance.source,
        active: snapshot.governance.active,
        enforcementMode: snapshot.governance.enforcementMode,
        selectedScore: snapshot.governance.selectedScore,
      } : undefined,
      latencySlo: live ? {
        p95TotalMs: live.latency.p95TotalMs,
        budgetTotalP95Ms: live.latency.budgetTotalP95Ms,
        withinBudget: live.latency.withinBudget?.total ?? null,
      } : undefined,
      impact: snapshot?.impact ? {
        totalDecisions: snapshot.impact.totalDecisions,
        carbonAvoidedKg: snapshot.impact.carbonAvoidedKg,
        waterShiftedLiters: snapshot.impact.waterShiftedLiters,
        costOptimizedUsd: snapshot.impact.costOptimizedUsd,
        delayedDecisions: snapshot.impact.delayedDecisions,
      } : null,
    })
  }, [vm, snapshot, live])

  useEffect(() => {
    if (aiReport?.insights.length && !advisorOpen) {
      setAdvisorPulse(true)
    }
  }, [advisorOpen, aiReport])

  const handleSendChat = useCallback(() => {
    const payload = {
      teamId: chatTeamId.trim(),
      operatorId: chatOperatorId.trim(),
      operatorName: chatOperatorName.trim(),
      body: chatDraft.trim(),
    }

    if (!payload.teamId || !payload.operatorId || !payload.operatorName || !payload.body) {
      return
    }

    sendChatMessage.mutate(payload, {
      onSuccess: () => {
        setChatDraft('')
      },
    })
  }, [
    chatDraft,
    chatOperatorId,
    chatOperatorName,
    chatTeamId,
    sendChatMessage,
  ])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // ── Portrait detection ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(orientation: portrait) and (max-width: 1100px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsPortrait(e.matches)
    handler(mql)
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
      return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
    }
    mql.addListener(handler as (e: MediaQueryListEvent) => void)
    return () => mql.removeListener(handler as (e: MediaQueryListEvent) => void)
  }, [])

  // ── Chat unread tracking ──
  useEffect(() => {
    if (chatOpen && chatQuery.data?.messages.length) {
      setChatLastSeenCount(chatQuery.data.messages.length)
    }
  }, [chatOpen, chatQuery.data?.messages.length])

  const chatUnreadCount = chatOpen
    ? 0
    : Math.max(0, (chatQuery.data?.messages.length ?? 0) - chatLastSeenCount)

  // ── Tooltip dismiss when detail card opens ──
  useEffect(() => {
    if (selectedFrameId) {
      setHoveredRegionId(null)
    }
  }, [selectedFrameId])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      switch (e.key) {
        case 'Escape': {
          if (selectedFrameId) {
            startTransition(() => setSelectedFrameId(null))
          } else if (alarmOpen) {
            setAlarmOpen(false)
          } else if (chatOpen) {
            setChatOpen(false)
          } else if (legendOpen) {
            setLegendOpen(false)
          } else if (manualOpen) {
            setManualOpen(false)
          } else if (advisorOpen) {
            setAdvisorOpen(false)
            setAdvisorPulse(false)
          } else if (policyOpen) {
            setPolicyOpen(false)
          }
          break
        }
        case 'g':
        case 'G': {
          if (consoleMode === 'presentation' && tier === 'elite') {
            setGhostMode((v) => !v)
          }
          break
        }
        case 'ArrowRight':
        case 'j': {
          e.preventDefault()
          if (!vm) break
          const regionIds = vm.regions.map((r) => r.frameId).filter(Boolean) as string[]
          if (!regionIds.length) break
          const idx = selectedFrameId ? regionIds.indexOf(selectedFrameId) : -1
          const next = regionIds[(idx + 1) % regionIds.length]
          if (next) startTransition(() => setSelectedFrameId(next))
          break
        }
        case 'ArrowLeft':
        case 'k': {
          e.preventDefault()
          if (!vm) break
          const regionIds = vm.regions.map((r) => r.frameId).filter(Boolean) as string[]
          if (!regionIds.length) break
          const idx = selectedFrameId ? regionIds.indexOf(selectedFrameId) : 1
          const prev = regionIds[(idx - 1 + regionIds.length) % regionIds.length]
          if (prev) startTransition(() => setSelectedFrameId(prev))
          break
        }
        default:
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    advisorOpen,
    alarmOpen,
    chatOpen,
    consoleMode,
    legendOpen,
    manualOpen,
    policyOpen,
    selectedFrameId,
    tier,
    vm,
  ])

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

  if (snapshotQuery.error || liveQuery.error) {
    const snapshotError = snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null
    const liveError = liveQuery.error instanceof Error ? liveQuery.error.message : null
    const isEngineDown =
      (snapshotError && (snapshotError.includes('404') || snapshotError.includes('not found') || snapshotError.includes('failed'))) ||
      (liveError && (liveError.includes('404') || liveError.includes('not found') || liveError.includes('failed')))

    return (
      <div
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: theme.shellBackdrop, color: theme.text }}
      >
        <div
          className="max-w-lg rounded-[28px] p-8 text-center"
          style={glassStyle(theme, {
            border: `1px solid ${theme.rose}33`,
          })}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: `${theme.rose}14`, border: `1px solid ${theme.rose}33`, boxShadow: `0 0 48px ${theme.rose}18` }}
          >
            <Shield className="h-6 w-6" style={{ color: theme.rose }} />
          </div>
          <div className="mt-5 text-[10px] tracking-[0.28em]" style={{ color: theme.rose }}>
            ENGINE UNREACHABLE
          </div>
          <div className="mt-2 text-lg font-black" style={{ color: theme.textStrong }}>
            CO2 Grid unavailable
          </div>
          <div className="mt-3 text-[13px] leading-6" style={{ color: theme.muted }}>
            {isEngineDown
              ? 'The CO2 Router engine is not responding. The backend service may be sleeping, redeploying, or the URL may have changed.'
              : 'Command center data sources failed to load.'}
          </div>
          <div className="mx-auto mt-5 max-w-sm space-y-2 text-left">
            {snapshotError ? (
              <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>COMMAND CENTER SNAPSHOT</div>
                <div className="mt-1 text-[11px] leading-5" style={{ color: theme.rose }}>{snapshotError.slice(0, 200)}</div>
              </div>
            ) : null}
            {liveError ? (
              <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                <div className="text-[9px] tracking-[0.16em]" style={{ color: theme.dim }}>LIVE SYSTEM SNAPSHOT</div>
                <div className="mt-1 text-[11px] leading-5" style={{ color: theme.rose }}>{liveError.slice(0, 200)}</div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              void snapshotQuery.refetch()
              void liveQuery.refetch()
            }}
            className="mt-5 rounded-full px-6 py-2.5 text-[11px] font-semibold tracking-[0.2em]"
            style={{ background: `${theme.sky}16`, border: `1px solid ${theme.sky}44`, color: theme.sky }}
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    )
  }

  if (!vm) {
    const snapshotLoading = snapshotQuery.isLoading
    const liveLoading = liveQuery.isLoading

    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: theme.shellBackdrop, color: theme.text }}
      >
        <div className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: `${theme.sky}14`, border: `1px solid ${theme.sky}33`, boxShadow: `0 0 48px ${theme.sky}18` }}
          >
            <Shield className="h-6 w-6 animate-pulse" style={{ color: theme.sky }} />
          </div>
          <div className="mt-5 text-[10px] tracking-[0.28em]" style={{ color: theme.sky }}>
            CO2 GRID COMMAND CENTER
          </div>
          <div className="mt-2 text-lg font-black" style={{ color: theme.textStrong }}>
            Connecting to engine...
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[11px]">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: snapshotLoading ? theme.amber : theme.green,
                  boxShadow: `0 0 6px ${snapshotLoading ? theme.amber : theme.green}`,
                }}
              />
              <span style={{ color: theme.muted }}>Command center snapshot</span>
              <span style={{ color: snapshotLoading ? theme.amber : theme.green }}>
                {snapshotLoading ? 'loading...' : 'ready'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px]">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: liveLoading ? theme.amber : theme.green,
                  boxShadow: `0 0 6px ${liveLoading ? theme.amber : theme.green}`,
                }}
              />
              <span style={{ color: theme.muted }}>Live system snapshot</span>
              <span style={{ color: liveLoading ? theme.amber : theme.green }}>
                {liveLoading ? 'loading...' : 'ready'}
              </span>
            </div>
          </div>
          <div className="mt-5 text-[10px]" style={{ color: theme.dim }}>
            If this takes more than 10 seconds, the engine may be cold-starting.
          </div>
        </div>
      </div>
    )
  }

  // ── Portrait mode blocker ──
  if (isPortrait) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 text-center"
        style={{
          background: theme.shellBackdrop,
          color: theme.text,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{
            background: `${theme.sky}14`,
            border: `1px solid ${theme.sky}33`,
            boxShadow: `0 0 48px ${theme.sky}18`,
          }}
        >
          <Smartphone className="h-8 w-8" style={{ color: theme.sky }} />
        </div>
        <div>
          <div
            className="text-[11px] tracking-[0.32em]"
            style={{ color: theme.sky }}
          >
            CO2 GRID COMMAND CENTER
          </div>
          <div
            className="mt-3 text-xl font-black"
            style={{ color: theme.textStrong }}
          >
            Rotate to landscape
          </div>
          <div
            className="mt-3 max-w-sm text-[13px] leading-6"
            style={{ color: theme.muted }}
          >
            The command center requires landscape orientation. Please rotate your device or resize your browser window.
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em]" style={{ color: theme.dim }}>
          <RotateCcw className="h-4 w-4" />
          <span>LANDSCAPE REQUIRED</span>
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
  const cumulativeImpact = snapshot?.impact
  const waterDatasets = live?.providers.datasets ?? []
  const verifiedDatasets = waterDatasets.filter(
    (dataset) => dataset.verificationStatus === 'verified',
  ).length

  const visibleAlarms = vm.alarms.filter((a) => !dismissedAlarms.has(a.id))
  const handleAckAlarm = (id: string) => setAckedAlarms((prev) => new Set(prev).add(id))
  const handleDismissAlarm = (id: string) => setDismissedAlarms((prev) => new Set(prev).add(id))
  const handleAckAll = () => setAckedAlarms(new Set(visibleAlarms.map((a) => a.id)))

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
        {/* ── LEFT HUD PANEL ── */}
        <AnimatePresence initial={false}>
          {leftVisible ? (
            <motion.aside
              key="left-rail"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative z-20 w-[232px] shrink-0"
            >
              <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-[32px] p-4" style={glassStyle(theme)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] tracking-[0.24em]" style={{ color: theme.muted }}>FLEET POSTURE</div>
                    <div className="mt-1 text-base font-semibold" style={{ color: theme.textStrong }}>HUD</div>
                  </div>
                  <button type="button" onClick={() => setLeftCollapsed(true)} className="rounded-full p-2" style={{ border: `1px solid ${theme.border}`, color: theme.text }}>
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>

                <ThreatGauge theme={theme} pct={vm.hud.threatPercentage} velocity={vm.hud.decisionVelocity} />

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'ACTIVE', count: vm.hud.active, tone: theme.green },
                    { label: 'MARGINAL', count: vm.hud.marginal, tone: theme.amber },
                    { label: 'BLOCKED', count: vm.hud.blocked, tone: theme.rose },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl p-2.5 text-center" style={{ background: `${item.tone}0c`, border: `1px solid ${item.tone}22` }}>
                      <div className="text-[8px] tracking-[0.18em]" style={{ color: item.tone }}>{item.label}</div>
                      <div className="mt-1 text-xl font-black" style={{ color: item.tone }}>{item.count}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between text-[10px] tracking-[0.18em]">
                    <span style={{ color: theme.muted }}>CARBON PRESSURE</span>
                    <span style={{ color: vm.hud.carbonPressure > 65 ? theme.rose : vm.hud.carbonPressure > 35 ? theme.amber : theme.green }}>
                      {vm.hud.carbonPressure}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, vm.hud.carbonPressure)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      style={{
                        background: vm.hud.carbonPressure > 65 ? theme.rose : vm.hud.carbonPressure > 35 ? theme.amber : theme.green,
                        boxShadow: `0 0 12px ${vm.hud.carbonPressure > 65 ? theme.rose : vm.hud.carbonPressure > 35 ? theme.amber : theme.green}44`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                  <div className="text-[9px] tracking-[0.18em]" style={{ color: theme.muted }}>PROVENANCE POSTURE</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {Array.from({ length: vm.hud.totalDatasets }).map((_, i) => (
                      <span
                        key={i}
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: i < verifiedDatasets ? theme.green : 'rgba(255,255,255,0.12)',
                          boxShadow: i < verifiedDatasets ? `0 0 6px ${theme.green}` : undefined,
                        }}
                      />
                    ))}
                    <span className="ml-2 text-[11px] font-semibold" style={{ color: theme.textStrong }}>
                      {verifiedDatasets}/{vm.hud.totalDatasets}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
                  <div className="text-[9px] tracking-[0.18em]" style={{ color: theme.muted }}>SIGNAL PROVIDERS</div>
                  <div className="mt-2 space-y-2">
                    {vm.providers.slice(0, 6).map((provider) => {
                      const providerTone = provider.status === 'healthy' ? theme.green : provider.status === 'offline' ? theme.rose : theme.amber
                      return (
                        <div key={provider.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: providerTone, boxShadow: `0 0 6px ${providerTone}` }} />
                            <span style={{ color: theme.text }}>{provider.label}</span>
                          </div>
                          <span className="font-mono text-[10px]" style={{ color: theme.dim }}>{provider.freshnessLabel}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {aiReport ? (
                  <div
                    className="rounded-2xl p-3"
                    style={{
                      background: `${aiReport.healthScore >= 75 ? theme.green : aiReport.healthScore >= 45 ? theme.amber : theme.rose}0c`,
                      border: `1px solid ${aiReport.healthScore >= 75 ? theme.green : aiReport.healthScore >= 45 ? theme.amber : theme.rose}22`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] tracking-[0.18em]" style={{ color: theme.muted }}>FLEET HEALTH</div>
                      <div className="text-lg font-black" style={{ color: aiReport.healthScore >= 75 ? theme.green : aiReport.healthScore >= 45 ? theme.amber : theme.rose }}>
                        {aiReport.healthScore}%
                      </div>
                    </div>
                    <div className="mt-1 text-[10px]" style={{ color: theme.muted }}>
                      Carbon {aiReport.carbonTrend} · Risk {aiReport.riskLevel}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        {/* ── GLOBE CENTER ── */}
        <div className="relative flex-1 overflow-hidden rounded-[32px]" style={{ background: theme.background }}>
          <Globe3D
            regions={vm.regions}
            flows={vm.flows}
            selectedFrameId={selectedFrameId}
            hoveredRegionId={hoveredRegionId}
            onHoverRegion={handleHoverRegion}
            onSelectRegion={(id: string) => startTransition(() => setSelectedFrameId(id))}
            showArcs={showArcs}
            showNodes={showNodes}
            showRadar={showRadar}
            showHeat={showHeat}
            theme={theme}
            mode={consoleMode === 'presentation' ? 'presentation' : displayMode}
            stormMode={vm.globe.stormMode}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
          />

          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2">
              {[
                { label: `${vm.hud.active} ACTIVE`, tone: theme.green },
                { label: `${vm.hud.marginal} MARGINAL`, tone: theme.amber },
                { label: `${vm.hud.blocked} BLOCKED`, tone: theme.rose },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.16em]"
                  style={{ background: `${item.tone}14`, border: `1px solid ${item.tone}33`, color: item.tone }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.tone, boxShadow: `0 0 6px ${item.tone}` }} />
                  {item.label}
                </div>
              ))}
            </div>

            {isFreeview ? (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.18)' }}>
                <div className="text-center">
                  <div className="text-[16px] font-black tracking-[0.35em]" style={{ color: theme.sky, textShadow: `0 0 40px ${theme.sky}` }}>
                    CO2 GRID FREEVIEW
                  </div>
                  <div className="mt-3 text-[12px] tracking-[0.15em]" style={{ color: theme.muted }}>
                    See the proof. Upgrade for full authority.
                  </div>
                </div>
              </div>
            ) : null}

            {compactPresentation && selectedDecision ? (
              <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
                <PresentationCard theme={theme} decision={selectedDecision} />
              </div>
            ) : null}

            {dockVisible && consoleMode !== 'presentation' ? (
              <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-[22px] px-4 py-2.5" style={glassStyle(theme)}>
                  <div className="mr-2 text-[8px] tracking-[0.22em]" style={{ color: theme.dim }}>LAYERS</div>
                  <ControlButton theme={theme} compact active={showArcs} onClick={() => setShowArcs((v) => !v)}>ARCS</ControlButton>
                  <ControlButton theme={theme} compact active={showNodes} onClick={() => setShowNodes((v) => !v)}>NODES</ControlButton>
                  <ControlButton theme={theme} compact active={showRadar} onClick={() => setShowRadar((v) => !v)}>RADAR</ControlButton>
                  <ControlButton theme={theme} compact active={showHeat} onClick={() => setShowHeat((v) => !v)}>HEAT</ControlButton>
                  <div className="mx-1 h-5 w-px" style={{ background: theme.border }} />
                  <ControlButton theme={theme} compact onClick={() => setZoomLevel((z) => Math.max(1, z - 1) as 1 | 2 | 3)}>
                    <Minus className="h-3.5 w-3.5" />
                  </ControlButton>
                  <div className="flex gap-1">
                    {([1, 2, 3] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        className="h-2 w-2 rounded-full"
                        onClick={() => setZoomLevel(level)}
                        style={{ background: zoomLevel >= level ? theme.sky : 'rgba(255,255,255,0.12)' }}
                      />
                    ))}
                  </div>
                  <ControlButton theme={theme} compact onClick={() => setZoomLevel((z) => Math.min(3, z + 1) as 1 | 2 | 3)}>
                    <Plus className="h-3.5 w-3.5" />
                  </ControlButton>
                  <div className="mx-1 h-5 w-px" style={{ background: theme.border }} />
                  <button
                    type="button"
                    onClick={() => setDockCollapsed(true)}
                    className="rounded-full p-1.5"
                    style={{ border: `1px solid ${theme.border}`, color: theme.text }}
                  >
                    <PanelBottomClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── RIGHT DECISION PANEL ── */}
        <AnimatePresence initial={false}>
          {rightVisible ? (
            <motion.aside
              key="right-rail"
              initial={{ x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative z-20 w-[320px] shrink-0"
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
          className="fixed right-16 top-1/2 z-30 -translate-y-1/2 rounded-full p-3"
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
                {visibleAlarms.length > 1 ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAckAll}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em]"
                      style={{ background: `${theme.sky}14`, border: `1px solid ${theme.sky}33`, color: theme.sky }}
                    >
                      <CheckCheck className="h-3 w-3" />
                      ACK ALL
                    </button>
                  </div>
                ) : null}
                {visibleAlarms.length ? (
                  visibleAlarms.map((alarm) => {
                    const isAcked = ackedAlarms.has(alarm.id)
                    return (
                      <div
                        key={alarm.id}
                        className="rounded-[22px] p-3"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${severityTone(theme, alarm.severity)}33`,
                          opacity: isAcked ? 0.55 : 1,
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                            {alarm.title}
                            {isAcked ? (
                              <span className="ml-2 text-[9px] tracking-[0.14em]" style={{ color: theme.dim }}>ACK</span>
                            ) : null}
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
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[10px]" style={{ color: theme.dim }}>
                            {formatTimeLabel(alarm.createdAt)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!isAcked ? (
                              <button
                                type="button"
                                onClick={() => handleAckAlarm(alarm.id)}
                                className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold tracking-[0.14em]"
                                style={{ background: `${theme.sky}14`, border: `1px solid ${theme.sky}33`, color: theme.sky }}
                              >
                                <Check className="h-3 w-3" />
                                ACK
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDismissAlarm(alarm.id)}
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold tracking-[0.14em]"
                              style={{ background: `${theme.rose}14`, border: `1px solid ${theme.rose}33`, color: theme.rose }}
                            >
                              <XCircle className="h-3 w-3" />
                              DISMISS
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
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
              subtitle="Elite operator channel"
              onClose={() => setChatOpen(false)}
            >
              <div className="space-y-3">
                <div
                  className="rounded-[22px] p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <div className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: theme.dim }}>
                        TEAM
                      </div>
                      <input
                        value={chatTeamId}
                        onChange={(event) =>
                          setChatTeamId(
                            event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, '-')
                              .slice(0, 48),
                          )
                        }
                        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${theme.border}`,
                          color: theme.textStrong,
                        }}
                      />
                    </label>
                    <label className="space-y-1">
                      <div className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: theme.dim }}>
                        OPERATOR
                      </div>
                      <input
                        value={chatOperatorName}
                        onChange={(event) => setChatOperatorName(event.target.value.slice(0, 48))}
                        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${theme.border}`,
                          color: theme.textStrong,
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px]" style={{ color: theme.muted }}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" style={{ color: theme.sky }} />
                      <span>
                        Live channel: <span style={{ color: theme.textStrong }}>#{chatQuery.data?.teamId ?? chatTeamId}</span>
                      </span>
                    </div>
                    <span style={{ color: sendChatMessage.isPending ? theme.amber : theme.green }}>
                      {sendChatMessage.isPending ? 'Sending' : 'Live'}
                    </span>
                  </div>
                </div>

                <div
                  ref={chatScrollRef}
                  className="max-h-[280px] space-y-2 overflow-y-auto rounded-[22px] p-3"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}` }}
                >
                  {chatQuery.isLoading ? (
                    <div className="text-[12px]" style={{ color: theme.muted }}>
                      Loading channel traffic...
                    </div>
                  ) : chatQuery.isError ? (
                    <div className="text-[12px]" style={{ color: theme.rose }}>
                      {(chatQuery.error as Error).message}
                    </div>
                  ) : chatQuery.data?.messages.length ? (
                    chatQuery.data.messages.map((message) => {
                      const mine = message.operatorId === chatOperatorId
                      return (
                        <div
                          key={message.id}
                          className={`rounded-2xl p-3 ${mine ? 'ml-8' : 'mr-8'}`}
                          style={{
                            background: mine ? `${theme.sky}10` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${mine ? `${theme.sky}33` : theme.border}`,
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold"
                                style={{
                                  background: mine ? `${theme.sky}22` : 'rgba(255,255,255,0.08)',
                                  color: mine ? theme.sky : theme.textStrong,
                                }}
                              >
                                {(message.operatorName || '??').slice(0, 2).toUpperCase()}
                              </span>
                              <span className="text-[11px] font-semibold" style={{ color: mine ? theme.sky : theme.textStrong }}>
                                {message.operatorName}
                              </span>
                            </div>
                            <div className="text-[10px]" style={{ color: theme.dim }}>
                              {formatTimeLabel(message.createdAt)}
                            </div>
                          </div>
                          <div className="mt-1 text-[12px] leading-6" style={{ color: theme.text }}>
                            {message.body}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl p-3 text-[12px] leading-6" style={{ background: 'rgba(255,255,255,0.02)', color: theme.muted }}>
                      No traffic yet in this team channel. The first message creates the live operator thread for everyone on the same deployment.
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-[22px] p-3" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}` }}>
                  <textarea
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value.slice(0, 600))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        handleSendChat()
                      }
                    }}
                    rows={3}
                    placeholder="Broadcast route changes, proof notes, escalations, or operator context..."
                    className="w-full resize-none rounded-2xl px-3 py-3 text-[12px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${theme.border}`,
                      color: theme.textStrong,
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px]" style={{ color: theme.dim }}>
                      Shared on this deployment for the selected team channel.
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled
                        className="rounded-full p-2 opacity-40 cursor-not-allowed"
                        style={{ border: `1px solid ${theme.border}`, color: theme.dim }}
                        title="Voice input (coming soon)"
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSendChat}
                        disabled={
                          sendChatMessage.isPending ||
                          !chatDraft.trim() ||
                          !chatOperatorName.trim() ||
                          !chatTeamId.trim() ||
                          !chatOperatorId.trim()
                        }
                        className="rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.2em] disabled:cursor-not-allowed"
                        style={{
                          background: sendChatMessage.isPending ? 'rgba(255,255,255,0.06)' : `${theme.sky}16`,
                          border: `1px solid ${sendChatMessage.isPending ? theme.border : `${theme.sky}44`}`,
                          color: sendChatMessage.isPending ? theme.dim : theme.sky,
                        }}
                      >
                        SEND
                      </button>
                    </div>
                  </div>
                  {sendChatMessage.isError ? (
                    <div className="text-[11px]" style={{ color: theme.rose }}>
                      {(sendChatMessage.error as Error).message}
                    </div>
                  ) : null}
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
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Decisions</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {cumulativeImpact?.totalDecisions != null ? cumulativeImpact.totalDecisions.toLocaleString() : 'Unavailable'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Carbon avoided</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {cumulativeImpact?.carbonAvoidedKg != null ? `${cumulativeImpact.carbonAvoidedKg.toFixed(1)} kg` : 'Unavailable'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Water shifted</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {cumulativeImpact?.waterShiftedLiters != null ? `${cumulativeImpact.waterShiftedLiters.toFixed(1)} L` : 'Unavailable'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Cost optimized</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {cumulativeImpact?.costOptimizedUsd != null ? `$${cumulativeImpact.costOptimizedUsd.toFixed(2)}` : 'Unavailable'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Reduction multiple</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {cumulativeImpact?.carbonReductionMultiplier != null ? `${cumulativeImpact.carbonReductionMultiplier.toFixed(2)}x` : 'Unavailable'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px]" style={{ color: theme.dim }}>Delayed</div>
                      <div className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                        {cumulativeImpact?.delayedDecisions != null ? cumulativeImpact.delayedDecisions.toLocaleString() : 'Unavailable'}
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
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md"
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
                    CO2 GRID READY
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

      <AnimatePresence>
        {advisorOpen && aiReport ? (
          <motion.div
            key="advisor-drawer"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed bottom-4 left-4 z-40"
          >
            <SmartAdvisor
              report={aiReport}
              theme={theme}
              onClose={() => {
                setAdvisorOpen(false)
                setAdvisorPulse(false)
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
        <ControlButton theme={theme} compact active={alarmOpen} onClick={() => setAlarmOpen((v) => !v)}>
          <span className="relative flex items-center justify-center">
            <Bell className="h-4 w-4" />
            {visibleAlarms.length > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">
                {visibleAlarms.length}
              </span>
            ) : null}
          </span>
        </ControlButton>
        <ControlButton
          theme={theme}
          compact
          active={chatOpen}
          onClick={() => setChatOpen((value) => !value)}
        >
          <span className="relative flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
            {chatUnreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-sky-500 px-1.5 text-[9px] font-bold text-white">
                {chatUnreadCount}
              </span>
            ) : null}
          </span>
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
