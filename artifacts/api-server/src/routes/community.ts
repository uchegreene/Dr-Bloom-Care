import { randomUUID } from "node:crypto";
import {
  bloomAccountsTable, bloomAdvisorsTable, communityPostsTable, communityCommentsTable,
  communityTagsTable, communityLikesTable, communityImagesTable, db,
} from "@workspace/db";
import { CreateCommunityPostBody, CreateCommunityCommentBody, RequestCommunityUploadBody } from "@workspace/api-zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { actor, MedicalError, requirePaid, respondingAdvisor } from "../lib/medicalAccess";
import { photoPath, signedPhotoUrl, validateUploadedPhoto } from "../lib/communityStorage";

const router: IRouter = Router();

export async function loadCommunityPosts(userId: string, options: { id?: number; questionsOnly?: boolean } = {}) {
  const rows = await db.select({
    post: communityPostsTable, username: bloomAccountsTable.username,
    objectPath: communityImagesTable.objectPath,
  }).from(communityPostsTable)
    .innerJoin(bloomAccountsTable, eq(communityPostsTable.authorId, bloomAccountsTable.clerkUserId))
    .leftJoin(communityImagesTable, eq(communityPostsTable.imageId, communityImagesTable.id))
    .where(options.id ? eq(communityPostsTable.id, options.id) : options.questionsOnly
      ? inArray(communityPostsTable.id, db.select({ postId: communityTagsTable.postId }).from(communityTagsTable)) : undefined)
    .orderBy(desc(communityPostsTable.createdAt)).limit(100);
  if (!rows.length) return [];
  const ids = rows.map(row => row.post.id);
  const [comments, tags, likes] = await Promise.all([
    db.select({ comment: communityCommentsTable, username: bloomAccountsTable.username, advisor: bloomAdvisorsTable })
      .from(communityCommentsTable)
      .innerJoin(bloomAccountsTable, eq(communityCommentsTable.authorId, bloomAccountsTable.clerkUserId))
      .leftJoin(bloomAdvisorsTable, eq(communityCommentsTable.advisorId, bloomAdvisorsTable.id))
      .where(inArray(communityCommentsTable.postId, ids)).orderBy(communityCommentsTable.createdAt, communityCommentsTable.id),
    db.select({ postId: communityTagsTable.postId, advisor: bloomAdvisorsTable }).from(communityTagsTable)
      .innerJoin(bloomAdvisorsTable, eq(communityTagsTable.advisorId, bloomAdvisorsTable.id))
      .where(inArray(communityTagsTable.postId, ids)),
    db.select().from(communityLikesTable).where(inArray(communityLikesTable.postId, ids)),
  ]);
  return Promise.all(rows.map(async ({ post, username, objectPath }) => ({
    id: post.id, authorId: post.authorId, authorName: `@${username ?? "member"}`,
    text: post.text, tag: post.tag, imageUri: objectPath ? await signedPhotoUrl(objectPath, "GET") : null,
    timestamp: post.createdAt,
    likes: likes.filter(like => like.postId === post.id).length,
    liked: likes.some(like => like.postId === post.id && like.userId === userId),
    taggedAdvisors: tags.filter(tag => tag.postId === post.id).map(tag => tag.advisor),
    comments: comments.filter(row => row.comment.postId === post.id).map(({ comment, username: handle, advisor }) => ({
      id: comment.id, authorId: comment.authorId, authorName: advisor?.name ?? `@${handle ?? "member"}`,
      text: comment.text, timestamp: comment.createdAt, advisorId: comment.advisorId,
      isVerified: Boolean(advisor?.isVerified), credentials: advisor?.credentials ?? null,
    })),
  })));
}

async function postResponse(userId: string, id: number) {
  const [post] = await loadCommunityPosts(userId, { id });
  if (!post) throw new MedicalError(404, "Post not found.");
  return post;
}

router.get("/posts", async (req, res) => {
  res.json(await loadCommunityPosts(actor(req).userId));
});
router.get("/posts/:id", async (req, res) => {
  res.json(await postResponse(actor(req).userId, Number(req.params.id)));
});

