import React, { useEffect, useRef, useState } from "react";
import { Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  useListDailyTipDevices, useListDailyTipNotices, useListDailyTips, useReadDailyTipNotices,
  useRemoveDailyTipDevice, useSetDailyTipDevice, useReviewDailyTip, type DailyTip,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useConfirmation } from "@/hooks/useConfirmation";
import { errorMessage } from "@/hooks/useMedicalAccess";
import { getProjectId, registerForTipPush, TIP_POLL_MS, useTipDeviceId, useTipEligibility } from "@/hooks/useDailyTips";
import { Empty, ErrorBox, Notice, ScreenHeader, SkeletonRows } from "@/components/MedicalUi";

export default function DailyTipsScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm, confirmationDialog } = useConfirmation();
  const { profile, loading, eligible, userId } = useTipEligibility();
  const deviceId = useTipDeviceId();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const [msg, setMsg] = useState("");

  const tips = useListDailyTips({ query: { queryKey: ["daily-tips", "list", userId], enabled: eligible, refetchInterval: TIP_POLL_MS } });
  const notices = useListDailyTipNotices({ query: { queryKey: ["daily-tips", "notices", userId], enabled: eligible, refetchInterval: TIP_POLL_MS } });
  const devices = useListDailyTipDevices({ query: { queryKey: ["daily-tips", "devices", userId], enabled: eligible } });
  const readMut = useReadDailyTipNotices();
  const setDevice = useSetDailyTipDevice();
  const removeDevice = useRemoveDailyTipDevice();
  const reviewMut = useReviewDailyTip();

  const unreadIds = new Set((notices.data ?? []).filter((n) => n.readAt == null).map((n) => n.tip.id));
  const unreadCount = (notices.data ?? []).filter((n) => n.readAt == null).length;
  const readRef = useRef(readMut.mutateAsync);
  readRef.current = readMut.mutateAsync;
  const marking = useRef(false);
  useEffect(() => {
    if (!eligible || unreadCount === 0 || marking.current) return;
    marking.current = true;
    readRef.current()
      .then(() => qc.invalidateQueries({ queryKey: ["daily-tips", "notices"] }))
      .catch(() => undefined)
      .finally(() => { marking.current = false; });
  }, [eligible, unreadCount, qc]);

  const top = Platform.OS === "web" ? 0 : 0;
  const enabled = Boolean(deviceId && devices.data?.some((d) => d.id === deviceId && d.enabled));
  const projectId = getProjectId();
  const nativeOk = Platform.OS !== "web";

  const togglePush = async () => {
    if (!deviceId || pushBusy) return;
    setPushBusy(true); setPushError(""); setMsg("");
    try {
      if (enabled) {
        await removeDevice.mutateAsync({ deviceId });
        setMsg("Phone notifications are off for this device.");
      } else {
        const token = await registerForTipPush();
        await setDevice.mutateAsync({ data: { deviceId, enabled: true, token } });
        setMsg("This device is registered for daily tip notifications. Registered is not the same as delivered; delivery depends on your phone and app build settings.");
      }
      await qc.invalidateQueries({ queryKey: ["daily-tips", "devices"] });
    } catch (e) {
      setPushError(errorMessage(e, "Could not update notifications."));
    } finally { setPushBusy(false); }
  };

  const withdraw = async (tip: DailyTip) => {
    const ok = await confirm("Withdraw this tip?", "It will be removed from the member feed.", "Withdraw", "Keep");
    if (!ok) return;
    try {
      await reviewMut.mutateAsync({ id: tip.id, data: { action: "reject" } });
      await qc.invalidateQueries({ queryKey: ["daily-tips"] });
    } catch (e) { setMsg(errorMessage(e)); }
  };

  if (loading) return <View style={[s.page, { backgroundColor: colors.background }]}><Stack.Screen options={{ headerShown: false }} /><ScreenHeader title="Daily health education" /><SkeletonRows /></View>;

  const plan = profile?.subscriptionPlan === "pregnancy" ? "Pregnancy" : "Cycle";
  return (
    <View style={[s.page, { backgroundColor: colors.background, paddingTop: top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Daily health education" subtitle={eligible ? `${plan} plan` : "Plan members"} />
      {!eligible ? (
        <ScrollView contentContainerStyle={s.content}>
          <Empty icon="lock" title="Daily tips are for plan members" body="An active cycle or pregnancy plan unlocks a short AI-generated health education note every morning." />
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile" as Href)} style={[s.btn, { backgroundColor: colors.primary }]}>
            <Text style={[s.btnText, { color: colors.primaryForeground }]}>See plans in Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={tips.isRefetching} onRefresh={() => { tips.refetch(); notices.refetch(); }} tintColor={colors.primary} />}
        >
          <Notice icon="info">
            Tips are AI-generated education and shared with all members on your plan. A named reviewer from the care team approves each one before it is published. General information only, not a diagnosis or prescription.
          </Notice>

          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
            <View style={s.row}>
              <Feather name="bell" size={18} color={colors.primary} />
              <Text style={[s.h, { color: colors.foreground, flex: 1 }]}>Phone notifications</Text>
            </View>
            {Platform.OS !== "web" && /permission|settings/i.test(pushError) ? (
              <TouchableOpacity onPress={() => Linking.openSettings().catch(() => setPushError("Could not open device settings."))}>
                <Text style={[s.sm, { color: colors.primary }]}>Open device settings</Text>
              </TouchableOpacity>
            ) : null}
            {!nativeOk ? (
              <Text style={[s.sm, { color: colors.mutedForeground }]}>On the web you see new tips here in the app. Background push is not available on web.</Text>
            ) : !projectId ? (
              <Text style={[s.sm, { color: colors.mutedForeground }]}>Phone alerts require a native build with push configured through Replit Launch. They are not available in this preview or Expo Go. New tips still appear here.</Text>
            ) : (
              <>
                <Text style={[s.sm, { color: colors.mutedForeground }]}>
                  A generic alert on new tips only; no health details appear on your lock screen. Enabled means registered, not guaranteed delivered.
                </Text>
                <TouchableOpacity onPress={togglePush} disabled={pushBusy || !deviceId || devices.isLoading} style={[s.btn, { backgroundColor: enabled ? colors.secondary : colors.primary, opacity: pushBusy ? 0.6 : 1 }]}>
                  <Text style={[s.btnText, { color: enabled ? colors.primary : colors.primaryForeground }]}>
                    {pushBusy ? "Working..." : enabled ? "Turn off on this device" : "Turn on for this device"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {pushError ? <Text style={[s.sm, { color: colors.destructive, fontFamily: "Nunito_700Bold" }]}>{pushError}</Text> : null}
            {devices.error ? <Text style={[s.sm, { color: colors.destructive }]}>Could not load notification status.</Text> : null}
          </View>
          {msg ? <Text style={[s.sm, { color: colors.primary, marginTop: 10 }]}>{msg}</Text> : null}

          <Text style={[s.h, { color: colors.foreground, marginTop: 22, marginBottom: 10 }]}>Published tips</Text>
          {tips.isLoading ? <SkeletonRows /> : tips.error ? (
            <ErrorBox message="Could not load daily tips." onRetry={() => tips.refetch()} />
          ) : (tips.data ?? []).length === 0 ? (
            <Empty icon="sun" title="No tips yet" body="New tips appear after review, around 9:00 AM Nigeria time." />
          ) : (
            [...(tips.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)).map((t) => (
              <View key={t.id} style={[s.card, { backgroundColor: colors.card, borderColor: unreadIds.has(t.id) ? colors.primary : colors.border, marginBottom: 12 }]}>
                <View style={s.row}>
                  <Text style={[s.date, { color: colors.primary }]}>{format(new Date(`${t.date}T12:00:00`), "EEEE d MMMM")}</Text>
                  {unreadIds.has(t.id) ? <View style={[s.dot, { backgroundColor: colors.primary }]} /> : null}
                </View>
                <Text style={[s.title, { color: colors.foreground }]}>{t.title}</Text>
                <Text style={[s.body, { color: colors.foreground }]}>{t.body}</Text>
                <Text style={[s.sm, { color: colors.mutedForeground, marginTop: 10 }]}>
                  AI-generated education ({t.model}).{t.reviewerName ? ` Reviewed by ${t.reviewerName}.` : ""}
                </Text>
                {profile?.role === "admin" || profile?.role === "medical_team" ? (
                  <TouchableOpacity onPress={() => withdraw(t)} disabled={reviewMut.isPending} style={{ marginTop: 8 }}>
                    <Text style={[s.sm, { color: colors.destructive, fontFamily: "Nunito_700Bold" }]}>Withdraw from feed</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
      {confirmationDialog}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 18, paddingBottom: 60 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  h: { fontFamily: "Nunito_700Bold", fontSize: 17 },
  sm: { fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 19 },
  date: { fontFamily: "Nunito_700Bold", fontSize: 12.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 18 },
  body: { fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22 },
  btn: { minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 8 },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 14 },
});
