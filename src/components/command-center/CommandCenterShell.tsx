'use client'

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCommandCenterSnapshot, useDecisionTrace } from '@/lib/hooks/control-surface';
import type {
  WorldRegionState,
  WorldRoutingFlow,
  CommandCenterDecisionItem,
  CommandCenterSnapshot,
} from '@/types/control-surface';

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HOLOGRID CONTROL PLANE v10 — GOLD STANDARD PRODUCTION BUILD           ║
 * ║  120Hz Physics | Executive Thermal Armor | Instant Clarity Engine       ║
 * ║  Every pixel has a purpose. Every animation encodes meaning.            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 *  UPGRADE MANIFEST (v9 → v10):
 *  ─────────────────────────────────────────────────────────────────────────
 *  [FIX] Hook wiring — useHallOGridSnapshot/Frame → useCommandCenterSnapshot/useDecisionTrace
 *  [FIX] willChange overuse — removed from feed cards, scoped to globe only
 *  [FIX] React.createElement pattern → clean JSX with single adaptive Plate
 *  [FIX] Globe nodes.find() per flow → pre-projected Map<region, point>
 *  [FIX] Missing aria-hidden on decorative SVG
 *  [+]  Error Boundary — graceful render failure recovery
 *  [+]  Reduced Motion Guard — respects prefers-reduced-motion globally
 *  [+]  Live UTC Clock — mission-critical time reference in header
 *  [+]  System Vitals Strip — SAIQ/trace/replay/latency at a glance
 *  [+]  Region Health Sidebar — persistent status indicators above feed
 *  [+]  Flow Status Legend — color meaning never ambiguous
 *  [+]  Signal Intelligence Plate — signalMode/accounting/waterAuthority
 *  [+]  SAIQ Governance Detail Plate — weights/thresholds/enforcement
 *  [+]  System Health Plate — service status/proof posture/provider health
 *  [+]  Aggregate Dashboard Empty State — summary stats when nothing selected
 *  [+]  Keyboard Navigation — ArrowUp/Down/Escape for feed traversal
 *  [+]  Feed card timestamps, signal mode chips, system state indicators
 *  [+]  Thermal micro-bars on feed cards for instant quality reads
 *  [~]  Zero names changed. Zero shapes changed. Zero features removed.
 */

