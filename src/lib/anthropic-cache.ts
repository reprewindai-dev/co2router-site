import 'server-only'

import crypto from 'crypto'

import { RateLimiter } from '@/lib/rate-limit'

export type AnthropicCacheTtl = '5m' | '1h'
export type AnthropicCacheMode = 'explicit' | 'automatic'

export type AnthropicCacheControl = {
  type: 'ephemeral'
  ttl?: AnthropicCacheTtl
}

export type AnthropicTextBlock = {
  type: 'text'
  text: string
  cache_control?: AnthropicCacheControl
}

export type AnthropicContentBlock = AnthropicTextBlock | Record<string, unknown>

export type AnthropicToolDefinition = {
  name: string
  description?: string
  input_schema: Record<string, unknown>
  cache_control?: AnthropicCacheControl
}

export type AnthropicMessageInput = {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export type AnthropicRequestInput = {
  model: string
  maxTokens: number
  tools?: AnthropicToolDefinition[]
  system?: string | AnthropicTextBlock[]
  prefixMessages?: AnthropicMessageInput[]
  messages: AnthropicMessageInput[]
  cacheMode?: AnthropicCacheMode
  cacheTtl?: AnthropicCacheTtl
  temperature?: number
  topP?: number
  topK?: number
  metadata?: Record<string, unknown>
}

export type AnthropicUsage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  cache_creation?: Record<string, number>
}

export type AnthropicResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  model: string
  content: Array<Record<string, unknown>>
  stop_reason?: string | null
  stop_sequence?: string | null
  usage?: AnthropicUsage
}

export type AnthropicCacheStatus = 'hit' | 'miss' | 'refresh' | 'stale'

export type AnthropicCacheSnapshot<T> = {
  value: T
  cacheStatus: AnthropicCacheStatus
  cachedAt: string
  expiresAt: string
  lastSuccessfulAt: string
  requestKey: string
  prefixKey: string
  upstreamCacheStatus: 'live' | 'cacheable' | 'read' | 'unknown'
  rateLimitRetryAfterSeconds: number | null
  errorMessage: string | null
}

export type AnthropicAdapterOptions = {
  apiKey?: string | null
  apiVersion?: string
  baseUrl?: string
  defaultCacheTtl?: AnthropicCacheTtl
  staleGraceMs?: number
  refreshCapacity?: number
  refreshRefillPerMinute?: number
  fetchImpl?: typeof fetch
  now?: () => number
}

type CacheEntry<T> = {
  value: T | undefined
  requestKey: string
  prefixKey: string
  cachedAt: number
  expiresAt: number
  staleUntil: number
  lastSuccessfulAt: number
  lastError: string | null
  refreshing?: Promise<T>
  upstreamCacheStatus: AnthropicCacheSnapshot<T>['upstreamCacheStatus']
}

type BuiltAnthropicRequest = {
  body: Record<string, unknown>
  requestKey: string
  prefixKey: string
  cacheMode: AnthropicCacheMode
  cacheTtl: AnthropicCacheTtl
}

const DEFAULT_API_VERSION = '2023-06-01'
const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_CACHE_TTL: AnthropicCacheTtl = '5m'
const DEFAULT_STALE_GRACE_MS = 365 * 24 * 60 * 60 * 1000

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item))
  }
  if (!isPlainObject(value)) {
    return value
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableValue(value))
}

function sha256(value: unknown) {
  return crypto.createHash('sha256').update(stableStringify(value) ?? '').digest('hex')
}

function cacheControl(ttl: AnthropicCacheTtl): AnthropicCacheControl {
  return ttl === '1h' ? { type: 'ephemeral', ttl: '1h' } : { type: 'ephemeral' }
}

function normalizeTextBlock(block: string | AnthropicTextBlock, ttl: AnthropicCacheTtl | null) {
  if (typeof block === 'string') {
    return { type: 'text', text: block } satisfies AnthropicTextBlock
  }

  if (ttl) {
    return { ...block, cache_control: block.cache_control ?? cacheControl(ttl) }
  }

  return { ...block }
}

function normalizeContentBlocks(
  content: string | AnthropicContentBlock[],
  ttl: AnthropicCacheTtl | null,
  applyBreakpoint = false
): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = (typeof content === 'string' ? [{ type: 'text', text: content }] : content).map(
    (block) => ({ ...block })
  )

  if (applyBreakpoint && blocks.length > 0 && ttl) {
    const lastIndex = blocks.length - 1
    blocks[lastIndex] = {
      ...blocks[lastIndex],
      cache_control: (blocks[lastIndex] as Record<string, unknown>).cache_control ?? cacheControl(ttl),
    }
  }

  return blocks
}

