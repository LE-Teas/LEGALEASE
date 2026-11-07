/**
 * @deprecated Kept only so existing imports keep working.
 *
 * The rate limiter now lives in `lib/security/rate-limit.ts` because more than
 * one feature needs it (chat, CNIC lookup, uploads). Having two independent
 * implementations would mean two separate budgets for the same request, which
 * is weaker than one shared budget.
 *
 * Import from `@/lib/security/rate-limit` in new code.
 */

export {
  rateLimit,
  CHAT_RATE_LIMIT,
  type RateLimitConfig,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
