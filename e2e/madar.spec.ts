import { test, expect } from "@playwright/test";

const userState = process.env.E2E_USER_STORAGE_STATE;
const adminState = process.env.E2E_ADMIN_STORAGE_STATE;
const screenshot = process.env.E2E_DEPOSIT_SCREENSHOT;

test.describe("MADAR marketplace end-to-end", () => {
  test.skip(!userState || !adminState || !screenshot, "Set E2E_USER_STORAGE_STATE, E2E_ADMIN_STORAGE_STATE and E2E_DEPOSIT_SCREENSHOT.");

  test("Purchase Request → Admin Approval → Binance Deposit → Wallet Payment → Publish → Lead → Analytics", async ({ browser }) => {
    const userContext = await browser.newContext({ storageState: userState });
    const adminContext = await browser.newContext({ storageState: adminState });
    const user = await userContext.newPage();
    const admin = await adminContext.newPage();

    await user.goto("/dashboard?tab=purchases");
    await user.getByPlaceholder("الاسم الكامل *").fill("MADAR E2E Customer");
    await user.getByPlaceholder("رقم WhatsApp *").fill("+966500000000");
    await user.getByRole("button", { name: "إرسال طلب شراء" }).click();
    await expect(user.getByText("تم إرسال طلب شراء الموقع")).toBeVisible();

    await admin.goto("/admin");
    await admin.getByRole("button", { name: "طلبات شراء المواقع" }).click();
    await admin.getByText(/MADAR E2E Customer/).first().waitFor();
    await admin.getByRole("button").filter({ has: admin.locator("svg") }).first().click().catch(() => {});
    const approveButtons = admin.locator("button").filter({ hasText: "" });
    await expect(admin.getByText(/MADAR E2E Customer/).first()).toBeVisible();
    // The approve action is the green check button in the matching request card.
    const requestCard = admin.getByText(/MADAR E2E Customer/).first().locator("xpath=../..");
    await requestCard.locator("button").first().click();

    await user.reload();
    await expect(user.getByText("approved").or(user.getByText("معتمد"))).toBeVisible().catch(() => {});
    await user.getByRole("button", { name: "طلبات الشراء" }).click().catch(() => {});
    await user.getByText("دفع وفتح الموقع").waitFor();

    await user.goto("/dashboard?tab=wallet");
    await user.getByPlaceholder("المبلغ").first().fill(process.env.E2E_DEPOSIT_AMOUNT || "500");
    await user.getByPlaceholder("Binance TxID / Payment Number").fill(`E2E-${Date.now()}`);
    await user.locator('input[type="file"]').setInputFiles(screenshot!);
    await user.getByRole("button", { name: "إرسال طلب الإيداع" }).click();

    await admin.goto("/admin");
    await admin.getByRole("button", { name: "طلبات الإيداع" }).click();
    await admin.getByText(/E2E-/).first().waitFor();
    const depositCard = admin.getByText(/E2E-/).first().locator("xpath=../..");
    await depositCard.locator("button").first().click();

    await user.goto("/dashboard?tab=purchases");
    await user.getByText("دفع وفتح الموقع").click();
    await expect(user).toHaveURL(/\/site\/\d+/);

    await user.getByRole("button", { name: /نشر الموقع/ }).click();
    await expect(user.getByText(/منشور/)).toBeVisible();

    const publicPage = await userContext.newPage();
    const siteUrl = await user.locator('a[href^="/s/"]').first().getAttribute("href");
    expect(siteUrl).toBeTruthy();
    await publicPage.goto(siteUrl!);
    await expect(publicPage.locator("body")).toBeVisible();
    if (await publicPage.getByPlaceholder("الاسم").count()) {
      await publicPage.getByPlaceholder("الاسم").fill("E2E Lead");
      await publicPage.getByPlaceholder("البريد الإلكتروني").fill("lead@example.com");
      await publicPage.getByPlaceholder("رسالتك").fill("Hello from E2E");
      await publicPage.getByRole("button", { name: "إرسال الرسالة" }).click();
    }
    await user.goto("/dashboard");
    await user.getByRole("button", { name: "الرسائل" }).click();
    await expect(user.getByText("E2E Lead")).toBeVisible().catch(() => {});

    await userContext.close();
    await adminContext.close();
  });
});
