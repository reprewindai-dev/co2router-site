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
      initial={isNew ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`decision-card ${decision.status}`}
    >
      {/* Header */}
      <div className="card-header">
        <span className="workload-type">{decision.workloadType}</span>
        <span className="timestamp">
          {new Date(decision.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      
      {/* Route info */}
      <div className="route-info">
        <span className="region">{decision.fromRegion}</span>
        <span className="route-arrow">→</span>
        <span className="region">{decision.toRegion}</span>
      </div>
      
      {/* Carbon impact */}
      <div className="carbon-impact">
        <div className={`impact-pill ${deltaPositive ? 'positive' : 'negative'}`}>
          <span>{deltaPositive ? '↓' : '↑'}</span>
          <span className="impact-value">{Math.abs(decision.delta).toFixed(2)} kg</span>
        </div>
      </div>
      
      {/* Metrics row */}
      <div className="card-metrics">
        <div className="card-metric">
          <span className="card-metric-value">{decision.latency}ms</span>
          <span className="card-metric-label">latency</span>
        </div>
        <div className="card-metric">
          <span className="card-metric-value">${decision.cost.toFixed(2)}</span>
          <span className="card-metric-label">cost</span>
        </div>
        <div className="card-metric">
          <span className="card-metric-value">{decision.waterUsage.toFixed(0)}L</span>
          <span className="card-metric-label">water</span>
        </div>
      </div>
    </motion.div>
  )
}

export function DecisionFeed({
  decisions,
  maxItems = 10,
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
  
  const displayDecisions = decisions.slice(0, maxItems)
  const totalSaved = decisions.reduce((sum, d) => sum + Math.max(0, d.delta), 0)
  
  return (
    <div className="decision-feed">
      <div className="feed-header">
        <div className="feed-title">
          <div className="feed-icon">⚡</div>
          <h3>Decision Feed</h3>
        </div>
        <div className="feed-badge">
          {decisions.length}
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="feed-list"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          {displayDecisions.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              isNew={newIds.has(decision.id)}
            />
          ))}
        </AnimatePresence>
        
        {displayDecisions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <p>Waiting for routing decisions...</p>
          </div>
        )}
      </div>
      
      <div className="feed-footer">
        <div className="total-saved">
          {totalSaved.toFixed(2)} kg CO₂ saved
        </div>
      </div>
    </div>
  )
}
