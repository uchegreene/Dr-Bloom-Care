import { pgTable, serial, integer, varchar, text, timestamp, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { bloomAccountsTable, bloomAdvisorsTable } from "./bloom";

export const medicalTeamTable = pgTable("bloom_medical_team", {
  userId: varchar("user_id", { length: 128 }).primaryKey().references(() => bloomAccountsTable.clerkUserId),
  advisorId: integer("advisor_id").notNull().references(() => bloomAdvisorsTable.id),
}, t => [uniqueIndex("bloom_medical_team_advisor_idx").on(t.advisorId)]);

export const communityImagesTable = pgTable("bloom_community_images", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId),
  objectPath: text("object_path").notNull(),
  contentType: varchar("content_type", { length: 32 }).notNull(),
  size: integer("size").notNull(),
});

export const communityPostsTable = pgTable("bloom_community_posts", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId),
  text: text("text").notNull(),
  tag: varchar("tag", { length: 32 }),
  imageId: varchar("image_id", { length: 36 }).references(() => communityImagesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("bloom_community_posts_created_idx").on(t.createdAt)]);

export const communityTagsTable = pgTable("bloom_community_tags", {
  postId: integer("post_id").notNull().references(() => communityPostsTable.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id").notNull().references(() => bloomAdvisorsTable.id),
}, t => [primaryKey({ columns: [t.postId, t.advisorId] })]);

export const communityCommentsTable = pgTable("bloom_community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPostsTable.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId),
  advisorId: integer("advisor_id").references(() => bloomAdvisorsTable.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("bloom_community_comments_post_idx").on(t.postId)]);

export const communityLikesTable = pgTable("bloom_community_likes", {
  postId: integer("post_id").notNull().references(() => communityPostsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId),
}, t => [primaryKey({ columns: [t.postId, t.userId] })]);

export const medicalConversationsTable = pgTable("bloom_medical_conversations", {
  id: serial("id").primaryKey(),
  memberId: varchar("member_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId),
  advisorId: integer("advisor_id").notNull().references(() => bloomAdvisorsTable.id),
  topic: varchar("topic", { length: 180 }).notNull(),
  lastMessage: text("last_message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("bloom_medical_conversations_member_idx").on(t.memberId), index("bloom_medical_conversations_updated_idx").on(t.updatedAt)]);

export const medicalMessagesTable = pgTable("bloom_medical_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => medicalConversationsTable.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId),
  advisorId: integer("advisor_id").references(() => bloomAdvisorsTable.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("bloom_medical_messages_conversation_idx").on(t.conversationId)]);