// ─── STRICT PREMIUM PALETTE ───
const C = {
  allow: "#00d65f",
  deny: "#e60023",
  reroute: "#f5a623",
  gold: "#FFD700",
  bg0: "#020305",
  bg1: "#07090f",
  glass: "rgba(10, 12, 18, 0.4)",
  glassActive: "rgba(18, 22, 32, 0.65)",
  border: "rgba(255,255,255,0.06)",
  t0: "#ffffff",
  t1: "#c4c9d4",
  t2: "#757c91",
  t3: "#41485c",
  accent: "#0ea5e9",
  g: (c: string, o = 0.3) => {
    if (!c) return `rgba(255,255,255,${o})`;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${o})`;
  },
};

const actionColor = (a: string) => {
  if (a === 'run_now') return C.allow;
  if (a === 'deny' || a === 'throttle') return C.deny;
  if (a === 'reroute' || a === 'delay') return C.reroute;
  return C.accent;
};

const stateColor = (s: string) =>
  s === 'active' ? C.allow : s === 'blocked' ? C.deny : C.reroute;

// ─── ERROR BOUNDARY ───
// Purpose: If any child throws during render, show a diagnostic
// instead of a white screen. Mission-critical — cannot go blank.
interface ErrorBoundaryProps { fallback: ReactNode; children: ReactNode }
interface ErrorBoundaryState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[HoloGrid] Render failure:', error, info);
    }
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── REDUCED MOTION GUARD ───
// Respects OS/browser prefers-reduced-motion. When active, all CSS
// animations become "none" and framer-motion transitions use duration: 0.
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ─── LIVE UTC CLOCK ───
// Control planes need a universal time reference. All operators see same clock.
function useLiveClock(): string {
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── OFF-THREAD CANONICAL GLOBE (GPU Protected) ───
const CanonicalGlobe = React.memo(function CanonicalGlobe({
  nodes,
  flows,
  isPro,
  reducedMotion,
}: {
  nodes: WorldRegionState[];
  flows: WorldRoutingFlow[];
  isPro: boolean;
  reducedMotion: boolean;
}) {
  const GLOBE_R = 180;
  const GLOBE_CX = 200;
  const GLOBE_CY = 200;

  const project = useCallback((node: WorldRegionState) => {
    const lon = (node.x / 100) * 360 - 180;
    const lat = 90 - (node.y / 100) * 180;
    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180;
    return {
      x: GLOBE_CX + GLOBE_R * Math.cos(phi) * Math.sin(lambda),
      y: GLOBE_CY - GLOBE_R * Math.sin(phi),
    };
  }, []);

  // Pre-project all nodes once per render — avoids repeated trig in map loops
  const projected = useMemo(
    () => {
      const map = new Map<string, { x: number; y: number }>();
      for (const n of nodes) map.set(n.region, project(n));
      return map;
    },
    [nodes, project]
  );

  // EXECUTIVE SHIELD: Cap heavy comet animations to prevent GPU thermal throttling
  const safeFlows = flows.slice(0, 50);
  let activeCometCount = 0;
  const cometBudget = reducedMotion ? 0 : 15;

  return (
    <div
      style={{
        position: "absolute",
        right: "-10%",
        top: "10%",
        zIndex: 0,
        opacity: 0.8,
        pointerEvents: "none",
        perspective: "1000px",
        contain: "layout style paint",
      }}
    >
      <div
        style={{
          width: 800,
          height: 800,
          transformStyle: "preserve-3d",
          animation: reducedMotion ? "none" : "slowSpin 120s linear infinite",
          willChange: reducedMotion ? "auto" : "transform",
        }}
      >
        <svg
          viewBox="0 0 400 400"
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            filter: isPro && !reducedMotion
              ? `drop-shadow(0 0 80px ${C.g(C.accent, 0.15)})`
              : 'none',
          }}
        >
          <defs>
            <radialGradient id="globeGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={C.g(C.accent, isPro ? 0.08 : 0.04)} />
              <stop offset="100%" stopColor={C.bg0} />
            </radialGradient>
          </defs>
          <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} fill="url(#globeGrad)" stroke={C.g(C.accent, 0.2)} strokeWidth="1" />

          {/* Canonical Routes & Comets */}
          {safeFlows.map((flow) => {
            const pa = projected.get(flow.fromRegion);
            const pb = projected.get(flow.toRegion);
            if (!pa || !pb) return null;

            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2 - 40;
            const pathD = `M${pa.x},${pa.y} Q${mx},${my} ${pb.x},${pb.y}`;

            if (flow.mode === "blocked") {
              return (
                <path
                  key={flow.id}
                  d={pathD}
                  fill="none"
                  stroke={C.deny}
                  strokeWidth="1.5"
                  strokeDasharray={isPro ? "4 6" : "2 2"}
                  opacity={0.6}
                />
              );
            }

            const renderComet = isPro && activeCometCount < cometBudget;
            if (renderComet) activeCometCount++;

            return (
              <g key={flow.id}>
                <path d={pathD} fill="none" stroke={C.g(C.accent, 0.15)} strokeWidth="2" />
                {renderComet && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={C.accent}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="15 300"
                    style={{ animation: "flowComet 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}
                  />
                )}
              </g>
            );
          })}

          {/* Canonical Nodes */}
          {nodes.map(node => {
            const p = projected.get(node.region);
            if (!p) return null;
            const isFatal = node.state === "blocked";
            const col = isFatal ? C.deny : node.state === "active" ? C.allow : C.reroute;
            const pulseClass = isFatal ? "svgFlicker" : node.state === "active" ? "svgPulseFast" : "svgPulseSlow";

            return (
              <g key={node.region}>
                {isPro && node.state === "marginal" && !reducedMotion && (
                  <circle
                    cx={p.x} cy={p.y} r={18}
                    fill="none" stroke={C.accent} strokeWidth={1} strokeDasharray="2 4"
                    style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: "dashSpin 4s linear infinite" }}
                  />
                )}
                {isPro ? (
                  <circle
                    cx={p.x} cy={p.y} r={6} fill={col}
                    style={{ animation: reducedMotion ? "none" : `${pulseClass} 2s infinite` }}
                  />
                ) : (
                  <circle cx={p.x} cy={p.y} r={6} fill={col} opacity={0.8} />
                )}
                <circle cx={p.x} cy={p.y} r={4} fill={col} stroke={C.bg0} strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});

// ─── ADAPTIVE Z-SPACE PLATE ───
// Unified plate component — adapts to pro/public mode via isPro prop.
// Pro: spring-physics entrance, glass morphism, depth shadow.
// Public: flat, instant, minimal.
function Plate({
  title,
  children,
  delay,
  isPro,
  reducedMotion,
}: {
  title: string;
  children: ReactNode;
  delay: number;
  isPro: boolean;
  reducedMotion: boolean;
}) {
  if (!isPro) {
    return (
      <div
        style={{
          background: C.g(C.bg1, 0.8),
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--m)",
            fontSize: 10,
            color: C.t3,
            letterSpacing: "0.1em",
            marginBottom: 12,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 3, height: 10, borderRadius: 1, background: C.accent, opacity: 0.4 }} />
          {title}
        </div>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 60, z: -200 }}
      animate={{ opacity: 1, x: 0, z: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 40, z: -100 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 500, damping: 40, mass: 0.8, delay }
      }
      style={{
        background: `linear-gradient(135deg, ${C.glassActive} 0%, ${C.glass} 100%)`,
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        border: `1px solid ${C.border}`,
        borderTop: `1px solid rgba(255,255,255,0.18)`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 16,
        boxShadow: `0 30px 60px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          fontFamily: "var(--m)",
          fontSize: 9,
          color: C.t2,
          letterSpacing: "0.15em",
          marginBottom: 14,
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ width: 3, height: 10, borderRadius: 1, background: C.accent, opacity: 0.6 }} />
        {title}
      </div>
      {children}
    </motion.div>
  );
}

