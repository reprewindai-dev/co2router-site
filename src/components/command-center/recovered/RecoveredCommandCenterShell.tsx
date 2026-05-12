'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageSquare,
  Minus,
  MoonStar,
  Plus,
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
import { HALOGRID_MANUAL_SECTIONS } from './manual-content'
import { buildHalogridViewModel, type HalogridRegionView, type HalogridTier } from './view-model'

const TIER_ORDER: HalogridTier[] = ['freeview', 'pro', 'elite']

const THEME = {
  bg: '#05070d',
  border: 'rgba(148, 163, 184, 0.16)',
  text: '#e5edf8',
  muted: '#8ca0bb',
  line: 'rgba(255,255,255,0.08)',
  blue: '#58c7ff',
  blueGlow: 'rgba(88, 199, 255, 0.45)',
  green: '#7CFF8A',
  amber: '#ffd35c',
  red: '#ff866b',
}

function glassStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: 'linear-gradient(180deg, rgba(10,16,28,0.96), rgba(8,13,22,0.76))',
    border: `1px solid ${THEME.border}`,
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    ...extra,
  }
}

function tierLabel(tier: HalogridTier) {
  return tier === 'freeview' ? 'FREEVIEW' : tier === 'pro' ? 'PRO' : 'ELITE'
}

function formatFreshness(value: number | null) {
  if (value == null) return 'n/a'
  if (value < 60) return `${value}s`
  if (value < 3600) return `${Math.round(value / 60)}m`
  return `${Math.round(value / 3600)}h`
}

function regionTone(state: HalogridRegionView['state']) {
  if (state === 'active') return THEME.green
  if (state === 'blocked') return THEME.red
  return THEME.amber
}

function threatLabel(threat: number) {
  if (threat >= 65) return 'CRITICAL'
  if (threat >= 30) return 'ELEVATED'
  return 'NOMINAL'
}

function projectNode(region: HalogridRegionView, rotation: number) {
  const rx = 245
  const ry = 250
  const centerX = 320
  const centerY = 310
  const lon = (region.x / 100) * 2 * Math.PI - Math.PI
  const lat = (0.5 - region.y / 100) * Math.PI
  const rotatedLon = lon + rotation
  const depth = Math.cos(lat) * Math.cos(rotatedLon)
  const x = centerX + rx * Math.cos(lat) * Math.sin(rotatedLon)
  const y = centerY - ry * Math.sin(lat) * 0.92
  return { x, y, depth }
}

