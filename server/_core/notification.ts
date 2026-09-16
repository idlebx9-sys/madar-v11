/**
 * In-app notifications are stored in the `notifications` table.
 * Email/WhatsApp delivery can be wired here (Resend, Twilio, etc.).
 */
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
  type?: string;
};

/** Persist an in-app notification for a user. */
export async function notifyUser(
  userId: number,
  payload: NotificationPayload,
): Promise<void> {
  const { getDb } = await import("../db");
  const { notifications } = await import("../../drizzle/schema");
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    userId,
    type: payload.type || "info",
    title: payload.title.slice(0, 255),
    body: payload.content,
  });
}

/**
 * Notify platform owner (admin). Used by systemRouter.
 * Returns true if a notification was recorded (or email attempted).
 */
export async function notifyOwner(input: {
  title: string;
  content: string;
}): Promise<boolean> {
  try {
    const { getDb } = await import("../db");
    const { users } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return false;

    // Prefer OWNER_OPEN_ID match, else first admin user
    let ownerId: number | null = null;
    if (ENV.ownerOpenId) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.openId, ENV.ownerOpenId))
        .limit(1);
      if (rows[0]) ownerId = rows[0].id;
    }
    if (ownerId == null) {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      if (admins[0]) ownerId = admins[0].id;
    }
    if (ownerId == null) {
      console.warn("[Notification] No owner/admin user found for notifyOwner");
      return false;
    }
    await notifyUser(ownerId, {
      type: "system",
      title: input.title,
      content: input.content,
    });
    return true;
  } catch (err) {
    console.error("[Notification] notifyOwner failed", err);
    return false;
  }
}

/** Placeholder for email delivery — integrate Resend/SES when ready. */
export async function sendEmailNotification(
  _user: User,
  _payload: NotificationPayload,
): Promise<{ ok: boolean; reason?: string }> {
  console.info("[Notification] Email delivery not configured yet");
  return { ok: false, reason: "email_provider_not_configured" };
}

/** Outbound Telegram notification only. No polling, commands or webhook is used. */
export async function notifyTelegram(input: { title: string; content: string }): Promise<boolean> {
  if (!ENV.telegramBotToken || !ENV.telegramChatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${ENV.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: ENV.telegramChatId,
        text: `🔔 ${input.title}\n\n${input.content}`.slice(0, 4000),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`[Telegram] sendMessage failed: ${response.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Telegram] notification failed", err);
    return false;
  }
}