// ─── DATA ROW ───
function Row({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: `1px solid ${C.g("#fff", 0.03)}`,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: C.t3,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontFamily: "var(--m)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: highlight ? 14 : 12,
          color: color || C.t1,
          fontFamily: "var(--m)",
          fontWeight: highlight ? 700 : 500,
          fontVariantNumeric: "tabular-nums",
          textShadow: highlight && color ? `0 0 16px ${C.g(color, 0.6)}` : "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── STATUS DOT ───
function StatusDot({ color, size = 6, pulse = false }: { color: string; size?: number; pulse?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: pulse ? `0 0 12px ${C.g(color, 0.6)}` : `0 0 6px ${C.g(color, 0.3)}`,
        flexShrink: 0,
      }}
    />
  );
}

// ─── THERMAL MICRO-BAR ───
// Purpose: Visual quality indicator on feed cards. Shows system state
// intensity at a glance without clicking into the detail view.
function ThermalBar({ state }: { state: string }) {
  const color = stateColor(state);
  const width = state === 'active' ? 100 : state === 'marginal' ? 60 : 25;
  return (
    <div
      style={{
        width: "100%",
        height: 3,
        background: C.g("#fff", 0.06),
        borderRadius: 2,
        marginTop: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${C.g(color, 0.4)}, ${color})`,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

// ─── VITALS CELL ───
function VitalCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ textAlign: "center", minWidth: 56 }}>
      <div
        style={{
          fontFamily: "var(--m)",
          fontSize: 13,
          fontWeight: 700,
          color: color || C.t0,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--m)",
          fontSize: 7,
          color: C.t3,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── FLOW STATUS LEGEND ───
function FlowLegend() {
  const items = [
    { color: C.allow, label: "ACTIVE" },
    { color: C.reroute, label: "MARGINAL" },
    { color: C.deny, label: "BLOCKED" },
    { color: C.accent, label: "MONITORING" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "10px 0 14px",
        borderBottom: `1px solid ${C.g("#fff", 0.04)}`,
        marginBottom: 14,
      }}
    >
      {items.map(item => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <StatusDot color={item.color} size={5} />
          <span style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t3, letterSpacing: "0.12em" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── REGION HEALTH SIDEBAR ───
// Purpose: Shows ALL region statuses without clicking into the globe.
function RegionHealthSidebar({ nodes }: { nodes: WorldRegionState[] }) {
  if (!nodes.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: "var(--m)",
          fontSize: 9,
          color: C.t3,
          letterSpacing: "0.15em",
          paddingBottom: 8,
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ width: 3, height: 10, borderRadius: 1, background: C.accent, opacity: 0.4 }} />
        REGION STATUS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {nodes.map(n => {
          const color = stateColor(n.state);
          return (
            <div
              key={n.region}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 9px",
                background: C.g(color, 0.06),
                border: `1px solid ${C.g(color, 0.12)}`,
                borderRadius: 7,
              }}
            >
              <StatusDot color={color} size={5} pulse={n.state === 'blocked'} />
              <div>
                <div style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t1, fontWeight: 500, lineHeight: 1.2 }}>
                  {n.region}
                </div>
                <div style={{ fontFamily: "var(--m)", fontSize: 7, color, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.2, marginTop: 1 }}>
                  {n.state}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AGGREGATE DASHBOARD (EMPTY STATE) ───
// Purpose: When no frame is selected, the inspector shows live system
// summary instead of dead space. Operator always has useful information.
function AggregateDashboard({
  snapshot,
  isPro,
  reducedMotion,
}: {
  snapshot: CommandCenterSnapshot;
  isPro: boolean;
  reducedMotion: boolean;
}) {
  const decisions = snapshot.decisionCore.recentDecisions;
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of decisions) {
      const key = d.action;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [decisions]);
  const total = decisions.length;

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
      style={{ maxWidth: 540 }}
    >
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: C.t0,
            letterSpacing: "-0.02em",
            textShadow: isPro ? `0 0 40px ${C.g(C.t0, 0.15)}` : "none",
          }}
        >
          System Overview
        </div>
        <div
          style={{
            fontFamily: "var(--m)",
            fontSize: 11,
            color: C.t2,
            marginTop: 6,
            letterSpacing: "0.1em",
          }}
        >
          {total} DECISIONS · {snapshot.world.nodes.length} REGIONS · {snapshot.world.flows.length} ROUTES
        </div>
      </div>

      {/* Decision Distribution */}
      {total > 0 && (
        <Plate title="Decision Distribution" delay={0.05} isPro={isPro} reducedMotion={reducedMotion}>
          {Object.entries(actionCounts).map(([action, count]) => {
            const pct = Math.round((count / total) * 100);
            const color = actionColor(action);
            return (
              <div key={action} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--m)", fontSize: 10, color, letterSpacing: "0.1em", fontWeight: 600 }}>
                    {action.toUpperCase().replace('_', ' ')}
                  </span>
                  <span style={{ fontFamily: "var(--m)", fontSize: 11, color: C.t1, fontVariantNumeric: "tabular-nums" }}>
                    {count}
                    <span style={{ color: C.t3, fontSize: 9, marginLeft: 4 }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ width: "100%", height: 4, background: C.g("#fff", 0.04), borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.g(color, 0.5)}, ${color})`, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </Plate>
      )}

      {/* System Posture */}
      <Plate title="System Posture" delay={0.1} isPro={isPro} reducedMotion={reducedMotion}>
        <Row label="System Status" value={snapshot.header.systemStatus.toUpperCase()} color={snapshot.header.systemActive ? C.allow : C.deny} highlight />
        <Row label="SAIQ Enforced" value={snapshot.header.saiqEnforced ? "YES" : snapshot.header.saiqEnforced === false ? "NO" : "PENDING"} color={snapshot.header.saiqEnforced ? C.allow : C.t2} />
        <Row label="Trace Locked" value={snapshot.header.traceLocked ? "LOCKED" : "UNLOCKED"} color={snapshot.header.traceLocked ? C.allow : C.reroute} />
        <Row label="Replay Verified" value={snapshot.header.replayVerified ? "VERIFIED" : "PENDING"} color={snapshot.header.replayVerified ? C.allow : C.t2} />
      </Plate>

      {/* SAIQ Governance */}
      {snapshot.governance.active && (
        <Plate title="SAIQ Governance" delay={0.15} isPro={isPro} reducedMotion={reducedMotion}>
          <Row label="Framework" value={snapshot.governance.frameworkLabel} />
          {snapshot.governance.selectedScore != null && (
            <Row
              label="Selected Score"
              value={snapshot.governance.selectedScore.toFixed(1)}
              color={snapshot.governance.selectedScore >= 70 ? C.allow : snapshot.governance.selectedScore >= 50 ? C.reroute : C.deny}
              highlight
            />
          )}
          {snapshot.governance.enforcementMode && (
            <Row label="Enforcement" value={snapshot.governance.enforcementMode.toUpperCase()} />
          )}
          <Row label="Constraints Applied" value={String(snapshot.governance.impact.constraintsApplied)} />
        </Plate>
      )}

      {/* Health */}
      <Plate title="Service Health" delay={0.2} isPro={isPro} reducedMotion={reducedMotion}>
        <Row label="Service Status" value={snapshot.health.service.status.toUpperCase()} color={snapshot.health.service.status === 'healthy' ? C.allow : C.reroute} />
        <Row label="Proof Posture" value={snapshot.health.service.proofPosture.slice(0, 40)} />
        {snapshot.health.latency.p95TotalMs != null && (
          <Row
            label="P95 Total Latency"
            value={`${snapshot.health.latency.p95TotalMs.toFixed(0)}ms`}
            color={snapshot.health.latency.withinBudget.total ? C.allow : C.deny}
          />
        )}
      </Plate>

      {/* Prompt */}
      <div
        style={{
          marginTop: 20,
          padding: "12px 16px",
          background: C.g(C.accent, 0.04),
          border: `1px solid ${C.g(C.accent, 0.1)}`,
          borderRadius: 10,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t2, letterSpacing: "0.12em" }}>
          SELECT A DECISION FRAME FOR DEEP INSPECTION
        </div>
        <div style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t3, marginTop: 3, letterSpacing: "0.08em" }}>
          ↑ ↓ NAVIGATE · ENTER SELECT · ESC DESELECT
        </div>
      </div>
    </motion.div>
  );
}

