import React, { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { useSignIn } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";

/** Passwords and verification codes go directly to Clerk, never our application server. */
export function PasswordRecovery({ initialEmail, onBack, adminOnly = false }: { initialEmail: string; onBack: () => void; adminOnly?: boolean }) {
  const colors = useColors();
  const { signIn } = useSignIn();
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const fieldStyle = { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card,
    borderWidth: 1, borderRadius: 13, minHeight: 52, paddingHorizontal: 14, fontSize: 16, marginTop: 8 };
  const labelStyle = { color: colors.foreground, marginTop: 20, fontSize: 15 };

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try { await action(); }
    catch (error) {
      const problem = error as { longMessage?: string; message?: string };
      setMessage(problem.longMessage || problem.message || "Unable to complete this step. Please try again.");
    } finally { setBusy(false); }
  };
  const sendCode = async () => {
    const start = await signIn.create({ identifier: email.trim() });
    if (start.error) throw start.error;
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) throw sent.error;
    setResendAt(Date.now() + 60_000);
    setStep("code");
  };
  const submit = () => run(async () => {
    if (step === "email") return sendCode();
    if (step === "code") {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (result.error) throw result.error;
      if (signIn.status !== "needs_new_password") throw new Error("Verification is not complete. Please request a new code.");
      setCode("");
      setStep("password");
      return;
    }
    if (password.length < 8) throw new Error("Use at least 8 characters.");
    if (password !== confirm) throw new Error("The passwords do not match.");
    const result = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (result.error) throw result.error;
    setPassword("");
    setConfirm("");
    // Do not finalize a session here: normal sign-in must still enforce any required MFA.
    setStep("done");
  });
  const disabled = busy || (step === "email" ? !email.trim() : step === "code" ? !code.trim() : password.length < 8 || password !== confirm);

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 26, paddingBottom: 48 }}
    keyboardShouldPersistTaps="handled">
    <Text style={{ fontFamily: "Nunito_700Bold", color: colors.foreground, fontSize: 26 }}>
      {step === "done" ? "Password updated" : "Reset your password"}
    </Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 15, lineHeight: 23, marginTop: 12 }}>
      {step === "email" ? "Enter the email registered to your account. We’ll send a verification code so you can choose a new password. Administrator access stays unchanged."
        : step === "code" ? `Enter the verification code sent to ${email.trim()}.`
        : step === "password" ? "Choose a new password with at least 8 characters."
        : "Your password has been updated. Return to sign in with your new password. Any required two-step verification still applies."}
    </Text>
    {step === "email" ? <>
      <Text style={labelStyle}>Account email</Text>
      <TextInput accessibilityLabel="Account email" value={email} onChangeText={setEmail} editable={!busy}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" style={fieldStyle} />
      <Text style={{ color: colors.mutedForeground, lineHeight: 21, marginTop: 14 }}>
        {adminOnly ? "Use the email assigned by the super admin. If an account has not been created for you, contact the super admin." : "If you have never created an account, register in the member app first and verify your email. A designated admin email alone does not create an account."}
      </Text>
    </> : step === "code" ? <>
      <Text style={labelStyle}>Verification code</Text>
      <TextInput accessibilityLabel="Verification code" value={code} onChangeText={setCode} editable={!busy}
        keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" style={fieldStyle} />
      <TouchableOpacity disabled={busy} onPress={() => run(async () => {
        if (Date.now() < resendAt) throw new Error("Please wait one minute before requesting another code.");
        await sendCode();
        setMessage("A new verification code has been sent.");
      })} style={{ paddingVertical: 16 }} accessibilityRole="button">
        <Text style={{ color: colors.primary }}>Resend code</Text>
      </TouchableOpacity>
    </> : step === "password" ? <>
      <Text style={labelStyle}>New password</Text>
      <TextInput accessibilityLabel="New password" value={password} onChangeText={setPassword} editable={!busy}
        secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" style={fieldStyle} />
      <Text style={labelStyle}>Confirm new password</Text>
      <TextInput accessibilityLabel="Confirm new password" value={confirm} onChangeText={setConfirm} editable={!busy}
        secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" style={fieldStyle} />
      {confirm && password !== confirm ? <Text style={{ color: "#B42318", marginTop: 10 }}>The passwords do not match.</Text> : null}
    </> : null}
    {message ? <Text accessibilityRole="alert" style={{ color: "#B42318", marginTop: 16 }}>{message}</Text> : null}
    {step !== "done" ? <TouchableOpacity disabled={disabled} onPress={submit} accessibilityRole="button"
      style={{ backgroundColor: colors.primary, opacity: disabled ? 0.55 : 1, padding: 16, borderRadius: 14, marginTop: 24, alignItems: "center" }}>
      {busy ? <ActivityIndicator color={colors.primaryForeground} /> :
        <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{step === "email" ? "Send reset code" : step === "code" ? "Verify code" : "Save new password"}</Text>}
    </TouchableOpacity> : null}
    <TouchableOpacity disabled={busy} onPress={onBack} accessibilityRole="button" style={{ alignItems: "center", padding: 18, marginTop: 10 }}>
      <Text style={{ color: colors.primary, fontWeight: "700" }}>Back to sign in</Text>
    </TouchableOpacity>
  </ScrollView>;
}
