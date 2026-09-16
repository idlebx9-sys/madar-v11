import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  platformSettings, purchaseRequests, wallets, walletDepositRequests, walletTransactions,
  currencyRates, currencyExchangeTransactions, sitePurchases, platformRevenue, sites, paymentMethods,
} from "../drizzle/schema";
import { addAuditLog, createSite, getSiteById } from "./db";
import { notifyOwner, notifyUser, notifyTelegram } from "./_core/notification";

export const SUPPORTED_CURRENCIES = ["USD", "SAR", "TRY"] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];

function assertCurrency(value: string): asserts value is Currency {
  if (!SUPPORTED_CURRENCIES.includes(value as Currency)) throw new TRPCError({ code: "BAD_REQUEST", message: "العملة غير مدعومة" });
}

function decimalToMinor(value: string, scale = 2): bigint {
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new TRPCError({ code: "BAD_REQUEST", message: "قيمة مالية غير صالحة" });
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > scale) throw new TRPCError({ code: "BAD_REQUEST", message: "المبلغ يتجاوز الدقة المسموحة" });
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt((fraction + "0".repeat(scale)).slice(0, scale));
}
function minorToDecimal(value: bigint, scale = 2): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const unit = 10n ** BigInt(scale);
  const whole = abs / unit;
  const frac = String(abs % unit).padStart(scale, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}
function percentOf(amount: string, percent: string): string {
  const a = decimalToMinor(amount);
  const p = decimalToMinor(percent);
  return minorToDecimal((a * p + 5000n) / 10000n);
}
function multiplyRate(amount: string, rate: string): string {
  const a = decimalToMinor(amount);
  const r = decimalToMinor(rate, 8);
  const result = (a * r + 5000000n) / 10000000n;
  return minorToDecimal(result);
}

export async function getSetting(key: string, fallback = "") {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const row = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
  return row[0]?.value ?? fallback;
}

export async function getSettings() {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const rows = await db.select().from(platformSettings);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function updateSettings(values: Record<string, string>, adminId: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const numericMoneyKeys = new Set(["site_purchase_price"]);
  const numericRateKeys = new Set(["sar_to_try_rate", "try_to_sar_rate"]);
  const fee = values.exchange_fee_percent;
  if (fee !== undefined && (decimalToMinor(fee) < 0n || decimalToMinor(fee) > 10000n)) throw new TRPCError({ code: "BAD_REQUEST", message: "نسبة رسوم التحويل يجب أن تكون بين 0% و100%" });
  for (const [key, value] of Object.entries(values)) {
    if (numericMoneyKeys.has(key) && decimalToMinor(value) <= 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "سعر الموقع غير صالح" });
    if (numericRateKeys.has(key) && decimalToMinor(value, 8) <= 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "سعر الصرف غير صالح" });
    if (key === "site_purchase_currency") { const currency = value.toUpperCase(); assertCurrency(currency); }
    if (key === "site_purchase_enabled" && !["true","false"].includes(value)) throw new TRPCError({ code: "BAD_REQUEST", message: "قيمة تفعيل الشراء غير صالحة" });
  }
  await db.transaction(async tx => {
    for (const [key, value] of Object.entries(values)) {
      await tx.insert(platformSettings).values({ key, value, updatedBy: adminId }).onDuplicateKeyUpdate({ set: { value, updatedBy: adminId } });
    }
  });
  await addAuditLog({ userId: adminId, action: "platform.settings.updated", entityType: "platform_settings", metadata: { keys: Object.keys(values) } });
}

async function ensureWalletTx(userId: number, currency: Currency, tx: any) {
  const existing = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const result = await tx.insert(wallets).values({ userId, baseCurrency: currency });
  const id = Number(result[0]?.insertId ?? result.insertId);
  return (await tx.select().from(wallets).where(eq(wallets.id, id)).limit(1))[0];
}

