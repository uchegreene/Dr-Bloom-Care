import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Redirect } from "expo-router";
import { differenceInYears, isFuture, isValid, parseISO } from "date-fns";
import { Feather } from "@expo/vector-icons";
import { useListPlans } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useProfile, type ProfileMode } from "@/hooks/useProfileContext";
import { StaffOnboarding } from "@/components/StaffOnboarding";
import { useAuth } from "@clerk/expo";

const money = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

export default function Onboarding() {
  const { profile, isLoading, profileError, refreshAccount } = useProfile();
  const { isLoaded, isSignedIn } = useAuth();
  const colors = useColors();
  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (isLoading || !profile) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24, gap: 16 }}>
    {profileError ? <><Text style={{ color: colors.foreground }}>{profileError}</Text>
      <TouchableOpacity onPress={refreshAccount}><Text style={{ color: colors.primary }}>Retry loading your account</Text></TouchableOpacity></>
      : <ActivityIndicator color={colors.primary} />}
  </View>;
  if (profile.role === "admin" || profile.role === "medical_team") return <StaffOnboarding />;
  return <MemberOnboarding />;
}

function MemberOnboarding() {
  const colors = useColors();
  const { completeOnboarding } = useProfile();
  const plansQuery = useListPlans();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [mode, setMode] = useState<ProfileMode>("none");
  const [femaleOnlyConfirmed, setFemaleOnlyConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <Redirect href="/" />;

  const plan = mode === "pregnant" ? "pregnancy" : "cycle";
  const price = plansQuery.data?.find((entry) => entry.plan === plan)?.priceNaira;

  const submit = async () => {
    Keyboard.dismiss();
    const cleanedUsername = username.trim().replace(/^@/, "").toLowerCase();
    const parsedDate = parseISO(dob.trim());
    if (!femaleOnlyConfirmed) {
      return setError("Confirm that Dr Bloom Care is a women-only community before continuing.");
    }
    if (name.trim().length < 2) return setError("Enter your name.");
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanedUsername)) {
      return setError("Username must be 3–30 letters, numbers, or underscores.");
    }
    if (!isValid(parsedDate) || isFuture(parsedDate)) {
      return setError("Enter your date of birth as YYYY-MM-DD.");
    }
    const age = differenceInYears(new Date(), parsedDate);
    if (age < 13) return setError("You must be at least 13 years old to use Dr Bloom Care.");
    if (age > 120) return setError("Enter a valid date of birth.");

    setError("");
    setSaving(true);
    try {
      await completeOnboarding({
        username: cleanedUsername,
        name: name.trim(),
        dateOfBirth: dob.trim(),
        bio: "",
        femaleOnlyConfirmed: true,
        mode,
      });
      setDone(true);
    } catch (cause) {
      const status = (cause as { status?: number }).status;
      setError(
        status === 409
          ? "That username is already taken. Try another."
          : "We couldn't save your profile. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const options: { key: ProfileMode; title: string; detail: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "cycle", title: "Cycle tracking", detail: "Period and cycle insights", icon: "calendar" },
    { key: "pregnant", title: "Pregnancy care", detail: "Pregnancy tracking and guidance", icon: "heart" },
    { key: "none", title: "Browse for now", detail: "Read community posts for free", icon: "users" },
  ];

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mark, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.markText, { color: colors.primary }]}>B</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Finish your profile</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your account is free. You can read community posts now; tracking and publishing need an active plan.
        </Text>

        <TouchableOpacity
          onPress={() => { setFemaleOnlyConfirmed((value) => !value); setError(""); }}
          style={[styles.attestation, { borderColor: femaleOnlyConfirmed ? colors.primary : colors.border, backgroundColor: colors.card }]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: femaleOnlyConfirmed }}
        >
          <Feather
            name={femaleOnlyConfirmed ? "check-square" : "square"}
            size={21}
            color={femaleOnlyConfirmed ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.attestationText, { color: colors.foreground }]}>
            I identify as a woman and understand Dr Bloom Care is a women-only community.
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground }]}>Public username</Text>
        <TextInput
          value={username}
          onChangeText={(value) => { setUsername(value); setError(""); }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. bloom_member"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />
        <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={(value) => { setName(value); setError(""); }}
          textContentType="name"
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />
        <Text style={[styles.label, { color: colors.foreground }]}>Date of birth</Text>
        <TextInput
          value={dob}
          onChangeText={(value) => { setDob(value); setError(""); }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />

        <Text style={[styles.label, styles.modeHeading, { color: colors.foreground }]}>Choose a starting mode</Text>
        <View style={styles.options}>
          {options.map((option) => {
            const selected = mode === option.key;
            const optionPlan = option.key === "pregnant" ? "pregnancy" : "cycle";
            const optionPrice = option.key === "none"
              ? null
              : plansQuery.data?.find((entry) => entry.plan === optionPlan)?.priceNaira;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => setMode(option.key)}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
              >
                <Feather name={option.icon} size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text>
                  <Text style={[styles.optionDetail, { color: colors.mutedForeground }]}>{option.detail}</Text>
                </View>
                {optionPrice != null && (
                  <Text style={[styles.price, { color: colors.primary }]}>{money(optionPrice)}/mo</Text>
                )}
                {selected && <Feather name="check-circle" size={19} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {mode !== "none" && (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            {price == null
              ? "Current monthly plan price is loading."
              : `${money(price)} per month. No payment is collected during signup. An administrator must confirm external payment to activate tracking.`}
          </Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          style={[styles.button, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        >
          {saving ? <ActivityIndicator color={colors.primaryForeground} /> : null}
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {saving ? "Saving…" : "Continue to Dr Bloom Care"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 38, paddingBottom: 45 },
  mark: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  markText: { fontFamily: "Nunito_700Bold", fontSize: 29 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 27, textAlign: "center", marginTop: 16 },
  subtitle: { fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8, marginBottom: 18 },
  label: { fontFamily: "Nunito_600SemiBold", fontSize: 14, marginTop: 14, marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontFamily: "Nunito_400Regular", fontSize: 16 },
  modeHeading: { marginTop: 24 },
  options: { gap: 9 },
  attestation: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 5 },
  attestationText: { flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 13, lineHeight: 19 },
  option: { minHeight: 66, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  optionTitle: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  optionDetail: { fontFamily: "Nunito_400Regular", fontSize: 12, marginTop: 2 },
  price: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  note: { fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 19, marginTop: 12 },
  error: { color: "#B42318", fontFamily: "Nunito_600SemiBold", fontSize: 14, marginTop: 14 },
  button: { minHeight: 52, borderRadius: 14, marginTop: 22, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: "Nunito_700Bold", fontSize: 16 },
});
