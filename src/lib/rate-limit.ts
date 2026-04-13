type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number }

type Bucket = {
  tokens: number
  updatedAtMs: number
}

type RateLimiterOptions = {
  capacity: number
  refillPerSecond: number
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>()
  private readonly capacity: number
  private readonly refillPerSecond: number

  constructor(options: RateLimiterOptions) {
    this.capacity = options.capacity
    this.refillPerSecond = options.refillPerSecond
  }

  consume(key: string, cost = 1): RateLimitResult {
    const now = Date.now()
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAtMs: now }
    const elapsedSeconds = Math.max(0, (now - bucket.updatedAtMs) / 1000)
    const refill = elapsedSeconds * this.refillPerSecond
    const nextTokens = Math.min(this.capacity, bucket.tokens + refill)

    if (nextTokens < cost) {
      const deficit = cost - nextTokens
      const retryAfterSeconds = Math.max(1, Math.ceil(deficit / this.refillPerSecond))
      this.buckets.set(key, { tokens: nextTokens, updatedAtMs: now })
      return { ok: false, retryAfterSeconds }
    }

    this.buckets.set(key, { tokens: nextTokens - cost, updatedAtMs: now })
    return { ok: true }
  }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

