import { and, eq, lt, or, sql } from "drizzle-orm";
import {
  db, pool, dailyTipSettingsTable as settings, dailyTipsTable as tips, dailyTipNoticesTable as notices,
  bloomAccountsTable as accounts, bloomAdvisorsTable as advisors, medicalTeamTable as team,
} from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import { batchProcess } from "@workspace/integrations-gemini-ai/batch";
import { logger } from "../lib/logger";
import { draftPrompt, eligibleTipPlan, nigeriaDate, publicationTime, tipDateOffset, TIP_MODEL, validateTipText, type TipAudience } from "../lib/dailyTipRules";
import { dispatchTipPush } from "./dailyTipPush";

export async function queueTipDrafts(days: number, now = new Date()): Promise<number> {
  const values = Array.from({ length: days }, (_, index) => tipDateOffset(nigeriaDate(now), index))
    .flatMap(date => (["cycle", "pregnancy"] as const).map(audience => ({ date, audience })));
  return (await db.insert(tips).values(values).onConflictDoNothing().returning({ id: tips.id })).length;
}

export async function publishApprovedTips(now = new Date()): Promise<number> {
  const today = nigeriaDate(now);
  const due = await db.select().from(tips).where(eq(tips.status, "approved"));
  let count = 0;
  for (const candidate of due) {
    if (publicationTime(candidate.date) > now) continue;
    await db.transaction(async tx => {
      const [tip] = await tx.select().from(tips).where(eq(tips.id, candidate.id)).for("update");
      if (!tip || tip.status !== "approved") return;
      const [currentSettings] = await tx.select().from(settings).where(eq(settings.id, 1)).for("share");
      if (currentSettings && !currentSettings.enabled) return;
      // Recheck authorisation at release time, not just at approval time.
      const [reviewer] = await tx.select({ id: team.advisorId }).from(team)
        .innerJoin(advisors, eq(team.advisorId, advisors.id))
        .where(and(eq(team.userId, tip.reviewerUserId ?? ""), eq(team.advisorId, tip.reviewerAdvisorId ?? -1),
          eq(advisors.isActive, true), eq(advisors.isVerified, true))).limit(1);
      if (!reviewer) {
        await tx.update(tips).set({ status: "draft", reviewerUserId: null, reviewerAdvisorId: null,
          reviewerName: null, reviewedAt: null, error: "The approving professional no longer has active verified access. A new review is required." }).where(eq(tips.id, tip.id));
        return;
      }
      await tx.update(tips).set({ status: "published", publishedAt: now, error: null }).where(eq(tips.id, tip.id));
      count++;
      // Late archived tips remain readable, but never produce a burst of old alerts.
      if (tip.date !== today) return;
      const subscribers = await tx.select({ clerkUserId: accounts.clerkUserId, femaleOnlyConfirmed: accounts.femaleOnlyConfirmed,
        subscriptionStatus: accounts.subscriptionStatus, subscriptionPlan: accounts.subscriptionPlan,
        subscriptionExpiresAt: accounts.subscriptionExpiresAt }).from(accounts).where(and(eq(accounts.subscriptionStatus, "active"),
        eq(accounts.subscriptionPlan, tip.audience), eq(accounts.femaleOnlyConfirmed, true)));
      const eligible = subscribers.filter(account => eligibleTipPlan(account, now) === tip.audience);
      if (eligible.length) await tx.insert(notices).values(eligible.map(account => ({
        userId: account.clerkUserId, tipId: tip.id, createdAt: now,
      }))).onConflictDoNothing();
    });
  }
  return count;
}

