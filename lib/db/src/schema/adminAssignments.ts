import { boolean, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { bloomAccountsTable } from "./bloom";

export const adminAssignmentsTable = pgTable("bloom_admin_assignments", {
  userId: varchar("user_id", { length: 128 }).primaryKey()
    .references(() => bloomAccountsTable.clerkUserId, { onDelete: "cascade" }),
  email: text("email").notNull(),
  active: boolean("active").notNull().default(true),
  assignedBy: text("assigned_by").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertAdminAssignmentSchema = createInsertSchema(adminAssignmentsTable);
export type AdminAssignment = typeof adminAssignmentsTable.$inferSelect;
