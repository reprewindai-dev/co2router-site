'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Brain,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  Sun,
  Sunset,
} from 'lucide-react'

import { useCommandCenterSnapshot, useLiveSystemSnapshot, useSendTeamChatMessage, useTeamChat } from '@/lib/hooks/control-surface'
import type { TeamChatMessage, WorldRegionState } from '@/types/control-surface'

import AlarmQueuePanel from './AlarmQueuePanel'
import DetailCard from './DetailCard'
import FleetSummaryPanel from './FleetSummaryPanel'
import HaloGridHUD from './HaloGridHUD'
import InlineTeamChat from './InlineTeamChat'
import OperatorLocalAuth from './OperatorLocalAuth'
import SmartAdvisorPanel from './SmartAdvisorPanel'
import { THEMES, type ThemeMode } from './theme'

const Globe3D = dynamic(() => import('./Globe3D'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-sky-500 animate-pulse">
      Initializing WebGL Engine...
    </div>
  ),
})

type OperatorIdentity = {
  id: string
  name: string
  clearance: string
}

type ShellNode = {
  id: string
  name: string
  region: string
  lat: number
  lng: number
  status: 'Active' | 'Marginal' | 'Blocked'
  actionLabel: string
  baselineIntensity: number
  selectedIntensity: number
  proofRef: string
  frameId: string | null
}

type ShellFlow = {
  id: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  action: 'Run now' | 'Reroute' | 'Blocked'
}

const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'us-east-1': { lat: 39.0, lng: -77.0 },
  'us-west-1': { lat: 37.35, lng: -121.96 },
  'us-west-2': { lat: 45.52, lng: -122.68 },
  'eu-west-1': { lat: 53.35, lng: -6.26 },
  'eu-central-1': { lat: 50.11, lng: 8.68 },
  'ap-southeast-1': { lat: 1.35, lng: 103.82 },
  'ap-northeast-1': { lat: 35.68, lng: 139.69 },
}

function toLatLngFromPercent(x: number, y: number) {
  return {
    lat: (0.5 - y / 100) * 180,
    lng: x * 3.6 - 180,
  }
}

function normalizeStatus(state: WorldRegionState['state']): 'Active' | 'Marginal' | 'Blocked' {
  if (state === 'blocked') return 'Blocked'
  if (state === 'marginal') return 'Marginal'
  return 'Active'
}

