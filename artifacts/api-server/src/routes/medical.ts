import {
  bloomAccountsTable, bloomAdvisorsTable, bloomAdviceTable, medicalConversationsTable, medicalMessagesTable, db,
} from "@workspace/db";
import { PublishMedicalAdviceBody, StartMedicalConversationBody, SendMedicalMessageBody } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { activeAdvisor, actor, MedicalError, requirePaid, requireTeam, respondingAdvisor, teamAccess } from "../lib/medicalAccess";
import { loadCommunityPosts } from "./community";

const router: IRouter = Router();
const conversationSelection = {
  id: medicalConversationsTable.id, advisorId: medicalConversationsTable.advisorId,
  advisorName: bloomAdvisorsTable.name, advisorSpecialty: bloomAdvisorsTable.specialty,
  memberUsername: bloomAccountsTable.username, topic: medicalConversationsTable.topic,
  lastMessage: medicalConversationsTable.lastMessage,
  updatedAt: medicalConversationsTable.updatedAt, createdAt: medicalConversationsTable.createdAt,
};

async function threadAccess(req: Request, id: number) {
  const [conversation] = await db.select().from(medicalConversationsTable).where(eq(medicalConversationsTable.id, id)).limit(1);
  if (!conversation) throw new MedicalError(404, "Conversation not found.");
  const access = await teamAccess(req);
  if (!access.isAdmin && !access.advisorId) {
    if (conversation.memberId !== actor(req).userId) throw new MedicalError(404, "Conversation not found.");
    await requirePaid(req);
  }
  return { conversation, access };
}

router.get("/questions", async (req, res) => {
  await requireTeam(req);
  res.json(await loadCommunityPosts(actor(req).userId, { questionsOnly: true }));
});

router.post("/advice", async (req, res) => {
  const parsed = PublishMedicalAdviceBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.title.trim() || !parsed.data.body.trim()) throw new MedicalError(400, "Complete your advice post.");
  const advisor = await respondingAdvisor(req, parsed.data.advisorId);
  const [post] = await db.insert(bloomAdviceTable).values({
    ...parsed.data, title: parsed.data.title.trim(), body: parsed.data.body.trim(), advisorId: advisor.id,
  }).returning();
  res.status(201).json({ ...post, authorName: advisor.name, credentials: advisor.credentials, specialty: advisor.specialty, isVerified: advisor.isVerified });
});

router.get("/conversations", async (req, res) => {
  const access = await teamAccess(req);
  const isTeam = access.isAdmin || access.advisorId != null;
  if (!isTeam) await requirePaid(req);
  const rows = await db.select(conversationSelection).from(medicalConversationsTable)
    .innerJoin(bloomAdvisorsTable, eq(medicalConversationsTable.advisorId, bloomAdvisorsTable.id))
    .innerJoin(bloomAccountsTable, eq(medicalConversationsTable.memberId, bloomAccountsTable.clerkUserId))
    .where(isTeam ? undefined : eq(medicalConversationsTable.memberId, actor(req).userId))
    .orderBy(desc(medicalConversationsTable.updatedAt)).limit(200);
  res.json(rows.map(row => ({ ...row, memberUsername: row.memberUsername ?? "member" })));
});

router.post("/conversations", async (req, res) => {
  await requirePaid(req);
  const parsed = StartMedicalConversationBody.safeParse(req.body);
  if (!parsed.success || parsed.data.topic.trim().length < 3 || !parsed.data.firstMessage.trim()) throw new MedicalError(400, "Enter a topic and your first message.");
  const advisor = await activeAdvisor(parsed.data.advisorId);
  const userId = actor(req).userId;
  const id = await db.transaction(async tx => {
    const [conversation] = await tx.insert(medicalConversationsTable).values({
      memberId: userId, advisorId: advisor.id, topic: parsed.data.topic.trim(), lastMessage: parsed.data.firstMessage.trim(),
    }).returning();
    await tx.insert(medicalMessagesTable).values({ conversationId: conversation.id, authorId: userId, text: parsed.data.firstMessage.trim() });
    return conversation.id;
  });
  const [row] = await db.select(conversationSelection).from(medicalConversationsTable)
    .innerJoin(bloomAdvisorsTable, eq(medicalConversationsTable.advisorId, bloomAdvisorsTable.id))
    .innerJoin(bloomAccountsTable, eq(medicalConversationsTable.memberId, bloomAccountsTable.clerkUserId))
    .where(eq(medicalConversationsTable.id, id)).limit(1);
  res.status(201).json({ ...row, memberUsername: row.memberUsername ?? "member" });
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  await threadAccess(req, id);
  const rows = await db.select({ message: medicalMessagesTable, username: bloomAccountsTable.username, advisor: bloomAdvisorsTable })
    .from(medicalMessagesTable)
    .innerJoin(bloomAccountsTable, eq(medicalMessagesTable.authorId, bloomAccountsTable.clerkUserId))
    .leftJoin(bloomAdvisorsTable, eq(medicalMessagesTable.advisorId, bloomAdvisorsTable.id))
    .where(eq(medicalMessagesTable.conversationId, id))
    .orderBy(desc(medicalMessagesTable.createdAt), desc(medicalMessagesTable.id)).limit(500);
  res.json(rows.reverse().map(({ message, username, advisor }) => ({
    id: message.id, text: message.text, authorName: advisor?.name ?? `@${username ?? "member"}`,
    advisorId: message.advisorId, fromMember: message.advisorId === null,
    isVerified: Boolean(advisor?.isVerified), timestamp: message.createdAt,
  })));
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const { access } = await threadAccess(req, id);
  const parsed = SendMedicalMessageBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) throw new MedicalError(400, "Write a message of 1–6000 characters.");
  const isTeam = access.isAdmin || access.advisorId != null;
  const advisor = isTeam ? await respondingAdvisor(req, parsed.data.advisorId) : null;
  if (!isTeam && parsed.data.advisorId != null) throw new MedicalError(403, "Only an authorized professional can send verified replies.");
  const message = await db.transaction(async tx => {
    const [created] = await tx.insert(medicalMessagesTable).values({
      conversationId: id, authorId: actor(req).userId, advisorId: advisor?.id ?? null, text: parsed.data.text.trim(),
    }).returning();
    await tx.update(medicalConversationsTable).set({ lastMessage: parsed.data.text.trim(), updatedAt: created.createdAt })
      .where(eq(medicalConversationsTable.id, id));
    return created;
  });
  const [account] = await db.select({ username: bloomAccountsTable.username }).from(bloomAccountsTable)
    .where(eq(bloomAccountsTable.clerkUserId, actor(req).userId)).limit(1);
  res.status(201).json({
    id: message.id, text: message.text, authorName: advisor?.name ?? `@${account?.username ?? "member"}`,
    advisorId: message.advisorId, fromMember: !advisor, isVerified: Boolean(advisor?.isVerified), timestamp: message.createdAt,
  });
});

export default router;
