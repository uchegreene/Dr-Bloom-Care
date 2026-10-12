import { clerkClient, getAuth } from "@clerk/express";
import { bloomAccountsTable, bloomAdvisorsTable, medicalTeamTable, db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

export interface BloomRequest extends Request {
  bloomUserId?: string;
  bloomEmail?: string;
}

export function isBloomAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "").split(",")
    .map(value => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export async function medicalAccessFor(userId: string, email: string) {
  const [assignment] = await db.select({ advisorId: medicalTeamTable.advisorId })
    .from(medicalTeamTable)
    .innerJoin(bloomAdvisorsTable, eq(medicalTeamTable.advisorId, bloomAdvisorsTable.id))
    .where(and(eq(medicalTeamTable.userId, userId), eq(bloomAdvisorsTable.isActive, true), eq(bloomAdvisorsTable.isVerified, true)))
    .limit(1);
  return { isAdmin: isBloomAdmin(email), advisorId: assignment?.advisorId ?? null };
}

export async function hasActiveMembership(userId: string) {
  const [account] = await db.select().from(bloomAccountsTable)
    .where(eq(bloomAccountsTable.clerkUserId, userId)).limit(1);
  return Boolean(account?.subscriptionStatus === "active" &&
    account.subscriptionExpiresAt && account.subscriptionExpiresAt > new Date() &&
    (account.subscriptionPlan === "cycle" || account.subscriptionPlan === "pregnancy"));
}

export async function requireBloomMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId,
    );

    if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
      res.status(403).json({ error: "A verified email is required." });
      return;
    }

    (req as BloomRequest).bloomUserId = userId;
    (req as BloomRequest).bloomEmail = primaryEmail.emailAddress.toLowerCase();
    next();
  } catch (error) {
    req.log?.error({ err: error }, "Unable to verify Bloom member identity");
    res.status(401).json({ error: "Unable to verify your account." });
  }
}

export async function requireBloomProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await requireBloomMember(req, res, async () => {
    const userId = (req as BloomRequest).bloomUserId;
    try {
      const [account] = await db
        .select({ femaleOnlyConfirmed: bloomAccountsTable.femaleOnlyConfirmed })
        .from(bloomAccountsTable)
        .where(eq(bloomAccountsTable.clerkUserId, userId!))
        .limit(1);
      if (!account?.femaleOnlyConfirmed) {
        res.status(403).json({
          error: "Complete the women-only community confirmation in your profile.",
        });
        return;
      }
      next();
    } catch (error) {
      req.log?.error({ err: error }, "Unable to check Bloom profile access");
      res.status(500).json({ error: "Unable to verify your profile access." });
    }
  });
}

export async function requireBloomAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await requireBloomProfile(req, res, async () => {
    const email = (req as BloomRequest).bloomEmail;
    const admins = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (!email || admins.length === 0 || !admins.includes(email)) {
      res.status(403).json({ error: "Administrator access is not configured." });
      return;
    }

    next();
  });
}
