import test from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage, canResumeCompletedSignIn, completePasswordReset, nextSignInStep } from "../lib/authFlow.ts";

test("only a completed same-email session can be resumed after an earlier reset", () => {
  assert.equal(canResumeCompletedSignIn("complete", "TEST@example.com", " test@example.com "), true);
  assert.equal(canResumeCompletedSignIn("complete", "other@example.com", "test@example.com"), false);
  assert.equal(canResumeCompletedSignIn("needs_second_factor", "test@example.com", "test@example.com"), false);
  assert.equal(canResumeCompletedSignIn("complete", null, "test@example.com"), false);
});

test("completed password reset continues its own sign-in instead of requesting another password login", async () => {
  const calls = [];
  await completePasswordReset("TEST-password-8", "TEST-password-8", async () => {
    calls.push("reset-password");
    return { error: null };
  }, async () => { calls.push("continue-current-session"); });
  assert.deepEqual(calls, ["reset-password", "continue-current-session"]);
});

test("failed or invalid password resets never activate a session", async () => {
  let activated = false;
  const submit = async () => ({ error: { code: "form_password_pwned" } });
  const activate = async () => { activated = true; };
  await assert.rejects(completePasswordReset("short", "short", submit, activate), /8 characters/);
  await assert.rejects(completePasswordReset("TEST-password-8", "different", submit, activate), /do not match/);
  await assert.rejects(completePasswordReset("TEST-password-8", "TEST-password-8", submit, activate));
  assert.equal(activated, false);
});

test("only completed sign-ins finalize; email trust, authenticator and backup challenges remain enforced", () => {
  assert.equal(nextSignInStep("complete", []), "finalize");
  assert.equal(nextSignInStep("needs_client_trust", ["email_code"]), "email_code");
  assert.equal(nextSignInStep("needs_second_factor", ["totp", "backup_code"]), "totp");
  assert.equal(nextSignInStep("needs_second_factor", ["backup_code"]), "backup_code");
  assert.equal(nextSignInStep("needs_second_factor", []), "unsupported");
  assert.equal(nextSignInStep("needs_first_factor", ["email_code"]), "unsupported");
});

test("current Clerk error details are shown rather than blaming every failure on credentials", () => {
  assert.match(authErrorMessage({ cause: { errors: [{ code: "identifier_already_signed_in" }] } }), /already has a sign-in session/);
  assert.match(authErrorMessage({ errors: [{ code: "form_password_incorrect" }] }), /password was not accepted/);
  assert.match(authErrorMessage({ errors: [{ code: "form_identifier_not_found" }] }), /No account was found/);
  assert.equal(authErrorMessage({ code: "wrapper", cause: { errors: [{ code: "other", longMessage: "Please verify your email." }] } }), "Please verify your email.");
  assert.match(authErrorMessage({ code: "unexpected_state" }), /unexpected_state/);
});
