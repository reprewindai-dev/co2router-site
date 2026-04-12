'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { RoutingDecision } from '../types'

export function useLiveDecisions(enabled: boolean = true) {
  const [decisions, setDecisions] = useState<RoutingDecision[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return

    try {
      // Connect to real WebSocket endpoint
      const ws = new WebSocket(`wss://${window.location.host}/api/control-surface/live`)
      
      ws.onopen = () => {
        setConnected(true)
        console.log('[CO2 Control] WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'decision') {
            setDecisions(prev => {
              const newDecision = data.decision as RoutingDecision
              // Keep last 100 decisions
              const updated = [newDecision, ...prev].slice(0, 100)
              return updated
            })
          }
        } catch (err) {
          console.error('[CO2 Control] Failed to parse message:', err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000)
      }

      ws.onerror = (err) => {
        console.error('[CO2 Control] WebSocket error:', err)
        ws.close()
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[CO2 Control] Failed to connect:', err)
    }
  }, [enabled])

  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  const clearDecisions = useCallback(() => {
    setDecisions([])
  }, [])

  const replayDecision = useCallback((id: string) => {
    wsRef.current?.send(JSON.stringify({ action: 'replay', decisionId: id }))
  }, [])

  return { decisions, connected, clearDecisions, replayDecision }
}
