---
name: Password reset session completion
description: Clerk password recovery may create a session that must be activated rather than restarting login.
---
After a successful password reset, continue the current Clerk sign-in attempt: activate a completed session, or finish its required verification. Do not force another password-login request first.

**Why:** Production accepted the owner's password reset but the app returned to the password form without activating the resulting session. Later sign-in requests failed behind a generic credential error. A disposable development-account browser test confirmed that continuing the reset session reaches signed-in onboarding.

**How to apply:** Preserve MFA and client-trust requirements; never activate an incomplete attempt. Only resume an already completed browser session for its matching email, or the existing session explicitly identified by Clerk. Read errors from the current request result, not a stale hook-error snapshot. Never reset a real owner's password during debugging.
