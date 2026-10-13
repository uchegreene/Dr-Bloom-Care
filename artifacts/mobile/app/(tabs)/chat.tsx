import React, { useState } from "react";
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  useListAdvisors,
  useListMedicalConversations,
  useStartMedicalConversation,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { POLL_MS, errorMessage, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { Empty, ErrorBox, Notice, SkeletonRows, TEAM_DISCLOSURE, VerifiedBadge } from "@/components/MedicalUi";

export default function ChatTab() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { userId, ready, canInteract, isStaff } = useMedicalAccess();
  const [view, setView] = useState<"chats" | "team">("chats");
  const [advisorId, setAdvisorId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [first, setFirst] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const enabled = ready && canInteract;
  const convos = useListMedicalConversations({
    query: { queryKey: ["medical", "conversations", userId], enabled, refetchInterval: POLL_MS },
  });
  const advisors = useListAdvisors({ query: { queryKey: ["advisors", userId], enabled: enabled && !isStaff } });
  const start = useStartMedicalConversation();
  const top = Platform.OS === "web" ? 67 : insets.top;
  const selected = advisors.data?.find((a) => a.id === advisorId);

  const begin = async () => {
    setError("");
    if (!advisorId) return setError("Choose a medical profile.");
    if (topic.trim().length < 3) return setError("Give the topic a short title (3+ characters).");
    if (!first.trim()) return setError("Write your first message.");
    if (!agreed) return setError("Please confirm you understand who can see this conversation.");
    try {
      const c = await start.mutateAsync({ data: { advisorId, topic: topic.trim(), firstMessage: first.trim() } });
      await qc.invalidateQueries({ queryKey: ["medical"] });
      setTopic("");
      setFirst("");
      setAgreed(false);
      setAdvisorId(null);
      setView("chats");
      router.push(`/chat/${c.id}` as Href);
    } catch (e) {
      setError(errorMessage(e, "Could not start the conversation."));
    }
  };

  if (ready && !canInteract) return (
    <View style={[styles.page, { backgroundColor: colors.background, paddingTop: top }]}>
      <View style={styles.titleRow}><Text style={[styles.title, { color: colors.foreground }]}>Chat</Text></View>
      <View style={{ padding: 18, gap: 18 }}>
        <Notice icon="lock">Chat has not been removed. An active subscription lets you send private questions to the medical team. Existing conversations remain saved when your subscription expires.</Notice>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>View subscription plans</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/community-demo?tab=chat" as Href)} style={styles.pill}>
          <Text style={[styles.pillText, { color: colors.primary }]}>Try sample chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const list = (
    <FlatList
      data={convos.error || !enabled ? [] : convos.data ?? []}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ padding: 18, paddingBottom: 60, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={convos.isRefetching} onRefresh={() => convos.refetch()} tintColor={colors.primary} />}
      ListEmptyComponent={
        convos.isLoading ? <SkeletonRows /> : convos.error ? <ErrorBox message="Could not load conversations." onRetry={() => convos.refetch()} /> : (
          <Empty icon="message-circle" title={isStaff ? "Inbox is clear" : "No conversations yet"} body={isStaff ? "Member messages to the team appear here for everyone on the team." : "Pick a medical profile and start a private topic."} />
        )
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/chat/${item.id}` as Href)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.topic, { color: colors.foreground }]} numberOfLines={1}>{item.topic}</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]} numberOfLines={1}>
              {isStaff ? `@${item.memberUsername} to ` : "With "}{item.advisorName} · {item.advisorSpecialty}
            </Text>
            <Text style={[styles.last, { color: colors.foreground }]} numberOfLines={2}>{item.lastMessage}</Text>
          </View>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{formatDistanceToNow(new Date(item.updatedAt), { addSuffix: false })}</Text>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background, paddingTop: top }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>{isStaff ? "Team inbox" : "Care team"}</Text>
        {isStaff ? (
          <TouchableOpacity onPress={() => router.push("/medical-team" as Href)} style={[styles.pill, { backgroundColor: colors.secondary }]}>
            <Feather name="help-circle" size={15} color={colors.primary} />
            <Text style={[styles.pillText, { color: colors.primary }]}>Tagged posts</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 18 }}>
        <Notice icon="shield">{TEAM_DISCLOSURE}</Notice>
        {!isStaff ? (
          <View style={[styles.segment, { backgroundColor: colors.muted }]}>
            {([["chats", "My conversations"], ["team", "Start a topic"]] as const).map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setView(k)} style={[styles.segBtn, view === k && { backgroundColor: colors.card }]}>
                <Text style={[styles.segText, { color: view === k ? colors.foreground : colors.mutedForeground }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
      {view === "chats" || isStaff ? (
        list
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.foreground }]}>Who would you like to ask?</Text>
          {advisors.isLoading ? <SkeletonRows count={2} /> : null}
          {advisors.error ? <ErrorBox message="Could not load profiles." onRetry={() => advisors.refetch()} /> : null}
          {(advisors.data ?? []).map((a) => {
            const on = a.id === advisorId;
            return (
              <TouchableOpacity key={a.id} onPress={() => setAdvisorId(a.id)} style={[styles.card, { backgroundColor: on ? colors.secondary : colors.card, borderColor: on ? colors.primary : colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.inline}>
                    <Text style={[styles.topic, { color: colors.foreground }]}>{a.name}</Text>
                    {a.isVerified ? <VerifiedBadge label="Verified" /> : null}
                  </View>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{a.title} · {a.specialty}</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{a.credentials}</Text>
                  <Text style={[styles.last, { color: colors.foreground }]} numberOfLines={on ? undefined : 2}>{a.bio}</Text>
                </View>
                <Feather name={on ? "check-circle" : "circle"} size={20} color={on ? colors.primary : colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
          {!advisors.isLoading && (advisors.data?.length ?? 0) === 0 && !advisors.error ? (
            <Empty icon="user-x" title="No profiles available" body="Verified medical profiles will appear here." />
          ) : null}
          <Text style={[styles.label, { color: colors.foreground }]}>Topic</Text>
          <TextInput value={topic} onChangeText={setTopic} maxLength={180} placeholder="e.g. Irregular cycles after stopping the pill" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
          <Text style={[styles.label, { color: colors.foreground }]}>Your message</Text>
          <TextInput value={first} onChangeText={setFirst} maxLength={6000} multiline placeholder="Describe what is happening…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { minHeight: 110, textAlignVertical: "top", color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
          <TouchableOpacity onPress={() => setAgreed((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} style={styles.check}>
            <Feather name={agreed ? "check-square" : "square"} size={20} color={colors.primary} />
            <Text style={[styles.muted, { flex: 1, color: colors.foreground, lineHeight: 18 }]}>
              I understand the whole medical team can read this conversation, a team member may reply
              {selected ? ` under their own profile rather than ${selected.name}'s` : " under their own profile"}, and Bloom is not an emergency service.
            </Text>
          </TouchableOpacity>
          {error ? <Text style={[styles.err, { color: colors.destructive }]}>{error}</Text> : null}
          <TouchableOpacity onPress={begin} disabled={start.isPending} style={[styles.btn, { backgroundColor: colors.primary, opacity: start.isPending ? 0.6 : 1 }]}>
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{start.isPending ? "Sending…" : "Send privately"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 28 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, marginTop: 12 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  segText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  card: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  topic: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  muted: { fontFamily: "Nunito_400Regular", fontSize: 12.5 },
  last: { fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 20, marginTop: 6 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, marginTop: 14, marginBottom: 10 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Nunito_400Regular", fontSize: 15 },
  check: { flexDirection: "row", gap: 10, marginTop: 16, alignItems: "flex-start" },
  err: { fontFamily: "Nunito_700Bold", fontSize: 13, marginTop: 12 },
  btn: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 16 },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 15 },
});
