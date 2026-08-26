const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// Temizle - her 5 dakikada bir
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimit.entries()) {
      if (now > val.resetAt) rateLimit.delete(key);
    }
  }, 5 * 60 * 1000);
}