router.post("/uploads", async (req, res) => {
  await requirePaid(req);
  const parsed = RequestCommunityUploadBody.safeParse(req.body);
  if (!parsed.success) throw new MedicalError(400, "Choose a JPEG, PNG or WebP photo no larger than 8 MB.");
  const id = randomUUID();
  const objectPath = photoPath(id);
  const uploadUrl = await signedPhotoUrl(objectPath, "PUT");
  await db.insert(communityImagesTable).values({ id, ownerId: actor(req).userId, objectPath, ...parsed.data });
  res.status(201).json({ imageId: id, uploadUrl });
});

router.post("/posts", async (req, res) => {
  await requirePaid(req);
  const parsed = CreateCommunityPostBody.safeParse(req.body);
  if (!parsed.success) throw new MedicalError(400, "Check your post and medical profile tags.");
  const { text, tag, imageId, advisorIds = [] } = parsed.data;
  if (!text.trim() && !imageId) throw new MedicalError(400, "Write a post or attach a photo.");
  if (new Set(advisorIds).size !== advisorIds.length) throw new MedicalError(400, "Select each medical profile only once.");
  if (advisorIds.length) {
    const advisors = await db.select({ id: bloomAdvisorsTable.id }).from(bloomAdvisorsTable)
      .where(and(inArray(bloomAdvisorsTable.id, advisorIds), eq(bloomAdvisorsTable.isVerified, true), eq(bloomAdvisorsTable.isActive, true)));
    if (advisors.length !== advisorIds.length) throw new MedicalError(400, "Tag only active verified medical profiles.");
  }
  const userId = actor(req).userId;
  if (imageId) {
    const [image] = await db.select().from(communityImagesTable)
      .where(and(eq(communityImagesTable.id, imageId), eq(communityImagesTable.ownerId, userId))).limit(1);
    if (!image) throw new MedicalError(400, "Use a photo uploaded by your account.");
    let valid = false;
    try { valid = await validateUploadedPhoto(image.objectPath, image.contentType, image.size); } catch { /* not uploaded */ }
    if (!valid) throw new MedicalError(400, "Photo upload is incomplete or invalid. Please upload it again.");
  }
  const id = await db.transaction(async tx => {
    const [post] = await tx.insert(communityPostsTable).values({
      authorId: userId, text: text.trim(), tag: tag ?? null, imageId: imageId ?? null,
    }).returning({ id: communityPostsTable.id });
    if (advisorIds.length) await tx.insert(communityTagsTable).values(advisorIds.map(advisorId => ({ postId: post.id, advisorId })));
    return post.id;
  });
  res.status(201).json(await postResponse(userId, id));
});

router.post("/posts/:id/comments", async (req, res) => {
  const parsed = CreateCommunityCommentBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) throw new MedicalError(400, "Write a reply of 1–6000 characters.");
  const id = Number(req.params.id);
  const [post] = await db.select({ id: communityPostsTable.id }).from(communityPostsTable).where(eq(communityPostsTable.id, id)).limit(1);
  if (!post) throw new MedicalError(404, "Post not found.");
  let advisorId: number | null = null;
  if (parsed.data.advisorId != null) advisorId = (await respondingAdvisor(req, parsed.data.advisorId)).id;
  else await requirePaid(req);
  await db.insert(communityCommentsTable).values({ postId: id, authorId: actor(req).userId, advisorId, text: parsed.data.text.trim() });
  res.status(201).json(await postResponse(actor(req).userId, id));
});

router.post("/posts/:id/like", async (req, res) => {
  await requirePaid(req);
  const id = Number(req.params.id);
  const userId = actor(req).userId;
  await db.transaction(async tx => {
    const [post] = await tx.select({ id: communityPostsTable.id }).from(communityPostsTable)
      .where(eq(communityPostsTable.id, id)).for("update");
    if (!post) throw new MedicalError(404, "Post not found.");
    const condition = and(eq(communityLikesTable.postId, id), eq(communityLikesTable.userId, userId));
    const [liked] = await tx.select().from(communityLikesTable).where(condition);
    if (liked) await tx.delete(communityLikesTable).where(condition);
    else await tx.insert(communityLikesTable).values({ postId: id, userId });
  });
  res.json(await postResponse(userId, id));
});

export default router;