export async function getWalletSummary(userId: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const wallet = (await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1))[0] ?? null;
  if (!wallet) return { wallet: null, balances: { USD: "0.00", SAR: "0.00", TRY: "0.00" }, totals: { deposits: "0.00", purchases: "0.00", fees: "0.00" } };
  const rows = await db.select({ currency: walletTransactions.currency, balance: sql<string>`COALESCE(SUM(${walletTransactions.amount}), 0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id)).groupBy(walletTransactions.currency);
  const balances = { USD: "0.00", SAR: "0.00", TRY: "0.00" } as Record<Currency,string>;
  rows.forEach(r => { if (r.currency in balances) balances[r.currency as Currency] = r.balance; });
  const [deposits, purchases, fees] = await Promise.all([
    db.select({ total: sql<string>`COALESCE(SUM(${walletTransactions.amount}),0)` }).from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.type, "deposit"))),
    db.select({ total: sql<string>`COALESCE(SUM(ABS(${walletTransactions.amount})),0)` }).from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.type, "purchase"))),
    db.select({ total: sql<string>`COALESCE(SUM(ABS(${walletTransactions.amount})),0)` }).from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.type, "conversion_fee"))),
  ]);
  return { wallet, balances, totals: { deposits: deposits[0]?.total ?? "0.00", purchases: purchases[0]?.total ?? "0.00", fees: fees[0]?.total ?? "0.00" } };
}

export async function getWalletTransactions(userId: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  return db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt)).limit(200);
}

export async function createPurchaseRequest(userId: number, input: { fullName: string; email: string; whatsapp: string; phone?: string }) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const enabled = (await getSetting("site_purchase_enabled", "true")) === "true";
  if (!enabled) throw new TRPCError({ code: "FORBIDDEN", message: "شراء المواقع متوقف حاليًا" });
  const amount = await getSetting("site_purchase_price", "500.00");
  const currency = (await getSetting("site_purchase_currency", "USD")).toUpperCase(); assertCurrency(currency);
  const result = await db.insert(purchaseRequests).values({ userId, fullName: input.fullName, email: input.email.toLowerCase(), whatsapp: input.whatsapp, phone: input.phone || null, amount, currency });
  const id = Number(result[0]?.insertId ?? result.insertId);
  const notificationText = `طلب شراء موقع #${id}\nالعميل: ${input.fullName}\nالبريد: ${input.email}\nWhatsApp: ${input.whatsapp}${input.phone ? `\nالهاتف: ${input.phone}` : ""}\nالمبلغ: ${amount} ${currency}`;
  await notifyOwner({ title: "طلب شراء موقع جديد", content: notificationText });
  await notifyTelegram({ title: "طلب شراء موقع جديد", content: notificationText });
  await addAuditLog({ userId, action: "purchase_request.created", entityType: "purchase_request", entityId: String(id), metadata: { amount, currency } });
  return (await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1))[0];
}

export async function listMinePurchaseRequests(userId: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db.select().from(purchaseRequests).where(eq(purchaseRequests.userId, userId)).orderBy(desc(purchaseRequests.createdAt));
}

export async function listPurchaseRequests() {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db.select().from(purchaseRequests).orderBy(desc(purchaseRequests.createdAt)).limit(500);
}

