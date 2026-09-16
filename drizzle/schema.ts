import { bigint, boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  emailUnique: uniqueIndex("users_email_uq").on(table.email),
}));

export const sites = mysqlTable("sites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  template: varchar("template", { length: 100 }).notNull().default("modern"),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#D4AF37"),
  secondaryColor: varchar("secondaryColor", { length: 20 }).default("#0F5132"),
  logoUrl: text("logoUrl"),
  whatsapp: varchar("whatsapp", { length: 30 }),
  tagline: varchar("tagline", { length: 255 }),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  publishStatus: mysqlEnum("publishStatus", ["draft", "published", "unpublished"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  lastPublishedVersion: int("lastPublishedVersion").default(0).notNull(),
  draftContent: json("draftContent").$type<Record<string, unknown>>().default({}),
  publishedContent: json("publishedContent").$type<Record<string, unknown>>().default({}),
  sections: json("sections").$type<Record<string, boolean>>().default({ hero: true, about: true, services: true, gallery: true, contact: true }),
  galleryImages: json("galleryImages").$type<string[]>().default([]),
  visitorCount: int("visitorCount").default(0).notNull(),
  messageCount: int("messageCount").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("sites_user_idx").on(table.userId), statusIdx: index("sites_status_idx").on(table.publishStatus) }));

export const siteVersions = mysqlTable("site_versions", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  version: int("version").notNull(),
  content: json("content").$type<Record<string, unknown>>().notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ siteVersionUnique: uniqueIndex("site_versions_site_version_uq").on(table.siteId, table.version), siteIdx: index("site_versions_site_idx").on(table.siteId) }));

export const siteVisits = mysqlTable("site_visits", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  sessionHash: varchar("sessionHash", { length: 128 }),
  visitDay: varchar("visitDay", { length: 10 }).notNull(),
  path: varchar("path", { length: 500 }).notNull().default("/"),
  referrer: varchar("referrer", { length: 1000 }),
  device: varchar("device", { length: 32 }),
  browser: varchar("browser", { length: 64 }),
  country: varchar("country", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  siteDateIdx: index("site_visits_site_date_idx").on(table.siteId, table.createdAt),
  sessionDayIdx: uniqueIndex("site_visits_session_day_uq").on(table.siteId, table.sessionHash, table.visitDay),
}));

export const analyticsDaily = mysqlTable("analytics_daily", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  day: varchar("day", { length: 10 }).notNull(),
  pageViews: int("pageViews").default(0).notNull(),
  uniqueVisitors: int("uniqueVisitors").default(0).notNull(),
  leads: int("leads").default(0).notNull(),
}, (table) => ({ dailyUnique: uniqueIndex("analytics_daily_site_day_uq").on(table.siteId, table.day) }));

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  userId: int("userId").notNull(),
  senderName: varchar("senderName", { length: 255 }).notNull(),
  senderEmail: varchar("senderEmail", { length: 320 }),
  senderPhone: varchar("senderPhone", { length: 30 }),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "won", "lost"]).default("new").notNull(),
  source: varchar("source", { length: 100 }).default("website"),
  notes: text("notes"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ siteIdx: index("messages_site_idx").on(table.siteId), userIdx: index("messages_user_idx").on(table.userId) }));

export const domains = mysqlTable("domains", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull().unique(),
  verificationToken: varchar("verificationToken", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["pending", "verified", "active", "failed", "removed"]).default("pending").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  verifiedAt: timestamp("verifiedAt"),
}, (table) => ({
  siteIdx: index("domains_site_idx").on(table.siteId),
  statusIdx: index("domains_status_idx").on(table.status),
}));


export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  siteId: int("siteId"),
  key: varchar("key", { length: 512 }).notNull().unique(),
  url: text("url").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 100 }).notNull(),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("media_assets_user_idx").on(table.userId), siteIdx: index("media_assets_site_idx").on(table.siteId) }));

export const aiUsage = mysqlTable("ai_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  day: varchar("day", { length: 10 }).notNull(),
  count: int("count").default(0).notNull(),
}, (table) => ({ dailyUnique: uniqueIndex("ai_usage_user_day_uq").on(table.userId, table.day) }));


export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 40 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"),
  rejectionReason: text("rejectionReason"),
  adminNotes: text("adminNotes"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled", "completed"]).default("pending").notNull(),
  siteId: int("siteId"),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("purchase_requests_user_idx").on(table.userId),
  statusIdx: index("purchase_requests_status_idx").on(table.status),
  requestedAtIdx: index("purchase_requests_requested_at_idx").on(table.requestedAt),
}));

