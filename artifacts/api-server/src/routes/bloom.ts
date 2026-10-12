import {
  bloomAccountsTable,
  bloomAdviceTable,
  bloomAdvisorsTable,
  bloomPlansTable,
  db,
} from "@workspace/db";
import {
  CreateAdviceBody,
  CreateAdvisorBody,
  GrantMembershipBody,
  RequestSubscriptionBody,
  UpdateAccountBody,
  UpdatePlanPriceBody,
} from "@workspace/api-zod";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  requireBloomAdmin,
  requireBloomMember,
  requireBloomProfile,
  medicalAccessFor,
  type BloomRequest,
} from "../middlewares/bloomAuth";

const router: IRouter = Router();
const defaultPlans = [
  { plan: "cycle", priceNaira: 4000 },
  { plan: "pregnancy", priceNaira: 7000 },
] as const;

function statusFor(
  status: string,
  expiresAt: Date | null,
): "free" | "active" | "expired" {
  if (status !== "active" || !expiresAt) return "free";
  return expiresAt.getTime() > Date.now() ? "active" : "expired";
}

async function ensureAccount(userId: string, email: string) {
  const [existing] = await db
    .select()
    .from(bloomAccountsTable)
    .where(eq(bloomAccountsTable.clerkUserId, userId))
    .limit(1);

  if (existing) {
    if (existing.email !== email) {
      const [updated] = await db
        .update(bloomAccountsTable)
        .set({ email, updatedAt: new Date() })
        .where(eq(bloomAccountsTable.clerkUserId, userId))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(bloomAccountsTable)
    .values({ clerkUserId: userId, email })
    .returning();
  return created;
}

function accountResponse(account: typeof bloomAccountsTable.$inferSelect, isAdmin: boolean, advisorId: number | null = null) {
  const subscriptionStatus = statusFor(
    account.subscriptionStatus,
    account.subscriptionExpiresAt,
  );
  return {
    userId: account.clerkUserId,
    email: account.email,
    username: account.username,
    name: account.name,
    dateOfBirth: account.dateOfBirth,
    bio: account.bio,
    femaleOnlyConfirmed: account.femaleOnlyConfirmed,
    mode: account.mode as "cycle" | "pregnant" | "none",
    role: isAdmin ? "admin" : advisorId ? "medical_team" : "member",
    advisorId,
    subscriptionPlan: account.subscriptionPlan as "cycle" | "pregnancy" | null,
    subscriptionStatus,
    subscriptionExpiresAt: account.subscriptionExpiresAt,
    requestedPlan: account.requestedPlan as "cycle" | "pregnancy" | null,
    requestedAt: account.requestedAt,
    subscriptionActive: subscriptionStatus === "active",
    profileComplete: Boolean(
      account.username &&
        account.name &&
        account.dateOfBirth &&
        account.femaleOnlyConfirmed,
    ),
  };
}

async function ensurePlans() {
  await db.insert(bloomPlansTable).values([...defaultPlans]).onConflictDoNothing();
}

router.get("/account", requireBloomMember, async (req, res) => {
  const { bloomUserId, bloomEmail } = req as BloomRequest;
  const account = await ensureAccount(bloomUserId!, bloomEmail!);
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const access = await medicalAccessFor(bloomUserId!, bloomEmail!);
  res.json(accountResponse(account, admins.includes(bloomEmail!), access.advisorId));
});

router.put("/account", requireBloomMember, async (req, res) => {
  const parsed = UpdateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check your profile details." });
    return;
  }
  const { bloomUserId, bloomEmail } = req as BloomRequest;
  const payload = parsed.data;
  if (!payload.femaleOnlyConfirmed) {
    res.status(403).json({ error: "Bloom is a women-only community." });
    return;
  }
  try {
    const [account] = await db
      .insert(bloomAccountsTable)
      .values({
        clerkUserId: bloomUserId!,
        email: bloomEmail!,
        username: payload.username.toLowerCase(),
        name: payload.name.trim(),
        dateOfBirth:
          payload.dateOfBirth instanceof Date
            ? payload.dateOfBirth.toISOString().slice(0, 10)
            : String(payload.dateOfBirth).slice(0, 10),
        bio: payload.bio.trim(),
        femaleOnlyConfirmed: payload.femaleOnlyConfirmed,
        mode: payload.mode,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: bloomAccountsTable.clerkUserId,
        set: {
          email: bloomEmail!,
          username: payload.username.toLowerCase(),
          name: payload.name.trim(),
          dateOfBirth:
            payload.dateOfBirth instanceof Date
              ? payload.dateOfBirth.toISOString().slice(0, 10)
              : String(payload.dateOfBirth).slice(0, 10),
          bio: payload.bio.trim(),
          femaleOnlyConfirmed: payload.femaleOnlyConfirmed,
          mode: payload.mode,
          updatedAt: new Date(),
        },
      })
      .returning();
    const admins = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const access = await medicalAccessFor(bloomUserId!, bloomEmail!);
    res.json(accountResponse(account, admins.includes(bloomEmail!), access.advisorId));
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "That username is already in use." });
      return;
    }
    req.log?.error({ err: error }, "Unable to save Bloom profile");
    res.status(500).json({ error: "Unable to save your profile right now." });
  }
});