export async function reviewPurchaseRequest(adminId: number, id: number, action: "approve"|"reject"|"cancel", reason?: string, notes?: string) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const row = (await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "طلب الشراء غير موجود" });
  if (row.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "لا يمكن معالجة الطلب أكثر من مرة" });
  if (action === "reject" && !reason?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "سبب الرفض مطلوب" });
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled";
  const updated = await db.update(purchaseRequests).set({ status, reviewedAt: new Date(), reviewedBy: adminId, rejectionReason: action === "reject" ? reason : null, adminNotes: notes || null }).where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.status, "pending")));
  if (Number((updated as any).affectedRows ?? (updated as any).rowsAffected ?? 0) !== 1) throw new TRPCError({ code: "CONFLICT", message: "تمت معالجة الطلب من مسؤول آخر" });
  if (action === "approve") await notifyUser(row.userId, { type: "purchase_request_approved", title: "تمت الموافقة على طلب شراء الموقع", content: `تمت الموافقة على الطلب #${id}. يمكنك الآن إتمام الدفع من المحفظة.` });
  if (action === "reject") await notifyUser(row.userId, { type: "purchase_request_rejected", title: "تم رفض طلب شراء الموقع", content: reason || "تم رفض الطلب." });
  if (action === "cancel") await notifyUser(row.userId, { type: "purchase_request_cancelled", title: "تم إلغاء طلب شراء الموقع", content: reason || "تم إلغاء الطلب من الإدارة." });
  await notifyTelegram({ title: `تحديث طلب شراء #${id}`, content: `العميل: ${row.fullName}\nالمبلغ: ${row.amount} ${row.currency}\nالحالة: ${status}${reason ? `\nالسبب: ${reason}` : ""}` });
  await addAuditLog({ userId: row.userId, action: `purchase_request.${action}`, entityType: "purchase_request", entityId: String(id), metadata: { adminId, reason, notes } });
  return { success: true };
}

export async function listPaymentMethods(includeInactive = false) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  return db.select().from(paymentMethods).where(includeInactive ? undefined : eq(paymentMethods.active, true)).orderBy(paymentMethods.sortOrder, paymentMethods.id);
}

export async function createPaymentMethod(adminId: number, input: { name: string; accountImageKey?: string; accountImageUrl?: string; accountNumber: string; accountName?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  if (!input.name.trim() || !input.accountNumber.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "اسم طريقة الدفع ورقم الحساب مطلوبان" });
  if (input.accountImageKey && !input.accountImageKey.startsWith("admin/payment-methods/")) throw new TRPCError({ code: "FORBIDDEN", message: "صورة الحساب غير صالحة" });
  const result = await db.insert(paymentMethods).values({ name: input.name.trim(), accountImageKey: input.accountImageKey || null, accountImageUrl: input.accountImageUrl || null, accountNumber: input.accountNumber.trim(), accountName: input.accountName?.trim() || null, sortOrder: input.sortOrder ?? 0, active: true });
  const id = Number(result[0]?.insertId ?? result.insertId);
  await addAuditLog({ userId: adminId, action: "payment_method.created", entityType: "payment_method", entityId: String(id), metadata: { name: input.name.trim() } });
  return (await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1))[0];
}

export async function updatePaymentMethod(adminId: number, id: number, input: { name: string; accountImageKey?: string; accountImageUrl?: string; accountNumber: string; accountName?: string; sortOrder?: number; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const current = (await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "طريقة الدفع غير موجودة" });
  if (!input.name.trim() || !input.accountNumber.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "اسم طريقة الدفع ورقم الحساب مطلوبان" });
  if (input.accountImageKey && !input.accountImageKey.startsWith("admin/payment-methods/")) throw new TRPCError({ code: "FORBIDDEN", message: "صورة الحساب غير صالحة" });
  await db.update(paymentMethods).set({ name: input.name.trim(), accountImageKey: input.accountImageKey ?? current.accountImageKey, accountImageUrl: input.accountImageUrl ?? current.accountImageUrl, accountNumber: input.accountNumber.trim(), accountName: input.accountName?.trim() || null, sortOrder: input.sortOrder ?? current.sortOrder, active: input.active ?? current.active }).where(eq(paymentMethods.id, id));
  await addAuditLog({ userId: adminId, action: "payment_method.updated", entityType: "payment_method", entityId: String(id), metadata: { active: input.active } });
  return (await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1))[0];
}

export async function removePaymentMethod(adminId: number, id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const current = (await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "طريقة الدفع غير موجودة" });
  await db.update(paymentMethods).set({ active: false }).where(eq(paymentMethods.id, id));
  await addAuditLog({ userId: adminId, action: "payment_method.removed", entityType: "payment_method", entityId: String(id) });
  return { success: true };
}