export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull().default("SAR"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


export const paymentMethods = mysqlTable("payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  accountImageKey: varchar("accountImageKey", { length: 512 }),
  accountImageUrl: text("accountImageUrl"),
  accountNumber: varchar("accountNumber", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 }),
  active: boolean("active").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  activeIdx: index("payment_methods_active_idx").on(table.active, table.sortOrder),
}));

export const walletDepositRequests = mysqlTable("wallet_deposit_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paymentMethodId: int("paymentMethodId"),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  txId: varchar("txId", { length: 255 }).notNull(),
  screenshotKey: varchar("screenshotKey", { length: 512 }).notNull(),
  screenshotUrl: text("screenshotUrl").notNull(),
  note: text("note"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("wallet_deposit_requests_user_idx").on(table.userId),
  statusIdx: index("wallet_deposit_requests_status_idx").on(table.status),
  txIdIdx: index("wallet_deposit_requests_txid_idx").on(table.txId),
}));

export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  walletId: int("walletId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["deposit", "purchase", "conversion", "conversion_fee", "refund", "admin_credit", "admin_debit", "adjustment"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 18, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 18, scale: 2 }).notNull(),
  referenceType: varchar("referenceType", { length: 64 }),
  referenceId: varchar("referenceId", { length: 100 }),
  description: varchar("description", { length: 500 }),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull().unique(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("wallet_transactions_wallet_idx").on(table.walletId, table.createdAt),
  userIdx: index("wallet_transactions_user_idx").on(table.userId, table.createdAt),
  typeIdx: index("wallet_transactions_type_idx").on(table.type),
}));

export const currencyRates = mysqlTable("currency_rates", {
  id: int("id").autoincrement().primaryKey(),
  fromCurrency: varchar("fromCurrency", { length: 3 }).notNull(),
  toCurrency: varchar("toCurrency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  active: boolean("active").default(true).notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pairUq: uniqueIndex("currency_rates_pair_uq").on(table.fromCurrency, table.toCurrency),
}));

export const currencyExchangeTransactions = mysqlTable("currency_exchange_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromCurrency: varchar("fromCurrency", { length: 3 }).notNull(),
  toCurrency: varchar("toCurrency", { length: 3 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  feeAmount: decimal("feeAmount", { precision: 18, scale: 2 }).notNull(),
  feeCurrency: varchar("feeCurrency", { length: 3 }).notNull(),
  netAmount: decimal("netAmount", { precision: 18, scale: 2 }).notNull(),
  exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 }).notNull(),
  convertedAmount: decimal("convertedAmount", { precision: 18, scale: 2 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("currency_exchange_user_idx").on(table.userId, table.createdAt) }));

export const sitePurchases = mysqlTable("site_purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  purchaseRequestId: int("purchaseRequestId").notNull().unique(),
  siteId: int("siteId").unique(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: mysqlEnum("status", ["paid", "refunded"]).default("paid").notNull(),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("site_purchases_user_idx").on(table.userId, table.createdAt) }));

export const platformRevenue = mysqlTable("platform_revenue", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["site_purchase", "conversion_fee", "adjustment"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  userId: int("userId"),
  referenceType: varchar("referenceType", { length: 64 }),
  referenceId: varchar("referenceId", { length: 100 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ typeIdx: index("platform_revenue_type_idx").on(table.type, table.createdAt) }));

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: varchar("entityId", { length: 100 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  requestId: varchar("requestId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;
export type SiteVersion = typeof siteVersions.$inferSelect;
export type InsertSiteVersion = typeof siteVersions.$inferInsert;
export type SiteVisit = typeof siteVisits.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * One-time tokens for email verification and password reset.
 * Token is stored only as SHA-256 hash; plaintext is emailed once.
 */
export const authTokens = mysqlTable(
  "auth_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: mysqlEnum("type", ["email_verify", "password_reset"]).notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUq: uniqueIndex("auth_tokens_hash_uq").on(table.tokenHash),
    userTypeIdx: index("auth_tokens_user_type_idx").on(table.userId, table.type),
  }),
);

/**
 * Refresh tokens for sliding sessions. Rotated on every successful refresh.
 * tokenHash only; plaintext goes into HttpOnly cookie.
 */
export const refreshTokens = mysqlTable(
  "refresh_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    userAgent: varchar("userAgent", { length: 255 }),
    ip: varchar("ip", { length: 45 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUq: uniqueIndex("refresh_tokens_hash_uq").on(table.tokenHash),
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
  }),
);

export type AuthToken = typeof authTokens.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