async function generateQueuedDrafts(now: Date) {
  // A terminated process must not permanently leave a generating row stuck.
  await db.update(tips).set({ status: "queued" }).where(and(eq(tips.status, "generating"),
    lt(tips.lastAttemptAt, new Date(now.getTime() - 10 * 60000))));
  await db.update(tips).set({ status: "error", error: "Generation stopped at the retry limit. No tip has been published." })
    .where(and(eq(tips.status, "queued"), sql`${tips.attempts} >= 6`));
  const rows = await db.select().from(tips).where(or(
    and(eq(tips.status, "queued"), lt(tips.attempts, 6)),
    and(eq(tips.status, "error"), lt(tips.attempts, 3), lt(tips.lastAttemptAt, new Date(now.getTime() - 5 * 60000))),
  )).orderBy(tips.date, tips.audience).limit(4);
  await batchProcess(rows, async tip => {
    await db.update(tips).set({ status: "generating", lastAttemptAt: new Date(), attempts: sql`${tips.attempts} + 1`, error: null }).where(eq(tips.id, tip.id));
    try {
      const [response] = await batchProcess([tip], () => ai.models.generateContent({
        model: TIP_MODEL, contents: draftPrompt(tip.audience as TipAudience, tip.date),
        config: { responseMimeType: "application/json", maxOutputTokens: 8192, httpOptions: { timeout: 60000 } },
      }), { concurrency: 1, retries: 1, minTimeout: 2000, maxTimeout: 5000 });
      const result = JSON.parse(response.text ?? "") as { title?: unknown; body?: unknown };
      if (typeof result.title !== "string" || typeof result.body !== "string") throw new Error("InvalidDraft");
      validateTipText(result.title, result.body);
      if (/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu)\b|https?:\/\//i.test(result.body)) throw new Error("UnsafeDraft");
      await db.update(tips).set({ status: "draft", title: result.title.trim(), body: result.body.trim(), model: TIP_MODEL, error: null })
        .where(and(eq(tips.id, tip.id), eq(tips.status, "generating")));
    } catch (error) {
      await db.update(tips).set({ status: "error", error: "Gemini could not produce an acceptable draft. A team member can retry; no content has been published." })
        .where(and(eq(tips.id, tip.id), eq(tips.status, "generating")));
      logger.warn({ errorName: error instanceof Error ? error.name : "UnknownError", tipId: tip.id }, "Daily-tip generation failed");
    }
  }, { concurrency: 1, retries: 0 });
}

async function withWorkerLease(key: number, work: () => Promise<unknown>): Promise<boolean> {
  const lease = await pool.connect();
  let locked = false;
  try {
    const result = await lease.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(771009, $1) AS locked", [key]);
    locked = result.rows[0].locked;
    if (!locked) return false;
    await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
    const [state] = await db.select().from(settings).where(eq(settings.id, 1));
    if (!state.enabled) return true;
    await work();
    return true;
  } finally {
    if (locked) await lease.query("SELECT pg_advisory_unlock(771009, $1)", [key]).catch(() => undefined);
    lease.release();
  }
}

export function runDailyTipJob(now = new Date()) {
  return withWorkerLease(1, () => publishApprovedTips(now));
}
export function runDailyDraftJob(now = new Date()) {
  return withWorkerLease(2, async () => {
    await queueTipDrafts(2, now);
    await generateQueuedDrafts(now);
  });
}
export function runDailyPushJob(now = new Date()) {
  return withWorkerLease(3, () => dispatchTipPush(now));
}
export function startDailyTipWorker() {
  // Separate leases/timers prevent slow AI or push-service calls delaying 9 a.m. publication.
  const stop = [runDailyTipJob, runDailyDraftJob, runDailyPushJob].map(job => {
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try { await job(); }
      catch (error) { logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Daily-tip worker failed; next check will retry"); }
      finally { running = false; }
    };
    const initial = setTimeout(() => void tick(), 5000);
    initial.unref();
    const timer = setInterval(() => void tick(), 30000);
    timer.unref();
    return () => { clearTimeout(initial); clearInterval(timer); };
  });
  logger.info("Daily-tip worker started: human approval required; publication at 09:00 Africa/Lagos");
  return () => stop.forEach(cancel => cancel());
}
