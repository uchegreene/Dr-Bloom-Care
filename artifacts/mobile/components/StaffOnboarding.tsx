import React, { useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Redirect } from "expo-router";
import { type StaffProfileInput } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/hooks/useProfileContext";

export function StaffOnboarding() {
  const colors = useColors();
  const { profile, completeStaffOnboarding } = useProfile();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.staffProfile?.name ?? profile?.name ?? "");
  const [gender, setGender] = useState<StaffProfileInput["gender"] | "">(profile?.staffProfile?.gender ?? "");
  const [age, setAge] = useState(profile?.staffProfile?.age?.toString() ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <Redirect href={profile?.role === "medical_team" ? "/medical-team" : "/admin"} />;
  const inputStyle = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }];
  const submit = async () => {
    Keyboard.dismiss();
    if (name.trim().length < 2 || name.trim().length > 100) return setError("Enter a name between 2 and 100 characters.");
    if (!gender) return setError("Choose your gender.");
    if (!/^\d+$/.test(age.trim()) || Number(age) < 13 || Number(age) > 120) return setError("Enter your age as a whole number from 13 to 120.");
    setError("");
    setSaving(true);
    try {
      await completeStaffOnboarding({ name: name.trim(), gender, age: Number(age) });
      setDone(true);
    } catch {
      setError("We couldn’t save your staff profile. Please try again. If your staff access was removed, contact the super administrator.");
    } finally { setSaving(false); }
  };
  return <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.foreground }]}>Set up your staff profile</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your staff account has already been assigned. Complete these details to enter your workspace.</Text>
      {profile?.assignedProfileName ? <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 13, padding: 14, marginTop: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold", fontSize: 13 }}>Assigned professional profile</Text>
        <Text style={{ color: colors.foreground, fontFamily: "Nunito_700Bold", fontSize: 18, marginTop: 7 }}>{profile.assignedProfileName}</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>Assigned by the super admin. Your advice and medical replies use this professional name. Editing your personal name below will not change it.</Text>
      </View> : null}
      <Text style={[styles.label, { color: colors.foreground }]}>Assigned email</Text>
      <TextInput accessibilityLabel="Assigned email (read only)" editable={false} value={profile?.email ?? ""} style={[inputStyle, { opacity: 0.75 }]} />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>This is the email assigned to your account and cannot be edited here.</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>Personal name</Text>
      <TextInput accessibilityLabel="Personal name" value={name} onChangeText={setName} editable={!saving} maxLength={100} textContentType="name"
        placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
      <Text style={[styles.label, { color: colors.foreground }]}>Gender</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {(["female", "male", "other"] as const).map(value => <TouchableOpacity key={value} accessibilityRole="radio"
          accessibilityLabel={value === "female" ? "Female" : value === "male" ? "Male" : "Other"}
          accessibilityState={{ checked: gender === value }} disabled={saving} onPress={() => setGender(value)}
          style={[styles.choice, { borderColor: gender === value ? colors.primary : colors.border, backgroundColor: gender === value ? colors.secondary : colors.card }]}>
          <Text style={{ color: colors.foreground }}>{value === "female" ? "Female" : value === "male" ? "Male" : "Other"}</Text>
        </TouchableOpacity>)}
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>Age</Text>
      <TextInput accessibilityLabel="Age" value={age} onChangeText={setAge} editable={!saving} keyboardType="number-pad" maxLength={3}
        placeholder="Age in years" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.foreground, marginTop: 18 }}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={submit}
        style={[styles.button, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
        {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontFamily: "Nunito_700Bold", fontSize: 16 }}>Continue to staff workspace</Text>}
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 45, width: "100%", maxWidth: 540, alignSelf: "center" },
  title: { fontFamily: "Nunito_700Bold", fontSize: 27 },
  subtitle: { fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 22, marginTop: 10, marginBottom: 14 },
  label: { fontFamily: "Nunito_600SemiBold", fontSize: 14, marginTop: 18, marginBottom: 8 },
  hint: { fontFamily: "Nunito_400Regular", fontSize: 12, lineHeight: 18, marginTop: 8 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontFamily: "Nunito_400Regular", fontSize: 16 },
  options: { flexDirection: "row", gap: 10 },
  choice: { flex: 1, alignItems: "center", borderRadius: 12, borderWidth: 1, paddingVertical: 15 },
  button: { padding: 16, borderRadius: 14, marginTop: 28, alignItems: "center" },
});
