const { createClient } = require("redis");

const redis = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
redis.on("error", (error) => console.warn("Redis connection error:", error.message));
redis.connect().catch((error) => console.warn("Redis is unavailable; rate limits will use local memory:", error.message));

module.exports = redis;
