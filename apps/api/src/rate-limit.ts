export type RateLimiter = (key: string, now: Date) => boolean;

interface Window {
  startedAt: number;
  count: number;
}

/** Fixed-window limiter. Returns true when the request is allowed. */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const windows = new Map<string, Window>();

  return (key, now) => {
    const time = now.getTime();
    const current = windows.get(key);
    const window =
      current && time - current.startedAt < windowMs ? current : { startedAt: time, count: 0 };

    if (window.count >= limit) return false;
    windows.set(key, { ...window, count: window.count + 1 });
    return true;
  };
}
