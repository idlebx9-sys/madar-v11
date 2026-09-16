import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import serverless from "serverless-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../../server/_core/oauth";
import { registerStorageProxy } from "../../server/_core/storageProxy";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";
import { apiLimiter, authLimiter } from "../../server/middleware";
import { ENV } from "../../server/_core/env";

const app = express();
const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(v => v.trim()).filter(Boolean) ?? [];
const origins = [...new Set(configuredOrigins)];

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!origins.length || origins.includes(origin) || origin === ENV.appUrl) return callback(null, origin);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "madar-netlify" }));
app.use("/api/trpc", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/trpc/auth", authLimiter);
app.use("/api/oauth", authLimiter);
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export const handler = serverless(app, { provider: "aws" });
