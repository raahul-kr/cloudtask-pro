const redis = require("../lib/redis");

const localWindows = new Map();

function incrementLocal(key, windowSeconds) {
  const now = Date.now();
  const current = localWindows.get(key);
  if (!current || current.expiresAt <= now) localWindows.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
  else current.count += 1;
  const count = localWindows.get(key).count;
  if (localWindows.size > 10000) for (const [entry, value] of localWindows) if (value.expiresAt <= now) localWindows.delete(entry);
  return count;
}

function rateLimit({ windowSeconds = 60, maxRequests = 30, keyPrefix = "api" } = {}) {
  return async (req, res, next) => {
    const key = `cloudtask:ratelimit:${keyPrefix}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    let count;
    try {
      if (redis?.isReady) {
        count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
      } else {
        count = incrementLocal(key, windowSeconds);
      }
    } catch (error) {
      console.warn("Rate limit storage error:", error.message);
      count = incrementLocal(key, windowSeconds);
    }
    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(Math.max(0, maxRequests - count)));
    if (count > maxRequests) return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    return next();
  };
}

module.exports = { rateLimit };
