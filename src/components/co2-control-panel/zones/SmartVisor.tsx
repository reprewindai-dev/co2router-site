'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { VisorStatus, RoutingDecision } from '../types'

interface RingProps {
  value: number // 0-100
  max: number
  color: string
  size: number
  strokeWidth: number
  label: string
  sublabel?: string
}

function StatusRing({ value, max, color, size, strokeWidth, label, sublabel }: RingProps) {
  const percentage = Math.min(100, (value / max) * 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="status-ring">
      <svg width={size} height={size} className="ring-svg">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-content">
        <span className="ring-value" style={{ color }}>
          {Math.round(percentage)}%
        </span>
        <span className="ring-label">{label}</span>
        {sublabel && <span className="ring-sublabel">{sublabel}</span>}
      </div>
    </div>
  )
}

function CompactMetric({ 
  label, 
  value, 
  unit, 
  trend 
}: { 
  label: string
  value: number
  unit: string
  trend?: 'up' | 'down' | 'stable'
}) {
  const trendIcon = {
    up: '↑',
    down: '↓',
    stable: '→',
  }[trend || 'stable']
  
  return (
    <div className="compact-metric">
      <span className="metric-label">{label}</span>
      <div className="metric-row">
        <span className="metric-value">{value.toFixed(1)}</span>
        <span className="metric-unit">{unit}</span>
        {trend && (
          <span className={`metric-trend ${trend}`}>{trendIcon}</span>
        )}
      </div>
    </div>
  )
}

export function SmartVisor({
  status,
  recentDecisions,
}: {
  status: VisorStatus
  recentDecisions: RoutingDecision[]
}) {
  // Calculate metrics from recent decisions
  const metrics = useMemo(() => {
    const decisions = recentDecisions.slice(0, 10)
    const totalCarbon = decisions.reduce((sum, d) => sum + Math.max(0, d.delta), 0)
    const totalWater = decisions.reduce((sum, d) => sum + (d.delta > 0 ? d.waterUsage * 0.1 : 0), 0)
    const avgLatency = decisions.length > 0 
      ? decisions.reduce((sum, d) => sum + d.latency, 0) / decisions.length 
      : 0
    
    return { totalCarbon, totalWater, avgLatency }
  }, [recentDecisions])
  
  // Posture color
  const postureColor = {
    green: '#00ff88',
    amber: '#ffaa00',
    red: '#ff4444',
  }[status.posture]
  
  const postureText = {
    green: 'EARTH APPROVES',
    amber: 'EARTH CAUTION',
    red: 'EARTH REJECTS',
  }[status.posture]
  
  return (
    <div className="smart-visor">
      {/* Main status header */}
      <motion.div 
        className="visor-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div 
          className="posture-indicator"
          style={{ 
            background: `linear-gradient(135deg, ${postureColor}22, ${postureColor}44)`,
            borderColor: postureColor 
          }}
        >
          <div className="posture-icon" style={{ color: postureColor }}>
            {status.posture === 'green' ? '✓' : status.posture === 'amber' ? '!' : '✕'}
          </div>
          <div className="posture-text">
            <span className="posture-label">{postureText}</span>
            <span className="posture-rate">
              {status.earthApprovalRate.toFixed(0)}% approval rate
            </span>
          </div>
        </div>
      </motion.div>
      
      {/* Primary status rings */}
      <div className="visor-rings">
        <StatusRing
          value={status.carbonSavedToday}
          max={1000}
          color="#00ff88"
          size={120}
          strokeWidth={8}
          label="Carbon"
          sublabel={`${status.carbonSavedToday.toFixed(1)} kg saved`}
        />
        
        <StatusRing
          value={status.waterSavedToday}
          max={10000}
          color="#00aaff"
          size={100}
          strokeWidth={6}
          label="Water"
          sublabel={`${status.waterSavedToday.toFixed(0)} L saved`}
        />
        
        <StatusRing
          value={100 - (status.currentLatency / 10)}
          max={100}
          color="#ffaa00"
          size={80}
          strokeWidth={5}
          label="Latency"
          sublabel={`${status.currentLatency.toFixed(0)}ms`}
        />
        
        <StatusRing
          value={100 - (status.costIndex * 10)}
          max={100}
          color="#ff66aa"
          size={70}
          strokeWidth={4}
          label="Cost"
        />
      </div>
      
      {/* Active decisions count */}
      <div className="active-workloads">
        <motion.div 
          className="workload-badge"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="workload-count">{status.activeDecisions}</span>
          <span className="workload-label">Active Workloads</span>
        </motion.div>
      </div>
      
      {/* Compact metrics grid */}
      <div className="visor-metrics">
        <CompactMetric
          label="Recent Carbon"
          value={metrics.totalCarbon}
          unit="kg"
          trend="down"
        />
        <CompactMetric
          label="Recent Water"
          value={metrics.totalWater}
          unit="L"
          trend="down"
        />
        <CompactMetric
          label="Avg Latency"
          value={metrics.avgLatency}
          unit="ms"
          trend="stable"
        />
      </div>
      
      {/* Fighter pilot style readout */}
      <div className="hud-readout">
        <div className="hud-line">
          <span className="hud-label">EARTH_STATUS</span>
          <span className="hud-value" style={{ color: postureColor }}>
            {status.posture.toUpperCase()}
          </span>
        </div>
        <div className="hud-line">
          <span className="hud-label">COMPUTE_AUTH</span>
          <span className="hud-value" style={{ color: status.posture === 'green' ? '#00ff88' : '#ff4444' }}>
            {status.posture === 'green' ? 'GRANTED' : 'RESTRICTED'}
          </span>
        </div>
        <div className="hud-line">
          <span className="hud-label">DOCTRINE_VER</span>
          <span className="hud-value">v2.1.4-ACTIVE</span>
        </div>
      </div>
    </div>
  )
}
