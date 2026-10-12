import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const bloomAccountsTable = pgTable(
  "bloom_accounts",
  {
    clerkUserId: varchar("clerk_user_id", { length: 128 }).primaryKey(),
    email: text("email").notNull(),
    username: varchar("username", { length: 30 }),
    name: text("name"),
    dateOfBirth: varchar("date_of_birth", { length: 10 }),
    bio: text("bio").notNull().default(""),
    femaleOnlyConfirmed: boolean("female_only_confirmed").notNull().default(false),
    mode: varchar("mode", { length: 16 }).notNull().default("none"),
    subscriptionPlan: varchar("subscription_plan", { length: 16 }),
    subscriptionStatus: varchar("subscription_status", { length: 16 })
      .notNull()
      .default("free"),
    subscriptionExpiresAt: timestamp("subscription_expires_at", {
      withTimezone: true,
    }),
    requestedPlan: varchar("requested_plan", { length: 16 }),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("bloom_accounts_username_idx").on(table.username)],
);

export const bloomPlansTable = pgTable("bloom_plans", {
  plan: varchar("plan", { length: 16 }).primaryKey(),
  priceNaira: integer("price_naira").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: varchar("updated_by", { length: 128 }),
});

export const bloomAdvisorsTable = pgTable("bloom_advisors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  specialty: varchar("specialty", { length: 100 }).notNull(),
  credentials: varchar("credentials", { length: 160 }).notNull(),
  bio: text("bio").notNull(),
  isVerified: boolean("is_verified").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bloomAdviceTable = pgTable(
  "bloom_advice",
  {
    id: serial("id").primaryKey(),
    advisorId: integer("advisor_id")
      .notNull()
      .references(() => bloomAdvisorsTable.id),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bloom_advice_created_at_idx").on(table.createdAt)],
);
