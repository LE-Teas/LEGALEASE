/**
 * Shared in-memory rate limiter.
 *
 * Used by the chat endpoint (expensive LLM calls) and by CNIC lookup
 * (enumeration defence). One implementation, several named configs — do not
 * add a second limiter elsewhere.
 *
 * LIMITATION: state is per-process. On serverless/multi-instance deployments
 * each instance has its own budget, so the effective limit is
 * `max * instance_count`. For a stricter guarantee, back this with Redis or a
 * Postgres counter; the call sites do not need to change.
 */

interface WindowState {
  timestamps: number[];
}

const buckets = new Map<string, WindowState>();

export interface RateLimitConfig {
  /** Max hits per windowMs. */
  max: number;
  windowMs: number;
}

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Chat: expensive (LLM + embedding + vector search). */
export const CHAT_RATE_LIMIT: RateLimitConfig = {
  max: positiveIntEnv("LEGALEASE_CHAT_RATE_LIMIT", 10),
  windowMs: 60_000,
};

/**
 * CNIC lookup: deliberately tight. The ATL covers millions of people, so a
 * generous budget turns the endpoint into an enumeration oracle.
 */
export const CNIC_LOOKUP_RATE_LIMIT: RateLimitConfig = {
  max: positiveIntEnv("LEGALEASE_CNIC_RATE_LIMIT", 5),
  windowMs: 60_000,
};

/** Modest budget for file uploads (each triggers parsing + storage writes). */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  max: positiveIntEnv("LEGALEASE_UPLOAD_RATE_LIMIT", 20),
  windowMs: 60_000,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Records a hit for `key` and reports whether it is allowed.
 * Keys should be namespaced per feature, e.g. `chat:<userId>`.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = CHAT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  let state = buckets.get(key);
  if (!state) {
    state = { timestamps: [] };
    buckets.set(key, state);
  }

  state.timestamps = state.timestamps.filter((t) => now - t < config.windowMs);

  if (state.timestamps.length >= config.max) {
    const oldest = state.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, config.windowMs - (now - oldest)),
    };
  }

  state.timestamps.push(now);
  return { allowed: true, remaining: config.max - state.timestamps.length, retryAfterMs: 0 };
}

/** Test-only: clears all buckets so assertions start from a known state. */
export function __resetRateLimitsForTests(): void {
  buckets.clear();
}

// Prevent unbounded memory growth on long-running processes. The longest
// window we configure bounds how long an entry can stay relevant.
const REAP_MS = Math.max(
  CHAT_RATE_LIMIT.windowMs,
  CNIC_LOOKUP_RATE_LIMIT.windowMs,
  UPLOAD_RATE_LIMIT.windowMs
);

const reaper = setInterval(() => {
  const now = Date.now();
  for (const [key, state] of buckets) {
    state.timestamps = state.timestamps.filter((t) => now - t < REAP_MS);
    if (state.timestamps.length === 0) buckets.delete(key);
  }
}, REAP_MS);
// `unref` keeps scripts and short-lived requests from hanging on the timer.
if (typeof reaper.unref === "function") reaper.unref();
