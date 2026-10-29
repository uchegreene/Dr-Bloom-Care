import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, adminAssignmentsTable, bloomAccountsTable, bloomAdvisorsTable, medicalTeamTable } from "@workspace/db";
import { CreateStaffAccountBody } from "@workspace/api-zod";
import { isBloomSuperAdmin, requireBloomSuperAdmin, type BloomRequest } from "../middlewares/bloomAuth";

const router: IRouter = Router();
router.post("/admin/staff-accounts", requireBloomSuperAdmin, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = CreateStaffAccountBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim() || (parsed.data.role === "medical_team" && !parsed.data.advisorId)) {
    res.status(400).json({ error: "Enter a name, email and role. Medical staff also need a verified professional profile." });
    return;
  }
  const { role, advisorId } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  if (isBloomSuperAdmin(email)) {
    res.status(409).json({ error: "The super administrator cannot be recreated or changed here." });
    return;
  }
  let createdId: string | undefined;
  try {
    const existing = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
    if (existing.data.length) {
      res.status(409).json({ error: "This email already has an account. Use the existing-account assignment tools instead." });
      return;
    }
    if (role === "medical_team") {
      const [advisor] = await db.select().from(bloomAdvisorsTable).where(and(
        eq(bloomAdvisorsTable.id, advisorId!), eq(bloomAdvisorsTable.isVerified, true), eq(bloomAdvisorsTable.isActive, true),
      )).limit(1);
      const [assigned] = await db.select().from(medicalTeamTable).where(eq(medicalTeamTable.advisorId, advisorId!)).limit(1);
      if (!advisor || assigned) {
        res.status(409).json({ error: "Choose an active, verified professional profile that has not been assigned." });
        return;
      }
    }
    // Only the owner may provision trusted staff emails. Never share a default password.
    // The random credential is not returned, persisted by our app, or logged.
    // Staff prove inbox ownership using the email-code password-recovery flow.
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      firstName: parsed.data.name.trim(),
      password: randomBytes(36).toString("base64url") + "aA1!",
    });
    createdId = user.id;
    await db.transaction(async tx => {
      await tx.insert(bloomAccountsTable).values({ clerkUserId: user.id, email, name: parsed.data.name.trim() });
      if (role === "admin") {
        const actor = (req as BloomRequest).bloomUserId!;
        await tx.insert(adminAssignmentsTable).values({ userId: user.id, email, active: true, assignedBy: actor, updatedBy: actor });
      } else {
        await tx.insert(medicalTeamTable).values({ userId: user.id, advisorId: advisorId! });
      }
    });
    res.status(201).json({ userId: user.id, email, role });
  } catch (error) {
    // Only compensate for an identity created in this request, never an existing account.
    if (createdId) {
      try { await clerkClient.users.deleteUser(createdId); }
      catch { req.log?.error({ userId: createdId }, "Unable to clean up unassigned new staff identity"); }
    }
    req.log?.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Staff account creation failed");
    res.status(503).json({ error: "Unable to create the staff account. Refresh the staff lists before trying again." });
  }
});
export default router;
