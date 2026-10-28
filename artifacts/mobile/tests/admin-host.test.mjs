import test from "node:test";
import assert from "node:assert/strict";
import { isAdminPortalHost } from "../lib/adminPortal.ts";
test("only the exact admin domain selects the restricted portal", () => {
  for (const host of ["admin.drbloomcare.com", "ADMIN.DRBLOOMCARE.COM", "admin.drbloomcare.com."]) assert.equal(isAdminPortalHost(host), true);
  for (const host of ["drbloomcare.com", "admin.drbloomcare.com.attacker.test", "attacker-admin.drbloomcare.com", "localhost"]) assert.equal(isAdminPortalHost(host), false);
});
