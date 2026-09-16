import { relations } from "drizzle-orm";
import { users, sites, siteVersions, siteVisits, analyticsDaily, messages, domains, mediaAssets, walletTransactions, wallets, walletDepositRequests, purchaseRequests, sitePurchases, notifications, auditLogs, aiUsage, currencyExchangeTransactions } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites), messages: many(messages), mediaAssets: many(mediaAssets), notifications: many(notifications), auditLogs: many(auditLogs), aiUsage: many(aiUsage), wallets: many(wallets), walletTransactions: many(walletTransactions), walletDepositRequests: many(walletDepositRequests), purchaseRequests: many(purchaseRequests), sitePurchases: many(sitePurchases), currencyExchanges: many(currencyExchangeTransactions),
}));
export const sitesRelations = relations(sites, ({ one, many }) => ({ owner: one(users,{fields:[sites.userId],references:[users.id]}), versions: many(siteVersions), visits: many(siteVisits), analytics: many(analyticsDaily), messages: many(messages), domains: many(domains), mediaAssets: many(mediaAssets), purchases: many(sitePurchases) }));
export const siteVersionsRelations = relations(siteVersions, ({ one }) => ({ site: one(sites,{fields:[siteVersions.siteId],references:[sites.id]}), creator: one(users,{fields:[siteVersions.createdBy],references:[users.id]}) }));
export const siteVisitsRelations = relations(siteVisits, ({ one }) => ({ site: one(sites,{fields:[siteVisits.siteId],references:[sites.id]}) }));
export const analyticsDailyRelations = relations(analyticsDaily, ({ one }) => ({ site: one(sites,{fields:[analyticsDaily.siteId],references:[sites.id]}) }));
export const messagesRelations = relations(messages, ({ one }) => ({ site: one(sites,{fields:[messages.siteId],references:[sites.id]}), owner: one(users,{fields:[messages.userId],references:[users.id]}) }));
export const domainsRelations = relations(domains, ({ one }) => ({ site: one(sites,{fields:[domains.siteId],references:[sites.id]}) }));
export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({ owner: one(users,{fields:[mediaAssets.userId],references:[users.id]}), site: one(sites,{fields:[mediaAssets.siteId],references:[sites.id]}) }));
export const walletsRelations = relations(wallets, ({ one, many }) => ({ user: one(users,{fields:[wallets.userId],references:[users.id]}), transactions: many(walletTransactions), deposits: many(walletDepositRequests) }));
export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({ wallet: one(wallets,{fields:[walletTransactions.walletId],references:[wallets.id]}), user: one(users,{fields:[walletTransactions.userId],references:[users.id]}) }));
export const walletDepositRequestsRelations = relations(walletDepositRequests, ({ one }) => ({ user: one(users,{fields:[walletDepositRequests.userId],references:[users.id]}), wallet: one(wallets,{fields:[walletDepositRequests.userId],references:[wallets.userId]}) }));
export const purchaseRequestsRelations = relations(purchaseRequests, ({ one }) => ({ user: one(users,{fields:[purchaseRequests.userId],references:[users.id]}), site: one(sites,{fields:[purchaseRequests.siteId],references:[sites.id]}), purchase: one(sitePurchases,{fields:[purchaseRequests.id],references:[sitePurchases.purchaseRequestId]}) }));
export const sitePurchasesRelations = relations(sitePurchases, ({ one }) => ({ user: one(users,{fields:[sitePurchases.userId],references:[users.id]}), request: one(purchaseRequests,{fields:[sitePurchases.purchaseRequestId],references:[purchaseRequests.id]}), site: one(sites,{fields:[sitePurchases.siteId],references:[sites.id]}) }));
export const currencyExchangeRelations = relations(currencyExchangeTransactions, ({ one }) => ({ user: one(users,{fields:[currencyExchangeTransactions.userId],references:[users.id]}) }));
export const notificationsRelations = relations(notifications, ({ one }) => ({ user: one(users,{fields:[notifications.userId],references:[users.id]}) }));
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({ user: one(users,{fields:[auditLogs.userId],references:[users.id]}) }));
export const aiUsageRelations = relations(aiUsage, ({ one }) => ({ user: one(users,{fields:[aiUsage.userId],references:[users.id]}) }));
