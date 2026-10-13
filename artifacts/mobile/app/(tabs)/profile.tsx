import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListPlans, useRemoveDailyTipDevice } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useConfirmation } from "@/hooks/useConfirmation";
import { getTipDeviceId, useUnreadTipCount, useTipEligibility } from "@/hooks/useDailyTips";
import { useProfile, type ProfileMode, type SubscriptionPlan } from "@/hooks/useProfileContext";

const formatNaira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

const MODES: {
  key: ProfileMode;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: "cycle", label: "Cycle mode", description: "Period and cycle tracking", icon: "calendar" },
  { key: "pregnant", label: "Pregnancy mode", description: "Pregnancy tracking and care", icon: "heart" },
  { key: "none", label: "Community only", description: "Browse posts without tracking", icon: "users" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, refreshAccount } = useProfile();
  const { signOut } = useAuth();
  const plansQuery = useListPlans();
  const removeTipDevice = useRemoveDailyTipDevice();
  const unreadTips = useUnreadTipCount();
  const { eligible: tipsEligible } = useTipEligibility();
  const [name, setName] = useState(profile?.name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { confirm, confirmationDialog } = useConfirmation();

  useEffect(() => {
    setName(profile?.name ?? "");
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
  }, [profile?.name, profile?.username, profile?.bio]);

  const topInset = Platform.OS === "web" ? 40 : insets.top;
  const bottomInset = Platform.OS === "web" ? 100 : insets.bottom + 92;
  const selectedPlan: SubscriptionPlan | null =
    profile?.mode === "cycle" ? "cycle" :
      profile?.mode === "pregnant" ? "pregnancy" : null;
  const selectedFee = selectedPlan
    ? plansQuery.data?.find((plan) => plan.plan === selectedPlan)?.priceNaira
    : null;
  const currentExpiry = profile?.subscriptionExpiresAt
    ? new Date(profile.subscriptionExpiresAt).toLocaleDateString()
    : null;
  const planMatchesMode =
    Boolean(profile?.subscriptionActive) &&
    profile?.subscriptionPlan === selectedPlan;

  const save = async () => {
    try {
      await updateProfile({
        name: name.trim(),
        username: username.trim().replace(/^@/, "").toLowerCase(),
        bio: bio.trim(),
      });
      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 1600);
    } catch (cause) {
      setSaved(false);
      setError(
        (cause as { status?: number }).status === 409
          ? "That username is already taken."
          : "Could not save your changes. Please try again.",
      );
    }
  };

  const changeMode = async (mode: ProfileMode) => {
    try {
      await updateProfile({ mode });
      setError("");
    } catch {
      setError("Could not change mode. Please try again.");
    }
  };


  const handleSignOut = async () => {
    try {
      const deviceId = await getTipDeviceId();
      await removeTipDevice.mutateAsync({ deviceId });
    } catch {
      // best effort; sign-out continues
    }
    await signOut();
    router.replace("/(auth)/sign-in" as Href);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 12,
        paddingBottom: bottomInset,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{(profile?.name || "B")[0].toUpperCase()}</Text>
        </View>
        <Text style={[styles.avatarName, { color: colors.foreground }]}>
          {profile?.name || "Dr Bloom Care member"}
        </Text>
        <Text style={[styles.handle, { color: colors.mutedForeground }]}>
          @{profile?.username || "member"}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Membership</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.membershipHeader}>
          <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
            <Feather name="shield" size={19} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {planMatchesMode
                ? `${selectedPlan === "cycle" ? "Cycle" : "Pregnancy"} plan active`
                : profile?.subscriptionActive
                  ? "Switching plan needed"
                  : "Free account"}
            </Text>
            <Text style={[styles.smallText, { color: colors.mutedForeground }]}>
              {planMatchesMode && currentExpiry
                ? `Manually activated through ${currentExpiry}`
                : "Free accounts can read community posts."}
            </Text>
          </View>
        </View>

        {!planMatchesMode && selectedPlan && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {selectedPlan === "cycle" ? "Cycle tracking" : "Pregnancy tracking"}
              {"  "}
              {selectedFee != null ? `${formatNaira(selectedFee)} / month` : ""}
            </Text>
            <Text style={[styles.smallText, { color: colors.mutedForeground, marginTop: 8 }]}>
              Subscriptions will activate automatically after a verified payment, without admin approval, and access ends when the paid period expires. Payments are not connected yet, so no purchase can be processed here. Do not send an external payment using the old approval process.
            </Text>
          </>
        )}
        {!selectedPlan && (
          <Text style={[styles.smallText, { color: colors.mutedForeground, marginTop: 10 }]}>
            Choose cycle or pregnancy mode below to see that plan’s monthly fee.
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About you</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Public username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="username"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Share a little about yourself"
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={280}
        style={[styles.input, styles.bio, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={[styles.error, { color: colors.primary }]}>{notice}</Text> : null}
      {profile?.requestedPlan ? (
        <Text style={[styles.error, { color: colors.mutedForeground }]}>
          An older {profile.requestedPlan} request is on record. The manual approval flow has been retired; this request does not grant paid access or confirm payment.
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={save}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        <Feather name={saved ? "check" : "save"} size={17} color={colors.primaryForeground} />
        <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
          {saved ? "Saved" : "Save profile"}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose mode</Text>
      <Text style={[styles.smallText, { color: colors.mutedForeground, marginBottom: 10 }]}>
        You can switch any time. A matching active plan is required to open tracking.
      </Text>
      <View style={{ gap: 10 }}>
        {MODES.map((mode) => {
          const active = profile?.mode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              onPress={() => changeMode(mode.key)}
              style={[
                styles.modeRow,
                {
                  backgroundColor: colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Feather name={mode.icon} size={19} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{mode.label}</Text>
                <Text style={[styles.smallText, { color: colors.mutedForeground }]}>{mode.description}</Text>
              </View>
              {active ? <Feather name="check-circle" size={19} color={colors.primary} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {tipsEligible && (
        <TouchableOpacity
          onPress={() => router.push("/daily-tips" as Href)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 12 }}
        >
          <Feather name="sun" size={18} color={colors.primary} />
          <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: colors.primary }}>
            Daily health education{unreadTips > 0 ? ` (${unreadTips} new)` : ""}
          </Text>
        </TouchableOpacity>
      )}
      {(profile?.role === "admin" || profile?.role === "medical_team") && (
        <TouchableOpacity
          onPress={() => router.push("/daily-tip-review" as Href)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}
        >
          <Feather name="clipboard" size={18} color={colors.primary} />
          <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: colors.primary }}>Daily tip review</Text>
        </TouchableOpacity>
      )}
      {(profile?.role === "admin" || profile?.role === "medical_team") && (
        <TouchableOpacity
          onPress={() => router.push("/medical-team" as Href)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 12 }}
        >
          <Feather name="inbox" size={18} color={colors.primary} />
          <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: colors.primary }}>Medical team inbox</Text>
        </TouchableOpacity>
      )}
      {profile?.role === "admin" && (
        <TouchableOpacity
          onPress={() => router.push("/admin" as Href)}
          style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 24 }]}
        >
          <Feather name="settings" size={18} color={colors.primaryForeground} />
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            Admin tools
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handleSignOut} style={styles.signOut}>
        <Feather name="log-out" size={17} color={colors.mutedForeground} />
        <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Sign out</Text>
      </TouchableOpacity>
      {confirmationDialog}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 28 },
  avatarWrap: { alignItems: "center", marginVertical: 20 },
  avatar: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 28 },
  avatarName: { fontFamily: "Nunito_700Bold", fontSize: 19, marginTop: 10 },
  handle: { fontFamily: "Nunito_400Regular", fontSize: 14, marginTop: 1 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 19, marginTop: 20, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 17, padding: 16 },
  membershipHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  smallText: { fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 18 },
  divider: { height: 1, marginVertical: 14 },
  pending: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 12 },
  pendingText: { color: "#7A5200", fontFamily: "Nunito_600SemiBold", fontSize: 13 },
  secondaryButton: { minHeight: 44, borderWidth: 1, borderRadius: 12, marginTop: 14, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  secondaryButtonText: { fontFamily: "Nunito_700Bold", fontSize: 13, textAlign: "center" },
  label: { fontFamily: "Nunito_600SemiBold", fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontFamily: "Nunito_400Regular", fontSize: 15 },
  bio: { minHeight: 78, paddingTop: 11, textAlignVertical: "top" },
  error: { color: "#B42318", fontFamily: "Nunito_600SemiBold", fontSize: 13, marginTop: 10 },
  primaryButton: { minHeight: 48, borderRadius: 13, marginTop: 16, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  modeRow: { minHeight: 66, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  signOut: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 20, marginTop: 8 },
  signOutText: { fontFamily: "Nunito_600SemiBold", fontSize: 14 },
});
