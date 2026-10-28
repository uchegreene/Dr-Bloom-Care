---
name: Bloom membership policy
description: Business rules for free accounts, mode switching, automatic paid membership and professional verification.
---

Free registration uses email/password with a public username. Free members may read posts but may not publish, ask/tag admins, or log cycle/pregnancy information. Mode selection is independent of payment: members can always change modes, while logging requires the matching active plan.

**Why:** The user explicitly confirmed free read-only access and unrestricted mode switching; changing mode must not silently purchase or grant another plan.

**How to apply:** Keep mode switching available in Profile for every member. Treat entitlement changes as separate authorized actions.

Administrator identities must be explicitly authorized by the owner, never through a self-selected account role. Only the designated super administrator may assign or remove other general administrators; delegated administrators cannot promote anyone. Professional blue badges and medical-team assignments remain separate from general administrative authority.

**Why:** The owner explicitly requested exclusive super-admin control of all other admin assignments and verified care professionals, not unrestricted self-verification. The identity is configured privately, not recorded in project memory.

**How to apply:** Verify the designated account's primary email on the server. Never auto-promote the first account, infer admin authority from a paid subscription, or manufacture a verified professional. Keep all assignment operations super-admin-only.

Paid subscriptions must activate automatically after provider-verified payment, without administrator approval, and access ends when the paid period expires. Do not grant access merely because someone selected a plan or clicked a payment confirmation.

**Why:** The owner explicitly replaced the earlier manual-payment decision with automatic activation and expiry. Administrator verification of professional credentials and medical approval of AI tips remain separate requirements.

**How to apply:** Connect real subscription billing and verify transactions on the backend. If payment setup is incomplete, say so explicitly rather than pretending purchases work or restoring manual approval.

Keep Timeline, Chat and the posting entry point discoverable, even when paid actions are locked. Provide clearly labelled, isolated sample posts/chat for testing likes, comments and publishing without changing actual membership permissions.

**Why:** The owner reported that subscription gating made these features appear removed and explicitly asked to retain interactive sample content for testing.

**How to apply:** Show a lock explanation instead of removing navigation. Never mix fictional medical professionals or demo conversations into the real care team, real community or private health records.

Do not automatically import anonymous prototype records or fabricate health history for a newly registered account.

**Why:** Intimacy, cycle, and pregnancy records are sensitive; anonymous device records have no proven owner.

**How to apply:** Keep existing records intact but require an explicit ownership-safe migration if account import is requested.
