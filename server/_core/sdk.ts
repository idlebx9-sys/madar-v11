/**
 * Compatibility shim — MADAR no longer depends on the external Forge SDK.
 * Session helpers live in ./auth.ts
 */
export { createSessionToken, verifySession, authenticateRequest } from "./auth";
