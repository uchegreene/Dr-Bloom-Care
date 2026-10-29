import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth, useClerk, useSignIn } from "@clerk/expo";
import { Redirect, Link, type Href, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { PasswordRecovery } from "@/components/PasswordRecovery";
import { isAdminPortalHost } from "@/lib/adminPortal";
import { SignInVerification } from "@/components/SignInVerification";
import { authErrorMessage, canResumeCompletedSignIn, nextSignInStep, type VerificationMethod } from "@/lib/authFlow";

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { setActive } = useClerk();
  const { isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [working, setWorking] = useState(false);
  const [verification, setVerification] = useState<VerificationMethod | null>(null);
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const busy = working || fetchStatus === "fetching";
  const adminPortal = Platform.OS === "web" && typeof window !== "undefined" && isAdminPortalHost(window.location.hostname);

  const navigate = ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
    const destination = decorateUrl("/");
    if (Platform.OS === "web" && /^https?:\/\//.test(destination)) window.location.assign(destination);
    else router.replace(destination as Href);
  };
  const run = async (action: () => Promise<void>) => {
    if (working) return;
    setWorking(true);
    setMessage("");
    try { await action(); }
    catch (error) { setMessage(error instanceof Error && !("code" in error) ? error.message : authErrorMessage(error)); }
    finally { setWorking(false); }
  };
  const sendEmailCode = async () => {
    const result = await signIn.mfa.sendEmailCode();
    if (result.error) throw result.error;
    setResendAt(Date.now() + 60_000);
    setMessage("A verification code has been sent to your account email.");
  };
  const advance = async () => {
    const next = nextSignInStep(signIn.status, signIn.supportedSecondFactors.map(factor => factor.strategy));
    if (next === "finalize") {
      const result = await signIn.finalize({ navigate });
      if (result.error) throw result.error;
      return;
    }
    if (next !== "unsupported") {
      setVerification(next);
      setCode("");
      if (next === "email_code") await sendEmailCode();
      return;
    }
    throw new Error(`Your sign-in requires another step (${signIn.status}). No administrator permissions have been changed.`);
  };
  const submit = () => run(async () => {
    // Resume a reset-created, fully verified session left by an older app version.
    // Never reuse an incomplete attempt or one belonging to a different email.
    if (canResumeCompletedSignIn(signIn.status, signIn.identifier, email)) {
      await advance();
      return;
    }
    const result = await signIn.password({
      identifier: email.trim().toLowerCase(),
      password,
    });
    if (result.error) {
      // Password recovery can already have created a session for this browser.
      // Only use the session explicitly returned by Clerk for this same client.
      if (signIn.existingSession) {
        await setActive({ session: signIn.existingSession.sessionId, navigate });
        return;
      }
      throw result.error;
    }
    await advance();
  });

  if (isSignedIn) return <Redirect href="/" />;
  if (verification) return <SignInVerification method={verification}
    available={signIn.supportedSecondFactors.map(factor => factor.strategy)} code={code} setCode={setCode}
    message={message} busy={busy} verify={() => run(async () => {
      const result = verification === "email_code" ? await signIn.mfa.verifyEmailCode({ code: code.trim() })
        : verification === "totp" ? await signIn.mfa.verifyTOTP({ code: code.trim() })
        : await signIn.mfa.verifyBackupCode({ code: code.trim() });
      if (result.error) throw result.error;
      await advance();
    })} chooseMethod={method => run(async () => {
      setVerification(method); setCode("");
      if (method === "email_code") await sendEmailCode();
    })} resend={() => run(async () => {
      if (Date.now() < resendAt) throw new Error("Please wait one minute before requesting another code.");
      await sendEmailCode();
    })} back={() => run(async () => {
      const result = await signIn.reset();
      if (result.error) throw result.error;
      setVerification(null); setCode(""); setPassword("");
    })} />;
  if (recovering) return <PasswordRecovery initialEmail={email} adminOnly={adminPortal} onComplete={async () => {
    setPassword(""); setRecovering(false);
    await run(advance);
  }} onBack={() => {
    setPassword("");
    setMessage("");
    setRecovering(false);
  }} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={require("../../assets/images/logo.png")} style={styles.mark}
        resizeMode="contain" accessible accessibilityLabel="Dr Bloom Care flower logo" />
      <Text style={[styles.brand, { color: colors.foreground }]}>Dr Bloom Care</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{adminPortal ? "Staff sign in" : "Welcome back"}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {adminPortal ? "Staff accounts are created by the super admin. Sign in with your assigned email and private password." : "Sign in with the email and password on your account."}
      </Text>

      <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        placeholder="Your password"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      {message ? <Text style={styles.error}>{message}</Text> : null}
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setRecovering(true)}
        style={{ paddingVertical: 14, alignSelf: "flex-end" }}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>Forgot password?</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={submit}
        disabled={!email.trim() || !password || busy}
        style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
      >
        {busy ? <ActivityIndicator color={colors.primaryForeground} /> : null}
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
          {busy ? "Signing in…" : "Sign in"}
        </Text>
      </TouchableOpacity>
      {!adminPortal ? <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        New to Dr Bloom Care?{" "}
        <Link href={"/(auth)/sign-up" as Href} style={{ color: colors.primary, fontWeight: "700" }}>
          Create a free account
        </Link>
      </Text> : <Text style={[styles.footer, { color: colors.mutedForeground }]}>Need an account? Contact the super admin. To set your password for the first time, use “Forgot password?”.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", padding: 26, paddingBottom: 48 },
  mark: { width: 124, height: 124, borderRadius: 20, alignSelf: "center" },
  brand: { fontFamily: "Nunito_700Bold", fontSize: 13, letterSpacing: 2, textAlign: "center", marginTop: 14 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 29, textAlign: "center", marginTop: 20 },
  subtitle: { fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 8, marginBottom: 26 },
  label: { fontFamily: "Nunito_600SemiBold", fontSize: 14, marginBottom: 7, marginTop: 14 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontFamily: "Nunito_400Regular", fontSize: 16 },
  button: { minHeight: 52, borderRadius: 14, marginTop: 24, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  error: { color: "#B42318", fontFamily: "Nunito_600SemiBold", fontSize: 14, marginTop: 14 },
  footer: { fontFamily: "Nunito_400Regular", fontSize: 14, textAlign: "center", marginTop: 22 },
});
