'use client'

import { useEffect, useState } from 'react'

import type { HaloGridConsoleSnapshot } from '@/lib/halogrid/types'

const POLL_MS = 30_000

export function useHalogridConsole(paused: boolean) {
  const [snapshot, setSnapshot] = useState<HaloGridConsoleSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/halogrid/console', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`HaloGrid snapshot request failed with ${response.status}`)
        }

        const next = (await response.json()) as HaloGridConsoleSnapshot
        if (cancelled) return
        setSnapshot(next)
        setError(null)
      } catch (nextError) {
        if (cancelled) return
        setError(nextError instanceof Error ? nextError.message : 'Console unavailable')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    if (paused) {
      return () => {
        cancelled = true
      }
    }

    const timer = window.setInterval(() => {
      void load()
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [paused])

  return {
    snapshot,
    error,
    loading,
    refresh: async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/halogrid/console', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`HaloGrid snapshot request failed with ${response.status}`)
        }
        const next = (await response.json()) as HaloGridConsoleSnapshot
        setSnapshot(next)
        setError(null)
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Console unavailable')
      } finally {
        setLoading(false)
      }
    },
  }
}
