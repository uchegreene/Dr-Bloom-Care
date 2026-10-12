import { bloomAdvisorsTable, db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { Request } from "express";
import { hasActiveMembership, medicalAccessFor, type BloomRequest } from "../middlewares/bloomAuth";

export class MedicalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const actor = (req: Request) => {
  const value = req as BloomRequest;
  return { userId: value.bloomUserId!, email: value.bloomEmail! };
};

export async function requirePaid(req: Request) {
  if (!await hasActiveMembership(actor(req).userId)) {
    throw new MedicalError(403, "An active paid plan is required.");
  }
}

export async function teamAccess(req: Request) {
  const { userId, email } = actor(req);
  return medicalAccessFor(userId, email);
}

export async function requireTeam(req: Request) {
  const access = await teamAccess(req);
  if (!access.isAdmin && !access.advisorId) throw new MedicalError(403, "Medical-team access is required.");
  return access;
}

export async function activeAdvisor(id: number) {
  const [advisor] = await db.select().from(bloomAdvisorsTable)
    .where(and(eq(bloomAdvisorsTable.id, id), eq(bloomAdvisorsTable.isActive, true), eq(bloomAdvisorsTable.isVerified, true))).limit(1);
  if (!advisor) throw new MedicalError(404, "Active verified medical profile not found.");
  return advisor;
}

export async function respondingAdvisor(req: Request, requestedId?: number | null) {
  const access = await requireTeam(req);
  const id = requestedId ?? access.advisorId;
  if (!id || (!access.isAdmin && id !== access.advisorId)) {
    throw new MedicalError(403, "Reply under your own authorized professional profile.");
  }
  return activeAdvisor(id);
}
