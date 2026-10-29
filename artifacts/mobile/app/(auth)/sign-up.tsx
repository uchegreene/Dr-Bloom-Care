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
  View,
} from "react-native";
import { useAuth, useSignUp } from "@clerk/expo";
import { Redirect, Link, type Href, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { isAdminPortalHost } from "@/lib/adminPortal";

export default function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const busy = fetchStatus === "fetching";

  const sendCode = async () => {
    setMessage("");
    const result = await signUp.password({
      emailAddress: email.trim(),
      password,
    });
    if (result.error) {
      setMessage(
        errors.fields.emailAddress?.message ??
          errors.fields.password?.message ??
          "We couldn't create the account. Check the details and try again.",
      );
      return;
    }
    const verification = await signUp.verifications.sendEmailCode();
    if (verification.error) {
      setMessage("We couldn't send the verification email. Please try again.");
      return;
    }
    setCodeSent(true);
  };

  const verifyCode = async () => {
    setMessage("");
    const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (result.error) {
      setMessage(errors.fields.code?.message ?? "That code did not work. Check it and try again.");
      return;
    }
    if (signUp.status !== "complete") {
      setMessage("Your account still needs verification. Request a new code or contact support.");
      return;
    }
    await signUp.finalize({
      navigate: ({ decorateUrl }) => {
        router.replace(decorateUrl("/onboarding") as Href);
      },
    });
  };

  if (Platform.OS === "web" && typeof window !== "undefined" && isAdminPortalHost(window.location.hostname)) return <Redirect href="/(auth)/sign-in" />;
  if (isSignedIn) return <Redirect href="/" />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={require("../../assets/images/logo.png")} style={styles.mark}
        resizeMode="contain" accessible accessibilityLabel="Dr Bloom Care flower logo" />
      <Text style={[styles.brand, { color: colors.foreground }]}>Dr Bloom Care</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {codeSent ? "Verify your email" : "Create your free account"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {codeSent
          ? `Enter the code sent to ${email.trim()}.`
          : "Read the community for free. Tracking and member publishing require an active plan."}
      </Text>

      {!codeSent ? (
        <>
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
            textContentType="newPassword"
            placeholder="Create a password"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.foreground }]}>Email verification code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="Enter the code"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          />
          <TouchableOpacity
            onPress={() => signUp.verifications.sendEmailCode()}
            style={styles.resend}
          >
            <Text style={{ color: colors.primary, fontFamily: "Nunito_700Bold" }}>
              Send a new code
            </Text>
          </TouchableOpacity>
        </>
      )}

      {message ? <Text style={styles.error}>{message}</Text> : null}
      <TouchableOpacity
        onPress={codeSent ? verifyCode : sendCode}
        disabled={busy || (codeSent ? !code.trim() : !email.trim() || password.length < 8)}
        style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
      >
        {busy ? <ActivityIndicator color={colors.primaryForeground} /> : null}
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
          {busy ? "Please wait…" : codeSent ? "Verify and continue" : "Create account"}
        </Text>
      </TouchableOpacity>
      {!codeSent ? <View nativeID="clerk-captcha" /> : null}
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Already have an account?{" "}
        <Link href={"/(auth)/sign-in" as Href} style={{ color: colors.primary, fontWeight: "700" }}>
          Sign in
        </Link>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", padding: 26, paddingBottom: 48 },
  mark: { width: 124, height: 124, borderRadius: 20, alignSelf: "center" },
  brand: { fontFamily: "Nunito_700Bold", fontSize: 13, letterSpacing: 2, textAlign: "center", marginTop: 14 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 27, textAlign: "center", marginTop: 20 },
  subtitle: { fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 8, marginBottom: 24 },
  label: { fontFamily: "Nunito_600SemiBold", fontSize: 14, marginBottom: 7, marginTop: 14 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontFamily: "Nunito_400Regular", fontSize: 16 },
  resend: { alignSelf: "flex-start", marginTop: 12, padding: 4 },
  button: { minHeight: 52, borderRadius: 14, marginTop: 24, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  error: { color: "#B42318", fontFamily: "Nunito_600SemiBold", fontSize: 14, marginTop: 14 },
  footer: { fontFamily: "Nunito_400Regular", fontSize: 14, textAlign: "center", marginTop: 22 },
});
