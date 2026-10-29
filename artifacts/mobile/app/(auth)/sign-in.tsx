import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth, useSignIn } from "@clerk/expo";
import { Redirect, Link, type Href, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { PasswordRecovery } from "@/components/PasswordRecovery";

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [recovering, setRecovering] = useState(false);
  const busy = fetchStatus === "fetching";

  const submit = async () => {
    setMessage("");
    const result = await signIn.password({
      identifier: email.trim(),
      password,
    });
    if (result.error) {
      setMessage(
        errors.fields.identifier?.message ??
          errors.fields.password?.message ??
          "We couldn't sign you in. Check your email and password.",
      );
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl("/") as Href);
        },
      });
      return;
    }
    setMessage(
      "This account needs an additional verification step. Use email verification or contact support.",
    );
  };

  if (isSignedIn) return <Redirect href="/" />;
  if (recovering) return <PasswordRecovery initialEmail={email} onBack={() => {
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
      <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Sign in with the email and password on your account.
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
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        New to Dr Bloom Care?{" "}
        <Link href={"/(auth)/sign-up" as Href} style={{ color: colors.primary, fontWeight: "700" }}>
          Create a free account
        </Link>
      </Text>
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
