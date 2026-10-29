import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/express";

type IdentityUsers = {
  getUserList(params: { emailAddress: string[]; limit: number }): Promise<{ data: { id: string }[] }>;
  createUser(params: { emailAddress: string[]; password: string }): Promise<{ id: string }>;
};

/**
 * Provision only the owner's explicitly configured identity in the current Clerk environment.
 * Authorization still requires its verified primary email in bloomAuth.
 * No roles, passwords, profile consent or membership of existing users are changed.
 */
export async function ensureSuperAdminIdentity(
  configuredEmail: string | undefined,
  users: IdentityUsers = clerkClient.users,
): Promise<"not_configured" | "existing" | "created"> {
  const email = configuredEmail?.trim().toLowerCase();
  if (!email) return "not_configured";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SUPER_ADMIN_EMAIL must be a valid email address.");
  }
  const find = () => users.getUserList({ emailAddress: [email], limit: 1 });
  if ((await find()).data.length > 0) return "existing";
  try {
    await users.createUser({
      emailAddress: [email],
      // Never expose a shared/default credential. The owner uses email-code
      // password recovery on the published portal to choose their private password.
      password: randomBytes(36).toString("base64url") + "aA1!",
    });
    return "created";
  } catch {
    // Multiple autoscale instances can start together. Keep the winning identity
    // unchanged rather than resetting its password or making a duplicate.
    if ((await find()).data.length > 0) return "existing";
    throw new Error("Unable to provision the configured super administrator. Check the authentication service before publishing again.");
  }
}
