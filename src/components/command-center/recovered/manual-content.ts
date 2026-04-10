export interface HalogridManualSection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const HALOGRID_MANUAL_SECTIONS: HalogridManualSection[] = [
  {
    id: 'overview',
    title: 'What HalOGrid Is',
    paragraphs: [
      'HalOGrid is the CO2 Router command-center surface for deterministic environmental authorization. Compute does not run until it is authorized. The system issues a binding decision before execution, not a recommendation after the fact.',
      'Every decision is sealed with a proof hash, tied to replayable signal state, and exposed through a surface that shows operators why the engine chose a region, why it blocked a route, and what the current world posture means for execution.',
    ],
    bullets: [
      'Issued before execution with no post-hoc gap',
      'Replayable and auditable through trace and proof continuity',
      'Enforceable across the live control plane and governance surfaces',
      'Driven by SAIQ governance and the CO2 Router evidence chain',
    ],
  },
  {
    id: 'globe',
    title: 'The Globe',
    paragraphs: [
      'The map theater is the live execution posture of the governed fleet. Nodes represent regions. Their state, confidence, freshness, and pressure tell the operator whether a lane is healthy, guarded, or blocked.',
      'Selecting a region freezes the operator focus on that governed lane and loads the associated decision record. Routing flows show where work was permitted, rerouted, delayed, throttled, or denied.',
    ],
    bullets: [
      'Green indicates active execution posture',
      'Amber indicates a guarded or marginal lane',
      'Red indicates a blocked lane',
      'Node emphasis scales with pressure and selection state',
      'Routing flows visualize live governed movement between regions',
    ],
  },
  {
    id: 'five-actions',
    title: 'Five Actions',
    paragraphs: [
      'Every decision resolves to one of five binding actions. These are not advisory labels. They are the execution authority surfaced by the CO2 Router engine and rendered directly inside HalOGrid.',
    ],
    bullets: [
      'Run Now: execute in the current approved lane',
      'Reroute: shift execution to a cleaner or safer region',
      'Delay: hold for a cleaner window when policy allows',
      'Throttle: reduce execution pressure under constrained posture',
      'Deny: block execution because no safe lane exists',
    ],
  },
  {
    id: 'controls',
    title: 'Controls',
    paragraphs: [
      'The recovered HalOGrid console preserves the original operator interaction model while staying truthful to live data. The theater supports drag-to-pan, discrete zoom levels, direct region selection, panel collapse, and Globe Only presentation mode.',
    ],
    bullets: [
      'Drag the theater to pan the map surface',
      'Use mouse wheel or zoom controls to move between Wide, Mid, and Close',
      'Click a region node to lock the decision card',
      'Collapse either side panel independently or switch to Globe Only',
      'In Globe Only mode, click the HalOGrid logo to toggle Ghost Mode',
      'Triple-click the HalOGrid logo in Elite to reveal the policy surface',
    ],
  },
  {
    id: 'zoom-controls',
    title: 'Zoom Controls',
    paragraphs: [
      'The theater supports three discrete zoom levels tuned for wide monitoring, regional inspection, and close pursuit of a selected lane. Operators can use mouse wheel, tactical dock buttons, or the floating right-side controls.',
    ],
    bullets: [
      'Wide: world posture and routing balance',
      'Mid: regional density and conflict visibility',
      'Close: selected lane emphasis and fly-to inspection',
    ],
  },
  {
    id: 'hud',
    title: 'HUD Elements',
    paragraphs: [
      'The HUD is always driven from the live HallOGrid snapshot. It summarizes fleet health, carbon pressure, blocked posture, decision velocity, queue pressure, provider stress, and current operator confidence without requiring additional clicks.',
    ],
    bullets: [
      'Active, marginal, and blocked region counts summarize world posture',
      'Carbon pressure expresses aggregate fleet strain, not a cosmetic score',
      'Threat posture reflects blocked-region concentration and live degradation',
      'Decision velocity is derived from recent governed records',
      'Queue pressure comes from the projection outbox when available',
      'Provider stress and integrity are surfaced through the advisor',
    ],
  },
  {
    id: 'decision-cards',
    title: 'Decision Cards',
    paragraphs: [
      'Decision cards are the core proof surface for a selected region. They show the decision action, region, reason code, dominant constraint, trust posture, proof reference, replay state, and latency metrics.',
      'Operator-capable tenants also see trace candidate data, replay results, governance context, counterfactuals, hazards, and override posture when that workspace is available.',
    ],
    bullets: [
      'Headline and dominant constraint explain why the lane was chosen or blocked',
      'Carbon reduction, water delta, confidence, and latency come from live trace or replay data',
      'Proof hash, evidence refs, and provider refs stay visible as audit anchors',
      'Preview users see a locked surface instead of fabricated detail',
    ],
  },
  {
    id: 'pipeline',
    title: 'Decision Pipeline',
    paragraphs: [
      'Every authorization still follows the five-stage control model described in the operator manual. Signals are collected, scored through SAIQ, constrained by policy, decided, and then sealed into replayable evidence.',
    ],
    bullets: [
      'Signals: carbon, water, freshness, and runtime context',
      'SAIQ: weighted scoring across carbon, water, latency, and cost',
      'Policy: thresholds, doctrine, and fail posture',
      'Decision: run now, reroute, delay, throttle, or deny',
      'Proof: trace, replay, and proof hash continuity',
    ],
  },
  {
    id: 'providers',
    title: 'Signal Providers',
    paragraphs: [
      'The left operator panel lists the live provider mirrors with health, freshness, authority mode, and confidence. This is no longer a mock provider table. It is mapped from the live HallOGrid health contract.',
    ],
    bullets: [
      'Healthy providers are live and inside freshness budget',
      'Degraded providers are stale, rate-limited, or guarded',
      'Offline providers are unavailable and require conservative fallback posture',
      'Authority mode and signal role stay visible per provider record',
    ],
  },
  {
    id: 'tiers',
    title: 'Tier Features',
    paragraphs: [
      'The surface remains tier-aware. Freeview proves credibility without exposing operator authority. Pro unlocks governed operator detail. Elite adds assurance and operations surfaces that remain truthful to the live stack.',
    ],
    bullets: [
      'Freeview: public proof surface with upgrade path and locked operator detail',
      'Pro: decision detail, trace-backed inspection, replay-backed context, and operator workspace visibility',
      'Elite: alarms, policy posture surface, hidden controls, manual access, and higher-assurance operator workflows',
    ],
  },
  {
    id: 'elite',
    title: 'Elite Features',
    paragraphs: [
      'Elite-only features are included only where the live stack can support them truthfully. This build does not fabricate chat traffic, random alerts, or writable policy changes. It surfaces live conditions, read-only policy posture, and explicit unavailable states where backend capability is not configured.',
    ],
    bullets: [
      'Alarm Queue is derived from live snapshot conditions and hazard data',
      'Policy Tuner opens in read-only mode unless a live write path exists',
      'Team Chat remains visible as a shell but shows unavailable status when no live comms connector is configured',
      'Hidden controls stay discoverable without pretending to be operationally wired when they are not',
    ],
  },
  {
    id: 'hidden-elite',
    title: 'Hidden Elite Features',
    paragraphs: [
      'HalOGrid keeps discoverable power-user behavior in the product without faking backend capability. These controls are designed for operators and presenters who want a cleaner surface or faster access to governance posture.',
    ],
    bullets: [
      'Ghost Mode: click the HalOGrid mark in Presentation mode to drop the top rail',
      'Policy Tuner reveal: triple-click the HalOGrid mark in Elite to open read-only governance weights',
      'Decision Forensics: pin a lane and inspect normalized candidates in the inspector rail',
      'Proof posture: proof hash, replay, and evidence reference counts stay visible in the inspector',
    ],
  },
  {
    id: 'alarms',
    title: 'Alarm Queue',
    paragraphs: [
      'The alarm queue no longer depends on generated demo events. It is synthesized from blocked regions, degraded providers, mirror freshness, projection lag, and workspace hazards when the selected frame exposes them.',
    ],
    bullets: [
      'Critical alarms represent blocked regions or hard stream degradation',
      'Warning alarms represent provider degradation, stale mirrors, or elevated pressure',
      'Info alarms represent queue or projection conditions that need operator attention',
      'Acknowledging an alarm only affects the local operator surface; it does not mutate backend state',
    ],
  },
  {
    id: 'team-chat',
    title: 'Team Chat',
    paragraphs: [
      'Team Chat is preserved as an Elite shell because it is part of the original HalOGrid experience. In this recovery build it must remain truthful: if no live team-communications backend exists for the tenant, the panel states that clearly instead of simulating operator messages.',
    ],
    bullets: [
      'No fake team traffic is generated',
      'The surface is ready for a future live comms connector',
      'The panel communicates current availability and scope explicitly',
    ],
  },
  {
    id: 'policy',
    title: 'Policy Tuner',
    paragraphs: [
      'The hidden policy surface reflects live governance weights when the snapshot exposes them. Until a real writable policy endpoint is connected, the tuner remains read-only to avoid pretending that front-end slider changes affect authorization.',
    ],
    bullets: [
      'Weights shown are live governance weights when present',
      'Read-only mode is explicit',
      'Doctrine and override workflows remain separate from weight tuning',
    ],
  },
  {
    id: 'security',
    title: 'Security And Truthfulness',
    paragraphs: [
      'The recovered console is integrated into the existing source-backed CO2 Router site and keeps the live backend path intact. Public preview remains read-only. Operator-only controls stay gated by the existing HallOGrid access contract.',
      'This build intentionally removes fake generation paths. No mock provider data, random decisions, synthetic alarms, or fake team messages are shipped as live behavior.',
    ],
    bullets: [
      'Preview users cannot bypass the operator surface lockout',
      'Trace and replay are loaded through the live API routes',
      'Provider posture is sourced from live health mirrors',
      'Mock runtime dependencies are removed from the console experience',
    ],
  },
  {
    id: 'color-system',
    title: 'Color System',
    paragraphs: [
      'The console supports three operator-calibrated display modes. Night mode is the cinematic default, Day mode is for bright-room legibility, and Focus mode is the fatigue-aware, warm-spectrum option for longer working sessions.',
    ],
    bullets: [
      'Night: high contrast, cold atmosphere, strongest bloom',
      'Day: lighter surfaces, softer bloom, high ambient readability',
      'Focus: warmer palette, lower glare, reduced visual fatigue',
    ],
  },
  {
    id: 'mobile-tablet',
    title: 'Mobile And Tablet',
    paragraphs: [
      'The premium console is optimized for desktop command-center use first, but the shell layout and drawers remain responsive so investors and operators can still inspect the command center on tablet-class devices.',
    ],
    bullets: [
      'Rails collapse into drawers sooner on narrower viewports',
      'Pinned decision detail remains accessible without leaving the globe view',
      'Presentation mode reduces chrome for portable demos',
    ],
  },
  {
    id: 'controls-reference',
    title: 'Controls Reference',
    paragraphs: [
      'HalOGrid is designed so the entire surface can be reduced to the globe, expanded back into a full command workspace, or shifted into a presentation state without losing access to the selected decision.',
    ],
    bullets: [
      'Hover a lane to preview live proof posture at the cursor',
      'Click a lane to pin the decision in the inspector',
      'Use the side handles to restore collapsed rails',
      'Use the tactical dock to control layers and zoom',
      'Use Full Screen for investor or NOC presentation',
    ],
  },
  {
    id: 'watchdog',
    title: 'Watchdog And Degraded Operation',
    paragraphs: [
      'The console continues to operate when the live stream or source freshness degrades, but it does so honestly. The watchdog holds the last verified snapshot, marks the mirror stale, and warns the operator instead of hiding the failure.',
    ],
    bullets: [
      'Freshness age is surfaced in the shell header',
      'Degraded mirror posture raises warning alarms',
      'Selected detail remains available from the last verified frame where possible',
      'The UI stays live without claiming that the feed is healthy',
    ],
  },
  {
    id: 'operator-notes',
    title: 'Operator Notes',
    paragraphs: [
      'HalOGrid is now restored as the authoritative command-center console on top of the existing CO2 Router stack. The route, backend connection, and Vercel deployment stay inside the source app. The recovered UI is no longer a disconnected demo.',
    ],
    bullets: [
      'Console route lives inside the source-backed production app',
      'Current domains and backend wiring remain in place',
      'Recovered UI now consumes the live HallOGrid data contract',
      'The in-app manual matches the operator surface instead of a mock narrative',
    ],
  },
  {
    id: 'performance-stress',
    title: 'Performance And Stress',
    paragraphs: [
      'The rebuilt HalOGrid theater is always 3D. When fleet posture becomes noisy, the scene reduces ring density and glow intensity through storm-mode tuning rather than dropping into a degraded 2D fallback.',
    ],
    bullets: [
      'Storm mode reduces visual clutter under blocked or degraded posture',
      'The scene remains interactive during stale or degraded backend conditions',
      'Pinned decision detail stays available even when the live feed requires refetch or watchdog intervention',
    ],
  },
]
