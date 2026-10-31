/**
 * Simple In-Memory Rate Limiter for Login Protection
 * Tracks failed attempts per identifier (IP or email) within a sliding or fixed time window.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      resetInSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  const resetInSeconds = Math.max(0, Math.ceil((record.resetAt - now) / 1000));

  return {
    allowed: record.count < MAX_ATTEMPTS,
    remaining,
    resetInSeconds,
  };
}

export function recordFailedAttempt(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + WINDOW_MS };
  } else {
    record.count += 1;
  }

  rateLimitStore.set(identifier, record);

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  const resetInSeconds = Math.max(0, Math.ceil((record.resetAt - now) / 1000));

  return {
    allowed: record.count < MAX_ATTEMPTS,
    remaining,
    resetInSeconds,
  };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

