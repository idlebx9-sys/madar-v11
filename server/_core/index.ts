import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiLimiter, authLimiter } from "../middleware";
import { logger } from "../logger";
import { checkDatabaseReady, getPublishedSites, cleanupAnalyticsRetention } from "../db";
import Redis from "ioredis";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  const isProd = process.env.NODE_ENV === "production";

  // ─── Security Middleware ──────────────────────────────────────────────────
  app.use(helmet({
    // A real CSP only in production — the Vite dev server needs inline
    // scripts/styles and eval for HMR, which a strict policy would block.
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000", "https://madar.app", "https://*.madar.app"];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server
      const allowed = allowedOrigins.some(o => {
        if (o.startsWith("https://*.")) {
          const suffix = o.slice("https://*".length);
          return origin.startsWith("https://") && origin.endsWith(suffix) && origin.length > ("https://" + suffix).length;
        }
        return o === origin;
      });
      callback(null, allowed ? origin : false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "madar" }));
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /admin\nSitemap: " + `${process.env.APP_URL || "http://localhost:3000"}/sitemap.xml` + "\n");
  });
  app.get("/sitemap.xml", async (_req, res) => {
    const base = process.env.APP_URL || "http://localhost:3000";
    const sites = await getPublishedSites();
    const urls = sites.map((site) => `<url><loc>${base}/s/${site.subdomain}</loc><lastmod>${new Date(site.updatedAt).toISOString()}</lastmod></url>`).join("");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url>${urls}</urlset>`);
  });
  app.get("/ready", async (_req, res) => {
    const database = await checkDatabaseReady();
    let redis = true;
    if (process.env.REDIS_URL) {
      const client = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      try { await client.connect(); await client.ping(); } catch { redis = false; } finally { client.disconnect(); }
    }
    const { isStorageConfigured } = await import("../storage");
    const storage = isStorageConfigured();
    // Storage is optional for readiness in local/dev; required in production only if enforced.
    const ready = database;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks: { database, redis, storage } });
  });

  // Rate limiting
  app.use("/api/trpc", apiLimiter);
  app.use("/api/auth", authLimiter);
  app.use("/api/trpc/auth", authLimiter);
  app.use("/api/oauth", authLimiter);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
    cleanupAnalyticsRetention().catch((err) => logger.warn({ err }, "[Analytics] initial retention cleanup failed"));
    setInterval(() => cleanupAnalyticsRetention().catch((err) => logger.warn({ err }, "[Analytics] retention cleanup failed")), 60 * 60 * 1000).unref();
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Fatal error during server startup");
  process.exit(1);
});
