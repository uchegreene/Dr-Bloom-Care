---
name: Administrative portal boundary
description: Owner's requested admin subdomain and separation from member access.
---
Use admin.drbloomcare.com as a separate administrative browser entry point while keeping the member app on its existing domain.

**Why:** The owner requested an admin-only domain, not a replacement for the member app or a rename of existing app identifiers.

**How to apply:** Restrict portal UI to authenticated administrators, and enforce every sensitive permission on the backend regardless of hostname. DNS or a hidden link is not an authorization mechanism. Do not claim the proposed address is live until publishing, domain linking and DNS verification are complete.
