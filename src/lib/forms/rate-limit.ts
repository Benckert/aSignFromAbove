import 'server-only';

/**
 * A small in-memory rate limit.
 *
 * This guards the contact forms against someone holding down submit, which on
 * a site whose only backend is email means filling the workshop's inbox. It
 * lives in the process's memory, which has two honest consequences: it resets
 * on deploy, and it does not coordinate across instances. For a workshop site
 * receiving a handful of enquiries a week that is the right amount of
 * machinery — a shared store would be more infrastructure to run and secure
 * than the problem warrants.
 *
 * If the site is ever scaled out, replace the map with a shared store; nothing
 * outside this file needs to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
/** Stop the map growing without bound on a long-lived process. */
const MAX_TRACKED = 5000;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > MAX_TRACKED) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Identifies the caller for rate-limiting purposes.
 *
 * The address is used to compare one request against another and is never
 * stored or logged — which is why it is hashed down to a short, non-reversible
 * key rather than kept as an IP address.
 */
export async function rateLimitKey(headers: Headers): Promise<string> {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const raw = forwarded || headers.get('x-real-ip') || 'unknown';

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
