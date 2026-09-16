import { TRPCError } from "@trpc/server";
import { getSitesByUserId } from "./db";
import { getWalletSummary, listMinePurchaseRequests } from "./commerce";

export async function requireSiteAccess(userId: number) {
  const sites = await getSitesByUserId(userId);
  if (sites.length > 0) return sites;
  const requests = await listMinePurchaseRequests(userId);
  const eligible = requests.some(r => r.status === "completed" && r.siteId);
  if (!eligible) throw new TRPCError({ code: "FORBIDDEN", message: "يجب شراء موقع والموافقة على الطلب أولًا" });
  return sites;
}

export async function requireCustomDomainAccess(userId: number) {
  const sites = await getSitesByUserId(userId);
  if (!sites.length) throw new TRPCError({ code: "FORBIDDEN", message: "يجب امتلاك موقع فعّال أولًا" });
  return true;
}

export async function hasPurchasingBalance(userId: number, currency: string, amount: string) {
  const summary = await getWalletSummary(userId);
  return Number(summary.balances[currency as keyof typeof summary.balances] ?? 0) >= Number(amount);
}
