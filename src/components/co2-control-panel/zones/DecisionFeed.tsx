'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RoutingDecision } from '../types'

function DecisionCard({ 
  decision, 
  isNew 
}: { 
  decision: RoutingDecision
  isNew: boolean 
}) {
  const deltaPositive = decision.delta > 0
  
  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -50, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`decision-card ${decision.status}`}
    >
      {/* Status indicator */}
      <div className="card-status-bar" />
      
      {/* Header */}
      <div className="card-header">
        <span className="workload-type">{decision.workloadType}</span>
        <span className="timestamp">
          {new Date(decision.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      {/* Route info */}
      <div className="route-info">
        <span className="region from">{decision.fromRegion}</span>
        <span className="route-arrow">→</span>
        <span className="region to">{decision.toRegion}</span>
      </div>
      
      {/* Carbon delta */}
      <div className={`carbon-delta ${deltaPositive ? 'saved' : 'increased'}`}>
        <span className="delta-icon">{deltaPositive ? '↓' : '↑'}</span>
        <span className="delta-value">
          {Math.abs(decision.delta).toFixed(2)} kg CO₂
        </span>
        <span className="delta-label">
          {deltaPositive ? 'saved' : 'increase'}
        </span>
      </div>
      
      {/* Comparison */}
      <div className="comparison">
        <div className="comparison-row">
          <span className="label">Baseline</span>
          <span className="value baseline">{decision.baselineCarbon.toFixed(2)} kg</span>
        </div>
        <div className="comparison-row selected">
          <span className="label">Selected</span>
          <span className="value selected">{decision.selectedCarbon.toFixed(2)} kg</span>
        </div>
      </div>
      
      {/* Proof hash */}
      <div className="proof-section">
        <span className="proof-label">Cryptographic Proof</span>
        <span className="proof-hash">
          {decision.proofHash.slice(0, 16)}...{decision.proofHash.slice(-8)}
        </span>
      </div>
      
      {/* Metrics */}
      <div className="metrics">
        <div className="metric">
          <span className="metric-value">{decision.latency}ms</span>
          <span className="metric-label">Latency</span>
        </div>
        <div className="metric">
          <span className="metric-value">{decision.cost.toFixed(2)}x</span>
          <span className="metric-label">Cost</span>
        </div>
        <div className="metric">
          <span className="metric-value">{decision.waterUsage.toFixed(1)}L</span>
          <span className="metric-label">Water</span>
        </div>
      </div>
    </motion.div>
  )
}

export function DecisionFeed({ 
  decisions, 
  maxItems = 10 
}: { 
  decisions: RoutingDecision[]
  maxItems?: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  
  // Track new decisions for animation
  useEffect(() => {
    if (decisions.length > 0) {
      const latestId = decisions[0].id
      setNewIds(prev => new Set(Array.from(prev).concat(latestId)))
      
      // Clear "new" status after animation
      setTimeout(() => {
        setNewIds(prev => {
          const next = new Set(Array.from(prev))
          next.delete(latestId)
          return next
        })
      }, 1000)
    }
  }, [decisions])
  
  // Auto-scroll to top for new decisions
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [decisions, isPaused])
  
  const visibleDecisions = decisions.slice(0, maxItems)
  
  return (
    <div className="decision-feed">
      {/* Header */}
      <div className="feed-header">
        <h3>Live Decisions</h3>
        <div className="feed-stats">
          <span className="stat">
            <span className="stat-value">{decisions.length}</span>
            <span className="stat-label">Active</span>
          </span>
          <button 
            className="pause-btn"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>
      
      {/* Decision list */}
      <div 
        ref={scrollRef}
        className="feed-list"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          {visibleDecisions.map((decision) => (
            <DecisionCard 
              key={decision.id}
              decision={decision}
              isNew={newIds.has(decision.id)}
            />
          ))}
        </AnimatePresence>
        
        {visibleDecisions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌍</div>
            <p>Waiting for Earth to approve compute...</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="feed-footer">
        <div className="totals">
          <span className="total-saved">
            {decisions.reduce((sum, d) => sum + Math.max(0, d.delta), 0).toFixed(2)} kg CO₂ saved
          </span>
        </div>
      </div>
    </div>
  )
}
