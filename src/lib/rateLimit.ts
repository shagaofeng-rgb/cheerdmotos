const buckets = new Map<string, {count: number; resetAt: number}>();

export function clientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {count: 1, resetAt: now + windowMs});
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