router.get("/plans", requireBloomMember, async (_req, res) => {
  await ensurePlans();
  const plans = await db.select().from(bloomPlansTable);
  res.json(plans.map(({ plan, priceNaira }) => ({ plan, priceNaira })));
});

router.post("/subscription-request", requireBloomProfile, async (req, res) => {
  const parsed = RequestSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid plan." });
    return;
  }
  const { bloomUserId } = req as BloomRequest;
  const requestedAt = new Date();
  const [account] = await db
    .update(bloomAccountsTable)
    .set({
      requestedPlan: parsed.data.plan,
      requestedAt,
      updatedAt: requestedAt,
    })
    .where(eq(bloomAccountsTable.clerkUserId, bloomUserId!))
    .returning();
  if (!account) {
    res.status(404).json({ error: "Complete your profile first." });
    return;
  }
  res.json({
    requestedPlan: account.requestedPlan,
    requestedAt: account.requestedAt,
  });
});

router.put("/admin/plans/:plan", requireBloomAdmin, async (req, res) => {
  const paramsPlan = req.params.plan;
  if (paramsPlan !== "cycle" && paramsPlan !== "pregnancy") {
    res.status(400).json({ error: "Choose a valid plan." });
    return;
  }
  const parsed = UpdatePlanPriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid monthly price in naira." });
    return;
  }
  await ensurePlans();
  const { bloomUserId } = req as BloomRequest;
  const [plan] = await db
    .insert(bloomPlansTable)
    .values({
      plan: paramsPlan,
      priceNaira: parsed.data.priceNaira,
      updatedAt: new Date(),
      updatedBy: bloomUserId!,
    })
    .onConflictDoUpdate({
      target: bloomPlansTable.plan,
      set: {
        priceNaira: parsed.data.priceNaira,
        updatedAt: new Date(),
        updatedBy: bloomUserId!,
      },
    })
    .returning();
  res.json({ plan: plan.plan, priceNaira: plan.priceNaira });
});

router.get("/advisors", requireBloomProfile, async (_req, res) => {
  const advisors = await db
    .select()
    .from(bloomAdvisorsTable)
    .where(
      and(
        eq(bloomAdvisorsTable.isActive, true),
        eq(bloomAdvisorsTable.isVerified, true),
      ),
    )
    .orderBy(bloomAdvisorsTable.name);
  res.json(advisors);
});

router.get("/admin/advisors", requireBloomAdmin, async (_req, res) => {
  const advisors = await db
    .select()
    .from(bloomAdvisorsTable)
    .orderBy(desc(bloomAdvisorsTable.createdAt));
  res.json(advisors);
});

router.post("/admin/advisors", requireBloomAdmin, async (req, res) => {
  const parsed = CreateAdvisorBody.safeParse(req.body);
  if (!parsed.success || parsed.data.credentialsVerified !== true) {
    res.status(400).json({
      error: "Complete all fields and confirm the credentials were checked.",
    });
    return;
  }
  const { credentialsVerified: _credentialsVerified, ...advisorInput } =
    parsed.data;
  const [advisor] = await db
    .insert(bloomAdvisorsTable)
    .values({
      ...advisorInput,
      isVerified: true,
      isActive: true,
    })
    .returning();
  res.status(201).json(advisor);
});

