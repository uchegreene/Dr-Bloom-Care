import React, { useState } from "react";
import { ActivityIndicator, Linking, Platform, RefreshControl, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateDailyTipDrafts, useGetDailyTipStatus, useListDailyTipDrafts, useReviewDailyTip,
  useSetDailyTipStatus, type DailyTip,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useConfirmation } from "@/hooks/useConfirmation";
import { errorMessage, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { TIP_POLL_MS } from "@/hooks/useDailyTips";
import { useProfile } from "@/hooks/useProfileContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Empty, ErrorBox, Notice, ScreenHeader, SkeletonRows } from "@/components/MedicalUi";

type Action = "edit" | "approve" | "reject" | "retry";

export default function DailyTipReviewScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { isLoading } = useProfile();
  const { isStaff, isAdmin, ready, userId } = useMedicalAccess();
  const { confirm, confirmationDialog } = useConfirmation();
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const allowed = ready && isStaff;
  const status = useGetDailyTipStatus({ query: { queryKey: ["daily-tips", "status", userId], enabled: allowed, refetchInterval: TIP_POLL_MS } });
  const drafts = useListDailyTipDrafts({ query: { queryKey: ["daily-tips", "review", userId], enabled: allowed, refetchInterval: TIP_POLL_MS } });
  const review = useReviewDailyTip();
  const generate = useGenerateDailyTipDrafts();
  const setStatus = useSetDailyTipStatus();

  if (isLoading) return <View style={{ flex: 1, backgroundColor: colors.background }}><Stack.Screen options={{ headerShown: false }} /><SkeletonRows /></View>;
  if (!allowed) return <Redirect href="/(tabs)/profile" />;

  const refresh = () => qc.invalidateQueries({ queryKey: ["daily-tips"] });
  const canApprove = status.data?.canApprove === true;
  const paused = status.data ? !status.data.enabled : false;

  const act = async (tip: DailyTip, action: Action, extra?: { title: string; body: string }) => {
    setMsg(""); setBusyId(tip.id);
    try {
      await review.mutateAsync({ id: tip.id, data: { action, ...extra } });
      if (action === "edit") setEditId(null);
      await refresh();
      setMsg(action === "approve" ? "Approved. It publishes at 9:00 AM Nigeria time, or on the next worker minute if that has passed." : action === "edit" ? "Saved. Approval was cleared; approve again to publish." : action === "retry" ? "Retry queued." : "Rejected.");
    } catch (e) { setMsg(errorMessage(e)); } finally { setBusyId(null); }
  };

  const reject = async (tip: DailyTip) => {
    const live = tip.status === "approved" || tip.status === "published";
    const ok = await confirm(live ? "Withdraw this tip?" : "Reject this draft?", live ? "It will be removed from the member feed." : "It will not be published.", live ? "Withdraw" : "Reject", "Cancel");
    if (ok) act(tip, "reject");
  };

  const queue = async (days: 1 | 7) => {
    const ok = await confirm("Queue AI drafts?", `Generates missing shared drafts for the next ${days === 1 ? "day" : "7 days"}. This uses Replit credits.`, "Queue", "Cancel");
    if (!ok) return;
    try {
      const r = await generate.mutateAsync({ data: { days } });
      await refresh();
      setMsg(r.queued > 0 ? `${r.queued} draft${r.queued === 1 ? "" : "s"} queued. They show as queued until generated.` : "Nothing to queue; those days already have drafts.");
    } catch (e) { setMsg(errorMessage(e)); }
  };

  const togglePause = async () => {
    if (!status.data) return;
    const next = !status.data.enabled;
    const ok = await confirm(next ? "Resume automation?" : "Pause automation?", next ? "Draft generation and publishing resume." : "No new drafts will be generated and nothing publishes while paused.", next ? "Resume" : "Pause", "Cancel");
    if (!ok) return;
    try { await setStatus.mutateAsync({ data: { enabled: next } }); await refresh(); } catch (e) { setMsg(errorMessage(e)); }
  };

  const list = [...(drafts.data ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.audience.localeCompare(b.audience));
  const Btn = ({ label, onPress, solid, disabled, danger }: { label: string; onPress: () => void; solid?: boolean; disabled?: boolean; danger?: boolean }) => (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[st.btn, { backgroundColor: solid ? colors.primary : colors.secondary, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={[st.btnText, { color: solid ? colors.primaryForeground : danger ? colors.destructive : colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Daily tip review" subtitle="AI drafts, human approval" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginHorizontal: 24, marginBottom: 10 }}>
        {([["NHS pregnancy", "https://www.nhs.uk/pregnancy/"], ["NHS periods", "https://www.nhs.uk/conditions/periods/"], ["ACOG guidance", "https://www.acog.org/womens-health"]] as const).map(([label, url]) => (
          <TouchableOpacity key={url} onPress={() => Linking.openURL(url).catch(() => setMsg("Could not open this clinical reference."))}>
            <Text style={{ color: colors.primary, fontFamily: "Nunito_600SemiBold", fontSize: 12 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ padding: 18, paddingBottom: Platform.OS === "web" ? 60 : 80, gap: 12 }}
        bottomOffset={40}
        refreshControl={<RefreshControl refreshing={drafts.isRefetching} onRefresh={() => { drafts.refetch(); status.refetch(); }} tintColor={colors.primary} />}
      >
        <Notice icon="info">
          Drafts are written by {status.data?.provider ?? "Gemini"} as general education. Do not add patient details. Approval is required before {status.data?.schedule ?? "09:00 Africa/Lagos"}; a day with no approved tip sends nothing. Approving does not make AI content verified; your name is recorded as reviewer.
        </Notice>
        {status.error ? <ErrorBox message="Could not load automation status." onRetry={() => status.refetch()} /> : null}
        {status.data && !canApprove ? (
          <Notice icon="alert-triangle" tone="error">
            You cannot approve yet. Your account must be assigned to an active verified professional profile in Admin tools. Even a super administrator needs this.
          </Notice>
        ) : null}
        {paused ? <Notice icon="pause-circle" tone="error">Automation is paused. Nothing is generated or published until it is resumed.</Notice> : null}
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[st.h, { color: colors.foreground }]}>Queue missing drafts</Text>
          <View style={st.row}>
            <Btn label="Next day" onPress={() => queue(1)} disabled={generate.isPending} />
            <Btn label="Next 7 days" onPress={() => queue(7)} disabled={generate.isPending} />
            {generate.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          {isAdmin && status.data ? <Btn label={paused ? "Resume automation" : "Pause automation"} onPress={togglePause} disabled={setStatus.isPending} solid={paused} /> : null}
        </View>
        {msg ? <Text style={[st.sm, { color: colors.primary, fontFamily: "Nunito_700Bold" }]}>{msg}</Text> : null}

        {drafts.isLoading ? <SkeletonRows /> : drafts.error ? <ErrorBox message="Could not load drafts." onRetry={() => drafts.refetch()} /> : list.length === 0 ? (
          <Empty icon="file-text" title="No drafts yet" body="Queue the next day or week to start." />
        ) : list.map((t) => {
          const editing = editId === t.id;
          const locked = t.status === "queued" || t.status === "generating" || t.status === "published";
          const busy = busyId === t.id;
          return (
            <View key={t.id} style={[st.card, { backgroundColor: colors.card, borderColor: t.status === "error" ? colors.destructive : colors.border }]}>
              <Text style={[st.sm, { color: colors.primary, fontFamily: "Nunito_700Bold" }]}>{t.date} · {t.audience} · {t.status.toUpperCase()}</Text>
              {t.status === "queued" || t.status === "generating" ? (
                <Text style={[st.sm, { color: colors.mutedForeground }]}>{t.status === "queued" ? "Queued for generation." : "Generating now."}</Text>
              ) : editing ? (
                <>
                  <TextInput value={title} onChangeText={setTitle} maxLength={180} placeholder="Title" placeholderTextColor={colors.mutedForeground} style={[st.input, { color: colors.foreground, borderColor: colors.border }]} />
                  <TextInput value={body} onChangeText={setBody} maxLength={5000} multiline placeholder="Body" placeholderTextColor={colors.mutedForeground} style={[st.input, { minHeight: 140, textAlignVertical: "top", color: colors.foreground, borderColor: colors.border }]} />
                  <Text style={[st.sm, { color: colors.mutedForeground }]}>General information only. No patient names or details. Saving clears any approval.</Text>
                  <View style={st.row}>
                    <Btn label="Save edit" solid disabled={busy || !title.trim() || !body.trim()} onPress={() => act(t, "edit", { title: title.trim(), body: body.trim() })} />
                    <Btn label="Cancel" onPress={() => setEditId(null)} />
                  </View>
                </>
              ) : (
                <>
                  {t.title ? <Text style={[st.title, { color: colors.foreground }]}>{t.title}</Text> : null}
                  {t.body ? <Text style={[st.body, { color: colors.foreground }]}>{t.body}</Text> : null}
                </>
              )}
              {t.error ? <Text style={[st.sm, { color: colors.destructive }]}>{t.error}</Text> : null}
              <Text style={[st.sm, { color: colors.mutedForeground }]}>
                AI draft ({t.model || "model pending"}).{t.reviewerName ? ` Reviewer: ${t.reviewerName}.` : " No human reviewer yet."}
              </Text>
              {!editing ? (
                <View style={st.row}>
                  {t.status === "error" ? <Btn label="Retry" onPress={() => act(t, "retry")} disabled={busy} solid /> : null}
                  {!locked && t.status !== "error" ? <Btn label="Edit" onPress={() => { setEditId(t.id); setTitle(t.title); setBody(t.body); }} /> : null}
                  {(t.status === "draft" || t.status === "rejected") && t.status !== "rejected" ? <Btn label="Approve" solid disabled={busy || !canApprove} onPress={() => act(t, "approve")} /> : null}
                  {t.status === "draft" || t.status === "approved" || t.status === "published" ? <Btn label={t.status === "draft" ? "Reject" : "Withdraw"} danger disabled={busy} onPress={() => reject(t)} /> : null}
                  {busy ? <ActivityIndicator color={colors.primary} /> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </KeyboardAwareScrollViewCompat>
      {confirmationDialog}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  h: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  sm: { fontFamily: "Nunito_400Regular", fontSize: 12.5, lineHeight: 18 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 17 },
  body: { fontFamily: "Nunito_400Regular", fontSize: 14.5, lineHeight: 21 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: "Nunito_400Regular", fontSize: 15 },
  btn: { minHeight: 42, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 13.5 },
});
