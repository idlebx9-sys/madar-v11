import { COOKIE_NAME, REFRESH_COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import { z } from "zod";
import { getSessionCookieOptions, getRefreshCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut, createPresignedUpload } from "./storage";
import { hashPassword, verifyPassword } from "./_core/auth";
import {
  createMessage,
  createSite,
  deleteSite,
  getMessagesByUserId,
  getMessageById,
  getSiteById,
  getSiteByIdBySubdomain,
  getSitesByUserId,
  getUserById,
  getUserByEmail,
  updateUserProfile,
  softDeleteUser,
  markAllMessagesRead,
  markMessageRead,
  updateSite,
  publishSite,
  unpublishSite,
  getSiteVersions,
  restoreSiteVersion,
  getPublishedSiteByHostname,
  recordSiteVisit,
  getAnalyticsDaily,
  recordLeadAnalytics,
  createDomain,
  getDomainById,
  setDomainStatus,
  getAllUsers,
  getAllSites,
  getAllDomains,
  addAuditLog,
  createMediaAsset,
  removeDomain,
  setPrimaryDomain,
} from "./db";
import {
  createPurchaseRequest, listMinePurchaseRequests, listPurchaseRequests, reviewPurchaseRequest,
  createDepositRequest, createDepositUpload, listDepositRequests, approveDeposit, rejectDeposit, cancelDeposit, listPaymentMethods, createPaymentMethod, updatePaymentMethod, removePaymentMethod, createPaymentMethodUpload,
  getWalletSummary, getWalletTransactions, getRates, updateRate, convertCurrency, payForSite,
  refundSitePurchase, adminWalletAdjustment, getAdminRevenueSummary, getAdminWalletTotals, getSettings, updateSettings,
} from "./commerce";

// ─── Input sanitization helpers ───────────────────────────────────────────────
const sanitizeString = (s: string) =>
  s.replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").trim();

const siteInputSchema = z.object({
  name: z.string().min(2).max(100).transform(sanitizeString),
  subdomain: z
    .string()
    .min(0)
    .max(50)
    .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens")
    .transform((s) => s.toLowerCase().trim()),
  template: z.enum(["modern", "minimal", "bold", "elegant", "tech", "restaurant"]).default("modern"),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().max(2048).refine((value) => value === "" || /^https?:\/\//i.test(value) || value.startsWith("/madar-storage/"), "Invalid logo URL").optional(),
  tagline: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  whatsapp: z
    .string()
    .max(30)
    .regex(/^[+\d\s-]*$/)
    .optional(),
  sections: z
    .object({
      hero: z.boolean().optional(),
      about: z.boolean().optional(),
      services: z.boolean().optional(),
      gallery: z.boolean().optional(),
      contact: z.boolean().optional(),
    })
    .optional(),
  galleryImages: z.array(z.string().max(2048).refine((value) => /^https?:\/\//i.test(value) || value.startsWith("/madar-storage/"), "Invalid image URL")).max(20).optional(),
});

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      const refreshOpts = getRefreshCookieOptions(ctx.req);
      ctx.res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshOpts, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Sites ────────────────────────────────────────────────────────────────
  sites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getSitesByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const site = await getSiteById(input.id);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        if (site.userId !== ctx.user.id)
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        return site;
      }),

    create: protectedProcedure
      .input(siteInputSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await getSitesByUserId(ctx.user.id);
        if (!existing.length) throw new TRPCError({ code: "FORBIDDEN", message: "يجب شراء موقع من خلال طلب شراء معتمد قبل إنشاء الموقع" });
        const subdomain = input.subdomain || `${nanoid(8).toLowerCase()}`;
        const duplicate = existing.some((site) => site.subdomain === subdomain);
        if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "هذا النطاق الفرعي مستخدم بالفعل" });
        await createSite({
          userId: ctx.user.id,
          name: input.name,
          subdomain,
          template: input.template,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          logoUrl: input.logoUrl || null,
          tagline: input.tagline || null,
          description: input.description || null,
          whatsapp: input.whatsapp || null,
          sections: input.sections as Record<string, boolean> | undefined,
          galleryImages: input.galleryImages,
          draftContent: {
            name: input.name,
            tagline: input.tagline || "",
            description: input.description || "",
          },
        });
        await addAuditLog({ userId: ctx.user.id, action: "site.updated.created", entityType: "site", metadata: { subdomain } });
        return getSiteByIdBySubdomain(subdomain);
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), data: siteInputSchema.partial() }))
      .mutation(async ({ ctx, input }) => {
        const site = await getSiteById(input.id);
        if (!site) throw new TRPCError({ code: "NOT_FOUND" });
        if (site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await updateSite(input.id, input.data as Parameters<typeof updateSite>[1]);
        return getSiteById(input.id);
      }),

    toggleSection: protectedProcedure
      .input(z.object({ siteId: z.number().int().positive(), section: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const site = await getSiteById(input.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND" });
        if (site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const sections = (site.sections as Record<string, boolean>) || {};
        sections[input.section] = input.enabled;
        await updateSite(input.siteId, { sections });
        return { success: true };
      }),

    updateGallery: protectedProcedure
      .input(z.object({ siteId: z.number().int().positive(), images: z.array(z.string()).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const site = await getSiteById(input.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND" });
        if (site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await updateSite(input.siteId, { galleryImages: input.images });
        return { success: true };
      }),

    publish: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => publishSite(input.id, ctx.user.id)),

    unpublish: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => unpublishSite(input.id, ctx.user.id)),

    versions: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const site = await getSiteById(input.id);
        if (!site || site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return getSiteVersions(input.id);
      }),
    restoreVersion: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), version: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await restoreSiteVersion(input.id, input.version, ctx.user.id);
        } catch (error) {
          if (error instanceof Error && error.message === "Version not found") throw new TRPCError({ code: "NOT_FOUND" });
          if (error instanceof Error && error.message === "Site not found") throw new TRPCError({ code: "FORBIDDEN" });
          throw error;
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const site = await getSiteById(input.id);
        if (!site) throw new TRPCError({ code: "NOT_FOUND" });
        if (site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await deleteSite(input.id);
        return { success: true };
      }),
  }),

  // ─── Messages ─────────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => { const db = await import("./db"); const conn = await db.getDb(); if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { notifications } = await import("../drizzle/schema"); const { desc, eq } = await import("drizzle-orm"); return conn.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(100); }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => { const db = await import("./db"); const conn = await db.getDb(); if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { notifications } = await import("../drizzle/schema"); const { and, eq, sql } = await import("drizzle-orm"); const rows = await conn.select({ count: sql<number>`COUNT(*)` }).from(notifications).where(and(eq(notifications.userId, ctx.user.id), sql`${notifications.readAt} IS NULL`)); return Number(rows[0]?.count ?? 0); }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await import("./db"); const conn = await db.getDb(); if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { notifications } = await import("../drizzle/schema"); const { and, eq } = await import("drizzle-orm"); await conn.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id,input.id),eq(notifications.userId,ctx.user.id))); return { success: true }; }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => { const db = await import("./db"); const conn = await db.getDb(); if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { notifications } = await import("../drizzle/schema"); const { and, eq, sql } = await import("drizzle-orm"); await conn.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId,ctx.user.id),sql`${notifications.readAt} IS NULL`)); return { success: true }; }),
  }),

  messages: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getMessagesByUserId(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const message = await getMessageById(input.id);
        if (!message) throw new TRPCError({ code: "NOT_FOUND" });
        if (message.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        await markMessageRead(input.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllMessagesRead(ctx.user.id);
      return { success: true };
    }),

    // Public endpoint for visitors to send messages
    send: publicProcedure
      .input(
        z.object({
          siteId: z.number().int().positive(),
          senderName: z.string().min(1).max(100).transform(sanitizeString),
          senderEmail: z.string().email().optional(),
          senderPhone: z.string().max(30).optional(),
          content: z.string().min(1).max(2000).transform(sanitizeString),
          honeypot: z.string().max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.honeypot) return { success: true };
        const site = await getSiteById(input.siteId);
        if (!site || site.publishStatus !== "published" || !site.isActive) throw new TRPCError({ code: "NOT_FOUND" });
        await createMessage({ siteId: site.id, userId: site.userId, senderName: input.senderName, senderEmail: input.senderEmail, senderPhone: input.senderPhone, content: input.content });
        await recordLeadAnalytics(site.id);
        try {
          const { notifyUser } = await import("./_core/notification");
          await notifyUser(site.userId, {
            type: "new_message",
            title: `رسالة جديدة من ${input.senderName}`,
            content: input.content.slice(0, 500),
          });
        } catch (err) {
          console.warn("[messages] notify failed", err);
        }
        return { success: true };
      }),
  }),

  // ─── Marketplace / Wallet / Currency ──────────────────────────────────────
  purchaseRequests: router({
    config: publicProcedure.query(async () => ({ enabled: (await import("./commerce")).getSetting("site_purchase_enabled", "true"), price: (await import("./commerce")).getSetting("site_purchase_price", "500.00"), currency: (await import("./commerce")).getSetting("site_purchase_currency", "USD") })),
    create: protectedProcedure.input(z.object({ fullName: z.string().min(2).max(255).transform(sanitizeString), email: z.string().email(), whatsapp: z.string().min(5).max(40), phone: z.string().max(40).optional() })).mutation(({ ctx, input }) => createPurchaseRequest(ctx.user.id, input)),
    listMine: protectedProcedure.query(({ ctx }) => listMinePurchaseRequests(ctx.user.id)),
    cancel: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await import("./db"); const conn = await db.getDb(); if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { purchaseRequests } = await import("../drizzle/schema"); const { and, eq } = await import("drizzle-orm");
      const row = (await conn.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.id)).limit(1))[0];
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "لا يمكن إلغاء هذا الطلب الآن" });
      await conn.update(purchaseRequests).set({ status: "cancelled" }).where(and(eq(purchaseRequests.id, input.id), eq(purchaseRequests.status, "pending")));
      return { success: true };
    }),
    pay: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive() })).mutation(({ ctx, input }) => payForSite(ctx.user.id, input.purchaseRequestId)),
  }),

  wallet: router({
    paymentMethods: protectedProcedure.query(() => listPaymentMethods(false)),
    summary: protectedProcedure.query(({ ctx }) => getWalletSummary(ctx.user.id)),
    transactions: protectedProcedure.query(({ ctx }) => getWalletTransactions(ctx.user.id)),
    deposit: router({
      createUpload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(180), contentType: z.enum(["image/png","image/jpeg","image/webp"]), sizeBytes: z.number().int().positive().max(8*1024*1024) })).mutation(({ ctx, input }) => createDepositUpload(ctx.user.id, input)),
      create: protectedProcedure.input(z.object({ amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/), currency: z.enum(["USD","SAR","TRY"]), paymentMethodId: z.number().int().positive(), txId: z.string().min(3).max(255), screenshotKey: z.string().min(1).max(512), screenshotUrl: z.string().url().or(z.string().startsWith("/madar-storage/")), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => createDepositRequest(ctx.user.id, input)),
      listMine: protectedProcedure.query(({ ctx }) => listDepositRequests(ctx.user.id)),
    }),
  }),

  currency: router({
    rates: protectedProcedure.query(getRates),
    convert: protectedProcedure.input(z.object({ fromCurrency: z.enum(["USD","SAR","TRY"]), toCurrency: z.enum(["USD","SAR","TRY"]), amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/) })).mutation(({ ctx, input }) => convertCurrency(ctx.user.id, input)),
  }),

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const userSites = await getSitesByUserId(ctx.user.id);
      const userMessages = await getMessagesByUserId(ctx.user.id);
      const wallet = await getWalletSummary(ctx.user.id);
      const totalVisitors = userSites.reduce((sum, s) => sum + s.visitorCount, 0);
      const unreadMessages = userMessages.filter((m) => !m.isRead).length;
      const analyticsRows = (await Promise.all(userSites.map(s => getAnalyticsDaily(s.id, 30)))).flat();
      const byDay = new Map<string, { visitors: number; messages: number }>();
      for (const row of analyticsRows) { const current = byDay.get(row.day) || { visitors: 0, messages: 0 }; current.visitors += row.uniqueVisitors; current.messages += row.leads; byDay.set(row.day, current); }
      const chartData = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - (6-i)); const key = date.toISOString().slice(0,10); const row = byDay.get(key) || { visitors: 0, messages: 0 }; return { date: date.toLocaleDateString("ar-SA", { weekday: "short" }), visitors: row.visitors, messages: row.messages }; });
      return { totalSites: userSites.length, totalVisitors, unreadMessages, wallet: wallet.balances, chartData, activeSites: userSites.filter(s => s.isActive).length };
    }),
  }),
  // Smart design suggestions
  publicSite: router({
    byHostname: publicProcedure.query(async ({ ctx }) => {
      const site = await getPublishedSiteByHostname(ctx.req.hostname);
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Published site not found" });
      return site;
    }),
    bySubdomain: publicProcedure.input(z.object({ subdomain: z.string().regex(/^[a-z0-9-]{3,100}$/) })).query(async ({ input }) => {
      const site = await getSiteByIdBySubdomain(input.subdomain);
      if (!site || site.publishStatus !== "published" || !site.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Published site not found" });
      return site;
    }),
    trackVisit: publicProcedure.input(z.object({ siteId: z.number().int().positive(), path: z.string().max(500).default("/") })).mutation(async ({ ctx, input }) => {
      const site = await getSiteById(input.siteId);
      if (!site || site.publishStatus !== "published" || !site.isActive) throw new TRPCError({ code: "NOT_FOUND" });
      const forwarded = String(ctx.req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      const ip = forwarded || ctx.req.socket.remoteAddress || "anonymous";
      const ua = String(ctx.req.headers["user-agent"] || "");
      const sessionHash = crypto.createHash("sha256").update(`${site.id}:${ip}:${ua}`).digest("hex");
      const device = /mobile/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop";
      const browser = /edg/i.test(ua) ? "edge" : /chrome/i.test(ua) ? "chrome" : /firefox/i.test(ua) ? "firefox" : /safari/i.test(ua) ? "safari" : "other";
      await recordSiteVisit({ siteId: site.id, sessionHash, path: input.path, referrer: String(ctx.req.headers.referer || "").slice(0, 1000), device, browser });
      return { success: true };
    }),
  }),

  media: router({
    /** Step 1: get a presigned PUT URL. Client uploads directly to S3. */
    createUploadUrl: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(180),
      contentType: z.enum(["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"]),
      sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
    })).mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `users/${ctx.user.id}/media/${nanoid(12)}-${safeName}`;
      const presigned = await createPresignedUpload({
        key,
        contentType: input.contentType,
        expiresIn: 600,
      });
      return {
        key: presigned.key,
        uploadUrl: presigned.uploadUrl,
        publicUrl: presigned.publicUrl,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        fileName: input.fileName,
      };
    }),

    /** Step 2: confirm upload and register the asset after client PUT succeeds. */
    confirmUpload: protectedProcedure.input(z.object({
      key: z.string().min(1).max(512),
      publicUrl: z.string().min(1).max(2048),
      fileName: z.string().min(1).max(180),
      contentType: z.enum(["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"]),
      sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
    })).mutation(async ({ ctx, input }) => {
      if (!input.key.startsWith(`users/${ctx.user.id}/`)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid storage key" });
      }
      await createMediaAsset({
        userId: ctx.user.id,
        key: input.key,
        url: input.publicUrl,
        fileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
      });
      return { key: input.key, url: input.publicUrl };
    }),

    /** Legacy server-side path kept for small SVGs / admin tools only. Prefer createUploadUrl. */
    upload: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(180),
      dataUrl: z.string().max(2_000_000),
      contentType: z.enum(["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"]),
    })).mutation(async ({ ctx, input }) => {
      const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match || match[1] !== input.contentType) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image payload" });
      let buffer = Buffer.from(match[2], "base64");
      if (buffer.length > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Use presigned upload for files > 2MB" });
      const key = `users/${ctx.user.id}/media/${nanoid(12)}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploaded = await storagePut(key, buffer, input.contentType);
      await createMediaAsset({ userId: ctx.user.id, key, url: uploaded.url, fileName: input.fileName, contentType: input.contentType, sizeBytes: buffer.length });
      return uploaded;
    }),
  }),

  // ─── Account settings ──────────────────────────────────────────────────────
  account: router({
    updateProfile: protectedProcedure.input(z.object({
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().max(320).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (input.email) {
        const existing = await getUserByEmail(input.email);
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد مستخدم بالفعل" });
        }
      }
      await updateUserProfile(ctx.user.id, {
        name: input.name,
        email: input.email,
      });
      return { success: true };
    }),

    changePassword: protectedProcedure.input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الحساب لا يستخدم كلمة مرور" });
      }
      const ok = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
      const passwordHash = await hashPassword(input.newPassword);
      const dbConn = await (await import("./db")).getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await dbConn.update(users).set({ passwordHash }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

    deleteAccount: protectedProcedure.input(z.object({
      confirmation: z.literal("DELETE"),
    })).mutation(async ({ ctx }) => {
      await softDeleteUser(ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

  }),

  domains: router({
    list: protectedProcedure.input(z.object({ siteId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const site = await getSiteById(input.siteId);
      if (!site || site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const all = await getAllDomains();
      return all.filter((d) => d.siteId === input.siteId);
    }),
    add: protectedProcedure.input(z.object({ siteId: z.number().int().positive(), hostname: z.string().min(4).max(255) })).mutation(async ({ ctx, input }) => {
      const site = await getSiteById(input.siteId);
      if (!site || site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const hostname = input.hostname.toLowerCase().trim().replace(/\.$/, "");
      if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid domain" });
      }
      const allDomains = await getAllDomains();
      if (allDomains.some((d) => d.hostname === hostname && d.status !== "removed")) throw new TRPCError({ code: "CONFLICT", message: "Domain is already registered" });
      if (hostname === "localhost" || /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) throw new TRPCError({ code: "BAD_REQUEST", message: "Private or local domains are not allowed" });
      const token = crypto.randomBytes(24).toString("hex");
      await createDomain({ siteId: site.id, hostname, verificationToken: token, status: "pending", isPrimary: false });
      return { hostname, status: "pending", txtName: `_madar-verify.${hostname}`, txtValue: token };
    }),
    verify: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const domain = await getDomainById(input.id);
      if (!domain) throw new TRPCError({ code: "NOT_FOUND" });
      const site = await getSiteById(domain.siteId);
      if (!site || site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      try {
        const records = await dns.resolveTxt(`_madar-verify.${domain.hostname}`);
        const verified = records.flat().includes(domain.verificationToken);
        if (!verified) throw new Error("TXT record not found");
        const [ipv4, ipv6] = await Promise.all([dns.resolve4(domain.hostname).catch(() => []), dns.resolve6(domain.hostname).catch(() => [])]);
        const isPrivateV4 = (ip: string) => /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip);
        const isPrivateV6 = (ip: string) => ip === "::1" || ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd") || ip.toLowerCase().startsWith("fe80:");
        if (ipv4.some(isPrivateV4) || ipv6.some(isPrivateV6)) throw new Error("Private DNS target is not allowed");
        await setDomainStatus(domain.id, "active");
        return { success: true, status: "active" };
      } catch {
        await setDomainStatus(domain.id, "failed");
        throw new TRPCError({ code: "BAD_REQUEST", message: "TXT verification record was not found" });
      }
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const domain = await getDomainById(input.id);
      if (!domain) throw new TRPCError({ code: "NOT_FOUND" });
      const site = await getSiteById(domain.siteId);
      if (!site || site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await removeDomain(domain.id);
      return { success: true };
    }),
    setPrimary: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const domain = await getDomainById(input.id);
      if (!domain) throw new TRPCError({ code: "NOT_FOUND" });
      const site = await getSiteById(domain.siteId);
      if (!site || site.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (domain.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Only active domains can be primary" });
      await setPrimaryDomain(domain.id, site.id);
      return { success: true };
    }),
  }),

  admin: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const [users, sites, domains, purchaseRequestsRows, deposits, revenue, settings, walletTotals] = await Promise.all([getAllUsers(), getAllSites(), getAllDomains(), listPurchaseRequests(), listDepositRequests(), getAdminRevenueSummary(), getSettings(), getAdminWalletTotals()]);
      return { users, sites, domains, purchaseRequests: purchaseRequestsRows, deposits, revenue, walletTotals, settings };
    }),
    purchaseRequests: router({
      list: protectedProcedure.query(async ({ ctx }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return listPurchaseRequests(); }),
      approve: protectedProcedure.input(z.object({ id: z.number().int().positive(), notes: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return reviewPurchaseRequest(ctx.user.id, input.id, "approve", undefined, input.notes); }),
      reject: protectedProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().min(2).max(2000) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return reviewPurchaseRequest(ctx.user.id, input.id, "reject", input.reason); }),
      cancel: protectedProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return reviewPurchaseRequest(ctx.user.id, input.id, "cancel", input.reason); }),
    }),
    walletDeposits: router({
      list: protectedProcedure.query(async ({ ctx }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return listDepositRequests(); }),
      approve: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return approveDeposit(ctx.user.id, input.id); }),
      reject: protectedProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().min(2).max(2000) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return rejectDeposit(ctx.user.id, input.id, input.reason); }),
      cancel: protectedProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return cancelDeposit(ctx.user.id, input.id, input.reason); }),
    }),
    paymentMethods: router({
      list: protectedProcedure.query(async ({ ctx }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return listPaymentMethods(true); }),
      createUpload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(180), contentType: z.enum(["image/png","image/jpeg","image/webp"]), sizeBytes: z.number().int().positive().max(5*1024*1024) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return createPaymentMethodUpload(ctx.user.id, input); }),
      create: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), accountImageKey: z.string().max(512).optional(), accountImageUrl: z.string().max(2048).optional(), accountNumber: z.string().min(2).max(255), accountName: z.string().max(255).optional(), sortOrder: z.number().int().min(0).max(9999).optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return createPaymentMethod(ctx.user.id, input); }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(120), accountImageKey: z.string().max(512).optional(), accountImageUrl: z.string().max(2048).optional(), accountNumber: z.string().min(2).max(255), accountName: z.string().max(255).optional(), sortOrder: z.number().int().min(0).max(9999).optional(), active: z.boolean().optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); const { id, ...data } = input; return updatePaymentMethod(ctx.user.id, id, data); }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return removePaymentMethod(ctx.user.id, input.id); }),
    }),
    settings: router({
      get: protectedProcedure.query(async ({ ctx }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return getSettings(); }),
      update: protectedProcedure.input(z.record(z.string().min(1).max(100), z.string().max(5000))).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return updateSettings(input, ctx.user.id); }),
    }),
    currency: router({
      updateRate: protectedProcedure.input(z.object({ fromCurrency: z.enum(["USD","SAR","TRY"]), toCurrency: z.enum(["USD","SAR","TRY"]), rate: z.string().regex(/^\d+(?:\.\d{1,8})?$/) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return updateRate(ctx.user.id, input.fromCurrency, input.toCurrency, input.rate); }),
    }),
    revenue: router({ summary: protectedProcedure.query(async ({ ctx }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return getAdminRevenueSummary(); }) }),
    wallet: router({
      user: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return getWalletSummary(input.userId); }),
      adjust: protectedProcedure.input(z.object({ userId: z.number().int().positive(), amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/), currency: z.enum(["USD","SAR","TRY"]), type: z.enum(["admin_credit","admin_debit"]), reason: z.string().min(2).max(2000) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return adminWalletAdjustment(ctx.user.id, input.userId, input); }),
    }),
    refunds: router({
      sitePurchase: protectedProcedure.input(z.object({ sitePurchaseId: z.number().int().positive(), reason: z.string().min(2).max(2000) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" }); return refundSitePurchase(ctx.user.id, input.sitePurchaseId, input.reason); }),
    }),
  }),

  ai: router({
    generateSuggestions: protectedProcedure
      .input(z.object({ template: z.string().max(100), businessType: z.string().max(200).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const response = await invokeLLM({
            model: "gpt-5-mini",
            messages: [
              {
                role: "system",
                content: "أنت مساعد متخصص في اقتراح أسماء مواقع واحترافية وأوصاف وشعارات. أرجع JSON فقط.",
              },
              {
                role: "user",
                content: `اقترح اسم موقع احترافي، وصف قصير (20 كلمة)، شعار مختصر، وألوان متناسقة لقالب ${input.template}${input.businessType ? ` متخصص في ${input.businessType}` : ''}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "suggestions",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    tagline: { type: "string" },
                    primaryColor: { type: "string" },
                    secondaryColor: { type: "string" },
                  },
                  required: ["name", "description", "tagline", "primaryColor", "secondaryColor"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = response.choices[0]?.message?.content;
          const parsed = JSON.parse(typeof content === 'string' ? content : "{}");
          return {
            name: parsed.name || "موقعي",
            description: parsed.description || "موقع احترافي وحديث",
            tagline: parsed.tagline || "جودة عالية وخدمة متميزة",
            primaryColor: parsed.primaryColor || "#D4AF37",
            secondaryColor: parsed.secondaryColor || "#0F5132",
          };
        } catch (error) {
          throw new TRPCError({ code: "BAD_GATEWAY", message: "تعذر توليد المحتوى حاليًا، حاول مرة أخرى" });
        }
      }),
  }),

});

export type AppRouter = typeof appRouter;