router.get("/advice", requireBloomProfile, async (_req, res) => {
  const posts = await db
    .select({
      id: bloomAdviceTable.id,
      advisorId: bloomAdviceTable.advisorId,
      authorName: bloomAdvisorsTable.name,
      title: bloomAdviceTable.title,
      body: bloomAdviceTable.body,
      category: bloomAdviceTable.category,
      credentials: bloomAdvisorsTable.credentials,
      specialty: bloomAdvisorsTable.specialty,
      isVerified: bloomAdvisorsTable.isVerified,
      createdAt: bloomAdviceTable.createdAt,
    })
    .from(bloomAdviceTable)
    .innerJoin(
      bloomAdvisorsTable,
      eq(bloomAdviceTable.advisorId, bloomAdvisorsTable.id),
    )
    .where(
      and(
        eq(bloomAdvisorsTable.isActive, true),
        eq(bloomAdvisorsTable.isVerified, true),
      ),
    )
    .orderBy(desc(bloomAdviceTable.createdAt))
    .limit(100);
  res.json(posts);
});

router.post("/admin/advice", requireBloomAdmin, async (req, res) => {
  const parsed = CreateAdviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Complete the advice post details." });
    return;
  }
  const [advisor] = await db
    .select()
    .from(bloomAdvisorsTable)
    .where(
      and(
        eq(bloomAdvisorsTable.id, parsed.data.advisorId),
        eq(bloomAdvisorsTable.isActive, true),
        eq(bloomAdvisorsTable.isVerified, true),
      ),
    )
    .limit(1);
  if (!advisor) {
    res.status(404).json({ error: "Verified advisor profile not found." });
    return;
  }
  const [post] = await db
    .insert(bloomAdviceTable)
    .values(parsed.data)
    .returning();
  res.status(201).json({
    ...post,
    authorName: advisor.name,
    credentials: advisor.credentials,
    specialty: advisor.specialty,
    isVerified: advisor.isVerified,
  });
});

router.get("/admin/members", requireBloomAdmin, async (_req, res) => {
  const accounts = await db
    .select()
    .from(bloomAccountsTable)
    .orderBy(desc(bloomAccountsTable.updatedAt))
    .limit(500);
  res.json(
    accounts.map((account) => ({
      userId: account.clerkUserId,
      email: account.email,
      username: account.username,
      name: account.name,
      mode: account.mode,
      subscriptionPlan: account.subscriptionPlan,
      subscriptionStatus: statusFor(
        account.subscriptionStatus,
        account.subscriptionExpiresAt,
      ),
      subscriptionExpiresAt: account.subscriptionExpiresAt,
      requestedPlan: account.requestedPlan,
      requestedAt: account.requestedAt,
    })),
  );
});

router.post(
  "/admin/members/:userId/subscription",
  requireBloomAdmin,
  async (req, res) => {
    const parsed = GrantMembershipBody.safeParse(req.body);
    if (!parsed.success || parsed.data.confirmedPayment !== true) {
      res.status(400).json({
        error: "Confirm payment was verified outside the app before activation.",
      });
      return;
    }
    const userId = String(req.params.userId);
    const [account] = await db
      .select()
      .from(bloomAccountsTable)
      .where(eq(bloomAccountsTable.clerkUserId, userId))
      .limit(1);
    if (!account) {
      res.status(404).json({ error: "Member account not found." });
      return;
    }
    const now = new Date();
    const existingExpiry = account.subscriptionExpiresAt;
    const anchor =
      account.subscriptionStatus === "active" &&
      account.subscriptionPlan === parsed.data.plan &&
      existingExpiry &&
      existingExpiry > now
        ? new Date(existingExpiry)
        : now;
    anchor.setMonth(anchor.getMonth() + parsed.data.months);
    const [updated] = await db
      .update(bloomAccountsTable)
      .set({
        subscriptionPlan: parsed.data.plan,
        subscriptionStatus: "active",
        subscriptionExpiresAt: anchor,
        requestedPlan: null,
        requestedAt: null,
        updatedAt: now,
      })
      .where(eq(bloomAccountsTable.clerkUserId, userId))
      .returning();
    res.json({
      userId: updated.clerkUserId,
      email: updated.email,
      username: updated.username,
      name: updated.name,
      mode: updated.mode,
      subscriptionPlan: updated.subscriptionPlan,
      subscriptionStatus: statusFor(
        updated.subscriptionStatus,
        updated.subscriptionExpiresAt,
      ),
      subscriptionExpiresAt: updated.subscriptionExpiresAt,
    });
  },
);

export default router;