function normalizeSystem(system: AnthropicRequestInput['system'], ttl: AnthropicCacheTtl | null, applyBreakpoint = false) {
  if (system == null) return undefined
  const blocks: AnthropicTextBlock[] =
    typeof system === 'string'
      ? [{ type: 'text', text: system }]
      : system.map((block) => normalizeTextBlock(block, null))

  if (applyBreakpoint && blocks.length > 0 && ttl) {
    const lastIndex = blocks.length - 1
    blocks[lastIndex] = {
      ...blocks[lastIndex],
      cache_control: (blocks[lastIndex] as AnthropicTextBlock).cache_control ?? cacheControl(ttl),
    }
  }

  return blocks
}

function normalizeMessage(message: AnthropicMessageInput, ttl: AnthropicCacheTtl | null, applyBreakpoint = false) {
  return {
    role: message.role,
    content: normalizeContentBlocks(message.content, ttl, applyBreakpoint),
  }
}

function normalizeTools(tools: AnthropicToolDefinition[] | undefined, ttl: AnthropicCacheTtl | null, applyBreakpoint = false) {
  if (!tools || tools.length === 0) return undefined
  const normalized = tools.map((tool) => ({ ...tool }))
  if (applyBreakpoint && normalized.length > 0 && ttl) {
    const lastIndex = normalized.length - 1
    normalized[lastIndex] = {
      ...normalized[lastIndex],
      cache_control: normalized[lastIndex].cache_control ?? cacheControl(ttl),
    }
  }
  return normalized
}

function buildPromptParts(input: AnthropicRequestInput, ttl: AnthropicCacheTtl): BuiltAnthropicRequest {
  const cacheMode = input.cacheMode ?? 'explicit'
  const cacheTtl = input.cacheTtl ?? ttl
  const breakpointOnPrefix = cacheMode === 'explicit'

  const tools = normalizeTools(input.tools, cacheTtl, breakpointOnPrefix)
  const system = normalizeSystem(input.system, cacheTtl, breakpointOnPrefix)
  const prefixMessages = (input.prefixMessages ?? []).map((message, index, arr) =>
    normalizeMessage(message, cacheTtl, breakpointOnPrefix && index === arr.length - 1)
  )
  const messages = input.messages.map((message) => normalizeMessage(message, cacheTtl, false))

  const body: Record<string, unknown> = {
    model: input.model,
    max_tokens: input.maxTokens,
    messages: [...prefixMessages, ...messages],
  }

  if (tools) body.tools = tools
  if (system) body.system = system
  if (input.temperature != null) body.temperature = input.temperature
  if (input.topP != null) body.top_p = input.topP
  if (input.topK != null) body.top_k = input.topK
  if (input.metadata) body.metadata = input.metadata

  if (cacheMode === 'automatic') {
    body.cache_control = cacheControl(cacheTtl)
  }

  const prefixKey = sha256({
    model: input.model,
    maxTokens: input.maxTokens,
    cacheMode,
    cacheTtl,
    tools,
    system,
    prefixMessages,
  })

  const requestKey = sha256({
    prefixKey,
    messages,
    temperature: input.temperature ?? null,
    topP: input.topP ?? null,
    topK: input.topK ?? null,
    metadata: input.metadata ?? null,
  })

  return {
    body,
    requestKey,
    prefixKey,
    cacheMode,
    cacheTtl,
  }
}

function parseRetryAfter(headers: Headers) {
  const value = headers.get('retry-after')
  if (!value) return null
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return Math.max(1, Math.ceil(parsed))
  const date = Date.parse(value)
  if (Number.isNaN(date)) return null
  return Math.max(1, Math.ceil((date - Date.now()) / 1000))
}

function pickUpstreamCacheStatus(usage: AnthropicUsage | undefined): AnthropicCacheSnapshot<AnthropicResponse>['upstreamCacheStatus'] {
  if (!usage) return 'unknown'
  if ((usage.cache_read_input_tokens ?? 0) > 0) return 'read'
  if ((usage.cache_creation_input_tokens ?? 0) > 0 || Object.keys(usage.cache_creation ?? {}).length > 0) {
    return 'cacheable'
  }
  return 'live'
}

function cacheSnapshot<T>(
  entry: CacheEntry<T>,
  cacheStatus: AnthropicCacheStatus,
  errorMessage: string | null,
  rateLimitRetryAfterSeconds: number | null
): AnthropicCacheSnapshot<T> {
  return {
    value: entry.value as T,
    cacheStatus,
    cachedAt: new Date(entry.cachedAt).toISOString(),
    expiresAt: new Date(entry.expiresAt).toISOString(),
    lastSuccessfulAt: new Date(entry.lastSuccessfulAt).toISOString(),
    requestKey: entry.requestKey,
    prefixKey: entry.prefixKey,
    upstreamCacheStatus: entry.upstreamCacheStatus,
    rateLimitRetryAfterSeconds,
    errorMessage,
  }
}

