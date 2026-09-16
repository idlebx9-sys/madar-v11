/**
 * Independent session + password auth for MADAR.
 * Uses scrypt for password hashing and jose (JWT) for session cookies.
 * Access tokens are short-lived (14d); refresh tokens live 30d and are rotated.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
} from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const scryptAsync = promisify(crypto.scrypt);

export type SessionPayload = {
  openId: string;
  name: string;
  userId: number;
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

// ─── Password hashing (scrypt) ───────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

// ─── JWT session ─────────────────────────────────────────────────────────────
function getSessionSecret() {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  user: { openId: string; id: number; name?: string | null },
  options: { expiresInMs?: number } = {},
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? SESSION_MAX_AGE_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  return new SignJWT({
    openId: user.openId,
    userId: user.id,
    name: user.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySession(
  cookieValue: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const openId = payload.openId;
    const name = payload.name;
    const userId = payload.userId;
    if (!isNonEmptyString(openId) || typeof userId !== "number") {
      return null;
    }
    return {
      openId,
      name: isNonEmptyString(name) ? name : "",
      userId,
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

/**
 * Authenticate an incoming request from session cookie or Bearer token.
 * Returns the DB user or throws ForbiddenError.
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  let sessionToken = cookies.get(COOKIE_NAME);

  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
    }
  }

  const session = await verifySession(sessionToken);
  if (!session) {
    throw ForbiddenError("Invalid session");
  }

  let user = await db.getUserByOpenId(session.openId);
  if (!user && session.userId) {
    user = await db.getUserById(session.userId);
  }
  if (!user || user.deletedAt) {
    throw ForbiddenError("User not found");
  }
  return user;
}

/** Generate a stable openId for email-registered users. */
export function generateOpenId(prefix = "local"): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

// ─── Secure one-time tokens (email verify / password reset) ─────────────────
/** Generate a cryptographically random token and its SHA-256 hash for storage. */
export function createSecureToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Refresh token helpers */
export function createRefreshTokenValue(): {
  token: string;
  tokenHash: string;
} {
  return createSecureToken();
}

export { SESSION_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS };
