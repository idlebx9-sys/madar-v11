import { and, desc, eq, gte, gt, lt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMessage,
  InsertSite,
  InsertUser,
  messages,
  sites,
  users,
  siteVersions,
  siteVisits,
  analyticsDaily,
  domains, auditLogs, mediaAssets, aiUsage, authTokens, refreshTokens,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./logger";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      logger.warn({ err: error }, "[Database] Failed to connect");
      _db = null;
    }
  }
  return _db;
}

export async function checkDatabaseReady() {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    logger.warn({ err: error }, "[Database] readiness check failed");
    return false;
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { logger.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    logger.error({ err: error }, "[Database] Failed to upsert user");
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    ...data,
    email: data.email?.toLowerCase() ?? null,
    loginMethod: data.loginMethod ?? "email",
    role: data.role ?? "user",
    lastSignedIn: data.lastSignedIn ?? new Date(),
  });
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.email !== undefined) set.email = data.email.toLowerCase();
  if (Object.keys(set).length === 0) return;
  await db.update(users).set(set).where(eq(users.id, userId));
}

export async function softDeleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}


// ─── Sites ────────────────────────────────────────────────────────────────────
export async function getSitesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sites).where(and(eq(sites.userId, userId), isNull(sites.deletedAt))).orderBy(desc(sites.createdAt));
}

export async function getSiteByIdBySubdomain(subdomain: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sites).where(eq(sites.subdomain, subdomain)).limit(1);
  return result[0];
}

export async function getSiteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSite(data: InsertSite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sites).values(data);
  return result;
}

export async function updateSite(id: number, data: Partial<InsertSite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(sites).set(data).where(eq(sites.id, id));
}

export async function deleteSite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(sites).set({ deletedAt: new Date(), isActive: false, publishStatus: "unpublished" }).where(eq(sites.id, id));
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function getMessagesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.createdAt));
}

export async function getMessagesBySiteId(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.siteId, siteId)).orderBy(desc(messages.createdAt));
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(messages).values(data);
}

export async function getMessageById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return result[0];
}

export async function markMessageRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
}

export async function markAllMessagesRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(messages).set({ isRead: true }).where(and(eq(messages.userId, userId), eq(messages.isRead, false)));
}

// ─── Publishing / public rendering ──────────────────────────────────────────
export async function getPublishedSiteByHostname(hostname: string) {
  const db = await getDb();
  if (!db) return undefined;
  const clean = hostname.split(":")[0].toLowerCase().replace(/\\.$/, "");
  const reserved = ["www", "api", "admin", "dashboard", "app", "mail", "support", "help", "status", "cdn", "assets"];
  const subdomain = clean.endsWith(".madar.app") ? clean.slice(0, -".madar.app".length) : null;
  if (subdomain && !reserved.includes(subdomain)) {
    const result = await db.select().from(sites).where(and(eq(sites.subdomain, subdomain), eq(sites.publishStatus, "published"), eq(sites.isActive, true), isNull(sites.deletedAt))).limit(1);
    if (result[0]) return result[0];
  }
  const domainRows = await db.select({ siteId: domains.siteId }).from(domains).where(and(eq(domains.hostname, clean), eq(domains.status, "active"))).limit(1);
  if (!domainRows[0]) return undefined;
  const result = await db.select().from(sites).where(and(eq(sites.id, domainRows[0].siteId), eq(sites.publishStatus, "published"), eq(sites.isActive, true), isNull(sites.deletedAt))).limit(1);
  return result[0];
}

export async function publishSite(siteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const site = await getSiteById(siteId);
  if (!site || site.userId !== userId) throw new Error("Site not found");
  const nextVersion = (site.lastPublishedVersion ?? 0) + 1;
  const content = {
    name: site.name,
    template: site.template,
    primaryColor: site.primaryColor,
    secondaryColor: site.secondaryColor,
    logoUrl: site.logoUrl,
    whatsapp: site.whatsapp,
    tagline: site.tagline,
    description: site.description,
    sections: site.sections,
    galleryImages: site.galleryImages,
    ...(site.draftContent || {}),
  };
  await db.insert(siteVersions).values({ siteId, version: nextVersion, content, createdBy: userId });
  await db.update(sites).set({ publishStatus: "published", publishedAt: new Date(), lastPublishedVersion: nextVersion, publishedContent: content }).where(eq(sites.id, siteId));
  return getSiteById(siteId);
}

export async function unpublishSite(siteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const site = await getSiteById(siteId);
  if (!site || site.userId !== userId) throw new Error("Site not found");
  await db.update(sites).set({ publishStatus: "unpublished" }).where(eq(sites.id, siteId));
  return getSiteById(siteId);
}

export async function getSiteVersions(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteVersions).where(eq(siteVersions.siteId, siteId)).orderBy(desc(siteVersions.version));
}

export async function restoreSiteVersion(siteId: number, version: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const site = await getSiteById(siteId);
  if (!site || site.userId !== userId) throw new Error("Site not found");
  const rows = await db.select().from(siteVersions).where(and(eq(siteVersions.siteId, siteId), eq(siteVersions.version, version))).limit(1);
  const selected = rows[0];
  if (!selected) throw new Error("Version not found");
  const nextVersion = (site.lastPublishedVersion ?? 0) + 1;
  await db.insert(siteVersions).values({ siteId, version: nextVersion, content: selected.content, createdBy: userId });
  await db.update(sites).set({ draftContent: selected.content, publishedContent: selected.content, publishStatus: "published", publishedAt: new Date(), lastPublishedVersion: nextVersion }).where(eq(sites.id, siteId));
  return getSiteById(siteId);
}

// ─── Real analytics ─────────────────────────────────────────────────────────
export async function recordSiteVisit(data: { siteId: number; sessionHash?: string; path?: string; referrer?: string; device?: string; browser?: string; country?: string }) {
  const db = await getDb();
  if (!db) return;
  const day = new Date().toISOString().slice(0, 10);
  let isUnique = false;
  if (data.sessionHash) {
    const inserted = await db.insert(siteVisits).values({ ...data, visitDay: day }).onDuplicateKeyUpdate({ set: { path: data.path || "/" } });
    isUnique = Number((inserted as any).rowsAffected ?? 1) === 1;
  } else {
    await db.insert(siteVisits).values({ ...data, visitDay: day });
  }
  if (!data.sessionHash) isUnique = true;
  await db.insert(analyticsDaily).values({ siteId: data.siteId, day, pageViews: 1, uniqueVisitors: isUnique ? 1 : 0, leads: 0 })
    .onDuplicateKeyUpdate({ set: { pageViews: sql`${analyticsDaily.pageViews} + 1`, uniqueVisitors: sql`${analyticsDaily.uniqueVisitors} + ${isUnique ? 1 : 0}` } });
  await db.update(sites).set({ visitorCount: sql`${sites.visitorCount} + 1` }).where(eq(sites.id, data.siteId));
}

export async function recordLeadAnalytics(siteId: number) {
  const db = await getDb();
  if (!db) return;
  const day = new Date().toISOString().slice(0, 10);
  await db.insert(analyticsDaily).values({ siteId, day, pageViews: 0, uniqueVisitors: 0, leads: 1 })
    .onDuplicateKeyUpdate({ set: { leads: sql`${analyticsDaily.leads} + 1` } });
  await db.update(sites).set({ messageCount: sql`${sites.messageCount} + 1` }).where(eq(sites.id, siteId));
}

export async function cleanupAnalyticsRetention() {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`DELETE FROM analytics_daily WHERE STR_TO_DATE(day, '%Y-%m-%d') < UTC_DATE() - INTERVAL 365 DAY`);
  await db.execute(sql`DELETE FROM site_visits WHERE createdAt < UTC_TIMESTAMP() - INTERVAL 365 DAY`);
}

export async function getAnalyticsDaily(siteId: number, limit = 90) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analyticsDaily).where(eq(analyticsDaily.siteId, siteId)).orderBy(desc(analyticsDaily.day)).limit(Math.min(Math.max(limit, 1), 365));
}

export async function getMediaUsage(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ total: sql<number>`COALESCE(SUM(${mediaAssets.sizeBytes}), 0)` }).from(mediaAssets).where(eq(mediaAssets.userId, userId));
  return Number(rows[0]?.total || 0);
}

export async function createMediaAsset(data: typeof mediaAssets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(mediaAssets).values(data);
}

export async function getAiUsage(userId: number, day: string) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(aiUsage).where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day))).limit(1);
  return rows[0]?.count ?? 0;
}

export async function consumeAiQuota(userId: number, day: string, limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiUsage).values({ userId, day, count: 1 }).onDuplicateKeyUpdate({ set: { count: sql`${aiUsage.count} + 1` } });
  const rows = await db.select().from(aiUsage).where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day))).limit(1);
  const count = rows[0]?.count ?? 0;
  if (count > limit) {
    await db.update(aiUsage).set({ count: sql`${aiUsage.count} - 1` }).where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)));
    return false;
  }
  return true;
}

export async function removeDomain(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(domains).set({ status: "removed", isPrimary: false }).where(eq(domains.id, id));
}

export async function setPrimaryDomain(id: number, siteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(domains).set({ isPrimary: false }).where(eq(domains.siteId, siteId));
  return db.update(domains).set({ isPrimary: true, status: "active" }).where(and(eq(domains.id, id), eq(domains.siteId, siteId), eq(domains.status, "active")));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
}
export async function getAllSites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sites).orderBy(desc(sites.createdAt));
}

export async function getPublishedSites() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ subdomain: sites.subdomain, updatedAt: sites.updatedAt }).from(sites).where(and(eq(sites.publishStatus, "published"), eq(sites.isActive, true), isNull(sites.deletedAt)));
}

export async function getAllDomains() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(domains).orderBy(desc(domains.createdAt));
}
export async function createDomain(data: typeof domains.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(domains).values(data);
}
export async function getDomainById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  return rows[0];
}
export async function setDomainStatus(id: number, status: "pending"|"verified"|"active"|"failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(domains).set({ status, verifiedAt: status === "verified" || status === "active" ? new Date() : null }).where(eq(domains.id, id));
}
export async function addAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  return db.insert(auditLogs).values(data);
}

export async function createAuthToken(data: {
  userId: number;
  type: "email_verify" | "password_reset";
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidate previous unused tokens of same type for this user
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.userId, data.userId),
        eq(authTokens.type, data.type),
        isNull(authTokens.usedAt),
      ),
    );
  return db.insert(authTokens).values(data);
}

export async function findValidAuthToken(
  tokenHash: string,
  type: "email_verify" | "password_reset",
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function markAuthTokenUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, id));
}

export async function markEmailVerified(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function createRefreshToken(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(refreshTokens).values(data);
}

export async function findValidRefreshToken(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function revokeRefreshToken(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id));
}

export async function revokeAllUserRefreshTokens(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
