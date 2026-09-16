import type { CookieOptions, Request } from "express";
import { SESSION_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from "@shared/const";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Session (access) cookie options.
 * Prefer SameSite=Strict on apex; use None only when cross-subdomain cookies are required.
 */
export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // Strict is safer against CSRF; fall back to None only on secure cross-site needs
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: SESSION_MAX_AGE_MS,
  };
}

/** Refresh token cookie — longer lived, path-restricted, SameSite aligned. */
export function getRefreshCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/api/trpc", // keep available for refresh procedure
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}
