export type VerificationMethod = "email_code" | "totp" | "backup_code";

export function canResumeCompletedSignIn(status: string, identifier: string | null | undefined, email: string) {
  return status === "complete" && Boolean(identifier) &&
    identifier!.trim().toLowerCase() === email.trim().toLowerCase();
}

export function nextSignInStep(status: string, strategies: string[]): VerificationMethod | "finalize" | "unsupported" {
  if (status === "complete") return "finalize";
  if (status !== "needs_client_trust" && status !== "needs_second_factor") return "unsupported";
  const preferred: VerificationMethod[] = status === "needs_client_trust"
    ? ["email_code", "totp", "backup_code"] : ["totp", "email_code", "backup_code"];
  return preferred.find(method => strategies.includes(method)) ?? "unsupported";
}

/** Read the error returned by this request, not a stale hook-error snapshot. */
export function authErrorMessage(error: unknown): string {
  const top = error as { code?: string; longMessage?: string; errors?: unknown[]; cause?: unknown } | null;
  const cause = top?.cause as { errors?: unknown[]; code?: string; longMessage?: string } | undefined;
  const detail = (top?.errors?.[0] ?? cause?.errors?.[0] ?? cause ?? top) as typeof top;
  const code = detail?.code ?? top?.code;
  const known: Record<string, string> = {
    form_password_incorrect: "The password was not accepted. Check your saved password and try again.",
    form_identifier_not_found: "No account was found for that email on this site. Check the email address.",
    identifier_already_signed_in: "This browser already has a sign-in session. Please continue with that session.",
    session_exists: "This browser already has a sign-in session. Please continue with that session.",
    too_many_requests: "Too many attempts. Please wait before trying again.",
    form_code_incorrect: "The verification code was not accepted. Check the latest code and try again.",
    verification_expired: "That verification code has expired. Request a new code.",
  };
  return (code && known[code]) || detail?.longMessage || top?.longMessage ||
    `Sign-in could not finish${code && /^[a-z0-9_]+$/i.test(code) ? ` (${code})` : ""}. Please try again.`;
}

export async function completePasswordReset(
  password: string,
  confirmation: string,
  submit: (params: { password: string }) => Promise<{ error: unknown }>,
  continueSignIn: () => Promise<void>,
) {
  if (password.length < 8) throw new Error("Use at least 8 characters.");
  if (password !== confirmation) throw new Error("The passwords do not match.");
  const result = await submit({ password });
  if (result.error) throw result.error;
  // A reset can create a session OR require MFA. Let the normal completion
  // handler activate the session only after all provider requirements are met.
  await continueSignIn();
}
