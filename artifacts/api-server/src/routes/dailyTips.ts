import { Router, type IRouter, type ErrorRequestHandler } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  db, bloomAccountsTable, bloomAdvisorsTable, dailyTipsTable as tips,
  dailyTipNoticesTable as notices, dailyTipDevicesTable as devices, dailyTipSettingsTable as settings,
} from "@workspace/db";
import { SetDailyTipDeviceBody, GenerateDailyTipDraftsBody, ReviewDailyTipBody, SetDailyTipStatusBody } from "@workspace/api-zod";
import { requireBloomProfile, requireBloomAdmin } from "../middlewares/bloomAuth";
import { actor, requireTeam, MedicalError } from "../lib/medicalAccess";
import { eligibleTipPlan, nigeriaDate, tipDateOffset, TIP_SCHEDULE, validateTipText } from "../lib/dailyTipRules";
import { queueTipDrafts } from "../jobs/dailyTips";

const router: IRouter = Router();
router.use("/daily-tips", (_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); }, requireBloomProfile);
export function tipResponse(tip: typeof tips.$inferSelect) {
  return { id: tip.id, date: tip.date, audience: tip.audience, status: tip.status,
    title: tip.title, body: tip.body, model: tip.model, reviewerName: tip.reviewerName,
    reviewedAt: tip.reviewedAt?.toISOString() ?? null, publishedAt: tip.publishedAt?.toISOString() ?? null, error: tip.error };
}
async function paidAudience(req: Parameters<typeof actor>[0]) {
  const [account] = await db.select().from(bloomAccountsTable).where(eq(bloomAccountsTable.clerkUserId, actor(req).userId)).limit(1);
  const plan = account && eligibleTipPlan(account);
  if (!plan) throw new MedicalError(403, "Daily AI tips require an active paid plan.");
  return plan;
}
async function reviewStatus(req: Parameters<typeof actor>[0]) {
  const access = await requireTeam(req);
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  const [state] = await db.select().from(settings).where(eq(settings.id, 1));
  return { enabled: state.enabled, isAdmin: access.isAdmin, canApprove: Boolean(access.advisorId), schedule: TIP_SCHEDULE, provider: "Gemini" };
}
router.get("/daily-tips", async (req, res) => {
  const audience = await paidAudience(req);
  const rows = await db.select().from(tips).where(and(eq(tips.status, "published"), eq(tips.audience, audience)))
    .orderBy(desc(tips.date)).limit(30);
  res.json(rows.map(tipResponse));
});
router.get("/daily-tips/notices", async (req, res) => {
  const audience = await paidAudience(req);
  const rows = await db.select({ notice: notices, tip: tips }).from(notices)
    .innerJoin(tips, eq(notices.tipId, tips.id))
    .where(and(eq(notices.userId, actor(req).userId), eq(tips.status, "published"), eq(tips.audience, audience)))
    .orderBy(desc(notices.createdAt)).limit(30);
  res.json(rows.map(row => ({ id: row.notice.id, tip: tipResponse(row.tip), readAt: row.notice.readAt?.toISOString() ?? null, createdAt: row.notice.createdAt.toISOString() })));
});
router.post("/daily-tips/notices/read", async (req, res) => {
  await paidAudience(req);
  await db.update(notices).set({ readAt: new Date() }).where(eq(notices.userId, actor(req).userId));
  res.status(204).end();
});
router.get("/daily-tips/devices", async (req, res) => {
  await paidAudience(req);
  res.json(await db.select({ id: devices.id, enabled: devices.enabled }).from(devices).where(eq(devices.userId, actor(req).userId)));
});
router.put("/daily-tips/devices", async (req, res) => {
  await paidAudience(req);
  const parsed = SetDailyTipDeviceBody.safeParse(req.body);
  if (!parsed.success) throw new MedicalError(400, "A valid notification preference is required.");
  const { deviceId, enabled, token } = parsed.data;
  const userId = actor(req).userId;
  if (!enabled) {
    await db.update(devices).set({ enabled: false, updatedAt: new Date() }).where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
  } else {
    if (!token || !/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)) throw new MedicalError(400, "A valid Expo push token from this installed app is required.");
    await db.transaction(async tx => {
      // One installation/token cannot remain assigned to an older signed-in account.
      await tx.delete(devices).where(eq(devices.token, token));
      const [existing] = await tx.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
      if (existing && existing.userId !== userId) throw new MedicalError(409, "This device identifier belongs to another account.");
      await tx.insert(devices).values({ id: deviceId, userId, token, enabled: true })
        .onConflictDoUpdate({ target: devices.id, set: { token, enabled: true, updatedAt: new Date() } });
    });
  }
  res.json({ id: deviceId, enabled });
});
router.delete("/daily-tips/devices/:deviceId", async (req, res) => {
  await db.delete(devices).where(and(eq(devices.id, String(req.params.deviceId)), eq(devices.userId, actor(req).userId)));
  res.status(204).end();
});
router.get("/daily-tips/review/settings", async (req, res) => { res.json(await reviewStatus(req)); });
router.put("/daily-tips/review/settings", requireBloomAdmin, async (req, res) => {
  const parsed = SetDailyTipStatusBody.safeParse(req.body);
  if (!parsed.success) throw new MedicalError(400, "Choose whether automation is enabled.");
  await db.insert(settings).values({ id: 1, enabled: parsed.data.enabled }).onConflictDoUpdate({
    target: settings.id, set: { enabled: parsed.data.enabled, updatedAt: new Date() },
  });
  res.json(await reviewStatus(req));
});
router.get("/daily-tips/review", async (req, res) => {
  await requireTeam(req);
  res.json((await db.select().from(tips).where(gte(tips.date, tipDateOffset(nigeriaDate(), -14)))
    .orderBy(desc(tips.date), tips.audience).limit(80)).map(tipResponse));
});
router.post("/daily-tips/review/generate", async (req, res) => {
  await requireTeam(req);
  const parsed = GenerateDailyTipDraftsBody.safeParse(req.body);
  if (!parsed.success) throw new MedicalError(400, "Choose between 1 and 7 days of drafts.");
  res.status(202).json({ queued: await queueTipDrafts(parsed.data.days) });
});
router.patch("/daily-tips/review/:id", async (req, res) => {
  const access = await requireTeam(req);
  const parsed = ReviewDailyTipBody.safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || !Number.isSafeInteger(id) || id < 1) throw new MedicalError(400, "Choose a valid tip and review action.");
  const input = parsed.data;
  const result = await db.transaction(async tx => {
    const [tip] = await tx.select().from(tips).where(eq(tips.id, id)).for("update");
    if (!tip) throw new MedicalError(404, "Tip not found.");
    const clear = { reviewerUserId: null, reviewerAdvisorId: null, reviewerName: null, reviewedAt: null };
    let changes: Partial<typeof tips.$inferInsert>;
    if (input.action === "edit") {
      if (["queued", "generating", "published"].includes(tip.status)) throw new MedicalError(409, "Wait for generation, or withdraw a published tip before editing it.");
      if (!tip.title || !tip.body) throw new MedicalError(409, "An AI draft must be generated successfully before it can be edited. Retry generation first.");
      if (input.title === undefined || input.body === undefined) throw new MedicalError(400, "Enter both the title and body.");
      try { validateTipText(input.title, input.body); } catch (error) { throw new MedicalError(400, (error as Error).message); }
      changes = { title: input.title.trim(), body: input.body.trim(), status: "draft", error: null, ...clear };
    } else if (input.action === "approve") {
      if (!access.advisorId) throw new MedicalError(403, "Approval requires your account to be assigned to an active verified professional profile.");
      if (tip.status !== "draft") throw new MedicalError(409, "Only a completed draft can be approved.");
      const [advisor] = await tx.select().from(bloomAdvisorsTable).where(eq(bloomAdvisorsTable.id, access.advisorId));
      if (!advisor?.isActive || !advisor.isVerified) throw new MedicalError(403, "The reviewing professional must still have active verified access.");
      changes = { status: "approved", reviewerUserId: actor(req).userId, reviewerAdvisorId: advisor.id, reviewerName: advisor.name, reviewedAt: new Date(), error: null };
    } else if (input.action === "reject") {
      if (tip.status === "generating") throw new MedicalError(409, "Wait for generation before rejecting this tip.");
      await tx.delete(notices).where(eq(notices.tipId, tip.id));
      changes = { status: "rejected", ...clear };
    } else {
      if (tip.status !== "error" || tip.attempts >= 6) throw new MedicalError(409, "Only failed drafts below the retry limit can be retried.");
      changes = { status: "queued", error: null };
    }
    const [row] = await tx.update(tips).set(changes).where(eq(tips.id, id)).returning();
    return row;
  });
  res.json(tipResponse(result));
});
const errors: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) { next(error); return; }
  if (error instanceof MedicalError) { res.status(error.status).json({ error: error.message }); return; }
  req.log?.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Daily-tip request failed");
  res.status(500).json({ error: "Unable to complete this daily-tip request." });
};
router.use(errors);
export default router;