export async function createPaymentMethodUpload(adminId: number, input: { fileName: string; contentType: "image/png"|"image/jpeg"|"image/webp"; sizeBytes: number }) {
  if (input.sizeBytes <= 0 || input.sizeBytes > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "حجم الصورة يجب ألا يتجاوز 5MB" });
  const safe = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return createPresignedUpload({ key: `admin/payment-methods/${adminId}/${nanoid(12)}-${safe}`, contentType: input.contentType, expiresIn: 600 });
}

export async function createDepositRequest(userId: number, input: { amount: string; currency: string; txId: string; screenshotKey: string; screenshotUrl: string; note?: string; paymentMethodId: number }) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const currency = input.currency.toUpperCase(); assertCurrency(currency); decimalToMinor(input.amount);
  const method = (await db.select().from(paymentMethods).where(and(eq(paymentMethods.id, input.paymentMethodId), eq(paymentMethods.active, true))).limit(1))[0];
  if (!method) throw new TRPCError({ code: "BAD_REQUEST", message: "طريقة الدفع المختارة غير متاحة" });
  if (decimalToMinor(input.amount) <= 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
  if (!input.screenshotKey.startsWith(`users/${userId}/deposits/`)) throw new TRPCError({ code: "FORBIDDEN", message: "ملف الإثبات غير صالح" });
  const { storageExists } = await import("./storage");
  if (!(await storageExists(input.screenshotKey))) throw new TRPCError({ code: "BAD_REQUEST", message: "لم يتم العثور على ملف إثبات التحويل" });
  const idempotencyKey = nanoid(24);
  const result = await db.insert(walletDepositRequests).values({ userId, paymentMethodId: method.id, amount: input.amount, currency, txId: input.txId.trim(), screenshotKey: input.screenshotKey, screenshotUrl: input.screenshotUrl, note: input.note?.trim() || null, idempotencyKey });
  const id = Number(result[0]?.insertId ?? result.insertId);
  const notificationText = `طلب شحن محفظة #${id}\nطريقة الدفع: ${method.name}\nالمبلغ: ${input.amount} ${currency}\nTxID: ${input.txId.trim()}\nالمستخدم: #${userId}`;
  await notifyOwner({ title: "طلب شحن محفظة جديد", content: notificationText });
  await notifyTelegram({ title: "طلب شحن محفظة جديد", content: notificationText });
  await addAuditLog({ userId, action: "deposit_request.created", entityType: "wallet_deposit_request", entityId: String(id), metadata: { amount: input.amount, currency } });
  return (await db.select().from(walletDepositRequests).where(eq(walletDepositRequests.id, id)).limit(1))[0];
}

export async function createDepositUpload(userId: number, input: { fileName: string; contentType: "image/png"|"image/jpeg"|"image/webp"; sizeBytes: number }) {
  if (input.sizeBytes <= 0 || input.sizeBytes > 8*1024*1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "حجم الصورة يجب ألا يتجاوز 8MB" });
  const safe = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const { createPresignedUpload } = await import("./storage");
  return createPresignedUpload({ key: `users/${userId}/deposits/${nanoid(12)}-${safe}`, contentType: input.contentType, expiresIn: 600 });
}

export async function listDepositRequests(userId?: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const where = userId ? eq(walletDepositRequests.userId, userId) : undefined;
  const rows = await db.select().from(walletDepositRequests).where(where).orderBy(desc(walletDepositRequests.createdAt)).limit(500);
  const methods = await db.select().from(paymentMethods);
  const methodMap = new Map(methods.map(m => [m.id, m]));
  return rows.map(row => ({ ...row, paymentMethod: row.paymentMethodId ? methodMap.get(row.paymentMethodId) ?? null : null }));
}

