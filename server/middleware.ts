import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import { logger } from "./logger";

// Shared across instances when REDIS_URL is set, so rate limits hold up
// behind a load balancer / multiple containers. Falls back to the
// in-memory store (single-process only) when Redis isn't configured.
let redisClient: Redis | null = null;
function getRedisStore(prefix: string) {
  if (!process.env.REDIS_URL) return undefined;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    redisClient.on("error", (err) => logger.warn({ err }, "[Redis] connection error, rate limiting will fall back to in-memory"));
    redisClient.connect().catch((err) => logger.warn({ err }, "[Redis] initial connect failed"));
  }
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => redisClient!.call(...args) as Promise<any>,
  });
}

// General API rate limiter: 100 requests per minute per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith("/api/oauth"),
  store: getRedisStore("rl:api:"),
});

// Strict limiter for auth endpoints: 10 requests per minute
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
  store: getRedisStore("rl:auth:"),
});