function TopPill({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold tracking-[0.22em]"
      style={{ background: `${tone}18`, border: `1px solid ${tone}66`, color: tone, boxShadow: `0 0 28px ${tone}22` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />
      <span>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function ControlButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl px-3 py-2 text-[11px] font-semibold tracking-[0.22em] transition"
      style={{
        background: active ? 'rgba(88, 199, 255, 0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(88, 199, 255, 0.46)' : THEME.border}`,
        color: disabled ? '#64748b' : active ? '#cfeeff' : '#d7e7ff',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Drawer({
  title,
  subtitle,
  onClose,
  className,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  className: string
  children: React.ReactNode
}) {
  return (
    <div className={className} style={glassStyle()}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: THEME.muted }}>
            {subtitle}
          </div>
          <div className="text-lg font-semibold text-white">{title}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border p-1.5" style={{ borderColor: THEME.border }}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  )
}

export function RecoveredCommandCenterShell() {
  const snapshotQuery = useCommandCenterSnapshot()
  const liveQuery = useLiveSystemSnapshot()
  const [tier, setTier] = useState<HalogridTier>('elite')
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [alarmOpen, setAlarmOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [globeOnly, setGlobeOnly] = useState(false)
  const [ghostMode, setGhostMode] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [showArcs, setShowArcs] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const [showRadar, setShowRadar] = useState(true)
  const [showHeat, setShowHeat] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(2)
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; rotation: number } | null>(null)
  const logoClicks = useRef<number[]>([])

  useEffect(() => {
    if (!selectedFrameId && snapshotQuery.data?.selectedDecisionFrameId) {
      setSelectedFrameId(snapshotQuery.data.selectedDecisionFrameId)
    }
  }, [selectedFrameId, snapshotQuery.data?.selectedDecisionFrameId])

  const traceQuery = useDecisionTrace(selectedFrameId, { enabled: Boolean(selectedFrameId) })
  const replayQuery = useReplayBundle(selectedFrameId, { enabled: Boolean(selectedFrameId) })

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

  const projectedRegions = useMemo(() => {
    if (!vm) return []
    return vm.regions
      .map((region) => ({ region, point: projectNode(region, rotation) }))
      .sort((left, right) => left.point.depth - right.point.depth)
  }, [rotation, vm])

  function handleLogoClick() {
    if (globeOnly) setGhostMode((value) => !value)
    const now = Date.now()
    logoClicks.current = [...logoClicks.current.filter((value) => now - value < 900), now]
    if (tier === 'elite' && logoClicks.current.length >= 3) {
      setPolicyOpen((value) => !value)
      logoClicks.current = []
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, rotation }
    setDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    const deltaX = event.clientX - dragRef.current.x
    const deltaY = event.clientY - dragRef.current.y
    setPan({ x: dragRef.current.panX + deltaX * 0.35, y: dragRef.current.panY + deltaY * 0.18 })
    setRotation(dragRef.current.rotation + deltaX / 520)
  }

  function handlePointerUp() {
    dragRef.current = null
    setDragging(false)
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    setZoomLevel((current) => Math.max(1, Math.min(3, event.deltaY < 0 ? current + 1 : current - 1)))
  }

  if (!vm) {
    return <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-slate-200">Loading HaloGrid...</div>
  }

  const scale = zoomLevel === 1 ? 0.9 : zoomLevel === 2 ? 1.02 : 1.18
  const selectedFrame = vm.selectedDecision
  const isFreeview = tier === 'freeview'
  const isElite = tier === 'elite'
  const latestFrame = vm.frames[0]
  const governanceWeights = snapshot?.governance.weights

  return (
    <div
      className="min-h-screen overflow-hidden text-slate-100"
      style={{
        background:
          'radial-gradient(circle at top, rgba(88,199,255,0.14), transparent 32%), radial-gradient(circle at bottom right, rgba(255,204,84,0.09), transparent 24%), #05070d',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_0,transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(#ffffff 0.9px, transparent 0.9px)', backgroundSize: '26px 26px' }} />

      <motion.header
        animate={{ opacity: ghostMode ? 0.14 : 1, y: 0 }}
        className="relative z-30 mx-4 mt-4 rounded-[24px] px-4 py-3"
        style={glassStyle()}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={handleLogoClick} className="flex items-center gap-3 text-left">
            <div>
              <div className="text-[28px] font-black leading-none" style={{ color: '#d7f4ff' }}>
                Halo<span style={{ color: THEME.blue }}>Grid</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: THEME.muted }}>
                CO2 Router Command Center
              </div>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <TopPill label="Pending" value={vm.hud.queue} tone={THEME.amber} />
            <ControlButton active>
              <span className="inline-flex items-center gap-2">
                <MoonStar className="h-3.5 w-3.5" />
                DARK
              </span>
            </ControlButton>
            {TIER_ORDER.map((value) => (
              <ControlButton key={value} active={tier === value} onClick={() => setTier(value)}>
                {tierLabel(value)}
              </ControlButton>
            ))}
            <ControlButton onClick={() => setAlarmOpen((value) => !value)}>
              <span className="inline-flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                LEGEND
              </span>
            </ControlButton>
            <ControlButton disabled={!isElite} onClick={() => isElite && setManualOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                MANUAL
              </span>
            </ControlButton>
            <ControlButton onClick={() => setGlobeOnly((value) => !value)}>
              {globeOnly ? 'EXPAND' : 'GLOBE MODE'}
            </ControlButton>
          </div>
        </div>
      </motion.header>
      <div className="relative z-20 flex min-h-[calc(100vh-108px)] gap-4 px-4 pb-4 pt-4">
        {!globeOnly && !leftCollapsed && (
          <aside className="w-[300px] shrink-0 rounded-[26px] p-4" style={glassStyle()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: THEME.muted }}>
                  Operator Surface
                </div>
                <div className="text-lg font-semibold text-white">Signals and integrity</div>
              </div>
              <button type="button" onClick={() => setLeftCollapsed(true)} className="rounded-full border p-1.5" style={{ borderColor: THEME.border }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {vm.providers.map((provider) => (
                <div key={provider.id} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{provider.label}</div>
                      <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: THEME.muted }}>
                        {provider.providerType ?? 'signal'}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{
                        background:
                          provider.status === 'healthy'
                            ? 'rgba(124,255,138,0.12)'
                            : provider.status === 'offline'
                              ? 'rgba(255,134,107,0.12)'
                              : 'rgba(255,211,92,0.12)',
                        color:
                          provider.status === 'healthy'
                            ? THEME.green
                            : provider.status === 'offline'
                              ? THEME.red
                              : THEME.amber,
                      }}
                    >
                      {provider.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm" style={{ color: '#d7e7ff' }}>
                    {provider.detail}
                  </div>
                  <div className="mt-2 text-[11px]" style={{ color: THEME.muted }}>
                    freshness {formatFreshness(provider.freshnessSec)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(88, 199, 255, 0.08)', border: `1px solid rgba(88, 199, 255, 0.18)` }}>
              <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#bce7ff' }}>
                Live posture
              </div>
              <div className="mt-2 text-sm leading-6" style={{ color: '#d7e7ff' }}>
                {vm.degradedReason ?? 'The console is live and reading the current command-center snapshot.'}
              </div>
            </div>
          </aside>
        )}

        {!globeOnly && leftCollapsed && (
          <button type="button" onClick={() => setLeftCollapsed(false)} className="mt-[160px] h-14 rounded-full border px-3" style={glassStyle({ width: 46 })}>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <main className="relative min-h-[820px] flex-1 overflow-hidden rounded-[32px]" style={glassStyle({ minWidth: 0 })}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,199,255,0.18),transparent_38%)]" />
          <div className="absolute left-6 top-6 z-20 flex flex-wrap items-center gap-3">
            <TopPill label="ACTIVE" value={vm.hud.active} tone={THEME.green} />
            <TopPill label="MARGINAL" value={vm.hud.marginal} tone={THEME.amber} />
            <TopPill label="BLOCKED" value={vm.hud.blocked} tone={THEME.red} />
            <ControlButton active={globeOnly} onClick={() => setGlobeOnly((value) => !value)}>
              GLOBE MODE
            </ControlButton>
          </div>

          <div className="absolute left-6 top-[92px] z-20">
            <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: '#d4b865' }}>
              Carbon Pressure
            </div>
            <div className="mt-2 h-3 w-[180px] overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full" style={{ width: `${Math.max(12, vm.hud.carbonPressure)}%`, background: 'linear-gradient(90deg, #ffd35c, #ffb347)', boxShadow: '0 0 18px rgba(255, 211, 92, 0.45)' }} />
            </div>
          </div>

          <div className="absolute left-1/2 top-[102px] z-20 -translate-x-1/2 text-center">
            <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: '#d4b865' }}>
              223 gCO2/kWh
            </div>
          </div>

          <div className="absolute right-6 top-6 z-20 w-[230px] rounded-[26px] p-4" style={glassStyle()}>
            <div className="flex items-center justify-between">
              <div className="rounded-2xl px-3 py-2 text-sm font-semibold" style={{ background: 'rgba(255,134,107,0.14)', color: '#ffc1b3', border: '1px solid rgba(255,134,107,0.35)' }}>
                {vm.alarms.length} ALARMS
              </div>
              <Bell className="h-4 w-4" style={{ color: '#ffc1b3' }} />
            </div>
            <div className="mt-6 text-center">
              <div className="text-4xl font-black" style={{ color: THEME.green, textShadow: `0 0 24px ${THEME.green}55` }}>
                {vm.hud.threatPercentage}%
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: THEME.muted }}>
                Threat
              </div>
              <div className="mt-2 text-xl font-black" style={{ color: vm.hud.threatPercentage > 30 ? THEME.amber : THEME.green }}>
                {threatLabel(vm.hud.threatPercentage)}
              </div>
            </div>
            <div className="mt-6 border-t pt-4 text-center" style={{ borderColor: THEME.line }}>
              <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: THEME.muted }}>
                Decision Velocity
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {vm.hud.decisionVelocity.toFixed(1)}
                <span className="ml-1 text-base font-semibold" style={{ color: THEME.muted }}>
                  /min
                </span>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 z-10" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleWheel} style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
            <motion.div animate={{ scale, x: pan.x, y: pan.y }} transition={{ type: 'spring', stiffness: 160, damping: 24 }} className="absolute left-1/2 top-[52%] h-[620px] w-[640px] -translate-x-1/2 -translate-y-1/2">
              <div className="absolute inset-[36px] rounded-full" style={{ background: 'radial-gradient(circle at 35% 32%, rgba(255,255,255,0.24), rgba(255,255,255,0.02) 28%, rgba(20,27,40,0.06) 31%), radial-gradient(circle at 50% 45%, rgba(255,255,255,0.08), rgba(2,6,23,0.82) 68%), radial-gradient(circle at 50% 50%, rgba(36,64,96,0.45), rgba(5,8,14,1) 74%)', boxShadow: `0 0 0 1px rgba(164, 201, 255, 0.12), 0 0 80px ${THEME.blueGlow}, inset 0 -24px 80px rgba(0, 0, 0, 0.6)` }} />
              <div className="absolute inset-[18px] rounded-full border" style={{ borderColor: 'rgba(109, 163, 255, 0.16)', boxShadow: `0 0 55px ${THEME.blueGlow}` }} />
              {showHeat && <div className="absolute inset-[58px] rounded-full opacity-55" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,207,106,0.22), transparent 24%), radial-gradient(circle at 62% 24%, rgba(255,134,107,0.22), transparent 20%), radial-gradient(circle at 46% 72%, rgba(124,255,138,0.2), transparent 26%)' }} />}
              {showArcs && (
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 620">
                  {vm.flows.map((flow) => {
                    if (!flow.from || !flow.to) return null
                    const from = projectNode(flow.from, rotation)
                    const to = projectNode(flow.to, rotation)
                    const midX = (from.x + to.x) / 2
                    const midY = Math.min(from.y, to.y) - 90
                    const color = flow.mode === 'blocked' ? THEME.red : THEME.green
                    return <path key={flow.id} d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`} fill="none" stroke={color} strokeOpacity={0.9} strokeWidth={flow.mode === 'blocked' ? 2 : 2.4} strokeDasharray={flow.mode === 'blocked' ? '4 8' : undefined} style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
                  })}
                </svg>
              )}
              {showNodes &&
                projectedRegions.map(({ region, point }) => {
                  const tone = regionTone(region.state)
                  const selected = vm.selectedFrameId === region.frameId
                  return (
                    <button key={region.id} type="button" onClick={() => setSelectedFrameId(region.frameId)} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: point.x, top: point.y, opacity: point.depth < -0.15 ? 0.18 : 1 }}>
                      {showRadar && <span className="absolute inset-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ border: `1px solid ${tone}88`, boxShadow: `0 0 30px ${tone}33`, animation: 'pulse-glow 2.8s ease-in-out infinite' }} />}
                      <span className="absolute inset-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: tone, boxShadow: `0 0 18px ${tone}, 0 0 34px ${tone}66`, transform: selected ? 'translate(-50%, -50%) scale(1.3)' : 'translate(-50%, -50%) scale(1)' }} />
                    </button>
                  )
                })}
            </motion.div>
          </div>

          <div className="absolute bottom-6 left-6 z-20 rounded-2xl px-4 py-3" style={glassStyle()}>
            <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: THEME.muted }}>Latest decision</div>
            <div className="mt-1 text-sm font-semibold text-white">{latestFrame ? `${latestFrame.decisionFrameId.slice(0, 18)}...` : 'Awaiting frame'}</div>
          </div>

          <div className="absolute bottom-6 left-1/2 z-20 w-[360px] -translate-x-1/2 rounded-[26px] px-4 py-4" style={glassStyle()}>
            <div className="text-center text-[11px] uppercase tracking-[0.32em]" style={{ color: THEME.muted }}>Layer Controls</div>
            <div className="mt-3 flex justify-center gap-2">
              <ControlButton active={showArcs} onClick={() => setShowArcs((value) => !value)}>ARCS</ControlButton>
              <ControlButton active={showNodes} onClick={() => setShowNodes((value) => !value)}>NODES</ControlButton>
              <ControlButton active={showRadar} onClick={() => setShowRadar((value) => !value)}>RADAR</ControlButton>
              <ControlButton active={showHeat} onClick={() => setShowHeat((value) => !value)}>HEAT</ControlButton>
            </div>
          </div>

          <div className="absolute bottom-[132px] right-6 z-20 flex flex-col gap-3">
            <button type="button" onClick={() => setZoomLevel((value) => Math.min(3, value + 1))} className="rounded-full p-3" style={glassStyle()}><Plus className="h-5 w-5" /></button>
            <button type="button" onClick={() => setZoomLevel((value) => Math.max(1, value - 1))} className="rounded-full p-3" style={glassStyle()}><Minus className="h-5 w-5" /></button>
            <button type="button" onClick={() => setChatOpen((value) => !value)} className="relative rounded-full p-3" style={glassStyle()}>
              <MessageSquare className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: THEME.amber, color: '#1f2937' }}>{vm.alarms.length}</span>
            </button>
          </div>
        </main>
        {!globeOnly && rightCollapsed && (
          <button type="button" onClick={() => setRightCollapsed(false)} className="mt-[160px] h-14 rounded-full border px-3" style={glassStyle({ width: 46 })}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {!globeOnly && !rightCollapsed && (
          <aside className="w-[360px] shrink-0 rounded-[26px] p-4" style={glassStyle()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: THEME.muted }}>Decision Panel</div>
                <div className="text-lg font-semibold text-white">Binding authorization</div>
              </div>
              <button type="button" onClick={() => setRightCollapsed(true)} className="rounded-full border p-1.5" style={{ borderColor: THEME.border }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {selectedFrame ? (
              <div className="space-y-4">
                <div className="rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: THEME.muted }}>{selectedFrame.frame.selectedRegion}</div>
                      <div className="mt-2 text-xl font-black text-white">{selectedFrame.frame.reasonCode}</div>
                    </div>
                    <div className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ background: 'rgba(88,199,255,0.12)', color: '#e6f6ff', border: `1px solid ${THEME.border}` }}>
                      {ACTION_META[selectedFrame.frame.action as keyof typeof ACTION_META]?.label ?? selectedFrame.frame.action}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: THEME.muted }}>Total latency</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedFrame.frame.latencyTotalMs ?? '--'}ms</div>
                    </div>
                    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: THEME.muted }}>Compute</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedFrame.frame.latencyComputeMs ?? '--'}ms</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span style={{ color: THEME.muted }}>Proof hash</span><span className="font-mono text-xs text-white">{(selectedFrame.frame.proofHash ?? 'unavailable').slice(0, 18)}...</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: THEME.muted }}>Signal mode</span><span className="text-white">{selectedFrame.frame.signalMode ?? 'unknown'}</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: THEME.muted }}>Accounting</span><span className="text-white">{selectedFrame.frame.accountingMethod ?? 'unknown'}</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: THEME.muted }}>Water authority</span><span className="text-white">{selectedFrame.frame.waterAuthorityMode ?? 'unknown'}</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: THEME.muted }}>Replay</span><span className="text-white">{selectedFrame.replay?.deterministicMatch ? 'verified' : selectedFrame.replay ? 'mismatch' : 'pending'}</span></div>
                  </div>
                </div>
                <div className="rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                  <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: THEME.muted }}>Decision stream</div>
                  <div className="mt-3 space-y-2">
                    {vm.frames.slice(0, 5).map((frame) => {
                      const tone = frame.action === 'deny' ? THEME.red : frame.action === 'delay' ? THEME.amber : THEME.green
                      return (
                        <button key={frame.decisionFrameId} type="button" onClick={() => setSelectedFrameId(frame.decisionFrameId)} className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left" style={{ background: frame.decisionFrameId === selectedFrame.frame.decisionFrameId ? 'rgba(88,199,255,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${frame.decisionFrameId === selectedFrame.frame.decisionFrameId ? 'rgba(88,199,255,0.35)' : THEME.border}` }}>
                          <div>
                            <div className="text-sm font-semibold text-white">{frame.reasonCode}</div>
                            <div className="text-[11px]" style={{ color: THEME.muted }}>{frame.selectedRegion}</div>
                          </div>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: tone }}>{frame.action.replace('_', ' ')}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {isFreeview && (
                  <div className="rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                    <div className="flex items-start gap-3">
                      <Lock className="mt-1 h-5 w-5 text-cyan-300" />
                      <div>
                        <div className="text-sm font-semibold text-white">Freeview lock</div>
                        <div className="mt-2 text-sm leading-6" style={{ color: THEME.muted }}>Operator detail is visible as a proof surface, but deeper governance and Elite controls stay gated.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[24px] p-4 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, color: THEME.muted }}>No decision selected yet.</div>
            )}
          </aside>
        )}
      </div>

      <AnimatePresence>
        {alarmOpen && (
          <motion.aside initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} className="fixed right-4 top-24 z-40 w-[360px] rounded-[28px] p-4">
            <Drawer title={`${vm.alarms.length} live alarms`} subtitle="Alarm Queue" onClose={() => setAlarmOpen(false)} className="">
              <div className="space-y-3">
                {vm.alarms.map((alarm) => (
                  <div key={alarm.id} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{alarm.title}</div>
                      <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ background: alarm.severity === 'critical' ? 'rgba(255,134,107,0.14)' : alarm.severity === 'warning' ? 'rgba(255,211,92,0.14)' : 'rgba(88,199,255,0.14)', color: alarm.severity === 'critical' ? THEME.red : alarm.severity === 'warning' ? THEME.amber : THEME.blue }}>{alarm.severity}</span>
                    </div>
                    <div className="mt-2 text-sm leading-6" style={{ color: THEME.muted }}>{alarm.detail}</div>
                  </div>
                ))}
              </div>
            </Drawer>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {manualOpen && (
          <motion.aside initial={{ x: 540, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 540, opacity: 0 }} className="fixed right-4 top-24 z-40 h-[calc(100vh-120px)] w-[520px] overflow-hidden rounded-[30px]">
      <Drawer title="HaloGrid control guide" subtitle="Operator Manual" onClose={() => setManualOpen(false)} className="h-full overflow-hidden">
              <div className="h-[calc(100%-24px)] overflow-y-auto">
                <div className="space-y-6">
                  {HALOGRID_MANUAL_SECTIONS.map((section) => (
                    <section key={section.id} className="rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                      <div className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#cdeeff' }}>{section.title}</div>
                      <div className="mt-3 space-y-3 text-sm leading-7" style={{ color: '#dbeafe' }}>
                        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      </div>
                      {section.bullets && (
                        <ul className="mt-3 space-y-2 text-sm leading-6" style={{ color: THEME.muted }}>
                          {section.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><span style={{ color: THEME.blue }}>•</span><span>{bullet}</span></li>)}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            </Drawer>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen && (
          <motion.aside initial={{ y: 360, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 360, opacity: 0 }} className="fixed bottom-6 right-6 z-40 w-[360px] rounded-[28px] p-4">
            <Drawer title="Elite communications shell" subtitle="Team Chat" onClose={() => setChatOpen(false)} className="">
              <div className="rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-1 h-5 w-5 text-cyan-300" />
                  <div>
                    <div className="text-sm font-semibold text-white">Not configured</div>
      <div className="mt-2 text-sm leading-6" style={{ color: THEME.muted }}>The recovered HaloGrid shell keeps the comms surface visible, but this repo has no live chat backend configured, so messages are not simulated.</div>
                  </div>
                </div>
              </div>
            </Drawer>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {policyOpen && (
          <motion.aside initial={{ x: -420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -420, opacity: 0 }} className="fixed left-4 top-24 z-40 w-[360px] rounded-[28px] p-4">
            <Drawer title="Read-only doctrine posture" subtitle="Policy Tuner" onClose={() => setPolicyOpen(false)} className="">
              {[
                ['Carbon', governanceWeights?.carbon],
                ['Water', governanceWeights?.water],
                ['Latency', governanceWeights?.latency],
                ['Cost', governanceWeights?.cost],
              ].map(([label, value]) => (
                <div key={label} className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-sm"><span style={{ color: THEME.muted }}>{label}</span><span className="text-white">{value == null ? '--' : value}</span></div>
                  <div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${Math.max(4, Number(value ?? 0) * 100)}%`, background: 'linear-gradient(90deg, #58c7ff, #9ce3ff)' }} /></div>
                </div>
              ))}
            </Drawer>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {welcomeOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6" onClick={() => setWelcomeOpen(false)}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(event) => event.stopPropagation()} className="max-w-xl rounded-[32px] p-6" style={glassStyle()}>
              <div className="flex items-start justify-between gap-4">
                <div>
      <div className="text-[12px] uppercase tracking-[0.28em]" style={{ color: '#cfeeff' }}>HaloGrid restored</div>
                  <h1 className="mt-2 text-3xl font-black text-white">Recovered command-center shell</h1>
                </div>
                <button type="button" onClick={() => setWelcomeOpen(false)} className="rounded-full border p-1.5" style={{ borderColor: THEME.border }}><X className="h-4 w-4" /></button>
              </div>
      <p className="mt-4 text-sm leading-7" style={{ color: '#dbeafe' }}>This console keeps the recovered HaloGrid look while reading the live command-center routes underneath it. Drag the globe, scroll to zoom, click a region to freeze the decision, and use the top rail for Globe Mode, alarms, and the Elite manual.</p>
              <div className="mt-5 flex flex-wrap gap-3">
      <ControlButton active onClick={() => setWelcomeOpen(false)}>ENTER CO2 GRID</ControlButton>
                <ControlButton onClick={() => { setWelcomeOpen(false); setManualOpen(true) }} disabled={!isElite}>
                  <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />OPEN MANUAL</span>
                </ControlButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
