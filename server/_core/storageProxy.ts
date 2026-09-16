/**
 * Proxy /madar-storage/* → presigned S3 GET (or public URL redirect).
 * Keeps media URLs stable even when objects are private.
 */
import type { Express } from "express";
import { storageGetSignedUrl, isStorageConfigured } from "../storage";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/madar-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || key.includes("..")) {
      res.status(400).send("Missing or invalid storage key");
      return;
    }

    // If a public CDN/base URL is configured, redirect there directly.
    if (ENV.s3PublicBaseUrl) {
      const url = `${ENV.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`;
      res.set("Cache-Control", "public, max-age=86400");
      res.redirect(302, url);
      return;
    }

    if (!isStorageConfigured()) {
      res.status(503).send("Storage not configured");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key, 3600);
      res.set("Cache-Control", "private, max-age=300");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