// ─── MASTER SHELL COMPONENT ───
export function CommandCenterShell() {
  // FIXED: Wire to actual exported hooks
  const snapshotQuery = useCommandCenterSnapshot();
  const snapshot = snapshotQuery.data;

  const [sel, setSel] = useState<string | null>(null);
  const [tier, setTier] = useState<'public' | 'pro'>('pro');
  const reducedMotion = useReducedMotion();
  const utcClock = useLiveClock();
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!snapshot || sel) return;
    const initial = snapshot.selectedDecisionFrameId ?? snapshot.decisionCore.recentDecisions[0]?.decisionFrameId ?? null;
    if (initial) setSel(initial);
  }, [sel, snapshot]);

  const isPrimary = Boolean(snapshot?.selectedDecisionFrameId && sel === snapshot.selectedDecisionFrameId);

  // FIXED: Wire to useDecisionTrace (actual exported hook)
  const detailQuery = useDecisionTrace(sel, { enabled: Boolean(sel) && !isPrimary, refetchInterval: false });

  const detail = isPrimary ? {
    trace: snapshot?.decisionCore.selectedTrace,
    replay: snapshot?.decisionCore.selectedReplay
  } : detailQuery.data ? { trace: detailQuery.data, replay: null } : null;

  const frame = useMemo(
    () => snapshot?.decisionCore.recentDecisions.find(f => f.decisionFrameId === sel) || null,
    [snapshot, sel]
  );

  const safeDecisions = useMemo(
    () => snapshot?.decisionCore.recentDecisions.slice(0, 100) ?? [],
    [snapshot]
  );

  const handleSelection = useCallback((id: string) => {
    setSel(prev => prev === id ? null : id);
  }, []);

  // ─── KEYBOARD NAVIGATION ───
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSel(null);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIdx = sel ? safeDecisions.findIndex(d => d.decisionFrameId === sel) : -1;
        let nextIdx: number;
        if (e.key === "ArrowDown") {
          nextIdx = currentIdx < safeDecisions.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : safeDecisions.length - 1;
        }
        if (safeDecisions[nextIdx]) {
          setSel(safeDecisions[nextIdx].decisionFrameId);
          const feed = feedRef.current;
          if (feed) {
            const cards = feed.querySelectorAll('[data-feed-card]');
            const target = cards[nextIdx] as HTMLElement | undefined;
            target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }
      }
    },
    [sel, safeDecisions],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (snapshotQuery.isLoading) {
    return (
      <div style={{ padding: 40, color: C.t1, fontFamily: "var(--m)", background: C.bg0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading Canonical Feed...
      </div>
    );
  }

  if (!snapshot || !snapshot.decisionCore) {
    return (
      <div style={{ padding: 40, color: C.deny, fontFamily: "var(--m)", background: C.bg0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>SYSTEM OFFLINE</div>
        <div style={{ fontSize: 12, color: C.t2 }}>Command center snapshot unavailable. Check engine connectivity.</div>
      </div>
    );
  }

  const isPro = tier === 'pro';

  // Compute aggregate vitals for header strip
  const activeNodes = snapshot.world.nodes.filter(n => n.state === 'active').length;
  const blockedNodes = snapshot.world.nodes.filter(n => n.state === 'blocked').length;
  const activeFlows = snapshot.world.flows.filter(f => f.mode === 'route').length;

  return (
    <ErrorBoundary
      fallback={
        <div style={{ background: C.bg0, color: C.deny, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>HOLOGRID RENDER FAILURE</div>
            <div style={{ color: C.t2 }}>Control plane encountered a critical error. Check console for diagnostics.</div>
          </div>
        </div>
      }
    >
      <div
        style={{
          background: C.bg0,
          color: C.t1,
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
          position: "relative",
          perspective: "1400px",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
          :root{--m:'JetBrains Mono',monospace}
          ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:${C.g("#fff", 0.08)};border-radius:2px}
          ::-webkit-scrollbar-thumb:hover{background:${C.g("#fff", 0.15)}}
          @keyframes slowSpin { to { transform: rotateZ(-360deg); } }
          @keyframes svgPulseFast { 0%, 100% { r: 5px; opacity: 0.6; } 50% { r: 9px; opacity: 1; } }
          @keyframes svgPulseSlow { 0%, 100% { r: 4px; opacity: 0.3; } 50% { r: 7px; opacity: 0.7; } }
          @keyframes svgFlicker { 0%, 100% { opacity: 1; } 15%, 45%, 75% { opacity: 0.1; } 30%, 60% { opacity: 0.9; } }
          @keyframes flowComet { to { stroke-dashoffset: -315; } }
          @keyframes dashSpin { to { transform: rotate(360deg); } }
          @keyframes goldShimmer { 0%, 100% { opacity: 0.8; box-shadow: 0 0 16px rgba(255, 215, 0, 0.15); } 50% { opacity: 1; box-shadow: 0 0 24px rgba(255, 215, 0, 0.4); } }
          @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.001ms !important;
              transition-duration: 0.001ms !important;
            }
          }
          *:focus-visible { outline: 1px solid ${C.accent}; outline-offset: 2px; }
        `}</style>

        {/* Deep Space Background Grid */}
        {isPro && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: `linear-gradient(to right, ${C.g("#fff", 0.015)} 1px, transparent 1px), linear-gradient(to bottom, ${C.g("#fff", 0.015)} 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
              maskImage: "radial-gradient(ellipse at center, black 10%, transparent 80%)",
            }}
          />
        )}

        {/* Ambient Scanline */}
        {isPro && !reducedMotion && (
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
            <div style={{ position: "absolute", width: "100%", height: 1, background: `linear-gradient(90deg, transparent, ${C.g(C.accent, 0.03)}, transparent)`, animation: "scanline 8s linear infinite" }} />
          </div>
        )}

        {/* Layer 0: Living Globe */}
        <CanonicalGlobe
          nodes={snapshot.world.nodes}
          flows={snapshot.world.flows}
          isPro={isPro}
          reducedMotion={reducedMotion}
        />

        {/* HUD Header Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: "12px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${C.border}`,
            background: isPro ? `linear-gradient(180deg, ${C.bg1}f0 0%, transparent 100%)` : C.bg1,
            backdropFilter: isPro ? "blur(20px)" : "none",
          }}
        >
          {/* Left: Brand + System Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: snapshot.header.systemActive ? C.allow : snapshot.header.systemActive === false ? C.deny : C.reroute,
                boxShadow: isPro ? `0 0 16px ${snapshot.header.systemActive ? C.allow : C.deny}` : "none",
              }}
            />
            <span style={{ fontFamily: "var(--m)", fontSize: 13, fontWeight: 700, color: C.t0, letterSpacing: "0.2em" }}>
              CO2 ROUTER
            </span>
            <span
              style={{
                fontFamily: "var(--m)",
                fontSize: 8,
                color: C.t3,
                letterSpacing: "0.1em",
                padding: "2px 7px",
                background: C.g(C.accent, 0.08),
                border: `1px solid ${C.g(C.accent, 0.15)}`,
                borderRadius: 4,
              }}
            >
              v10
            </span>
          </div>

          {/* Center: Vitals Strip */}
          {isPro && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "3px 16px",
                background: C.g(C.bg0, 0.5),
                border: `1px solid ${C.g("#fff", 0.04)}`,
                borderRadius: 8,
              }}
            >
              <VitalCell label="REGIONS" value={`${activeNodes}/${snapshot.world.nodes.length}`} color={blockedNodes > 0 ? C.reroute : C.allow} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="ROUTES" value={String(activeFlows)} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="SAIQ" value={snapshot.header.saiqEnforced ? "ON" : "OFF"} color={snapshot.header.saiqEnforced ? C.allow : C.t3} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="TRACE" value={snapshot.header.traceLocked ? "LOCKED" : "OPEN"} color={snapshot.header.traceLocked ? C.allow : C.reroute} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="REPLAY" value={snapshot.header.replayVerified ? "OK" : "PENDING"} color={snapshot.header.replayVerified ? C.allow : C.t3} />
            </div>
          )}

          {/* Right: Clock + Tier Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Live UTC Clock */}
            <div style={{ fontFamily: "var(--m)", fontSize: 12, color: C.t0, fontVariantNumeric: "tabular-nums", fontWeight: 500, letterSpacing: "0.08em" }}>
              {utcClock}
              <span style={{ fontSize: 8, color: C.t3, marginLeft: 4 }}>UTC</span>
            </div>

            {/* Tier Toggle */}
            <div
              style={{
                display: "flex",
                background: C.g("#000", 0.5),
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                overflow: "hidden",
                fontFamily: "var(--m)",
                fontSize: 10,
              }}
            >
              <button
                type="button"
                onPointerDown={() => setTier("public")}
                aria-pressed={!isPro}
                style={{
                  padding: "5px 14px",
                  background: !isPro ? C.t3 : "transparent",
                  color: !isPro ? C.t0 : C.t2,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                PUBLIC
              </button>
              <button
                type="button"
                onPointerDown={() => setTier("pro")}
                aria-pressed={isPro}
                style={{
                  padding: "5px 14px",
                  background: isPro ? C.accent : "transparent",
                  color: isPro ? C.bg0 : C.t2,
                  fontWeight: isPro ? 700 : 400,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                PRO
              </button>
            </div>
          </div>
        </div>

        {/* Structural Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(340px, 420px) minmax(600px, 1fr)",
            height: "100vh",
            paddingTop: 56,
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Layer 1: Canonical Feed */}
          <div
            ref={feedRef}
            style={{
              overflowY: "auto",
              padding: "20px 28px",
              borderRight: `1px solid ${C.border}`,
              background: isPro ? C.g(C.bg0, 0.4) : C.bg1,
              backdropFilter: isPro ? "blur(16px)" : "none",
            }}
          >
            {/* Region Health */}
            <RegionHealthSidebar nodes={snapshot.world.nodes} />

            {/* Feed Header + Legend */}
            <div
              style={{
                fontFamily: "var(--m)",
                fontSize: 9,
                color: C.t3,
                letterSpacing: "0.15em",
                paddingBottom: 6,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ width: 3, height: 10, borderRadius: 1, background: C.accent, opacity: 0.4 }} />
              LIVE DECISION STREAM
            </div>
            <FlowLegend />

            {/* Decision Cards */}
            {safeDecisions.map((f) => {
              const isSel = sel === f.decisionFrameId;
              const c = actionColor(f.action);

              const cardContent = (
                <>
                  {/* Top: Frame ID + Timestamp + Action Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "var(--m)", fontSize: 9, color: C.t2 }}>
                        {f.decisionFrameId.slice(0, 12)}...
                      </span>
                      <span style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t3, fontVariantNumeric: "tabular-nums" }}>
                        {new Date(f.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--m)",
                        fontSize: 9,
                        color: c,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        padding: "2px 8px",
                        background: C.g(c, 0.1),
                        border: `1px solid ${C.g(c, 0.2)}`,
                        borderRadius: 4,
                        textShadow: isSel ? `0 0 8px ${C.g(c, 0.5)}` : "none",
                      }}
                    >
                      {f.action.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  {/* Reason Code */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t0, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                    {f.reasonCode}
                  </div>

                  {/* Region + Latency + Signal Mode */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: C.t3 }}>
                      {f.selectedRegion} {f.latencyTotalMs ? `· ${f.latencyTotalMs}ms` : ""}
                    </span>
                    {f.signalMode && (
                      <span style={{ fontFamily: "var(--m)", fontSize: 8, color: f.signalMode === 'marginal' ? C.allow : f.signalMode === 'fallback' ? C.deny : C.t2, letterSpacing: "0.08em" }}>
                        {f.signalMode.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Thermal Micro-Bar */}
                  <ThermalBar state={f.systemState} />
                </>
              );

              if (isPro) {
                return (
                  <motion.button
                    key={f.decisionFrameId}
                    data-feed-card
                    type="button"
                    aria-pressed={isSel}
                    onPointerDown={() => handleSelection(f.decisionFrameId)}
                    animate={{
                      x: isSel ? 12 : 0,
                      scale: isSel ? 1.02 : 1,
                      opacity: sel && !isSel ? 0.35 : 1,
                    }}
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      outline: "none",
                      background: isSel ? `linear-gradient(135deg, ${C.g(c, 0.12)} 0%, ${C.glassActive} 100%)` : C.glass,
                      border: `1px solid ${isSel ? c : C.border}`,
                      borderLeft: `4px solid ${c}`,
                      borderRadius: 14,
                      padding: "14px 18px",
                      marginBottom: 12,
                      boxShadow: isSel ? `0 16px 32px ${C.g(c, 0.15)}` : "0 4px 12px rgba(0,0,0,0.5)",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {cardContent}
                  </motion.button>
                );
              }

              return (
                <button
                  key={f.decisionFrameId}
                  data-feed-card
                  type="button"
                  aria-pressed={isSel}
                  onPointerDown={() => handleSelection(f.decisionFrameId)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    outline: "none",
                    background: isSel ? C.g(c, 0.05) : C.g(C.bg1, 0.8),
                    border: `1px solid ${isSel ? c : C.border}`,
                    borderLeft: `4px solid ${c}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 12,
                    opacity: sel && !isSel ? 0.6 : 1,
                  }}
                >
                  {cardContent}
                </button>
              );
            })}
          </div>

          {/* Layer 2: Canonical Inspector */}
          <div
            style={{
              position: "relative",
              padding: "32px 52px",
              transformStyle: "preserve-3d",
              overflowY: "auto",
            }}
          >
            <AnimatePresence mode="wait">
              {sel && frame ? (
                <motion.div key={frame.decisionFrameId} style={{ maxWidth: 560 }}>
                  {/* Inspector Header */}
                  <motion.div
                    initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
                    style={{ marginBottom: 32 }}
                  >
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: C.t0,
                        letterSpacing: "-0.02em",
                        textShadow: isPro ? `0 0 40px ${C.g(C.t0, 0.2)}` : "none",
                        lineHeight: 1.2,
                      }}
                    >
                      {frame.reasonCode}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--m)",
                        fontSize: 11,
                        color: actionColor(frame.action),
                        marginTop: 8,
                        letterSpacing: "0.12em",
                        textShadow: isPro ? `0 0 12px ${C.g(actionColor(frame.action), 0.5)}` : "none",
                      }}
                    >
                      ROUTED TO {frame.selectedRegion.toUpperCase()}
                    </div>

                    {/* Meta Row */}
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: `1px solid ${C.g("#fff", 0.04)}`,
                      }}
                    >
                      {[
                        { label: "FRAME", value: frame.decisionFrameId.slice(0, 14) + "..." },
                        { label: "LATENCY", value: frame.latencyTotalMs ? `${frame.latencyTotalMs}ms` : "--" },
                        { label: "COMPUTE", value: frame.latencyComputeMs ? `${frame.latencyComputeMs}ms` : "--" },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontFamily: "var(--m)", fontSize: 7, color: C.t3, letterSpacing: "0.12em", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t1, fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Decision Core */}
                  <Plate title="Decision Core" delay={0.05} isPro={isPro} reducedMotion={reducedMotion}>
                    <Row label="Action Taken" value={frame.action.toUpperCase().replace('_', ' ')} color={actionColor(frame.action)} highlight={isPro} />
                    <Row label="Latency (Compute)" value={`${frame.latencyComputeMs ?? "--"}ms`} />
                    <Row label="Fallback State" value={frame.fallbackUsed ? "ACTIVE" : "NONE"} color={frame.fallbackUsed ? C.reroute : C.t1} />
                    <Row label="System State" value={frame.systemState.toUpperCase()} color={stateColor(frame.systemState)} highlight={isPro} />
                  </Plate>

                  {/* Signal Intelligence */}
                  <Plate title="Signal Intelligence" delay={0.08} isPro={isPro} reducedMotion={reducedMotion}>
                    <Row label="Signal Mode" value={(frame.signalMode ?? "unknown").toUpperCase()} color={frame.signalMode === 'marginal' ? C.allow : frame.signalMode === 'fallback' ? C.deny : C.accent} highlight={isPro} />
                    <Row label="Accounting Method" value={(frame.accountingMethod ?? "unknown").toUpperCase()} />
                    <Row label="Water Authority" value={(frame.waterAuthorityMode ?? "unknown").toUpperCase()} color={frame.waterAuthorityMode === 'basin' ? C.allow : frame.waterAuthorityMode === 'fallback' ? C.reroute : C.accent} />
                    {frame.governanceSource && (
                      <Row label="Governance Source" value={frame.governanceSource} />
                    )}
                  </Plate>

                  {/* SAIQ Governance */}
                  {snapshot.governance.active && (
                    <Plate title="SAIQ Governance" delay={0.1} isPro={isPro} reducedMotion={reducedMotion}>
                      <Row label="Framework" value={snapshot.governance.frameworkLabel} />
                      <Row
                        label="Carbon Impact"
                        value={`${snapshot.governance.impact.carbonReductionPct ?? 0}%`}
                        color={C.allow}
                        highlight={isPro}
                      />
                      <Row
                        label="Signal Confidence"
                        value={`${snapshot.governance.impact.signalConfidence ?? "--"}%`}
                      />
                      {snapshot.governance.impact.waterImpactDeltaLiters != null && (
                        <Row label="Water Impact" value={`${snapshot.governance.impact.waterImpactDeltaLiters.toFixed(2)} L`} color={C.accent} />
                      )}
                      <Row label="Constraints Applied" value={String(snapshot.governance.impact.constraintsApplied)} />
                      {snapshot.governance.enforcementMode && (
                        <Row label="Enforcement Mode" value={snapshot.governance.enforcementMode.toUpperCase()} />
                      )}
                      {snapshot.governance.strict != null && (
                        <Row label="Strict Mode" value={snapshot.governance.strict ? "ENFORCED" : "ADVISORY"} color={snapshot.governance.strict ? C.allow : C.reroute} />
                      )}
                    </Plate>
                  )}

                  {/* Cryptographic Provenance */}
                  <Plate title="Cryptographic Provenance" delay={0.15} isPro={isPro} reducedMotion={reducedMotion}>
                    <Row
                      label="Proof Hash"
                      value={frame.proofHash ? `${frame.proofHash.slice(0, 16)}...` : "UNAVAILABLE"}
                      color={frame.proofHash ? C.t2 : C.deny}
                    />
                    {frame.traceAvailable && (
                      <Row label="Trace Status" value="AVAILABLE" color={C.allow} />
                    )}

                    <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
                      {/* Gold Standard Sealed Ledger */}
                      <div
                        style={{
                          flex: 1,
                          padding: "12px",
                          textAlign: "center",
                          background: frame.proofHash ? C.g(C.gold, isPro ? 0.08 : 0.02) : C.g(C.t3, 0.1),
                          border: `1px solid ${frame.proofHash ? C.g(C.gold, isPro ? 0.3 : 0.1) : C.border}`,
                          borderRadius: 8,
                          animation: isPro && frame.proofHash && !reducedMotion ? "goldShimmer 3s ease-in-out infinite" : "none",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--m)",
                            fontSize: 10,
                            color: frame.proofHash ? C.gold : C.t3,
                            letterSpacing: "0.1em",
                            fontWeight: isPro ? 700 : 500,
                            textShadow: isPro && frame.proofHash ? `0 0 10px ${C.g(C.gold, 0.5)}` : "none",
                          }}
                        >
                          {frame.proofHash ? "◆ SEALED LEDGER" : "UNSEALED"}
                        </div>
                      </div>

                      {/* Replay Status */}
                      <div
                        style={{
                          flex: 1,
                          padding: "12px",
                          textAlign: "center",
                          background: snapshot.header.replayVerified ? C.g(C.allow, isPro ? 0.08 : 0.02) : C.g(C.t3, 0.1),
                          border: `1px solid ${snapshot.header.replayVerified ? C.g(C.allow, isPro ? 0.2 : 0.1) : C.border}`,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--m)",
                            fontSize: 10,
                            color: snapshot.header.replayVerified ? C.allow : C.t3,
                            letterSpacing: "0.1em",
                          }}
                        >
                          {snapshot.header.replayVerified ? "✓ REPLAY VERIFIED" : "PENDING"}
                        </div>
                      </div>
                    </div>

                    {/* Immutability notice */}
                    {frame.proofHash && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "8px 12px",
                          background: C.g(C.gold, 0.03),
                          borderRadius: 6,
                          textAlign: "center",
                        }}
                      >
                        <span style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t3, letterSpacing: "0.1em" }}>
                          IMMUTABLE RECORD · CRYPTOGRAPHICALLY SEALED · AUDIT-READY
                        </span>
                      </div>
                    )}
                  </Plate>

                  {/* System Health */}
                  <Plate title="System Health" delay={0.2} isPro={isPro} reducedMotion={reducedMotion}>
                    <Row label="Service Status" value={snapshot.health.service.status.toUpperCase()} color={snapshot.health.service.status === 'healthy' ? C.allow : C.reroute} highlight={isPro} />
                    {snapshot.health.latency.p95TotalMs != null && (
                      <Row
                        label="P95 Total Latency"
                        value={`${snapshot.health.latency.p95TotalMs.toFixed(0)}ms`}
                        color={snapshot.health.latency.withinBudget.total ? C.allow : C.deny}
                      />
                    )}
                    {snapshot.health.latency.p95ComputeMs != null && (
                      <Row label="P95 Compute" value={`${snapshot.health.latency.p95ComputeMs.toFixed(0)}ms`} />
                    )}
                    {snapshot.health.provenance.datasets.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t3, letterSpacing: "0.1em", marginBottom: 6 }}>DATASET PROVENANCE</div>
                        {snapshot.health.provenance.datasets.map(ds => {
                          const dsColor = ds.verificationStatus === 'verified' ? C.allow : ds.verificationStatus === 'unverified' ? C.reroute : C.deny;
                          return (
                            <div key={ds.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                              <span style={{ fontFamily: "var(--m)", fontSize: 9, color: C.t2 }}>{ds.name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <StatusDot color={dsColor} size={4} />
                                <span style={{ fontFamily: "var(--m)", fontSize: 8, color: dsColor, letterSpacing: "0.08em" }}>
                                  {ds.verificationStatus.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Plate>
                </motion.div>
              ) : (
                /* Aggregate Dashboard Empty State */
                <AggregateDashboard snapshot={snapshot} isPro={isPro} reducedMotion={reducedMotion} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
