import { pgTable, serial, varchar, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { bloomAccountsTable, bloomAdvisorsTable } from "./bloom";

export const dailyTipSettingsTable = pgTable("daily_tip_settings", {
  id: integer("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const dailyTipsTable = pgTable("daily_tips", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  audience: varchar("audience", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  title: varchar("title", { length: 180 }).notNull().default(""),
  body: text("body").notNull().default(""),
  model: varchar("model", { length: 64 }).notNull().default("gemini-3.8-flash"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  error: text("error"),
  reviewerUserId: varchar("reviewer_user_id", { length: 128 }),
  reviewerAdvisorId: integer("reviewer_advisor_id").references(() => bloomAdvisorsTable.id),
  reviewerName: varchar("reviewer_name", { length: 100 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("daily_tip_date_audience_idx").on(table.date, table.audience)]);

export const dailyTipNoticesTable = pgTable("daily_tip_notices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId, { onDelete: "cascade" }),
  tipId: integer("tip_id").notNull().references(() => dailyTipsTable.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("daily_tip_notice_user_idx").on(table.userId, table.tipId)]);

export const dailyTipDevicesTable = pgTable("daily_tip_devices", {
  id: varchar("id", { length: 100 }).primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => bloomAccountsTable.clerkUserId, { onDelete: "cascade" }),
  token: varchar("token", { length: 256 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("daily_tip_device_token_idx").on(table.token)]);

export const dailyTipPushTable = pgTable("daily_tip_push", {
  id: serial("id").primaryKey(),
  noticeId: integer("notice_id").notNull().references(() => dailyTipNoticesTable.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id", { length: 100 }).notNull().references(() => dailyTipDevicesTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  ticket: varchar("ticket", { length: 128 }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  error: text("error"),
}, table => [uniqueIndex("daily_tip_push_notice_device_idx").on(table.noticeId, table.deviceId)]);