export async function approveDeposit(adminId: number, id: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  let userId = 0; let amount = "0.00"; let currency: Currency = "USD";
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM wallet_deposit_requests WHERE id = ${id} FOR UPDATE`);
    const rows = await tx.select().from(walletDepositRequests).where(eq(walletDepositRequests.id, id)).limit(1);
    const deposit = rows[0];
    if (!deposit) throw new TRPCError({ code: "NOT_FOUND", message: "طلب الإيداع غير موجود" });
    if (deposit.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "لا يمكن اعتماد طلب الإيداع أكثر من مرة" });
    userId = deposit.userId; amount = deposit.amount; currency = deposit.currency as Currency; assertCurrency(currency);
    const wallet = await ensureWalletTx(userId, currency, tx);
    await tx.execute(sql`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`);
    const sumRows = await tx.select({ balance: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.currency} = ${currency} THEN ${walletTransactions.amount} ELSE 0 END),0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
    const before = sumRows[0]?.balance ?? "0.00"; const after = minorToDecimal(decimalToMinor(before) + decimalToMinor(amount));
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: "deposit", amount, currency, balanceBefore: before, balanceAfter: after, referenceType: "deposit", referenceId: String(id), description: `شحن محفظة عبر Binance #${id}`, idempotencyKey: `deposit:${id}`, metadata: { adminId } });
    await tx.update(walletDepositRequests).set({ status: "approved", reviewedBy: adminId, reviewedAt: new Date() }).where(and(eq(walletDepositRequests.id, id), eq(walletDepositRequests.status, "pending")));
  });
  await notifyUser(userId, { type: "deposit_approved", title: "تم اعتماد الإيداع", content: `تمت إضافة ${amount} ${currency} إلى محفظتك.` });
  await addAuditLog({ userId, action: "deposit_request.approved", entityType: "wallet_deposit_request", entityId: String(id), metadata: { adminId, amount, currency } });
  return { success: true };
}

export async function rejectDeposit(adminId: number, id: number, reason: string) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  if (!reason.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "سبب الرفض مطلوب" });
  const row = (await db.select().from(walletDepositRequests).where(eq(walletDepositRequests.id, id)).limit(1))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  if (row.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "لا يمكن معالجة الطلب أكثر من مرة" });
  const updated = await db.update(walletDepositRequests).set({ status: "rejected", rejectionReason: reason.trim(), reviewedBy: adminId, reviewedAt: new Date() }).where(and(eq(walletDepositRequests.id, id), eq(walletDepositRequests.status, "pending")));
  if (Number((updated as any).affectedRows ?? (updated as any).rowsAffected ?? 0) !== 1) throw new TRPCError({ code: "CONFLICT", message: "تمت معالجة الطلب من مسؤول آخر" });
  await notifyUser(row.userId, { type: "deposit_rejected", title: "تم رفض طلب الإيداع", content: reason.trim() });
  await addAuditLog({ userId: row.userId, action: "deposit_request.rejected", entityType: "wallet_deposit_request", entityId: String(id), metadata: { adminId, reason } });
  return { success: true };
}

export async function cancelDeposit(adminId: number, id: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const row = (await db.select().from(walletDepositRequests).where(eq(walletDepositRequests.id, id)).limit(1))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  const updated = await db.update(walletDepositRequests).set({ status: "cancelled", rejectionReason: reason?.trim() || null, reviewedBy: adminId, reviewedAt: new Date() }).where(and(eq(walletDepositRequests.id, id), eq(walletDepositRequests.status, "pending")));
  if (Number((updated as any).affectedRows ?? (updated as any).rowsAffected ?? 0) !== 1) throw new TRPCError({ code: "CONFLICT", message: "تمت معالجة الطلب من مسؤول آخر" });
  await notifyUser(row.userId, { type: "deposit_cancelled", title: "تم إلغاء طلب الإيداع", content: reason?.trim() || "تم إلغاء طلب الإيداع من الإدارة." });
  await notifyTelegram({ title: "تم إلغاء طلب إيداع", content: `إيداع #${id}\nالمستخدم: #${row.userId}\nالسبب: ${reason?.trim() || "بدون سبب"}` });
  await addAuditLog({ userId: row.userId, action: "deposit_request.cancelled", entityType: "wallet_deposit_request", entityId: String(id), metadata: { adminId, reason } });
  return { success: true };
}

export async function getRates() {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db.select().from(currencyRates).where(eq(currencyRates.active, true));
}

