import { and, eq, inArray } from "drizzle-orm";
import {
  db, dailyTipPushTable as pushes, dailyTipDevicesTable as devices,
  dailyTipNoticesTable as notices, dailyTipsTable as tips, bloomAccountsTable as accounts,
} from "@workspace/db";
import { batchProcess } from "@workspace/integrations-gemini-ai/batch";
import { eligibleTipPlan, nigeriaDate } from "../lib/dailyTipRules";

export async function dispatchTipPush(now = new Date()) {
  const today = nigeriaDate(now);
  const candidates = await db.select({ noticeId: notices.id, deviceId: devices.id }).from(notices)
    .innerJoin(tips, eq(notices.tipId, tips.id))
    .innerJoin(devices, eq(notices.userId, devices.userId))
    .where(and(eq(tips.status, "published"), eq(tips.date, today), eq(devices.enabled, true)));
  if (candidates.length) await db.insert(pushes).values(candidates).onConflictDoNothing();

  // Interrupted sends are uncertain: do not resend automatically and risk repeated alerts.
  const rows = await db.select({ push: pushes, device: devices, notice: notices, tip: tips, account: accounts })
    .from(pushes).innerJoin(devices, eq(pushes.deviceId, devices.id))
    .innerJoin(notices, eq(pushes.noticeId, notices.id))
    .innerJoin(tips, eq(notices.tipId, tips.id))
    .innerJoin(accounts, eq(notices.userId, accounts.clerkUserId))
    .where(inArray(pushes.status, ["pending", "failed", "accepted"])).limit(100);
  await batchProcess(rows, async row => {
    const { push, device, tip, account } = row;
    const eligible = device.enabled && device.userId === account.clerkUserId &&
      tip.status === "published" && tip.date === today && eligibleTipPlan(account, now) === tip.audience;
    if (!eligible) {
      await db.update(pushes).set({ status: "cancelled" }).where(eq(pushes.id, push.id));
      return;
    }
    if (push.status === "accepted") {
      if (!push.ticket || !push.lastAttemptAt || now.getTime() - push.lastAttemptAt.getTime() < 15 * 60000) return;
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [push.ticket] }), signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return;
        const value = await response.json() as { data?: Record<string, { status?: string; details?: { error?: string } }> };
        const receipt = value.data?.[push.ticket];
        if (!receipt) return;
        if (receipt.details?.error === "DeviceNotRegistered") await db.update(devices).set({ enabled: false }).where(eq(devices.id, device.id));
        await db.update(pushes).set({ status: receipt.status === "ok" ? "receipt_ok" : "failed_final",
          error: receipt.status === "ok" ? null : "The phone push service could not deliver this notice." }).where(eq(pushes.id, push.id));
      } catch { /* Receipt polling is retried, never resending an accepted notification. */ }
      return;
    }
    if (push.attempts >= 3) {
      await db.update(pushes).set({ status: "failed_final" }).where(eq(pushes.id, push.id));
      return;
    }
    if (push.lastAttemptAt && now.getTime() - push.lastAttemptAt.getTime() < 5 * 60000) return;
    const [claimed] = await db.update(pushes).set({ status: "sending", attempts: push.attempts + 1, lastAttemptAt: now })
      .where(and(eq(pushes.id, push.id), eq(pushes.status, push.status))).returning({ id: pushes.id });
    if (!claimed) return;
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: device.token, title: "Dr Bloom Care", body: "A medically reviewed health tip is ready. Open the app to read it.",
          sound: "default", channelId: "dr-bloom-daily-tips",
          data: { route: "/daily-tips", tipId: tip.id }, ttl: 86400,
        }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("PushRequestFailed");
      const value = await response.json() as { data?: { status?: string; id?: string; details?: { error?: string } } };
      const ticket = value.data;
      if (ticket?.details?.error === "DeviceNotRegistered") await db.update(devices).set({ enabled: false }).where(eq(devices.id, device.id));
      await db.update(pushes).set({
        status: ticket?.status === "ok" && ticket.id ? "accepted" : "failed",
        ticket: ticket?.id ?? null, error: ticket?.status === "ok" ? null : "The phone push service rejected this notice.",
      }).where(eq(pushes.id, push.id));
    } catch {
      // An HTTP timeout may occur after Expo accepted the request. Preserve the
      // uncertain sending state instead of silently duplicating a health alert.
      await db.update(pushes).set({ error: "Delivery could not be confirmed. The in-app notice remains available." }).where(eq(pushes.id, push.id));
    }
  }, { concurrency: 3, retries: 0 });
}
