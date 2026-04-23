'use client'

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useControlSurfaceSnapshot, useControlSurfaceFrame } from '@/lib/hooks/control-surface';
import type { WorldRegionState, WorldRoutingFlow, CommandCenterDecisionItem } from '@/types/control-surface';

/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HOLOGRID CONTROL PLANE v9 — PRODUCTION MASTER BUILD             ║
 * ║  120Hz Physics | Executive Thermal Armor | Gold Standard Ledger  ║
 * ╚══════════════════════════════════════════════════════════════════╝
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
  borderTop: "rgba(255,255,255,0.18)",
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

// ─── ERROR BOUNDARY ───
interface ErrorBoundaryProps { fallback: ReactNode; children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') console.error('[ControlSurface]', error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ─── REDUCED MOTION GUARD ───
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

// ─── OFF-THREAD CANONICAL GLOBE (GPU Protected) ───
const CanonicalGlobe = React.memo(function CanonicalGlobe({
  nodes,
  flows,
  isPro,
}: {
  nodes: WorldRegionState[];
  flows: WorldRoutingFlow[];
  isPro: boolean;
}) {
  const GLOBE_R = 180;
  const GLOBE_CX = 200;
  const GLOBE_CY = 200;
  const reducedMotion = useReducedMotion();

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

  const safeFlows = flows.slice(0, 50);
  let activeCometCount = 0;
  const cometBudget = reducedMotion ? 0 : 15;

  const projected = useMemo(
    () => Object.fromEntries(nodes.map(n => [n.region, project(n)])),
    [nodes, project]
  );

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
        contain: "layout style",
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
              : "none",
          }}
        >
          <defs>
            <radialGradient id="globeGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={C.g(C.accent, isPro ? 0.08 : 0.04)} />
              <stop offset="100%" stopColor={C.bg0} />
            </radialGradient>
            <linearGradient id="cometGrad" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={C.accent} stopOpacity="0" />
              <stop offset="60%" stopColor={C.accent} stopOpacity="1" />
              <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R}
            fill="url(#globeGrad)" stroke={C.g(C.accent, 0.2)} strokeWidth="1" />

          {safeFlows.map((flow) => {
            const pa = projected[flow.fromRegion];
            const pb = projected[flow.toRegion];
            if (!pa || !pb) return null;
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2 - 40;
            const pathD = `M${pa.x},${pa.y} Q${mx},${my} ${pb.x},${pb.y}`;
            if (flow.mode === "blocked") {
              return (
                <path key={flow.id} d={pathD} fill="none" stroke={C.deny}
                  strokeWidth="1.5" strokeDasharray={isPro ? "4 6" : "2 2"} opacity={0.6} />
              );
            }
            const renderComet = isPro && activeCometCount < cometBudget;
            if (renderComet) activeCometCount++;
            return (
              <g key={flow.id}>
                <path d={pathD} fill="none" stroke={C.g(C.accent, 0.15)} strokeWidth="2" />
                {renderComet && (
                  <path d={pathD} fill="none" stroke={C.accent} strokeWidth="3"
                    strokeLinecap="round" strokeDasharray="15 300" strokeDashoffset="0"
                    style={{ animation: "flowComet 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite" }} />
                )}
              </g>
            );
          })}

          {nodes.map((node) => {
            const p = projected[node.region];
            if (!p) return null;
            const isFatal = node.state === "blocked";
            const col = isFatal ? C.deny : node.state === "active" ? C.allow : C.reroute;
            const pulseClass = isFatal ? "svgFlicker" : node.state === "active" ? "svgPulseFast" : "svgPulseSlow";
            return (
              <g key={node.region}>
                {isPro && node.state === "marginal" && (
                  <circle cx={p.x} cy={p.y} r={18} fill="none" stroke={C.accent}
                    strokeWidth={1} strokeDasharray="2 4"
                    style={{
                      transformOrigin: `${p.x}px ${p.y}px`,
                      animation: reducedMotion ? "none" : "dashSpin 4s linear infinite",
                      willChange: reducedMotion ? "auto" : "transform",
                    }} />
                )}
                {isPro ? (
                  <circle cx={p.x} cy={p.y} r={6} fill={col}
                    style={{
                      animation: reducedMotion ? "none" : `${pulseClass} 2s infinite`,
                      willChange: reducedMotion ? "auto" : "r, opacity",
                    }} />
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

// ─── 120FPS HARDWARE Z-PLATES (PRO ONLY) ───
function ProPlate({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, z: -200 }}
      animate={{ opacity: 1, x: 0, z: 0 }}
      exit={{ opacity: 0, x: 40, z: -100 }}
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8, delay }}
      style={{
        background: `linear-gradient(135deg, ${C.glassActive} 0%, ${C.glass} 100%)`,
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        border: `1px solid ${C.border}`,
        borderTop: `1px solid ${C.borderTop}`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 16,
        boxShadow: `0 30px 60px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)`,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
        transform: "translateZ(0)",
        isolation: "isolate",
      }}
    >
      <div style={{ fontFamily: "var(--m)", fontSize: 9, color: C.t2, letterSpacing: "0.15em", marginBottom: 14, textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </motion.div>
  );
}

// ─── FLAT STANDARD PLATES (PUBLIC PREVIEW) ───
function PublicPlate({ title, children, delay: _delay }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ background: C.g(C.bg1, 0.8), border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t3, letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.g("#fff", 0.03)}` }}>
      <span style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{
        fontSize: highlight ? 14 : 12,
        color: color || C.t1,
        fontFamily: "var(--m)",
        fontWeight: highlight ? 700 : 500,
        fontVariantNumeric: "tabular-nums lining-nums",
        textShadow: highlight && color ? `0 0 16px ${C.g(color, 0.6)}` : "none",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── MASTER SHELL COMPONENT ───
export function CommandCenterShell() {
  const snapshotQuery = useControlSurfaceSnapshot();
  const snapshot = snapshotQuery.data;
  const reducedMotion = useReducedMotion();

  const [sel, setSel] = useState<string | null>(null);
  const [tier, setTier] = useState<"public" | "pro">("pro");

  useEffect(() => {
    if (!snapshot || sel) return;
    const initial =
      snapshot.selectedDecisionFrameId ??
      snapshot.decisionCore.recentDecisions[0]?.decisionFrameId ??
      null;
    if (initial) setSel(initial);
  }, [sel, snapshot]);

  const isPrimary = Boolean(
    snapshot?.selectedDecisionFrameId && sel === snapshot.selectedDecisionFrameId
  );
  const detailQuery = useControlSurfaceFrame(sel, {
    enabled: Boolean(sel) && !isPrimary,
    refetchInterval: false,
  });

  const detail = isPrimary
    ? {
        trace: snapshot?.decisionCore.selectedTrace,
        replay: snapshot?.decisionCore.selectedReplay,
      }
    : detailQuery.data;

  const frame = useMemo(
    () => snapshot?.decisionCore.recentDecisions.find((f) => f.decisionFrameId === sel) || null,
    [snapshot, sel]
  );

  const handleSelection = useCallback((id: string) => {
    setSel((prev) => (prev === id ? null : id));
  }, []);

  const handleKeyActivation = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelection(id);
      }
    },
    [handleSelection]
  );

  const safeDecisions = useMemo(
    () => snapshot?.decisionCore.recentDecisions.slice(0, 100) ?? [],
    [snapshot]
  );
  const deferredDecisions = useDeferredValue(safeDecisions);
  const isListStale = deferredDecisions !== safeDecisions;

  // ↑/↓ arrow-key navigation through the feed
  const handleFeedArrow = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      if (!safeDecisions.length) return;
      const idx = safeDecisions.findIndex((f) => f.decisionFrameId === sel);
      if (idx === -1) return;
      const nextIdx =
        e.key === "ArrowDown"
          ? Math.min(idx + 1, safeDecisions.length - 1)
          : Math.max(idx - 1, 0);
      const next = safeDecisions[nextIdx];
      if (next && next.decisionFrameId !== sel) {
        setSel(next.decisionFrameId);
        requestAnimationFrame(() => {
          document
            .getElementById(`card-${next.decisionFrameId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    },
    [sel, safeDecisions]
  );

  // Live color bridge between selected card and inspector panel
  const selectedColor = frame ? actionColor(frame.action) : null;

  if (snapshotQuery.isLoading) {
    return <div style={{ padding: 40, color: C.t1, fontFamily: "var(--m)" }}>Loading Canonical Feed...</div>;
  }
  if (!snapshot || !snapshot.decisionCore) {
    return <div style={{ padding: 40, color: C.deny, fontFamily: "var(--m)" }}>SYSTEM OFFLINE</div>;
  }

  const isPro = tier === "pro";

  return (
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
        contain: "layout",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        :root { --m: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

        @keyframes slowSpin { to { transform: rotateZ(-360deg); } }
        @keyframes svgPulseFast { 0%, 100% { r: 5px; opacity: 0.6; } 50% { r: 9px; opacity: 1; } }
        @keyframes svgPulseSlow { 0%, 100% { r: 4px; opacity: 0.3; } 50% { r: 7px; opacity: 0.7; } }
        @keyframes svgFlicker { 0%, 100% { opacity: 1; } 15%, 45%, 75% { opacity: 0.1; } 30%, 60% { opacity: 0.9; } }
        @keyframes flowComet {
          0%   { stroke-dashoffset: 0;    }
          100% { stroke-dashoffset: -315; }
        }
        @keyframes dashSpin { to { transform: rotate(360deg); } }
        @keyframes goldShimmer {
          0%, 100% { opacity: 0.8; box-shadow: 0 0 16px rgba(255, 215, 0, 0.15); }
          50%       { opacity: 1;   box-shadow: 0 0 28px rgba(255, 215, 0, 0.45); }
        }
        .feed-btn:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 3px; border-radius: 14px; }
        .feed-list-stale { opacity: 0.7; transition: opacity 0.15s; }
        .feed-list-live  { opacity: 1;   transition: opacity 0.15s; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {isPro && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(to right,  ${C.g("#fff", 0.015)} 1px, transparent 1px),
            linear-gradient(to bottom, ${C.g("#fff", 0.015)} 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          contain: "strict",
          pointerEvents: "none",
        }} />
      )}

      <ErrorBoundary fallback={<div style={{ position: "absolute", right: 0, top: "10%", width: 800, height: 800, pointerEvents: "none" }} />}>
        <CanonicalGlobe nodes={snapshot.world.nodes} flows={snapshot.world.flows} isPro={isPro} />
      </ErrorBoundary>

      {/* HUD Header */}
      <div role="banner" style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${C.border}`,
        background: isPro ? `linear-gradient(180deg, ${C.bg1}f0 0%, transparent 100%)` : C.bg1,
        backdropFilter: isPro ? "blur(20px)" : "none",
        isolation: "isolate",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div role="status" aria-label={snapshot.header.systemActive ? "System online" : "System offline"}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: snapshot.header.systemActive ? C.allow : C.deny,
              boxShadow: isPro ? `0 0 16px ${snapshot.header.systemActive ? C.allow : C.deny}` : "none",
              flexShrink: 0,
            }} />
          <span style={{ fontFamily: "var(--m)", fontSize: 13, fontWeight: 700, color: C.t0, letterSpacing: "0.2em" }}>
            CO2 ROUTER
          </span>
        </div>
        <div role="group" aria-label="Display tier" style={{
          display: "flex", background: C.g("#000", 0.5), borderRadius: 8,
          border: `1px solid ${C.border}`, overflow: "hidden", fontFamily: "var(--m)", fontSize: 10,
        }}>
          <button type="button" aria-pressed={!isPro}
            onPointerDown={() => setTier("public")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTier("public"); } }}
            style={{ padding: "6px 16px", background: !isPro ? C.t3 : "transparent", color: !isPro ? C.t0 : C.t2, border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            PUBLIC PREVIEW
          </button>
          <button type="button" aria-pressed={isPro}
            onPointerDown={() => setTier("pro")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTier("pro"); } }}
            style={{ padding: "6px 16px", background: isPro ? C.accent : "transparent", color: isPro ? C.bg0 : C.t2, fontWeight: isPro ? 700 : 400, border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            PRO LICENSE
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(340px, 420px) minmax(600px, 1fr)",
        height: "100vh",
        paddingTop: 60,
        position: "relative",
        zIndex: 10,
      }}>
        {/* Layer 1: Canonical Feed */}
        <div
          role="feed"
          aria-label="Live decision stream"
          aria-busy={isListStale}
          onKeyDown={handleFeedArrow}
          style={{
            overflowY: "auto",
            padding: "24px 32px",
            borderRight: selectedColor
              ? `1px solid ${C.g(selectedColor, 0.45)}`
              : `1px solid ${C.border}`,
            transition: "border-color 0.18s ease",
            background: isPro ? C.g(C.bg0, 0.4) : C.bg1,
            backdropFilter: isPro ? "blur(16px)" : "none",
            isolation: "isolate",
          }}
        >
          <div style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t3, letterSpacing: "0.15em", paddingBottom: 16 }}>
            LIVE DECISION STREAM
          </div>

          <div className={isListStale ? "feed-list-stale" : "feed-list-live"}>
            {deferredDecisions.map((f) => {
              const isSel = sel === f.decisionFrameId;
              const c = actionColor(f.action);

              if (isPro) {
                return (
                  <motion.button
                    key={f.decisionFrameId}
                    id={`card-${f.decisionFrameId}`}
                    type="button"
                    className="feed-btn"
                    role="button"
                    aria-pressed={isSel}
                    aria-label={`Decision ${f.reasonCode} — ${f.action} — ${f.selectedRegion}`}
                    onPointerDown={() => handleSelection(f.decisionFrameId)}
                    onKeyDown={(e) => handleKeyActivation(e, f.decisionFrameId)}
                    animate={{
                      x: isSel ? 12 : 0,
                      scale: isSel ? 1.02 : 1,
                      opacity: sel && !isSel ? 0.35 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      cursor: "pointer", outline: "none",
                      background: isSel
                        ? `linear-gradient(135deg, ${C.g(c, 0.12)} 0%, ${C.glassActive} 100%)`
                        : C.glass,
                      border: `1px solid ${isSel ? c : C.border}`,
                      borderLeft: `4px solid ${c}`,
                      borderRight: isSel ? `1px solid ${C.g(c, 0.4)}` : `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                      marginBottom: 14,
                      boxShadow: isSel
                        ? `0 16px 32px ${C.g(c, 0.15)}, 8px 0 24px ${C.g(c, 0.1)}`
                        : "0 4px 12px rgba(0,0,0,0.5)",
                      willChange: "transform, opacity",
                      transformStyle: "preserve-3d",
                      transform: "translateZ(0)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t2, fontVariantNumeric: "tabular-nums" }}>
                        {f.decisionFrameId.slice(0, 12)}...
                      </span>
                      <span style={{ fontFamily: "var(--m)", fontSize: 10, color: c, fontWeight: 700, letterSpacing: "0.15em", textShadow: isSel ? `0 0 12px ${C.g(c, 0.6)}` : "none" }}>
                        {f.action.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.t0, letterSpacing: "-0.01em" }}>
                      {f.reasonCode}
                    </div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      {f.selectedRegion}
                      {f.latencyTotalMs != null ? ` · ${f.latencyTotalMs}ms` : ""}
                    </div>
                  </motion.button>
                );
              }

              return (
                <button
                  key={f.decisionFrameId}
                  id={`card-${f.decisionFrameId}`}
                  type="button"
                  className="feed-btn"
                  role="button"
                  aria-pressed={isSel}
                  aria-label={`Decision ${f.reasonCode} — ${f.action} — ${f.selectedRegion}`}
                  onPointerDown={() => handleSelection(f.decisionFrameId)}
                  onKeyDown={(e) => handleKeyActivation(e, f.decisionFrameId)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    cursor: "pointer", outline: "none",
                    background: isSel ? C.g(c, 0.05) : C.g(C.bg1, 0.8),
                    border: `1px solid ${isSel ? c : C.border}`,
                    borderLeft: `4px solid ${c}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 12,
                    opacity: sel && !isSel ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t2, fontVariantNumeric: "tabular-nums" }}>
                      {f.decisionFrameId.slice(0, 12)}...
                    </span>
                    <span style={{ fontFamily: "var(--m)", fontSize: 10, color: c, fontWeight: 700 }}>
                      {f.action.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.t0 }}>{f.reasonCode}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {f.selectedRegion}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer 2: Canonical Inspector */}
        <main
          aria-label="Decision inspector"
          style={{
            position: "relative",
            padding: "40px 60px",
            transformStyle: "preserve-3d",
            overflowY: "auto",
            borderLeft: selectedColor
              ? `2px solid ${C.g(selectedColor, 0.35)}`
              : "2px solid transparent",
            transition: "border-color 0.18s ease",
          }}
        >
          <AnimatePresence mode="sync">
            {sel && frame ? (
              <motion.div
                key={frame.decisionFrameId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.08, ease: "easeOut" }}
                style={{ maxWidth: 640 }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  style={{ marginBottom: 36, willChange: "transform, opacity", transform: "translateZ(0)" }}
                >
                  <div style={{
                    fontSize: 24, fontWeight: 700, color: C.t0, letterSpacing: "-0.02em",
                    textShadow: isPro ? `0 0 40px ${C.g(C.t0, 0.2)}` : "none",
                  }}>
                    {frame.reasonCode}
                  </div>
                  <div style={{
                    fontFamily: "var(--m)", fontSize: 12,
                    color: actionColor(frame.action), marginTop: 8, letterSpacing: "0.15em",
                  }}>
                    ROUTED TO {frame.selectedRegion.toUpperCase()}
                  </div>
                </motion.div>

                {isPro ? (
                  <ProPlate title="Decision Core" delay={0.05}>
                    <Row key="action" label="Action Taken" value={frame.action.toUpperCase()} color={actionColor(frame.action)} highlight={isPro} />
                    <Row key="lat" label="Latency (Compute)" value={`${frame.latencyComputeMs ?? "--"}ms`} />
                    <Row key="fallback" label="Fallback State" value={frame.fallbackUsed ? "ACTIVE" : "NONE"} color={frame.fallbackUsed ? C.reroute : C.t1} />
                  </ProPlate>
                ) : (
                  <PublicPlate title="Decision Core" delay={0.05}>
                    <Row key="action" label="Action Taken" value={frame.action.toUpperCase()} color={actionColor(frame.action)} />
                    <Row key="lat" label="Latency (Compute)" value={`${frame.latencyComputeMs ?? "--"}ms`} />
                    <Row key="fallback" label="Fallback State" value={frame.fallbackUsed ? "ACTIVE" : "NONE"} color={frame.fallbackUsed ? C.reroute : C.t1} />
                  </PublicPlate>
                )}

                {snapshot.governance.active && (isPro ? (
                  <ProPlate title="Governance Metrics" delay={0.1}>
                    <Row key="framework" label="Framework" value={snapshot.governance.frameworkLabel} />
                    <Row key="carbon" label="Carbon Impact" value={`${snapshot.governance.impact.carbonReductionPct ?? 0}%`} color={C.allow} highlight={isPro} />
                    <Row key="conf" label="Signal Confidence" value={`${snapshot.governance.impact.signalConfidence ?? "--"}%`} />
                  </ProPlate>
                ) : (
                  <PublicPlate title="Governance Metrics" delay={0.1}>
                    <Row key="framework" label="Framework" value={snapshot.governance.frameworkLabel} />
                    <Row key="carbon" label="Carbon Impact" value={`${snapshot.governance.impact.carbonReductionPct ?? 0}%`} color={C.allow} />
                    <Row key="conf" label="Signal Confidence" value={`${snapshot.governance.impact.signalConfidence ?? "--"}%`} />
                  </PublicPlate>
                ))}

                {isPro ? (
                  <ProPlate title="Cryptographic Provenance" delay={0.15}>
                    <Row key="trace" label="Trace ID" value={frame.proofHash ? `${frame.proofHash.slice(0, 16)}...` : "UNAVAILABLE"} color={frame.proofHash ? C.t2 : C.deny} />
                    <div key="blocks" style={{ display: "flex", gap: 16, marginTop: 20 }}>
                      <div style={{
                        flex: 1, padding: "12px", textAlign: "center",
                        background: frame.proofHash ? C.g(C.gold, 0.08) : C.g(C.t3, 0.1),
                        border: `1px solid ${frame.proofHash ? C.g(C.gold, 0.3) : C.border}`,
                        borderRadius: 8,
                        animation: frame.proofHash && !reducedMotion ? "goldShimmer 3s ease-in-out infinite" : "none",
                        willChange: frame.proofHash && !reducedMotion ? "opacity, box-shadow" : "auto",
                      }}>
                        <div style={{
                          fontFamily: "var(--m)", fontSize: 10,
                          color: frame.proofHash ? C.gold : C.t3,
                          letterSpacing: "0.1em", fontWeight: 700,
                          textShadow: frame.proofHash && !reducedMotion ? `0 0 10px ${C.g(C.gold, 0.5)}` : "none",
                        }}>
                          {frame.proofHash ? "◆ SEALED LEDGER" : "UNSEALED"}
                        </div>
                      </div>
                    </div>
                  </ProPlate>
                ) : (
                  <PublicPlate title="Cryptographic Provenance" delay={0.15}>
                    <Row key="trace" label="Trace ID" value={frame.proofHash ? `${frame.proofHash.slice(0, 16)}...` : "UNAVAILABLE"} color={frame.proofHash ? C.t2 : C.deny} />
                    <div key="blocks" style={{ display: "flex", gap: 16, marginTop: 20 }}>
                      <div style={{
                        flex: 1, padding: "12px", textAlign: "center",
                        background: frame.proofHash ? C.g(C.gold, 0.02) : C.g(C.t3, 0.1),
                        border: `1px solid ${frame.proofHash ? C.g(C.gold, 0.1) : C.border}`,
                        borderRadius: 8,
                      }}>
                        <div style={{
                          fontFamily: "var(--m)", fontSize: 10,
                          color: frame.proofHash ? C.gold : C.t3,
                          letterSpacing: "0.1em", fontWeight: 500,
                        }}>
                          {frame.proofHash ? "◆ SEALED LEDGER" : "UNSEALED"}
                        </div>
                      </div>
                    </div>
                  </PublicPlate>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", willChange: "opacity" }}
              >
                <div style={{ fontFamily: "var(--m)", fontSize: 12, color: C.t3, letterSpacing: "0.25em" }}>
                  AWAITING SPATIAL FOCUS
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
