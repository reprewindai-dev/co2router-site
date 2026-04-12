'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CoPilotSuggestion, DoctrinePolicy, DoctrineWeights } from '../types'

function SuggestionCard({
  suggestion,
  onApprove,
  onDismiss,
  isProcessing,
}: {
  suggestion: CoPilotSuggestion
  onApprove: () => void
  onDismiss: () => void
  isProcessing: boolean
}) {
  const typeIcons = {
    weight_adjustment: '⚖️',
    latency_threshold: '⚡',
    region_expansion: '🌍',
    time_shifting: '⏰',
  }
  
  const typeLabels = {
    weight_adjustment: 'Weight Adjustment',
    latency_threshold: 'Latency Optimization',
    region_expansion: 'Region Expansion',
    time_shifting: 'Time Shifting',
  }
  
  return (
    <motion.div
      className={`suggestion-card ${suggestion.approved ? 'approved' : ''}`}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      layout
    >
      <div className="suggestion-header">
        <span className="suggestion-icon">{typeIcons[suggestion.type]}</span>
        <span className="suggestion-type">{typeLabels[suggestion.type]}</span>
        <span className="confidence-badge">
          {suggestion.confidence}% confidence
        </span>
      </div>
      
      <h4 className="suggestion-title">{suggestion.title}</h4>
      <p className="suggestion-description">{suggestion.description}</p>
      
      <div className="suggestion-evidence">
        <div className="evidence-label">Evidence:</div>
        <div className="evidence-text">{suggestion.evidence}</div>
      </div>
      
      <div className="suggestion-impact">
        <span className="impact-value">
          {suggestion.estimatedImpact.toFixed(1)} tonnes CO₂/year
        </span>
        <span className="impact-label">potential savings</span>
      </div>
      
      {!suggestion.approved && (
        <div className="suggestion-actions">
          <button 
            className="btn-approve"
            onClick={onApprove}
            disabled={isProcessing}
          >
            {isProcessing ? 'Applying...' : '✓ Approve & Apply'}
          </button>
          <button 
            className="btn-dismiss"
            onClick={onDismiss}
            disabled={isProcessing}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {suggestion.approved && (
        <div className="approved-badge">
          ✓ Applied to active doctrine
        </div>
      )}
    </motion.div>
  )
}

export function AICoPilot({
  activePolicy,
  onPolicyUpdate,
  onRequestSuggestions,
}: {
  activePolicy: DoctrinePolicy | null
  onPolicyUpdate: (policy: DoctrinePolicy) => void
  onRequestSuggestions: () => Promise<CoPilotSuggestion[]>
}) {
  const [suggestions, setSuggestions] = useState<CoPilotSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    
    try {
      const newSuggestions = await onRequestSuggestions()
      setSuggestions(newSuggestions.filter(s => !s.approved))
    } finally {
      setLoading(false)
    }
  }, [onRequestSuggestions])
  
  const approveSuggestion = useCallback(async (suggestion: CoPilotSuggestion) => {
    if (!activePolicy) return
    
    setProcessingId(suggestion.id)
    
    // Apply the suggestion to the policy
    let updatedWeights: DoctrineWeights = activePolicy.weights
    
    switch (suggestion.type) {
      case 'weight_adjustment':
        // Example: shift 10% from cost to carbon
        updatedWeights = {
          ...activePolicy.weights,
          carbon: Math.min(100, activePolicy.weights.carbon + 10),
          cost: Math.max(0, activePolicy.weights.cost - 10),
        }
        break
        
      case 'latency_threshold':
        // Increase latency tolerance for more carbon savings
        // This would be handled via the policy update
        break
        
      case 'time_shifting':
        // Enable more aggressive time shifting
        updatedWeights = {
          ...activePolicy.weights,
          carbon: Math.min(100, activePolicy.weights.carbon + 5),
        }
        break
    }
    
    const updatedPolicy: DoctrinePolicy = {
      ...activePolicy,
      weights: updatedWeights,
    }
    
    onPolicyUpdate(updatedPolicy)
    
    // Mark suggestion as approved
    setSuggestions(prev => 
      prev.map(s => 
        s.id === suggestion.id ? { ...s, approved: true } : s
      )
    )
    
    setProcessingId(null)
  }, [activePolicy, onPolicyUpdate])
  
  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }, [])
  
  return (
    <div className="ai-copilot">
      <div className="copilot-header">
        <div className="header-icon">🤖</div>
        <div className="header-text">
          <h3>AI Co-Pilot</h3>
          <div className="header-subtitle">
            Surfaces optimization opportunities with evidence
          </div>
        </div>
      </div>
      
      {/* Action bar */}
      <div className="copilot-actions">
        <button 
          className="btn-analyze"
          onClick={loadSuggestions}
          disabled={loading || !activePolicy}
        >
          {loading ? 'Analyzing 30 days of history...' : '🔄 Analyze for Opportunities'}
        </button>
        
        <div className="suggestions-count">
          {suggestions.filter(s => !s.approved).length} pending suggestions
        </div>
      </div>
      
      {/* Suggestions list */}
      <div className="suggestions-list">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApprove={() => approveSuggestion(suggestion)}
              onDismiss={() => dismissSuggestion(suggestion.id)}
              isProcessing={processingId === suggestion.id}
            />
          ))}
        </AnimatePresence>
        
        {suggestions.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <p>
              {activePolicy 
                ? 'No pending suggestions. Run analysis to find optimization opportunities.'
                : 'Activate a doctrine policy to enable AI Co-Pilot recommendations.'
              }
            </p>
          </div>
        )}
        
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Analyzing workload patterns, carbon intensity variations, and cost optimization opportunities...</p>
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="copilot-stats">
        <div className="stat">
          <span className="stat-value">
            {suggestions.filter(s => s.approved).length}
          </span>
          <span className="stat-label">Applied</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {suggestions
              .filter(s => s.approved)
              .reduce((sum, s) => sum + s.estimatedImpact, 0)
              .toFixed(1)}
          </span>
          <span className="stat-label">tonnes CO₂/year saved</span>
        </div>
      </div>
    </div>
  )
}
