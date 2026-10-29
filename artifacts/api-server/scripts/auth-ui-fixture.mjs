// Development-only disposable identity for testing the actual password/reset UI.
// Never use this against production or a real person's account.
import { clerkClient } from "@clerk/express";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { createRequire } from "node:module";

if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
  throw new Error("UI auth fixtures are development-only.");
}
const file = "/tmp/drbloom-auth-ui-fixture.json";
if (process.argv[2] === "create") {
  const email = `bloom-auth-ui-${randomBytes(8).toString("hex")}+clerk_test@example.com`;
  const password = randomBytes(24).toString("base64url") + "aA1!";
  const user = await clerkClient.users.createUser({ emailAddress: [email], password });
  await writeFile(file, JSON.stringify({ userId: user.id, email, password }), { mode: 0o600 });
  console.log(`Disposable development fixture saved to ${file}; no real email will be sent.`);
} else if (process.argv[2] === "cleanup") {
  const fixture = JSON.parse(await readFile(file, "utf8"));
  if (!/^bloom-auth-ui-[a-f0-9]+\+clerk_test@example\.com$/.test(fixture.email)) throw new Error("Not a disposable fixture");
  const user = await clerkClient.users.getUser(fixture.userId);
  if (!user.emailAddresses.some(address => address.emailAddress === fixture.email)) throw new Error("Identity mismatch");
  const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("DELETE FROM bloom_accounts WHERE clerk_user_id = $1 AND email = $2", [fixture.userId, fixture.email]);
    await clerkClient.users.deleteUser(fixture.userId);
  } finally { await pool.end(); }
  await unlink(file);
  console.log("Disposable development fixture removed.");
} else {
  throw new Error("Choose create or cleanup.");
}
