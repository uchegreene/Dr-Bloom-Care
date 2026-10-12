import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import {
  db, pool, bloomAccountsTable, bloomAdvisorsTable, bloomAdviceTable, medicalTeamTable,
  communityPostsTable, communityImagesTable, medicalConversationsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import communityRouter from "../src/routes/community";
import medicalRouter from "../src/routes/medical";
import teamRouter from "../src/routes/medicalTeam";
import { MedicalError } from "../src/lib/medicalAccess";
import { photoPath, signedPhotoUrl } from "../src/lib/communityStorage";
import type { BloomRequest } from "../src/middlewares/bloomAuth";

// This isolated test server injects fixture identities only. No auth bypass is
// mounted in the application. Actual transport auth is checked separately.
test("paid questions, specialist attribution, shared private inbox and revocation", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const users = ["paid", "other", "staff", "admin"].map(role => `TEST_care_${role}_${suffix}`);
  const [paid, other, staff, admin] = users;
  const previousAdmins = process.env.ADMIN_EMAILS;
  const emails = new Map(users.map(id => [id, `${id.toLowerCase()}@example.com`]));
  process.env.ADMIN_EMAILS = emails.get(admin);
  const advisorIds: number[] = [];
  const photoIds: string[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const userId = req.header("x-fixture-user");
    if (!userId || !emails.has(userId)) { res.status(401).end(); return; }
    (req as BloomRequest).bloomUserId = userId;
    (req as BloomRequest).bloomEmail = emails.get(userId)!;
    next();
  });
  app.use("/community", communityRouter);
  app.use("/medical", medicalRouter);
  app.use("/team", teamRouter);
  app.use(((error, _req, res, _next) => {
    res.status(error instanceof MedicalError ? error.status : 500)
      .json({ error: error instanceof MedicalError ? error.message : "Test request failed." });
  }) as express.ErrorRequestHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const api = async (method: string, path: string, userId: string, body?: unknown) => {
    const response = await fetch(`${origin}${path}`, {
      method, headers: { "Content-Type": "application/json", "x-fixture-user": userId },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() as any };
  };
  try {
    await db.insert(bloomAccountsTable).values(users.map((id, i) => ({
      clerkUserId: id, email: emails.get(id)!, username: `tc_${suffix.slice(0, 16)}_${i}`,
      name: `TEST ${i}`, dateOfBirth: "1995-01-01", femaleOnlyConfirmed: true,
      subscriptionStatus: i < 2 ? "active" : "free", subscriptionPlan: i < 2 ? "cycle" : null,
      subscriptionExpiresAt: i < 2 ? new Date(Date.now() + 86_400_000) : null,
    })));
    const advisors = await db.insert(bloomAdvisorsTable).values([0, 1].map(i => ({
      name: `TEST clinician ${suffix.slice(0, 8)} ${i}`, title: "TEST specialist", specialty: "TEST care",
      credentials: "TEST credentials — not real medical advice", bio: "Synthetic test profile only.",
      isVerified: true, isActive: true,
    }))).returning();
    advisorIds.push(...advisors.map(row => row.id));
    const [doctor, specialist] = advisorIds;

    assert.equal((await api("POST", "/team", admin, { userId: staff, advisorId: specialist })).status, 200);
    assert.equal((await api("POST", "/team", admin, { userId: other, advisorId: specialist })).status, 409);
    assert.equal((await api("POST", "/community/posts", staff, { text: "TEST unpaid post" })).status, 403);
    assert.equal((await api("POST", "/community/posts", paid, { text: "TEST invalid tag", advisorIds: [2147483647] })).status, 400);
    const post = await api("POST", "/community/posts", paid, {
      text: `TEST question ${suffix}`, advisorIds: [doctor], tag: "Health", authorId: other,
    });
    assert.equal(post.status, 201);
    assert.equal(post.data.authorId, paid);
    const id = post.data.id;
    assert.equal((await api("GET", `/community/posts/${id}`, other)).data.taggedAdvisors[0].id, doctor);
    assert.equal((await api("POST", `/community/posts/${id}/comments`, other, { text: "TEST spoof", advisorId: doctor })).status, 403);
    assert.equal((await api("POST", `/community/posts/${id}/comments`, staff, { text: "TEST wrong profile", advisorId: doctor })).status, 403);
    const reply = await api("POST", `/community/posts/${id}/comments`, staff, { text: "TEST specialist reply", advisorId: specialist });
    assert.equal(reply.status, 201);
    assert.equal(reply.data.comments[0].authorName, advisors[1].name);
    assert.equal(reply.data.comments[0].isVerified, true);
    assert.equal((await api("GET", "/medical/questions", staff)).data.some((p: any) => p.id === id), true);
    assert.equal((await api("POST", `/community/posts/${id}/like`, paid)).data.likes, 1);
    assert.equal((await api("POST", `/community/posts/${id}/like`, paid)).data.likes, 0);

    const thread = await api("POST", "/medical/conversations", paid, { advisorId: doctor, topic: "TEST private topic", firstMessage: "TEST private question" });
    assert.equal(thread.status, 201);
    const messagePath = `/medical/conversations/${thread.data.id}/messages`;
    assert.equal((await api("GET", messagePath, other)).status, 404);
    assert.equal((await api("GET", "/medical/conversations", other)).data.some((c: any) => c.id === thread.data.id), false);
    assert.equal((await api("GET", "/medical/conversations", staff)).data.some((c: any) => c.id === thread.data.id), true);
    assert.equal((await api("POST", messagePath, paid, { text: "TEST spoof", advisorId: specialist })).status, 403);
    assert.equal((await api("POST", messagePath, staff, { text: "TEST wrong responder", advisorId: doctor })).status, 403);
    assert.equal((await api("POST", messagePath, staff, { text: "TEST private answer", advisorId: specialist })).status, 201);
    const messages = await api("GET", messagePath, paid);
    assert.equal(messages.data.length, 2);
    assert.equal(messages.data[1].authorName, advisors[1].name);
    assert.equal(messages.data[1].isVerified, true);
    assert.equal(messages.data[1].fromMember, false);

    const advice = { advisorId: specialist, title: "TEST professional advice", body: "This is synthetic test content and is not medical guidance.", category: "General" };
    assert.equal((await api("POST", "/medical/advice", staff, advice)).status, 201);
    assert.equal((await api("POST", "/medical/advice", staff, { ...advice, advisorId: doctor })).status, 403);
    assert.equal((await api("POST", "/medical/advice", other, advice)).status, 403);
    assert.equal((await api("DELETE", `/team/${staff}`, admin)).status, 204);
    assert.equal((await api("GET", "/medical/conversations", staff)).status, 403);
    assert.equal((await api("GET", messagePath, staff)).status, 404);
    assert.equal((await api("POST", `/community/posts/${id}/comments`, staff, { text: "TEST revoked", advisorId: specialist })).status, 403);

    assert.equal((await api("POST", "/community/uploads", paid, { contentType: "image/png", size: 8_388_609 })).status, 400);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUioAAAAASUVORK5CYII=", "base64");
    const upload = await api("POST", "/community/uploads", paid, { contentType: "image/png", size: png.byteLength });
    assert.equal(upload.status, 201);
    photoIds.push(upload.data.imageId);
    assert.equal((await fetch(upload.data.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png })).ok, true);
    assert.equal((await api("POST", "/community/posts", other, { text: "TEST stolen photo", imageId: upload.data.imageId })).status, 400);
    const photo = await api("POST", "/community/posts", paid, { text: "TEST persistent photo", imageId: upload.data.imageId });
    assert.equal(photo.status, 201);
    assert.equal((await fetch(photo.data.imageUri)).ok, true);

    await db.update(bloomAccountsTable).set({ subscriptionExpiresAt: new Date(Date.now() - 1000) }).where(eq(bloomAccountsTable.clerkUserId, paid));
    assert.equal((await api("GET", messagePath, paid)).status, 403);
    assert.equal((await api("POST", "/medical/conversations", paid, { advisorId: doctor, topic: "TEST expired", firstMessage: "TEST" })).status, 403);
    assert.equal((await api("POST", "/community/posts", paid, { text: "TEST expired", advisorIds: [doctor] })).status, 403);
    assert.equal((await api("GET", `/community/posts/${id}`, paid)).status, 200);
  } finally {
    let cleanupError: Error | null = null;
    for (const imageId of photoIds) {
      try {
        const url = await signedPhotoUrl(photoPath(imageId), "DELETE");
        const removed = await fetch(url, { method: "DELETE" });
        if (!removed.ok && removed.status !== 404) throw new Error("Test photo cleanup failed.");
      } catch { cleanupError = new Error("Test photo cleanup failed; fixture database rows were still removed."); }
    }
    await db.delete(communityPostsTable).where(inArray(communityPostsTable.authorId, users));
    await db.delete(medicalConversationsTable).where(inArray(medicalConversationsTable.memberId, users));
    await db.delete(medicalTeamTable).where(inArray(medicalTeamTable.userId, users));
    await db.delete(communityImagesTable).where(inArray(communityImagesTable.ownerId, users));
    if (advisorIds.length) {
      await db.delete(bloomAdviceTable).where(inArray(bloomAdviceTable.advisorId, advisorIds));
      await db.delete(bloomAdvisorsTable).where(inArray(bloomAdvisorsTable.id, advisorIds));
    }
    await db.delete(bloomAccountsTable).where(inArray(bloomAccountsTable.clerkUserId, users));
    if (previousAdmins === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousAdmins;
    await new Promise<void>(resolve => server.close(() => resolve()));
    await pool.end();
    if (cleanupError) throw cleanupError;
  }
});