function formatRegionLabel(value: string) {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function zoomIn(value: 1 | 2 | 3): 1 | 2 | 3 {
  if (value === 1) return 2
  if (value === 2) return 3
  return 3
}

function zoomOut(value: 1 | 2 | 3): 1 | 2 | 3 {
  if (value === 3) return 2
  if (value === 2) return 1
  return 1
}

export function HaloGridShell() {
  const [operator, setOperator] = useState<OperatorIdentity | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('night')
  const [ghostMode, setGhostMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1)
  const [isLeftPanelOpen, setLeftPanelOpen] = useState(false)
  const [isRightPanelOpen, setRightPanelOpen] = useState(false)
  const [isChatOpen, setChatOpen] = useState(false)
  const [isAdvisorOpen, setAdvisorOpen] = useState(false)
  const [isAlertsOpen, setAlertsOpen] = useState(false)
  const [showArcs, setShowArcs] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const [showRadar, setShowRadar] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const { data: liveData } = useLiveSystemSnapshot()
  const { data: snapshotData } = useCommandCenterSnapshot()
  const { data: chatData } = useTeamChat('co2-router-ops')
  const sendChatMessage = useSendTeamChatMessage()

  const theme = THEMES[themeMode]
  const workspaceMode = isLeftPanelOpen || isRightPanelOpen ? 'hybrid' : 'theater'

  const nodes = useMemo<ShellNode[]>(() => {
    const selectedDecision = snapshotData?.decisionCore.selectedDecision

    return (snapshotData?.world.nodes ?? []).map((node) => {
      const mapped = REGION_COORDS[node.region] ?? toLatLngFromPercent(node.x, node.y)
      const selectedIntensity = selectedDecision?.selectedRegion === node.region ? 310 : 310
      const baselineIntensity = 450
      return {
        id: node.region,
        name: node.label || formatRegionLabel(node.region),
        region: node.region,
        lat: mapped.lat,
        lng: mapped.lng,
        status: normalizeStatus(node.state),
        actionLabel: node.reasonCode ? node.reasonCode.replace(/_/g, ' ') : 'Awaiting selection',
        baselineIntensity,
        selectedIntensity,
        proofRef: node.decisionFrameId ?? 'frm-unavailable',
        frameId: node.decisionFrameId,
      }
    })
  }, [snapshotData])

  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.region, node])), [nodes])

  const flows = useMemo<ShellFlow[]>(
    () =>
      (snapshotData?.world.flows ?? [])
        .map((flow) => {
          const from = nodeLookup.get(flow.fromRegion)
          const to = nodeLookup.get(flow.toRegion)
          if (!from || !to) return null
          return {
            id: flow.id,
            startLat: from.lat,
            startLng: from.lng,
            endLat: to.lat,
            endLng: to.lng,
            action: flow.mode === 'blocked' ? 'Blocked' : 'Reroute',
          }
        })
        .filter((flow): flow is ShellFlow => Boolean(flow)),
    [nodeLookup, snapshotData],
  )

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null,
    [nodes, selectedNodeId],
  )

  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      setSelectedNodeId(nodes[0].id)
    }
  }, [nodes, selectedNodeId])

  const fleetMetrics = useMemo(
    () => ({
      carbonDiverted: liveData?.recentDecisions.available ? `${Math.max(0, nodes.length)} routes` : '--',
      waterPreserved: liveData?.providers.available ? `${Math.max(0, liveData.providers.datasets.length)} datasets` : '--',
      activeNodes: nodes.filter((node) => node.status === 'Active').length,
      degradedNodes: nodes.filter((node) => node.status !== 'Active').length,
    }),
    [liveData, nodes],
  )

  const teamMessages = (chatData?.messages ?? []) as TeamChatMessage[]
  const hud = useMemo(
    () => ({
      active: nodes.filter((node) => node.status === 'Active').length,
      marginal: nodes.filter((node) => node.status === 'Marginal').length,
      blocked: nodes.filter((node) => node.status === 'Blocked').length,
      threatPercentage:
        nodes.length > 0 ? Math.round((nodes.filter((node) => node.status === 'Blocked').length / nodes.length) * 100) : 0,
    }),
    [nodes],
  )

  if (!operator) {
    return <OperatorLocalAuth theme={theme} onAuthenticated={(identity) => setOperator(identity as OperatorIdentity)} />
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden font-sans transition-colors duration-700"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div className="absolute inset-0 z-[20]">
        <Globe3D
          mode={ghostMode ? 'presentation' : workspaceMode}
          zoomLevel={zoomLevel}
          theme={theme}
          nodes={nodes}
          flows={showArcs ? flows : []}
          showNodes={showNodes}
          showRadar={showRadar}
        />
      </div>

      <AnimatePresence>
        {!ghostMode ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
            <div className="absolute left-4 right-4 top-4 z-[10] flex items-start justify-between pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-3">
                <button
                  onClick={(event) => {
                    if (event.detail === 3) window.alert('POLICY TUNER: Active')
                    if (event.detail === 1) {
                      setGhostMode(true)
                      setLeftPanelOpen(false)
                      setRightPanelOpen(false)
                    }
                  }}
                  className="flex items-center gap-2 outline-none transition-opacity hover:opacity-80"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg"
                    style={{ borderColor: theme.primary }}
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-black drop-shadow-md">HalOGrid</div>
                    <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: theme.muted }}>
                      {operator.name}
                    </div>
                  </div>
                </button>
              </div>

              <div
                className="pointer-events-auto flex gap-2 rounded-full border p-1.5 shadow-lg backdrop-blur-md"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              >
                <button
                  onClick={() => setThemeMode('daylight')}
                  className={`rounded-full p-2 transition-colors ${themeMode === 'daylight' ? 'bg-black/10' : 'hover:bg-black/5'}`}
                  aria-label="Switch to daylight theme"
                >
                  <Sun size={14} color={themeMode === 'daylight' ? theme.primary : theme.muted} />
                </button>
                <button
                  onClick={() => setThemeMode('night')}
                  className={`rounded-full p-2 transition-colors ${themeMode === 'night' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  aria-label="Switch to night theme"
                >
                  <Moon size={14} color={themeMode === 'night' ? theme.primary : theme.muted} />
                </button>
                <button
                  onClick={() => setThemeMode('cayenne')}
                  className={`rounded-full p-2 transition-colors ${themeMode === 'cayenne' ? 'bg-orange-500/20' : 'hover:bg-orange-500/5'}`}
                  aria-label="Switch to cayenne theme"
                >
                  <Sunset size={14} color={themeMode === 'cayenne' ? theme.primary : theme.muted} />
                </button>
              </div>

              <div
                className="pointer-events-auto flex items-center gap-2 rounded border px-3 py-1.5 shadow-lg backdrop-blur-md"
                style={{
                  backgroundColor: `${theme.warning}10`,
                  borderColor: `${theme.warning}30`,
                  color: theme.warning,
                }}
              >
                <ShieldCheck size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">{operator.clearance}</span>
              </div>
            </div>

            <HaloGridHUD
              isVisible={!isLeftPanelOpen && !isRightPanelOpen}
              theme={theme}
              hud={hud}
              showArcs={showArcs}
              showNodes={showNodes}
              showRadar={showRadar}
              onToggleLayer={(layer) => {
                if (layer === 'arcs') setShowArcs((value) => !value)
                if (layer === 'nodes') setShowNodes((value) => !value)
                if (layer === 'radar') setShowRadar((value) => !value)
              }}
            />

            <div className="absolute left-4 top-20 z-[10] pointer-events-auto">
              <button
                onClick={() => setLeftPanelOpen((value) => !value)}
                className="rounded-lg border p-2.5 shadow-lg backdrop-blur-md transition-opacity hover:opacity-80"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                aria-label="Toggle left panel"
              >
                {isLeftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
            </div>

            <div className="absolute right-4 top-20 z-[10] flex flex-col gap-3 pointer-events-auto">
              <button
                onClick={() => setAlertsOpen((value) => !value)}
                className="rounded-lg border p-2.5 shadow-lg backdrop-blur-md transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: isAlertsOpen ? `${theme.primary}20` : theme.surface,
                  borderColor: isAlertsOpen ? theme.primary : theme.border,
                }}
                aria-label="Toggle alerts panel"
              >
                <Bell size={18} />
              </button>
              <button
                onClick={() => setAdvisorOpen((value) => !value)}
                className="rounded-lg border p-2.5 shadow-lg backdrop-blur-md transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: isAdvisorOpen ? `${theme.primary}20` : theme.surface,
                  borderColor: isAdvisorOpen ? theme.primary : theme.border,
                }}
                aria-label="Toggle advisor panel"
              >
                <Brain size={18} />
              </button>
              <button
                onClick={() => setRightPanelOpen((value) => !value)}
                className="rounded-lg border p-2.5 shadow-lg backdrop-blur-md transition-opacity hover:opacity-80"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                aria-label="Toggle right panel"
              >
                {isRightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>

            <div
              className="absolute bottom-24 right-4 z-[30] flex flex-col rounded-xl border shadow-lg backdrop-blur-md pointer-events-auto"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <button
                onClick={() => setZoomLevel((value) => zoomIn(value))}
                className="border-b p-3 transition-colors hover:bg-white/10"
                style={{ borderColor: theme.border }}
                aria-label="Zoom in globe"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel((value) => zoomOut(value))}
                className="border-t p-3 transition-colors hover:bg-white/10"
                style={{ borderColor: theme.border }}
                aria-label="Zoom out globe"
              >
                -
              </button>
            </div>

            <div className="absolute bottom-6 right-6 z-[40] pointer-events-auto">
              <InlineTeamChat
                isOpen={isChatOpen}
                toggleOpen={() => setChatOpen((value) => !value)}
                theme={theme}
                messages={teamMessages}
                operatorName={operator.name}
                sending={sendChatMessage.isPending}
                onSend={(body) =>
                  sendChatMessage.mutate({
                    teamId: 'co2-router-ops',
                    operatorId: operator.id,
                    operatorName: operator.name,
                    body,
                  })
                }
              />
            </div>

            <AlarmQueuePanel isOpen={isAlertsOpen} onClose={() => setAlertsOpen(false)} theme={theme} />
            <SmartAdvisorPanel isOpen={isAdvisorOpen} onClose={() => setAdvisorOpen(false)} theme={theme} />
            <FleetSummaryPanel isOpen={isLeftPanelOpen} theme={theme} metrics={fleetMetrics} />

            <AnimatePresence>
              {isRightPanelOpen ? (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute bottom-6 right-20 top-20 w-[calc(100vw-110px)] overflow-y-auto rounded-xl border p-5 shadow-2xl backdrop-blur-xl pointer-events-auto sm:w-[420px]"
                  style={{ zIndex: 70, backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  <DetailCard
                    node={
                      selectedNode
                        ? {
                            name: selectedNode.name,
                            baselineIntensity: selectedNode.baselineIntensity,
                            selectedIntensity: selectedNode.selectedIntensity,
                            actionLabel: selectedNode.actionLabel,
                            proofRef: selectedNode.proofRef,
                          }
                        : null
                    }
                    close={() => setRightPanelOpen(false)}
                    theme={theme}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {ghostMode ? (
        <div className="absolute inset-0 z-[100] cursor-pointer" onClick={() => setGhostMode(false)} />
      ) : null}
    </div>
  )
}