export async function updateRate(adminId: number, fromCurrency: Currency, toCurrency: Currency, rate: string) {
  assertCurrency(fromCurrency); assertCurrency(toCurrency); if (fromCurrency === toCurrency) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تحويل العملة إلى نفسها" });
  if (decimalToMinor(rate, 8) <= 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "سعر الصرف غير صالح" });
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await db.insert(currencyRates).values({ fromCurrency, toCurrency, rate, updatedBy: adminId, active: true }).onDuplicateKeyUpdate({ set: { rate, updatedBy: adminId, active: true } });
  await addAuditLog({ userId: adminId, action: "currency.rate.updated", entityType: "currency_rate", metadata: { fromCurrency, toCurrency, rate } });
}

export async function convertCurrency(userId: number, input: { fromCurrency: string; toCurrency: string; amount: string }) {
  const from = input.fromCurrency.toUpperCase(); const to = input.toCurrency.toUpperCase(); assertCurrency(from); assertCurrency(to);
  if (from === to) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر عملتين مختلفتين" });
  const amountMinor = decimalToMinor(input.amount); if (amountMinor <= 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  let resultData: any;
  await db.transaction(async tx => {
    const wallet = await ensureWalletTx(userId, from, tx);
    await tx.execute(sql`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`);
    const rateRows = await tx.select().from(currencyRates).where(and(eq(currencyRates.fromCurrency, from), eq(currencyRates.toCurrency, to), eq(currencyRates.active, true))).limit(1);
    const rate = rateRows[0]?.rate; if (!rate) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "سعر الصرف غير مضبوط لهذه العملية" });
    const balanceRows = await tx.select({ balance: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.currency} = ${from} THEN ${walletTransactions.amount} ELSE 0 END),0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
    const balance = balanceRows[0]?.balance ?? "0.00";
    if (decimalToMinor(balance) < amountMinor) throw new TRPCError({ code: "BAD_REQUEST", message: "رصيد المحفظة غير كافٍ" });
    const feePercent = await getSetting("exchange_fee_percent", "2.00");
    const fee = percentOf(input.amount, feePercent); const net = minorToDecimal(amountMinor - decimalToMinor(fee)); const converted = multiplyRate(net, rate);
    const sourceAfter = minorToDecimal(decimalToMinor(balance) - amountMinor);
    const targetRows = await tx.select({ balance: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.currency} = ${to} THEN ${walletTransactions.amount} ELSE 0 END),0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
    const targetBefore = targetRows[0]?.balance ?? "0.00"; const targetAfter = minorToDecimal(decimalToMinor(targetBefore) + decimalToMinor(converted));
    const idem = `conversion:${nanoid(24)}`;
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: "conversion", amount: `-${input.amount}`, currency: from, balanceBefore: balance, balanceAfter: sourceAfter, referenceType: "currency_exchange", description: `تحويل ${from} إلى ${to}`, idempotencyKey: `${idem}:source`, metadata: { toCurrency: to, rate, fee } });
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: "conversion_fee", amount: `-${fee}`, currency: from, balanceBefore: sourceAfter, balanceAfter: minorToDecimal(decimalToMinor(sourceAfter) - decimalToMinor(fee)), referenceType: "currency_exchange", description: `رسوم تحويل ${feePercent}%`, idempotencyKey: `${idem}:fee`, metadata: { feePercent } });
    const sourceFinal = minorToDecimal(decimalToMinor(sourceAfter) - decimalToMinor(fee));
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: "conversion", amount: converted, currency: to, balanceBefore: targetBefore, balanceAfter: targetAfter, referenceType: "currency_exchange", description: `ناتج تحويل من ${from}`, idempotencyKey: `${idem}:target`, metadata: { fromCurrency: from, rate, net } });
    const ex = await tx.insert(currencyExchangeTransactions).values({ userId, fromCurrency: from, toCurrency: to, amount: input.amount, feeAmount: fee, feeCurrency: from, netAmount: net, exchangeRate: rate, convertedAmount: converted, idempotencyKey: idem });
    await tx.insert(platformRevenue).values({ type: "conversion_fee", amount: fee, currency: from, userId, referenceType: "currency_exchange", referenceId: String(ex[0]?.insertId ?? ex.insertId), metadata: { feePercent } });
    resultData = { fromCurrency: from, toCurrency: to, amount: input.amount, fee, netAmount: net, exchangeRate: rate, convertedAmount: converted };
  });
  await notifyUser(userId, { type: "currency_conversion_completed", title: "اكتمل تحويل العملة", content: `تم تحويل ${resultData.amount} ${resultData.fromCurrency} إلى ${resultData.convertedAmount} ${resultData.toCurrency}.` });
  await addAuditLog({ userId, action: "currency.conversion.completed", entityType: "currency_exchange", metadata: resultData });
  return resultData;
}

