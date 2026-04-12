import 'server-only'

type CacheStatus = 'hit' | 'miss' | 'refresh' | 'stale'

type CacheEntry<T> = {
  value?: T
  expiresAt: number
  inflight?: Promise<T>
  lastSuccessfulAt?: number
  lastError?: string | null
}

const snapshotCache = new Map<string, CacheEntry<unknown>>()

export async function getCachedSnapshot<T>(
  key: string,
  ttlMs: number,
  loader: (previousValue: T | undefined) => Promise<T>
): Promise<{
  value: T
  cacheStatus: CacheStatus
  lastSuccessfulAt: string | null
  errorMessage: string | null
}> {
  const now = Date.now()
  const current = snapshotCache.get(key) as CacheEntry<T> | undefined

  if (current?.value !== undefined && current.expiresAt > now) {
    return {
      value: current.value,
      cacheStatus: 'hit',
      lastSuccessfulAt:
        current.lastSuccessfulAt != null
          ? new Date(current.lastSuccessfulAt).toISOString()
          : null,
      errorMessage: current.lastError ?? null,
    }
  }

  if (current?.inflight) {
    try {
      return {
        value: await current.inflight,
        cacheStatus: current.value !== undefined ? 'refresh' : 'miss',
        lastSuccessfulAt:
          current.lastSuccessfulAt != null
            ? new Date(current.lastSuccessfulAt).toISOString()
            : null,
        errorMessage: null,
      }
    } catch (error) {
      const latest = snapshotCache.get(key) as CacheEntry<T> | undefined
      if (latest?.value !== undefined) {
        return {
          value: latest.value,
          cacheStatus: 'stale',
          lastSuccessfulAt:
            latest.lastSuccessfulAt != null
              ? new Date(latest.lastSuccessfulAt).toISOString()
              : null,
          errorMessage:
            error instanceof Error ? error.message : 'Snapshot refresh failed',
        }
      }
      throw error
    }
  }

  const inflight = loader(current?.value)
  snapshotCache.set(key, {
    value: current?.value,
    expiresAt: current?.expiresAt ?? 0,
    inflight,
    lastSuccessfulAt: current?.lastSuccessfulAt,
    lastError: current?.lastError ?? null,
  })

  try {
    const value = await inflight
    const lastSuccessfulAt = Date.now()
    snapshotCache.set(key, {
      value,
      expiresAt: lastSuccessfulAt + ttlMs,
      lastSuccessfulAt,
      lastError: null,
    })
    return {
      value,
      cacheStatus: current?.value !== undefined ? 'refresh' : 'miss',
      lastSuccessfulAt: new Date(lastSuccessfulAt).toISOString(),
      errorMessage: null,
    }
  } catch (error) {
    if (current?.value !== undefined) {
      snapshotCache.set(key, {
        value: current.value,
        expiresAt: Date.now() + Math.min(ttlMs, 2_000),
        lastSuccessfulAt: current.lastSuccessfulAt,
        lastError: error instanceof Error ? error.message : 'Snapshot refresh failed',
      })
      return {
        value: current.value,
        cacheStatus: 'stale',
        lastSuccessfulAt:
          current.lastSuccessfulAt != null
            ? new Date(current.lastSuccessfulAt).toISOString()
            : null,
        errorMessage:
          error instanceof Error ? error.message : 'Snapshot refresh failed',
      }
    }
    snapshotCache.delete(key)
    throw error
  }
}

export function peekCachedSnapshot<T>(key: string) {
  const current = snapshotCache.get(key) as CacheEntry<T> | undefined
  if (!current?.value) {
    return null
  }

  return {
    value: current.value,
    expiresAt: current.expiresAt,
    lastSuccessfulAt:
      current.lastSuccessfulAt != null
        ? new Date(current.lastSuccessfulAt).toISOString()
        : null,
    errorMessage: current.lastError ?? null,
  }
}
