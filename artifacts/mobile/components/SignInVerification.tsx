import React from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { VerificationMethod } from "@/lib/authFlow";

export function SignInVerification({ method, available, code, setCode, message, busy, verify, chooseMethod, resend, back }: {
  method: VerificationMethod; available: string[]; code: string; setCode: (code: string) => void;
  message: string; busy: boolean; verify: () => void; chooseMethod: (method: VerificationMethod) => void;
  resend: () => void; back: () => void;
}) {
  const colors = useColors();
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 26 }} keyboardShouldPersistTaps="handled">
    <Text style={{ color: colors.foreground, fontFamily: "Nunito_700Bold", fontSize: 27 }}>Complete your sign-in</Text>
    <Text style={{ color: colors.mutedForeground, marginTop: 12, lineHeight: 23 }}>
      {method === "email_code" ? "Enter the verification code sent to your account email to verify this browser."
        : method === "totp" ? "Enter the current code from your authenticator app."
        : "Enter one of your unused backup codes."}
    </Text>
    <TextInput accessibilityLabel="Sign-in verification code" value={code} onChangeText={setCode} editable={!busy}
      autoCapitalize="none" autoCorrect={false} textContentType="oneTimeCode"
      keyboardType={method === "backup_code" ? "default" : "number-pad"}
      style={{ borderWidth: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card,
        borderRadius: 13, padding: 14, minHeight: 52, fontSize: 18, marginTop: 20 }} />
    {message ? <Text accessibilityRole="alert" style={{ color: colors.foreground, marginTop: 14, lineHeight: 22 }}>{message}</Text> : null}
    <TouchableOpacity accessibilityRole="button" onPress={verify} disabled={busy || !code.trim()}
      style={{ backgroundColor: colors.primary, opacity: busy || !code.trim() ? 0.55 : 1, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 22 }}>
      {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Verify and sign in</Text>}
    </TouchableOpacity>
    {method === "email_code" ? <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={resend} style={{ paddingVertical: 16 }}>
      <Text style={{ color: colors.primary }}>Resend email code</Text>
    </TouchableOpacity> : null}
    {(["email_code", "totp", "backup_code"] as const).filter(other => other !== method && available.includes(other)).map(other =>
      <TouchableOpacity accessibilityRole="button" disabled={busy} key={other} onPress={() => chooseMethod(other)} style={{ paddingVertical: 14 }}>
        <Text style={{ color: colors.primary }}>{other === "email_code" ? "Use email verification" : other === "totp" ? "Use authenticator app" : "Use a backup code"}</Text>
      </TouchableOpacity>)}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={back} style={{ paddingVertical: 18 }}>
      <Text style={{ color: colors.primary }}>Back to sign in</Text>
    </TouchableOpacity>
  </ScrollView>;
}
