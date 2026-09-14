import 'server-only'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/**
 * Fixed-window rate limiter, scoped per key (e.g. `${userId}:${action}`).
 *
 * This is in-memory and per-process. On a single long-running server it's a real limit;
 * on Vercel's serverless platform, concurrent invocations can land on different function
 * instances that don't share this Map, so it does not enforce one global ceiling across
 * every instance. It still meaningfully throttles a single client hammering a HIGH-risk
 * endpoint (repeated requests from one connection tend to hit the same warm instance) and
 * costs nothing extra to run. For a hard cross-instance guarantee, swap this for a shared
 * store (e.g. Upstash Redis) — the call site below wouldn't need to change.
 */
export function checkRateLimit(key: string, opts: { max: number; windowMs: number }): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }
  if (bucket.count >= opts.max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }
  bucket.count += 1
  return { allowed: true, retryAfterMs: 0 }
}
