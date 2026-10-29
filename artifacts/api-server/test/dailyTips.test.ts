import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  db, pool, bloomAccountsTable as accounts, bloomAdvisorsTable as advisors, medicalTeamTable as team,
  dailyTipsTable as tips, dailyTipNoticesTable as notices, dailyTipDevicesTable as devices,
} from "@workspace/db";
import dailyTipRouter from "../src/routes/dailyTips";
import bloomRouter from "../src/routes/bloom";
import careRouter from "../src/routes/care";
import { runDailyTipJob, runDailyDraftJob, publishApprovedTips } from "../src/jobs/dailyTips";
import { dispatchTipPush } from "../src/jobs/dailyTipPush";
import { nigeriaDate, publicationTime, eligibleTipPlan, tipDateOffset } from "../src/lib/dailyTipRules";
import { modelInputs } from "./dailyTipsFixtures";

test("Nigeria 9am boundaries, calendar rollover and exact paid entitlement", () => {
  assert.equal(nigeriaDate(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
  assert.equal(publicationTime("2026-10-13").toISOString(), "2026-10-13T08:00:00.000Z");
  assert.equal(tipDateOffset("2026-12-31", 1), "2027-01-01");
  const now = new Date("2026-10-13T08:00:00Z");
  const base = { femaleOnlyConfirmed: true, subscriptionStatus: "active", subscriptionPlan: "pregnancy", subscriptionExpiresAt: new Date("2026-10-14T08:00:00Z") };
  assert.equal(eligibleTipPlan(base, now), "pregnancy");
  for (const change of [{ subscriptionStatus: "free" }, { subscriptionExpiresAt: now }, { femaleOnlyConfirmed: false }, { subscriptionPlan: null }]) {
    assert.equal(eligibleTipPlan({ ...base, ...change }, now), null);
  }
});

test("isolated DB: auth, premium access, review, scheduling, notifications and privacy", async () => {
  const schema = process.env.TIP_TEST_SCHEMA!;
  assert.match(schema, /^tip_test_[a-f0-9]+$/);
  const tables = ["bloom_accounts", "bloom_admin_assignments", "bloom_advisors", "bloom_medical_team", "daily_tip_settings",
    "daily_tips", "daily_tip_notices", "daily_tip_devices", "daily_tip_push"];
  const suffix = schema.slice(-12);
  const user = (role: string) => `TEST_tip_${role}_${suffix}`;
  const roles = ["cycle", "pregnancy", "free", "expired", "staff", "admin", "unverified", "unconfirmed"];
  const ids = roles.map(user);
  process.env.SUPER_ADMIN_EMAIL = `${user("admin").toLowerCase()}@example.com`;
  const app = express();
  app.use(express.json());
  app.use(dailyTipRouter);
  app.use(bloomRouter);
  app.use(careRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const realFetch = globalThis.fetch;
  const origin = `http://127.0.0.1:${address.port}`;
  const api = async (method: string, path: string, role?: string, body?: unknown) => {
    const response = await realFetch(`${origin}/daily-tips${path}`, {
      method, headers: { "Content-Type": "application/json", ...(role ? { "x-fixture-user": user(role) } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() as any };
  };
  const adminApi = async (method: string, path: string, role?: string, body?: unknown) => {
    const response = await realFetch(`${origin}${path}`, {
      method, headers: { "Content-Type": "application/json", ...(role ? { "x-fixture-user": user(role) } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() as any };
  };
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    for (const name of tables) await pool.query(`CREATE TABLE "${schema}"."${name}" (LIKE public."${name}" INCLUDING ALL)`);
    await db.insert(accounts).values(roles.map(role => ({
      clerkUserId: user(role), email: `${user(role).toLowerCase()}@example.com`,
      username: `tt_${suffix}_${role}`, name: "TEST account", dateOfBirth: "1995-01-01",
      bio: "TEST_SECRET_PRIVATE_HEALTH_NOTE", femaleOnlyConfirmed: role !== "unconfirmed",
      mode: "cycle", subscriptionStatus: ["cycle", "pregnancy", "expired"].includes(role) ? "active" : "free",
      subscriptionPlan: role === "pregnancy" ? "pregnancy" : ["cycle", "expired"].includes(role) ? "cycle" : null,
      subscriptionExpiresAt: new Date(role === "expired" ? "2020-01-01" : "2051-01-01"),
    })));
    const [advisor] = await db.insert(advisors).values({
      name: "TEST qualified reviewer", title: "TEST doctor", specialty: "TEST education", credentials: "TEST", bio: "TEST",
      isActive: true, isVerified: true,
    }).returning();
    await db.insert(team).values({ userId: user("staff"), advisorId: advisor.id });
    const [cycle, pregnancy] = await db.insert(tips).values(["cycle", "pregnancy"].map(audience => ({
      date: "2050-02-11", audience, status: "draft", title: `TEST ${audience} education`, body: "TEST general education only.",
    }))).returning();
    assert.equal((await adminApi("GET", "/admin/assignments")).status, 401);
    assert.equal((await adminApi("GET", "/admin/assignments", "free")).status, 403);
    assert.equal((await adminApi("PUT", `/admin/assignments/${user("free")}`, "free", { active: true })).status, 403);
    assert.equal((await adminApi("GET", "/account", "admin")).data.isSuperAdmin, true);
    assert.equal((await adminApi("PUT", `/admin/assignments/${user("admin")}`, "admin", { active: false })).status, 409);
    assert.equal((await adminApi("PUT", `/admin/assignments/${user("unverified")}`, "admin", { active: true })).status, 409);
    assert.equal((await adminApi("PUT", `/admin/assignments/${user("cycle")}`, "admin", { active: true })).status, 200);
    const delegated = (await adminApi("GET", "/account", "cycle")).data;
    assert.equal(delegated.role, "admin");
    assert.equal(delegated.isSuperAdmin, false);
    assert.equal((await adminApi("GET", "/admin/members", "cycle")).status, 200);
    assert.equal((await adminApi("GET", "/admin/assignments", "cycle")).status, 403);
    const staffInput = { email: `staff_${suffix}@example.com`, name: "TEST created staff", role: "admin" };
    assert.equal((await adminApi("POST", "/admin/staff-accounts", undefined, staffInput)).status, 401);
    for (const role of ["free", "staff", "cycle"]) {
      assert.equal((await adminApi("POST", "/admin/staff-accounts", role, staffInput)).status, 403);
    }
    assert.equal((await adminApi("POST", "/admin/medical-team", "cycle", {})).status, 403);
    assert.equal((await adminApi("DELETE", `/admin/medical-team/${user("staff")}`, "cycle")).status, 403);
    assert.equal((await adminApi("POST", "/admin/staff-accounts", "admin", { ...staffInput, role: "super_admin" })).status, 400);
    assert.equal((await adminApi("POST", "/admin/staff-accounts", "admin", { ...staffInput, role: "medical_team" })).status, 400);
    assert.equal((await adminApi("POST", "/admin/staff-accounts", "admin", {
      ...staffInput, role: "medical_team", advisorId: advisor.id,
    })).status, 409);
    const createdStaff = await adminApi("POST", "/admin/staff-accounts", "admin", staffInput);
    assert.equal(createdStaff.status, 201);
    assert.equal(createdStaff.data.role, "admin");
    assert.deepEqual(Object.keys(createdStaff.data).sort(), ["email", "role", "userId"]);
    const [staffAccount] = await db.select().from(accounts).where(eq(accounts.clerkUserId, createdStaff.data.userId));
    assert.equal(staffAccount.subscriptionStatus, "free");
    assert.equal(staffAccount.femaleOnlyConfirmed, false);
    assert.equal(staffAccount.dateOfBirth, null);
    assert.equal((await adminApi("POST", "/admin/staff-accounts", "admin", staffInput)).status, 409);
    const [unassignedAdvisor] = await db.insert(advisors).values({
      name: "TEST new professional", title: "TEST midwife", specialty: "TEST care",
      credentials: "TEST", bio: "TEST", isActive: true, isVerified: true,
    }).returning();
    const createdMedical = await adminApi("POST", "/admin/staff-accounts", "admin", {
      email: `medical_${suffix}@example.com`, name: "TEST new medical", role: "medical_team", advisorId: unassignedAdvisor.id,
    });
    assert.equal(createdMedical.status, 201);
    assert.equal((await db.select().from(team).where(eq(team.userId, createdMedical.data.userId)))[0].advisorId, unassignedAdvisor.id);
    assert.equal((await adminApi("PUT", `/admin/assignments/${user("free")}`, "cycle", { active: true })).status, 403);
    assert.equal((await adminApi("PUT", `/admin/assignments/${user("cycle")}`, "admin", { active: false })).status, 200);
    assert.equal((await adminApi("GET", "/admin/members", "cycle")).status, 403);
    assert.equal((await adminApi("GET", "/account", "cycle")).data.role, "member");
    assert.equal((await adminApi("GET", "/account", "cycle")).data.subscriptionActive, true);

    assert.equal((await api("GET", "")).status, 401);
    assert.equal((await api("GET", "", "unverified")).status, 403);
    assert.equal((await api("GET", "", "unconfirmed")).status, 403);
    for (const role of ["free", "expired", "staff"]) assert.equal((await api("GET", "", role)).status, 403);
    assert.equal((await api("GET", "/review", "cycle")).status, 403);
    assert.equal((await api("GET", "/review", "staff")).status, 200);
    assert.equal((await api("GET", "/review/settings", "staff")).data.canApprove, true);
    assert.equal((await api("GET", "/review/settings", "admin")).data.canApprove, false);
    assert.equal((await api("PATCH", `/review/${cycle.id}`, "admin", { action: "approve" })).status, 403);
    assert.equal((await api("PUT", "/review/settings", "staff", { enabled: false })).status, 403);
    assert.equal((await api("PATCH", `/review/${cycle.id}`, "staff", { action: "approve" })).status, 200);
    assert.equal((await api("PATCH", `/review/${cycle.id}`, "staff", { action: "edit", title: "Reviewed edit", body: "General shared education." })).data.status, "draft");
    assert.equal((await db.select().from(tips).where(eq(tips.id, cycle.id)))[0].reviewerName, null);
    assert.equal(await publishApprovedTips(new Date("2050-02-11T08:00:00Z")), 0);
    await api("PATCH", `/review/${cycle.id}`, "staff", { action: "approve" });
    await api("PATCH", `/review/${pregnancy.id}`, "staff", { action: "approve" });
    assert.equal(await publishApprovedTips(new Date("2050-02-11T07:59:59Z")), 0);
    await api("PUT", "/review/settings", "admin", { enabled: false });
    await runDailyTipJob(new Date("2050-02-11T08:00:00Z"));
    assert.equal((await db.select().from(notices)).length, 0);
    await api("PUT", "/review/settings", "admin", { enabled: true });
    assert.equal(await publishApprovedTips(new Date("2050-02-11T08:00:00Z")), 2);
    assert.equal(await publishApprovedTips(new Date("2050-02-11T08:00:01Z")), 0);
    assert.equal((await db.select().from(notices)).length, 2);
    assert.deepEqual((await api("GET", "", "cycle")).data.map((row: any) => row.audience), ["cycle"]);
    assert.deepEqual((await api("GET", "", "pregnancy")).data.map((row: any) => row.audience), ["pregnancy"]);
    assert.equal((await api("GET", "/notices", "cycle")).data.length, 1);
    await api("POST", "/notices/read", "cycle");
    assert((await api("GET", "/notices", "cycle")).data[0].readAt);
    assert.equal((await api("GET", "/notices", "pregnancy")).data[0].readAt, null);
    const sent: any[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).startsWith("https://exp.host/")) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ data: { status: "ok", id: `test-ticket-${sent.length}` } }), { status: 200 });
      }
      return realFetch(url, init);
    }) as typeof fetch;
    for (const role of ["cycle", "pregnancy"]) {
      assert.equal((await api("PUT", "/devices", role, { deviceId: `dev-${role}`, enabled: true, token: `ExpoPushToken[test_${role}_${suffix}]` })).status, 200);
    }
    await dispatchTipPush(new Date("2050-02-11T08:01:00Z"));
    assert.equal(sent.length, 2);
    assert(sent.every(message => !/pregnan|cycle|medicine/i.test(message.body)));
    await dispatchTipPush(new Date("2050-02-11T08:02:00Z"));
    assert.equal(sent.length, 2);
    assert.equal((await api("DELETE", "/devices/dev-cycle", "pregnancy")).status, 204);
    assert.equal((await db.select().from(devices).where(eq(devices.id, "dev-cycle"))).length, 1);
    await api("DELETE", "/devices/dev-cycle", "cycle");
    assert.equal((await db.select().from(devices).where(eq(devices.id, "dev-cycle"))).length, 0);
    assert.equal((await api("POST", "/review/generate", "staff", { days: 1 })).data.queued, 2);
    assert.equal((await api("POST", "/review/generate", "staff", { days: 1 })).data.queued, 0);
    await runDailyDraftJob(new Date("2050-02-11T08:03:00Z"));
    assert(modelInputs.length > 0);
    assert(modelInputs.every(prompt => !prompt.includes("TEST_SECRET") && !prompt.includes("@example.com") && !prompt.includes("TEST_tip_")));
    assert.equal((await api("PATCH", `/review/${cycle.id}`, "staff", { action: "edit", title: "Changed", body: "Changed" })).status, 409);
    await api("PATCH", `/review/${cycle.id}`, "staff", { action: "reject" });
    assert.equal((await api("GET", "", "cycle")).data.length, 0);
    assert.equal((await api("GET", "/notices", "cycle")).data.length, 0);
    const [future] = await db.insert(tips).values({
      date: "2050-02-12", audience: "cycle", status: "draft", title: "TEST future", body: "TEST general education.",
    }).onConflictDoUpdate({ target: [tips.date, tips.audience], set: { status: "draft", title: "TEST future", body: "TEST general education." } }).returning();
    await api("PATCH", `/review/${future.id}`, "staff", { action: "approve" });
    await db.delete(team).where(eq(team.userId, user("staff")));
    await publishApprovedTips(new Date("2050-02-12T08:00:00Z"));
    assert.equal((await db.select().from(tips).where(eq(tips.id, future.id)))[0].status, "draft");
  } finally {
    globalThis.fetch = realFetch;
    server.close();
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  }
});
