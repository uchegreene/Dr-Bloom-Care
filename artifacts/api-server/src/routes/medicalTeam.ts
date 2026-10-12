import { bloomAccountsTable, bloomAdvisorsTable, medicalTeamTable, db } from "@workspace/db";
import { AssignMedicalTeamMemberBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { activeAdvisor, MedicalError } from "../lib/medicalAccess";

const router: IRouter = Router();
const selection = {
  userId: medicalTeamTable.userId, advisorId: medicalTeamTable.advisorId,
  username: bloomAccountsTable.username, name: bloomAccountsTable.name, advisorName: bloomAdvisorsTable.name,
};

router.get("/", async (_req, res) => {
  const rows = await db.select(selection).from(medicalTeamTable)
    .innerJoin(bloomAccountsTable, eq(medicalTeamTable.userId, bloomAccountsTable.clerkUserId))
    .innerJoin(bloomAdvisorsTable, eq(medicalTeamTable.advisorId, bloomAdvisorsTable.id));
  res.json(rows.map(row => ({ ...row, username: row.username ?? "member", name: row.name ?? "Member" })));
});

router.post("/", async (req, res) => {
  const parsed = AssignMedicalTeamMemberBody.safeParse(req.body);
  if (!parsed.success) throw new MedicalError(400, "Choose a registered account and a verified professional profile.");
  const { userId, advisorId } = parsed.data;
  const advisor = await activeAdvisor(advisorId);
  const [account] = await db.select().from(bloomAccountsTable).where(eq(bloomAccountsTable.clerkUserId, userId)).limit(1);
  if (!account?.femaleOnlyConfirmed || !account.username || !account.name || !account.dateOfBirth) {
    throw new MedicalError(400, "The professional must register and finish their Bloom profile first.");
  }
  const [owner] = await db.select().from(medicalTeamTable).where(eq(medicalTeamTable.advisorId, advisorId)).limit(1);
  if (owner && owner.userId !== userId) throw new MedicalError(409, "That professional profile already belongs to another team account.");
  try {
    await db.insert(medicalTeamTable).values({ userId, advisorId }).onConflictDoUpdate({
      target: medicalTeamTable.userId, set: { advisorId },
    });
  } catch (error) {
    if ((error as { code?: string; cause?: { code?: string } }).code === "23505" || (error as { cause?: { code?: string } }).cause?.code === "23505") {
      throw new MedicalError(409, "That profile was assigned to another team account. Refresh and try again.");
    }
    throw error;
  }
  res.json({ userId, advisorId, username: account.username, name: account.name, advisorName: advisor.name });
});

router.delete("/:userId", async (req, res) => {
  await db.delete(medicalTeamTable).where(eq(medicalTeamTable.userId, String(req.params.userId)));
  res.status(204).end();
});

export default router;