export async function payForSite(userId: number, purchaseRequestId: number) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  let siteId = 0; let amount = "0.00"; let currency: Currency = "USD";
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM purchase_requests WHERE id = ${purchaseRequestId} FOR UPDATE`);
    const request = (await tx.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1))[0];
    if (!request || request.userId !== userId) throw new TRPCError({ code: "NOT_FOUND", message: "طلب الشراء غير موجود" });
    if (request.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "طلب الشراء غير جاهز للدفع" });
    amount = request.amount; currency = request.currency as Currency; assertCurrency(currency);
    const wallet = await ensureWalletTx(userId, currency, tx);
    await tx.execute(sql`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`);
    const balanceRows = await tx.select({ balance: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.currency} = ${currency} THEN ${walletTransactions.amount} ELSE 0 END),0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
    const before = balanceRows[0]?.balance ?? "0.00"; if (decimalToMinor(before) < decimalToMinor(amount)) throw new TRPCError({ code: "BAD_REQUEST", message: "رصيد المحفظة غير كافٍ" });
    const after = minorToDecimal(decimalToMinor(before) - decimalToMinor(amount));
    const subdomain = `site-${nanoid(10).toLowerCase()}`;
    const siteResult = await tx.insert(sites).values({ userId, name: request.fullName + " — موقع مدار", subdomain, template: "modern", isActive: true, publishStatus: "draft" });
    siteId = Number(siteResult[0]?.insertId ?? siteResult.insertId);
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: "purchase", amount: `-${amount}`, currency, balanceBefore: before, balanceAfter: after, referenceType: "site_purchase", referenceId: String(purchaseRequestId), description: "شراء موقع مدار", idempotencyKey: `site-purchase:${purchaseRequestId}` });
    await tx.insert(sitePurchases).values({ userId, purchaseRequestId, siteId, amount, currency, status: "paid" });
    await tx.insert(platformRevenue).values({ type: "site_purchase", amount, currency, userId, referenceType: "site_purchase", referenceId: String(purchaseRequestId) });
    await tx.update(purchaseRequests).set({ status: "completed", siteId }).where(and(eq(purchaseRequests.id, purchaseRequestId), eq(purchaseRequests.status, "approved")));
  });
  await notifyUser(userId, { type: "site_purchase_completed", title: "تم شراء الموقع بنجاح", content: `تم خصم ${amount} ${currency} وأصبح موقعك متاحًا للبناء.` });
  await addAuditLog({ userId, action: "site_purchase.completed", entityType: "site_purchase", entityId: String(purchaseRequestId), metadata: { amount, currency, siteId } });
  return { siteId, amount, currency };
}

export async function refundSitePurchase(adminId: number, sitePurchaseId: number, reason: string) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  let userId = 0; let amount = "0.00"; let currency: Currency = "USD";
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM site_purchases WHERE id = ${sitePurchaseId} FOR UPDATE`);
    const purchase = (await tx.select().from(sitePurchases).where(eq(sitePurchases.id, sitePurchaseId)).limit(1))[0];
    if (!purchase) throw new TRPCError({ code: "NOT_FOUND" });
    if (purchase.status !== "paid") throw new TRPCError({ code: "CONFLICT", message: "عملية الشراء ليست قابلة للاسترداد" });
    if (!reason.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "سبب الاسترداد مطلوب" });
    userId = purchase.userId; amount = purchase.amount; currency = purchase.currency as Currency;
    const wallet = await ensureWalletTx(userId, currency, tx); await tx.execute(sql`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`);
    const rows = await tx.select({ balance: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.currency} = ${currency} THEN ${walletTransactions.amount} ELSE 0 END),0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
    const before = rows[0]?.balance ?? "0.00"; const after = minorToDecimal(decimalToMinor(before) + decimalToMinor(amount));
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: "refund", amount, currency, balanceBefore: before, balanceAfter: after, referenceType: "site_purchase", referenceId: String(sitePurchaseId), description: "استرداد شراء موقع", idempotencyKey: `refund:${sitePurchaseId}` });
    await tx.update(sitePurchases).set({ status: "refunded", refundedAt: new Date() }).where(and(eq(sitePurchases.id, sitePurchaseId), eq(sitePurchases.status, "paid")));
    if (purchase.siteId) await tx.update(sites).set({ isActive: false, publishStatus: "unpublished" }).where(eq(sites.id, purchase.siteId));
  });
  await notifyUser(userId, { type: "site_purchase_refunded", title: "تم استرداد قيمة الموقع", content: `تمت إعادة ${amount} ${currency} إلى محفظتك.` });
  await addAuditLog({ userId, action: "site_purchase.refunded", entityType: "site_purchase", entityId: String(sitePurchaseId), metadata: { adminId, amount, currency, reason } });
  return { success: true };
}

