---
name: Administrative portal boundary
description: Owner's requested admin subdomain and separation from member access.
---
Use admin.drbloomcare.com as a separate administrative browser entry point while keeping the member app on its existing domain.

**Why:** The owner requested an admin-only domain, not a replacement for the member app or a rename of existing app identifiers.

**How to apply:** Restrict portal UI to authenticated administrators, and enforce every sensitive permission on the backend regardless of hostname. DNS or a hidden link is not an authorization mechanism. Do not claim the proposed address is live until publishing, domain linking and DNS verification are complete.

Keep runtime-required generated exports out of Git, but not out of the deployment image.

**Why:** A successful Expo web export was followed by a successful publish, yet the live admin domain returned 503 because the export directory was excluded by `.replitignore`. Build success alone did not establish that the final image contained the portal.

**How to apply:** Treat Git exclusions and publishing exclusions separately. Verify the exported document and referenced scripts, and fail server startup when required portal output is absent rather than reporting a healthy member landing page.
