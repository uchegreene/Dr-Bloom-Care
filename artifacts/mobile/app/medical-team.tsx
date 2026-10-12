import React, { useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Redirect, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  useCreateCommunityComment,
  useListAdvisors,
  useListMedicalQuestions,
  usePublishMedicalAdvice,
  type CommunityPost,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { POLL_MS, errorMessage, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { Empty, ErrorBox, Notice, ResponderPicker, ScreenHeader, SkeletonRows, VerifiedBadge } from "@/components/MedicalUi";

const CATEGORIES = ["Cycle health", "Pregnancy", "Sexual health", "Newborn care", "General"] as const;

function Question({ post, responder, isStaffAdmin }: { post: CommunityPost; responder: number | null; isStaffAdmin: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const comment = useCreateCommunityComment();
  const [reply, setReply] = useState("");
  const [err, setErr] = useState("");
  const answered = post.comments.some((c) => c.isVerified);
  const send = async () => {
    setErr("");
    if (!responder) return setErr(isStaffAdmin ? "Choose a profile to respond as above." : "Your account has no verified profile assigned.");
    try {
      await comment.mutateAsync({ id: post.id, data: { text: reply.trim(), advisorId: responder } });
      setReply("");
      await qc.invalidateQueries({ queryKey: ["community"] });
    } catch (e) {
      setErr(errorMessage(e, "Could not post your answer."));
    }
  };
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.bold, { color: colors.foreground }]}>{post.authorName}</Text>
        <View style={[styles.status, { backgroundColor: answered ? colors.secondary : colors.muted }]}>
          <Text style={[styles.statusText, { color: answered ? colors.primary : colors.mutedForeground }]}>{answered ? "Answered" : "Awaiting answer"}</Text>
        </View>
      </View>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>
        {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })} · tagged {post.taggedAdvisors.map((a) => a.name).join(", ") || "no one"}
      </Text>
      <Text style={[styles.body, { color: colors.foreground }]}>{post.text}</Text>
      {post.comments.filter((c) => c.isVerified).map((c) => (
        <View key={c.id} style={[styles.answer, { backgroundColor: colors.secondary }]}>
          <View style={styles.inline}>
            <Text style={[styles.bold, { color: colors.foreground, fontSize: 13 }]}>{c.authorName}</Text>
            <VerifiedBadge />
          </View>
          <Text style={[styles.muted, { color: colors.foreground, marginTop: 3 }]}>{c.text}</Text>
        </View>
      ))}
      <TextInput value={reply} onChangeText={setReply} multiline maxLength={6000} placeholder="Answer under your verified profile…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
      {err ? <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text> : null}
      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <TouchableOpacity onPress={() => router.push(`/post/${post.id}` as Href)} style={styles.inline}>
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>Open post</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={send} disabled={comment.isPending || !reply.trim()} style={[styles.btn, { backgroundColor: colors.primary, opacity: comment.isPending || !reply.trim() ? 0.5 : 1 }]}>
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{comment.isPending ? "Sending…" : "Answer"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MedicalTeamScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { userId, ready, isStaff, isAdmin, ownAdvisorId } = useMedicalAccess();
  const questions = useListMedicalQuestions({ query: { queryKey: ["community", "questions", userId], enabled: ready && isStaff, refetchInterval: POLL_MS } });
  const advisors = useListAdvisors({ query: { queryKey: ["advisors", userId], enabled: ready && isStaff } });
  const publish = usePublishMedicalAdvice();
  const [tab, setTab] = useState<"questions" | "advice">("questions");
  const [chosen, setChosen] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("General");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  if (!ready) return null;
  if (!isStaff) return <Redirect href="/(tabs)/community" />;

  const responder = isAdmin ? chosen ?? advisors.data?.[0]?.id ?? null : ownAdvisorId;
  const ownName = advisors.data?.find((a) => a.id === ownAdvisorId)?.name;

  const doPublish = async () => {
    setMsg("");
    setIsError(false);
    if (!responder) { setIsError(true); return setMsg("Choose a verified profile."); }
    if (title.trim().length < 5 || body.trim().length < 20) { setIsError(true); return setMsg("Title needs 5+ characters and advice 20+."); }
    try {
      await publish.mutateAsync({ data: { advisorId: responder, title: title.trim(), body: body.trim(), category } });
      setTitle(""); setBody("");
      setMsg("Advice published under the selected verified profile.");
      await qc.invalidateQueries({ queryKey: ["advice"] });
    } catch (e) {
      setIsError(true);
      setMsg(errorMessage(e, "Could not publish advice."));
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Medical team"
        subtitle={isAdmin ? "Admin view" : ownName ? `Responding as ${ownName}` : undefined}
        right={
          <TouchableOpacity onPress={() => router.push("/(tabs)/chat" as Href)} accessibilityLabel="Open shared inbox">
            <Feather name="inbox" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: Platform.OS === "web" ? 70 : 50 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={questions.isRefetching} onRefresh={() => questions.refetch()} tintColor={colors.primary} />}
      >
        <Notice icon="users">Tagged questions are shared by the whole team. Your answers always appear under your own verified profile, never as the profile the member tagged.</Notice>
        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          {([["questions", "Tagged questions"], ["advice", "Publish advice"]] as const).map(([k, l]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && { backgroundColor: colors.card }]}>
              <Text style={[styles.segText, { color: tab === k ? colors.foreground : colors.mutedForeground }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {isAdmin ? <View style={{ marginHorizontal: -14, marginBottom: 12 }}><ResponderPicker isAdmin advisors={advisors.data ?? []} value={responder} onChange={setChosen} /></View> : null}
        {tab === "questions" ? (
          questions.isLoading ? <SkeletonRows /> : questions.error ? <ErrorBox message="Could not load tagged questions." onRetry={() => questions.refetch()} /> :
          (questions.data?.length ?? 0) === 0 ? <Empty icon="inbox" title="No tagged questions" body="Posts where members tag a verified profile show up here." /> :
          questions.data!.map((p) => <Question key={p.id} post={p} responder={responder} isStaffAdmin={isAdmin} />)
        ) : (
          <View>
            {!isAdmin ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>Publishing as {ownName ?? "your assigned profile"}.</Text> : null}
            <TextInput value={title} onChangeText={setTitle} maxLength={180} placeholder="Advice title" placeholderTextColor={colors.mutedForeground} style={[styles.input, { marginTop: 10, color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
            <TextInput value={body} onChangeText={setBody} maxLength={6000} multiline placeholder="Write advice for members…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { minHeight: 140, color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 12, color: category === c ? colors.primaryForeground : colors.foreground }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {msg ? <Text style={[styles.err, { color: isError ? colors.destructive : colors.primary }]}>{msg}</Text> : null}
            <TouchableOpacity onPress={doPublish} disabled={publish.isPending} style={[styles.btn, { backgroundColor: colors.primary, marginTop: 14, minHeight: 46, opacity: publish.isPending ? 0.6 : 1 }]}>
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{publish.isPending ? "Publishing…" : "Publish advice"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, marginVertical: 14 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  segText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  bold: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  muted: { fontFamily: "Nunito_400Regular", fontSize: 12.5, lineHeight: 18 },
  body: { fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22, marginVertical: 10 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontFamily: "Nunito_700Bold", fontSize: 11.5 },
  answer: { borderRadius: 10, padding: 10, marginBottom: 8 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Nunito_400Regular", fontSize: 14.5, marginBottom: 10, textAlignVertical: "top" },
  err: { fontFamily: "Nunito_700Bold", fontSize: 13, marginTop: 6 },
  btn: { minHeight: 38, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
});
