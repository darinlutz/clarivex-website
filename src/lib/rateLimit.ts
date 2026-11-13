// A small in-memory attempt counter that slows down bots guessing passwords or
// flooding the email forms. Per server instance and cleared on restart, which
// is enough to make brute force impractical.
const attempts = new Map<string, number[]>();

export type RateLimit = { max: number; windowMs: number };

// Records an attempt for `key` and returns true when it is over the limit.
export function tooManyAttempts(key: string, { max, windowMs }: RateLimit): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 10_000) {
    for (const [k, times] of attempts) {
      if (times.every((time) => now - time >= windowMs)) attempts.delete(k);
    }
  }
  return recent.length > max;
}

// The visitor's IP address as reported by the host's proxy
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}