export async function adminWalletAdjustment(adminId: number, userId: number, input: { amount: string; currency: string; type: "admin_credit"|"admin_debit"; reason: string }) {
  const currency = input.currency.toUpperCase(); assertCurrency(currency); const amountMinor = decimalToMinor(input.amount); if (amountMinor <= 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" }); if (!input.reason.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "السبب مطلوب" });
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await db.transaction(async tx => {
    const wallet = await ensureWalletTx(userId, currency, tx); await tx.execute(sql`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`);
    const rows = await tx.select({ balance: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.currency} = ${currency} THEN ${walletTransactions.amount} ELSE 0 END),0)` }).from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
    const before = rows[0]?.balance ?? "0.00"; const delta = input.type === "admin_credit" ? amountMinor : -amountMinor; const afterMinor = decimalToMinor(before) + delta; if (afterMinor < 0n) throw new TRPCError({ code: "BAD_REQUEST", message: "الرصيد لا يسمح بهذا الخصم" });
    await tx.insert(walletTransactions).values({ walletId: wallet.id, userId, type: input.type, amount: minorToDecimal(delta), currency, balanceBefore: before, balanceAfter: minorToDecimal(afterMinor), referenceType: "admin_adjustment", referenceId: String(adminId), description: input.reason.trim(), idempotencyKey: `admin-adjustment:${adminId}:${nanoid(18)}`, metadata: { adminId, reason: input.reason.trim() } });
  });
  await addAuditLog({ userId, action: `wallet.${input.type}`, entityType: "wallet", metadata: { adminId, amount: input.amount, currency, reason: input.reason } });
  await notifyUser(userId, { type: "wallet_adjusted", title: input.type === "admin_credit" ? "تمت إضافة رصيد" : "تم خصم رصيد", content: `${input.amount} ${currency} — ${input.reason}` });
}

export async function getAdminWalletTotals() {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const rows = await db.select({ currency: walletTransactions.currency, total: sql<string>`COALESCE(SUM(${walletTransactions.amount}),0)` }).from(walletTransactions).groupBy(walletTransactions.currency);
  return rows;
}

export async function getAdminRevenueSummary() {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const rows = await db.select({ type: platformRevenue.type, currency: platformRevenue.currency, total: sql<string>`COALESCE(SUM(${platformRevenue.amount}),0)` }).from(platformRevenue).groupBy(platformRevenue.type, platformRevenue.currency);
  return rows;
}
