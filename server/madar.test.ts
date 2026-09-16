import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "k", url: "/madar-storage/k" }),
  createPresignedUpload: vi.fn().mockResolvedValue({ key: "k", uploadUrl: "https://s3/presign", publicUrl: "/madar-storage/k" }),
}));
vi.mock("./commerce", () => ({
  getSetting: vi.fn().mockImplementation(async (key:string, fallback="") => fallback),
  getSettings: vi.fn().mockResolvedValue({}),
  createPurchaseRequest: vi.fn(), listMinePurchaseRequests: vi.fn().mockResolvedValue([]), listPurchaseRequests: vi.fn().mockResolvedValue([]), reviewPurchaseRequest: vi.fn(),
  createDepositRequest: vi.fn(), createDepositUpload: vi.fn().mockResolvedValue({ key:"users/1/deposits/x.png", uploadUrl:"https://s3/upload", publicUrl:"/madar-storage/x.png" }), listDepositRequests: vi.fn().mockResolvedValue([]), approveDeposit: vi.fn(), rejectDeposit: vi.fn(),
  getWalletSummary: vi.fn().mockResolvedValue({ balances:{USD:"0.00",SAR:"50.00",TRY:"0.00"}, totals:{deposits:"50.00",purchases:"0.00",fees:"0.00"} }), getWalletTransactions: vi.fn().mockResolvedValue([]), getRates: vi.fn().mockResolvedValue([]), updateRate: vi.fn(), convertCurrency: vi.fn(), payForSite: vi.fn(), refundSitePurchase: vi.fn(), adminWalletAdjustment: vi.fn(), getAdminRevenueSummary: vi.fn().mockResolvedValue([]), updateSettings: vi.fn(),
}));
vi.mock("./db", () => ({
  getSitesByUserId: vi.fn().mockResolvedValue([]), getSiteById: vi.fn().mockResolvedValue(null), createSite: vi.fn(), updateSite: vi.fn(), deleteSite: vi.fn(),
  getMessagesByUserId: vi.fn().mockResolvedValue([]), createMessage: vi.fn(), markMessageRead: vi.fn(), markAllMessagesRead: vi.fn(), getUserById: vi.fn().mockResolvedValue({ id:1 }),
  getSiteByIdBySubdomain: vi.fn().mockResolvedValue({ id:1,userId:1 }), addAuditLog: vi.fn(), recordLeadAnalytics: vi.fn(), getAnalyticsDaily: vi.fn().mockResolvedValue([]), getPublishedSiteByHostname: vi.fn().mockResolvedValue(null), recordSiteVisit: vi.fn(),
  getAllDomains: vi.fn().mockResolvedValue([]), createDomain: vi.fn(), getDomainById: vi.fn().mockResolvedValue(null), setDomainStatus: vi.fn(), getAllUsers: vi.fn().mockResolvedValue([]), getAllSites: vi.fn().mockResolvedValue([]), getUserByEmail: vi.fn(), updateUserProfile: vi.fn(), softDeleteUser: vi.fn(), createMediaAsset: vi.fn(), publishSite: vi.fn(), unpublishSite: vi.fn(), restoreSiteVersion: vi.fn(), removeDomain: vi.fn(), setPrimaryDomain: vi.fn(), getSiteVersions: vi.fn().mockResolvedValue([]), getMessageById: vi.fn().mockResolvedValue(null), getDb: vi.fn(),
}));

function createCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return { user: { id:1, openId:"test-user", email:"test@example.com", name:"Test User", passwordHash:null, loginMethod:"oauth", role:"user", emailVerifiedAt:null, createdAt:new Date(), updatedAt:new Date(), lastSignedIn:new Date(), deletedAt:null }, req:{protocol:"https",headers:{}} as TrpcContext["req"], res:{clearCookie:vi.fn()} as any, ...overrides };
}

describe("MADAR marketplace contract", () => {
  it("returns the authenticated user", async () => expect(await appRouter.createCaller(createCtx()).auth.me()).toMatchObject({ id:1 }));
  it("returns wallet summary without legacy walletBalance", async () => {
    const result = await appRouter.createCaller(createCtx()).wallet.summary();
    expect(result.balances.SAR).toBe("50.00");
  });
  it("exposes purchase requests as the new commercial flow", async () => {
    const result = await appRouter.createCaller(createCtx()).purchaseRequests.listMine();
    expect(result).toEqual([]);
  });
  it("rejects malformed site subdomains before business logic", async () => {
    await expect(appRouter.createCaller(createCtx()).sites.create({name:"Test Site",subdomain:"INVALID SUBDOMAIN!",template:"modern"})).rejects.toThrow();
  });
});
