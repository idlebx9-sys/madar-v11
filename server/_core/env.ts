/**
 * Central environment configuration for MADAR.
 * All secrets must be provided via environment variables — never hardcode.
 */
export const ENV = {
  // Core
  isProduction: process.env.NODE_ENV === "production",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  appDomain: process.env.APP_DOMAIN ?? "madar.app",
  publicSiteBaseUrl: process.env.PUBLIC_SITE_BASE_URL ?? "https://madar.app",

  // Auth / sessions
  cookieSecret: process.env.JWT_SECRET ?? "",
  /** Optional: first admin user openId (or email) promoted automatically */
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // S3-compatible object storage (R2 / S3 / MinIO)
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",

  // Optional Google OAuth (manual)
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // Telegram notifications (outbound only; no bot commands/webhooks)
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",

  // Legacy aliases kept only so gradual migration does not break imports.
  // These are intentionally empty and must not be used in new code.
  appId: "",
  oAuthServerUrl: "",
  forgeApiUrl: "",
  forgeApiKey: "",
};

export function assertCriticalEnv() {
  const missing: string[] = [];
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 32) {
    missing.push("JWT_SECRET (min 32 chars)");
  }
  if (!ENV.databaseUrl) {
    missing.push("DATABASE_URL");
  }
  if (ENV.isProduction && missing.length) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
  if (missing.length) {
    console.warn(`[ENV] Warning — missing recommended vars: ${missing.join(", ")}`);
  }
}
