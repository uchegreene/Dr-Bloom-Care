---
name: Administrative portal boundary
description: Owner's requested admin subdomain and separation from member access.
---
Use admin.drbloomcare.com as a separate administrative browser entry point while keeping the member app on its existing domain.

**Why:** The owner requested an admin-only domain, not a replacement for the member app or a rename of existing app identifiers.

**How to apply:** Restrict portal UI to authenticated administrators, and enforce every sensitive permission on the backend regardless of hostname. DNS or a hidden link is not an authorization mechanism. Do not claim the proposed address is live until publishing, domain linking and DNS verification are complete.

The admin domain is sign-in only. Only the super admin may register staff/sub-admin accounts or grant and revoke staff assignments. Public member signup remains separate.

**Why:** The owner explicitly rejected public signup on the admin link and required the super admin to sign up all staff and sub-admins.

**How to apply:** Do not add public staff registration or let delegated administrators recruit/promote other staff. Keep medical-team permissions distinct from general administrator permissions and preserve ordinary member signup.

Bootstrap the first super-admin identity separately from staff registration; do not require public signup to unlock a sign-in-only portal.

**Why:** Recognizing an email as super admin does not create its authentication account, and a development account does not establish a production identity. The owner encountered “couldn't find your account” on the live portal.

**How to apply:** Resolve the configured trusted owner identity in the target environment and provision it only if missing. Preserve existing passwords and accounts; never copy development user IDs or disclose shared/default passwords. Verify live access after publishing.

Keep runtime-required generated exports out of Git, but not out of the deployment image.

**Why:** A successful Expo web export was followed by a successful publish, yet the live admin domain returned 503 because the export directory was excluded by `.replitignore`. Build success alone did not establish that the final image contained the portal.

**How to apply:** Treat Git exclusions and publishing exclusions separately. Verify the exported document and referenced scripts, and fail server startup when required portal output is absent rather than reporting a healthy member landing page.