export function createAnthropicCacheAdapter(options: AnthropicAdapterOptions = {}) {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null
  const apiVersion = options.apiVersion ?? process.env.ANTHROPIC_API_VERSION ?? DEFAULT_API_VERSION
  const baseUrl = options.baseUrl ?? process.env.ANTHROPIC_API_URL ?? DEFAULT_BASE_URL
  const defaultCacheTtl = (process.env.ANTHROPIC_CACHE_TTL as AnthropicCacheTtl | undefined) ?? options.defaultCacheTtl ?? DEFAULT_CACHE_TTL
  const staleGraceMs = options.staleGraceMs ?? Number(process.env.ANTHROPIC_CACHE_STALE_MS ?? DEFAULT_STALE_GRACE_MS)
  const refreshCapacity = options.refreshCapacity ?? Number(process.env.ANTHROPIC_REFRESH_CAPACITY ?? 6)
  const refreshRefillPerMinute = options.refreshRefillPerMinute ?? Number(process.env.ANTHROPIC_REFRESH_REFILL_PER_MINUTE ?? 6)
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? Date.now

  const cache = new Map<string, CacheEntry<AnthropicResponse>>()
  const refreshLimiter = new RateLimiter({
    capacity: Number.isFinite(refreshCapacity) && refreshCapacity > 0 ? refreshCapacity : 6,
    refillPerSecond:
      Number.isFinite(refreshRefillPerMinute) && refreshRefillPerMinute > 0
        ? refreshRefillPerMinute / 60
        : 6 / 60,
  })

  async function execute(input: AnthropicRequestInput): Promise<AnthropicCacheSnapshot<AnthropicResponse>> {
    const built = buildPromptParts(input, defaultCacheTtl)
    const existing = cache.get(built.requestKey)
    const startedAt = now()

    if (existing && existing.expiresAt > startedAt) {
      return cacheSnapshot(existing, 'hit', existing.lastError, null)
    }

    if (existing?.refreshing) {
      try {
        const value = await existing.refreshing
        const refreshed = cache.get(built.requestKey)
        if (refreshed) {
          return cacheSnapshot(refreshed, existing.expiresAt > startedAt ? 'refresh' : 'stale', refreshed.lastError, null)
        }
        return {
          value,
          cacheStatus: 'refresh',
          cachedAt: new Date(startedAt).toISOString(),
          expiresAt: new Date(startedAt).toISOString(),
          lastSuccessfulAt: new Date(startedAt).toISOString(),
          requestKey: built.requestKey,
          prefixKey: built.prefixKey,
          upstreamCacheStatus: 'unknown',
          rateLimitRetryAfterSeconds: null,
          errorMessage: null,
        }
      } catch (error) {
        if (existing && startedAt <= existing.staleUntil) {
          return cacheSnapshot(
            {
              ...existing,
              lastError: error instanceof Error ? error.message : 'Anthropic refresh failed',
            },
            'stale',
            error instanceof Error ? error.message : 'Anthropic refresh failed',
            null
          )
        }
        throw error
      }
    }

    if (!apiKey) {
      if (existing && startedAt <= existing.staleUntil) {
        return cacheSnapshot(existing, 'stale', 'Anthropic API key is unavailable.', null)
      }
      throw new Error('Anthropic API key is unavailable.')
    }

    const rateBudget = refreshLimiter.consume(built.prefixKey, 1)
    if (!rateBudget.ok) {
      if (existing && startedAt <= existing.staleUntil) {
        return cacheSnapshot(existing, 'stale', 'Local refresh budget exhausted.', rateBudget.retryAfterSeconds)
      }
      throw new Error(`Local refresh budget exhausted. Retry after ${rateBudget.retryAfterSeconds}s.`)
    }

    const refreshPromise = (async () => {
      const response = await fetchImpl(baseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': apiVersion,
          'content-type': 'application/json',
        },
        body: JSON.stringify(built.body),
        cache: 'no-store',
      })

      if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers)
        const text = await response.text()
        const message = text || `Anthropic request failed with ${response.status}`

        if (response.status === 401 || response.status === 403) {
          throw Object.assign(new Error(message), {
            name: 'AnthropicAuthError',
            status: response.status,
            retryAfterSeconds: retryAfter,
          })
        }

        if (response.status === 429) {
          throw Object.assign(new Error(message), {
            name: 'AnthropicRateLimitError',
            status: response.status,
            retryAfterSeconds: retryAfter,
            rateLimitHeaders: {
              requestsLimit: response.headers.get('anthropic-ratelimit-requests-limit'),
              requestsRemaining: response.headers.get('anthropic-ratelimit-requests-remaining'),
              requestsReset: response.headers.get('anthropic-ratelimit-requests-reset'),
              tokensLimit: response.headers.get('anthropic-ratelimit-tokens-limit'),
              tokensRemaining: response.headers.get('anthropic-ratelimit-tokens-remaining'),
              tokensReset: response.headers.get('anthropic-ratelimit-tokens-reset'),
              inputTokensLimit: response.headers.get('anthropic-ratelimit-input-tokens-limit'),
              inputTokensRemaining: response.headers.get('anthropic-ratelimit-input-tokens-remaining'),
              inputTokensReset: response.headers.get('anthropic-ratelimit-input-tokens-reset'),
              outputTokensLimit: response.headers.get('anthropic-ratelimit-output-tokens-limit'),
              outputTokensRemaining: response.headers.get('anthropic-ratelimit-output-tokens-remaining'),
              outputTokensReset: response.headers.get('anthropic-ratelimit-output-tokens-reset'),
            },
          })
        }

        throw new Error(message)
      }

      const json = (await response.json()) as AnthropicResponse
      const finishedAt = now()
      const freshnessMs = Math.max(1, finishedAt - startedAt)
      const expiresAt = finishedAt + Math.max(5 * 60_000, freshnessMs)
      const cachedValue = json

      cache.set(built.requestKey, {
        value: cachedValue,
        requestKey: built.requestKey,
        prefixKey: built.prefixKey,
        cachedAt: finishedAt,
        expiresAt,
        staleUntil: finishedAt + staleGraceMs,
        lastSuccessfulAt: finishedAt,
        lastError: null,
        upstreamCacheStatus: pickUpstreamCacheStatus(json.usage),
      })

      return cachedValue
    })()

    cache.set(built.requestKey, {
      value: existing?.value,
      requestKey: built.requestKey,
      prefixKey: built.prefixKey,
      cachedAt: existing?.cachedAt ?? startedAt,
      expiresAt: existing?.expiresAt ?? startedAt,
      staleUntil: existing?.staleUntil ?? startedAt + staleGraceMs,
      lastSuccessfulAt: existing?.lastSuccessfulAt ?? startedAt,
      lastError: existing?.lastError ?? null,
      refreshing: refreshPromise,
      upstreamCacheStatus: existing?.upstreamCacheStatus ?? 'unknown',
    })

    try {
      const value = await refreshPromise
      const refreshed = cache.get(built.requestKey)
      if (!refreshed) {
        return {
          value,
          cacheStatus: existing ? 'refresh' : 'miss',
          cachedAt: new Date(now()).toISOString(),
          expiresAt: new Date(now()).toISOString(),
          lastSuccessfulAt: new Date(now()).toISOString(),
          requestKey: built.requestKey,
          prefixKey: built.prefixKey,
          upstreamCacheStatus: pickUpstreamCacheStatus(value.usage),
          rateLimitRetryAfterSeconds: null,
          errorMessage: null,
        }
      }

      return cacheSnapshot(refreshed, existing ? 'refresh' : 'miss', null, null)
    } catch (error) {
      const retryAfterSeconds =
        error && typeof error === 'object' && 'retryAfterSeconds' in error
          ? (error as { retryAfterSeconds?: number | null }).retryAfterSeconds ?? null
          : null
      const message = error instanceof Error ? error.message : 'Anthropic request failed'
      const stale = cache.get(built.requestKey)
      if (stale && startedAt <= stale.staleUntil) {
        cache.set(built.requestKey, {
          ...stale,
          refreshing: undefined,
          lastError: message,
        })
        return cacheSnapshot(stale, 'stale', message, retryAfterSeconds)
      }
      throw error
    }
  }

  return {
    execute,
    peek(requestKey: string) {
      const entry = cache.get(requestKey)
      if (!entry) return null
      return cacheSnapshot(entry, entry.expiresAt > now() ? 'hit' : 'stale', entry.lastError, null)
    },
    clear(requestKey?: string) {
      if (requestKey) {
        cache.delete(requestKey)
        return
      }
      cache.clear()
    },
    buildRequest(input: AnthropicRequestInput) {
      return buildPromptParts(input, defaultCacheTtl)
    },
  }
}

export const anthropicCacheAdapter = createAnthropicCacheAdapter()
