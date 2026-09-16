/**
 * Local authentication routes (email/password + optional Google OAuth).
 * Replaces the previous Forge OAuth portal dependency.
 * Includes email verification + password-reset flows.
 */
import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { z } from "zod";
import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
} from "@shared/const";
import * as db from "../db";
import {
  createSessionToken,
  generateOpenId,
  hashPassword,
  verifyPassword,
  createSecureToken,
  hashToken,
  createRefreshTokenValue,
} from "./auth";
import { getSessionCookieOptions, getRefreshCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sendEmailNotification } from "./notification";

const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(320).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(320).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

const resetRequestSchema = z.object({
  email: z.string().email().max(320).transform((s) => s.toLowerCase().trim()),
});

const resetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(20).max(200),
});

function readCookie(req: Request, name: string): string | undefined {
  const parsed = parseCookieHeader(req.headers.cookie ?? "");
  return parsed[name];
}

async function issueSession(
  req: Request,
  res: Response,
  user: { id: number; openId: string; name?: string | null },
) {
  const token = await createSessionToken(user, { expiresInMs: SESSION_MAX_AGE_MS });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });

  // Issue refresh token
  const { token: refreshPlain, tokenHash } = createRefreshTokenValue();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
  await db.createRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 255),
    ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip,
  });
  const refreshOpts = getRefreshCookieOptions(req);
  res.cookie(REFRESH_COOKIE_NAME, refreshPlain, {
    ...refreshOpts,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
  return token;
}

export function registerOAuthRoutes(app: Express) {
  // ─── Email / Password Register ─────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "بيانات غير صالحة", details: parsed.error.flatten() });
        return;
      }
      const { name, email, password } = parsed.data;

      const existing = await db.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
        return;
      }

      const openId = generateOpenId("email");
      const passwordHash = await hashPassword(password);
      const role =
        ENV.ownerOpenId && (ENV.ownerOpenId === email || ENV.ownerOpenId === openId)
          ? ("admin" as const)
          : ("user" as const);

      await db.createLocalUser({
        openId,
        name,
        email,
        passwordHash,
        loginMethod: "email",
        role,
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "فشل إنشاء الحساب" });
        return;
      }

      // Create email verification token
      const { token: verifyToken, tokenHash } = createSecureToken();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
      await db.createAuthToken({
        userId: user.id,
        type: "email_verify",
        tokenHash,
        expiresAt,
      });
      const verifyUrl = `${ENV.appUrl}/api/auth/verify-email?token=${verifyToken}`;
      await sendEmailNotification(user, {
        title: "تأكيد البريد الإلكتروني — مدار",
        content: `مرحباً ${name}،\n\nيرجى تأكيد بريدك الإلكتروني عبر الرابط التالي (صالح 24 ساعة):\n${verifyUrl}\n\nإذا لم تطلب هذا، تجاهل الرسالة.`,
        type: "email_verify",
      });

      await issueSession(req, res, user);
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: false,
        },
        message: "تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني.",
      });
    } catch (err) {
      console.error("[Auth] Register failed", err);
      res.status(500).json({ error: "فشل التسجيل" });
    }
  });

  // ─── Email / Password Login ────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "بيانات غير صالحة" });
        return;
      }
      const { email, password } = parsed.data;
      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
        return;
      }
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
        return;
      }
      if (user.deletedAt) {
        res.status(403).json({ error: "الحساب محذوف" });
        return;
      }

      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      await issueSession(req, res, user);
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: !!user.emailVerifiedAt,
        },
      });
    } catch (err) {
      console.error("[Auth] Login failed", err);
      res.status(500).json({ error: "فشل تسجيل الدخول" });
    }
  });

  // ─── Verify Email ──────────────────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const token = String(req.query.token || "");
      if (!token || token.length < 20) {
        res.status(400).send("رابط غير صالح");
        return;
      }
      const tokenHash = hashToken(token);
      const record = await db.findValidAuthToken(tokenHash, "email_verify");
      if (!record) {
        res.status(400).send("الرابط منتهي أو مستخدم مسبقاً");
        return;
      }
      await db.markAuthTokenUsed(record.id);
      await db.markEmailVerified(record.userId);
      res.redirect(`${ENV.appUrl}/dashboard?verified=1`);
    } catch (err) {
      console.error("[Auth] Verify email failed", err);
      res.status(500).send("حدث خطأ");
    }
  });

  // ─── Request Password Reset ────────────────────────────────────────────────
  app.post("/api/auth/password-reset/request", async (req: Request, res: Response) => {
    try {
      const parsed = resetRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "بريد غير صالح" });
        return;
      }
      const { email } = parsed.data;
      const user = await db.getUserByEmail(email);
      // Always return success to avoid email enumeration
      if (user && !user.deletedAt) {
        const { token, tokenHash } = createSecureToken();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h
        await db.createAuthToken({
          userId: user.id,
          type: "password_reset",
          tokenHash,
          expiresAt,
        });
        const resetUrl = `${ENV.appUrl}/account?resetToken=${token}`;
        await sendEmailNotification(user, {
          title: "إعادة تعيين كلمة المرور — مدار",
          content: `طلبت إعادة تعيين كلمة المرور.\n\nالرابط صالح لمدة ساعة:\n${resetUrl}\n\nإذا لم تطلب هذا، تجاهل الرسالة.`,
          type: "password_reset",
        });
      }
      res.json({ success: true, message: "إذا كان البريد مسجلاً، ستصلك رسالة." });
    } catch (err) {
      console.error("[Auth] Password reset request failed", err);
      res.status(500).json({ error: "فشل الطلب" });
    }
  });

  // ─── Confirm Password Reset ────────────────────────────────────────────────
  app.post("/api/auth/password-reset/confirm", async (req: Request, res: Response) => {
    try {
      const parsed = resetConfirmSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "بيانات غير صالحة" });
        return;
      }
      const { token, newPassword } = parsed.data;
      const tokenHash = hashToken(token);
      const record = await db.findValidAuthToken(tokenHash, "password_reset");
      if (!record) {
        res.status(400).json({ error: "الرابط منتهي أو غير صالح" });
        return;
      }
      await db.markAuthTokenUsed(record.id);
      const passwordHash = await hashPassword(newPassword);
      const dbConn = await db.getDb();
      if (!dbConn) {
        res.status(500).json({ error: "قاعدة البيانات غير متاحة" });
        return;
      }
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await dbConn.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
      // Revoke all refresh tokens for security
      await db.revokeAllUserRefreshTokens(record.userId);
      res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح" });
    } catch (err) {
      console.error("[Auth] Password reset confirm failed", err);
      res.status(500).json({ error: "فشل التحديث" });
    }
  });

  // ─── Refresh session ───────────────────────────────────────────────────────
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const refreshPlain = readCookie(req, REFRESH_COOKIE_NAME);
      if (!refreshPlain) {
        res.status(401).json({ error: "لا يوجد رمز تحديث" });
        return;
      }
      const tokenHash = hashToken(refreshPlain);
      const record = await db.findValidRefreshToken(tokenHash);
      if (!record) {
        res.status(401).json({ error: "رمز التحديث غير صالح أو منتهي" });
        return;
      }
      // Rotate: revoke old, issue new
      await db.revokeRefreshToken(record.id);
      const user = await db.getUserById(record.userId);
      if (!user || user.deletedAt) {
        res.status(401).json({ error: "المستخدم غير موجود" });
        return;
      }
      await issueSession(req, res, user);
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] Refresh failed", err);
      res.status(500).json({ error: "فشل التحديث" });
    }
  });

  // ─── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    const refreshOpts = getRefreshCookieOptions(req);
    res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshOpts, maxAge: -1 });
    // Best-effort revoke
    const refreshPlain = readCookie(req, REFRESH_COOKIE_NAME);
    if (refreshPlain) {
      try {
        const tokenHash = hashToken(refreshPlain);
        const record = await db.findValidRefreshToken(tokenHash);
        if (record) await db.revokeRefreshToken(record.id);
      } catch {
        /* ignore */
      }
    }
    res.json({ success: true });
  });

  // ─── Optional Google OAuth (if credentials configured) ─────────────────────
  app.get("/api/auth/google", (_req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(501).json({ error: "Google OAuth غير مفعّل" });
      return;
    }
    const redirectUri = `${ENV.appUrl}/api/auth/google/callback`;
    const state = crypto.randomUUID();
    const isProd = ENV.isProduction;
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 600_000,
      path: "/",
    });
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      if (!ENV.googleClientId || !ENV.googleClientSecret) {
        res.status(501).send("Google OAuth غير مفعّل");
        return;
      }
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      const storedState = readCookie(req, "oauth_state");
      if (!code || !state || state !== storedState) {
        res.status(403).send("حالة OAuth غير صالحة");
        return;
      }
      res.clearCookie("oauth_state", { path: "/" });

      const redirectUri = `${ENV.appUrl}/api/auth/google/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) {
        res.status(500).send("فشل تبادل الرمز");
        return;
      }
      const tokens = (await tokenRes.json()) as { access_token?: string };
      if (!tokens.access_token) {
        res.status(500).send("لا يوجد access_token");
        return;
      }
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileRes.ok) {
        res.status(500).send("فشل جلب الملف الشخصي");
        return;
      }
      const profile = (await profileRes.json()) as {
        id: string;
        email?: string;
        name?: string;
        verified_email?: boolean;
      };

      const openId = `google_${profile.id}`;
      let user = await db.getUserByOpenId(openId);
      if (!user && profile.email) {
        user = await db.getUserByEmail(profile.email);
      }
      if (!user) {
        const role =
          ENV.ownerOpenId &&
          (ENV.ownerOpenId === profile.email || ENV.ownerOpenId === openId)
            ? ("admin" as const)
            : ("user" as const);
        await db.createLocalUser({
          openId,
          name: profile.name || null,
          email: profile.email || null,
          passwordHash: null,
          loginMethod: "google",
          role,
          lastSignedIn: new Date(),
          emailVerifiedAt: profile.verified_email ? new Date() : null,
        } as any);
        user = await db.getUserByOpenId(openId);
      } else {
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
          name: profile.name || user.name,
        });
        if (profile.verified_email && !user.emailVerifiedAt) {
          await db.markEmailVerified(user.id);
        }
      }
      if (!user) {
        res.status(500).send("فشل إنشاء/جلب المستخدم");
        return;
      }
      await issueSession(req, res, user);
      res.redirect(`${ENV.appUrl}/dashboard`);
    } catch (err) {
      console.error("[Auth] Google callback failed", err);
      res.status(500).send("Google login failed");
    }
  });
}
