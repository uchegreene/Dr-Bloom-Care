import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  useListAdvisors,
  useListMedicalConversations,
  useListMedicalMessages,
  useSendMedicalMessage,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { POLL_MS, errorMessage, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { Composer, Empty, ErrorBox, Notice, ResponderPicker, ScreenHeader, SkeletonRows, TEAM_DISCLOSURE, VerifiedBadge } from "@/components/MedicalUi";

export default function ChatDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { userId, ready, canInteract, isAdmin, isStaff, ownAdvisorId } = useMedicalAccess();
  const enabled = ready && canInteract && Number.isFinite(id);
  const convos = useListMedicalConversations({ query: { queryKey: ["medical", "conversations", userId], enabled, refetchInterval: POLL_MS } });
  const messages = useListMedicalMessages(id, { query: { queryKey: ["medical", "messages", userId, id], enabled, refetchInterval: POLL_MS } });
  const advisors = useListAdvisors({ query: { queryKey: ["advisors", userId], enabled: enabled && isStaff } });
  const send = useSendMedicalMessage();
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [error, setError] = useState("");

  const convo = canInteract && !convos.error ? convos.data?.find((c) => c.id === id) : undefined;
  const responder = isAdmin ? chosen ?? convo?.advisorId ?? advisors.data?.[0]?.id ?? null : ownAdvisorId;
  const ownName = isStaff && !isAdmin ? advisors.data?.find((a) => a.id === ownAdvisorId)?.name : undefined;

  const submit = async () => {
    setError("");
    if (isStaff && !responder) return setError("Choose a verified profile to respond as.");
    try {
      await send.mutateAsync({ id, data: { text: text.trim(), ...(isStaff ? { advisorId: responder } : {}) } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["medical"] });
    } catch (e) {
      setError(errorMessage(e, "Could not send your message."));
    }
  };

  const data = [...(messages.data ?? [])].reverse();

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <ScreenHeader
        title={convo?.topic ?? "Conversation"}
        subtitle={convo ? (isStaff ? `@${convo.memberUsername} · asked ${convo.advisorName}` : `${convo.advisorName} · ${convo.advisorSpecialty}`) : undefined}
      />
      {!canInteract ? <Notice icon="lock">Private messages need an active plan.</Notice> : null}
      {messages.isLoading ? <SkeletonRows count={3} /> : null}
      {messages.error ? <ErrorBox message="Could not load messages." onRetry={() => messages.refetch()} /> : null}
      {messages.data && canInteract && !messages.error ? (
        <FlatList
          inverted
          data={data}
          keyExtractor={(m) => String(m.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }] }}><Empty icon="message-circle" title="No messages yet" /></View>}
          ListFooterComponent={<View style={{ marginBottom: 6 }}><Notice icon="shield">{TEAM_DISCLOSURE}</Notice></View>}
          renderItem={({ item }) => {
            const mine = isStaff ? !item.fromMember : item.fromMember;
            return (
              <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                <View style={[styles.bubble, { backgroundColor: mine ? colors.primary : colors.card, borderColor: mine ? colors.primary : colors.border }]}>
                  {!item.fromMember ? (
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: mine ? colors.primaryForeground : colors.foreground }]}>{item.authorName}</Text>
                      {item.isVerified ? <VerifiedBadge label={mine ? undefined : "Verified"} /> : null}
                    </View>
                  ) : isStaff ? (
                    <Text style={[styles.name, { color: colors.foreground }]}>{item.authorName}</Text>
                  ) : null}
                  <Text style={[styles.msg, { color: mine ? colors.primaryForeground : colors.foreground }]}>{item.text}</Text>
                  <Text style={[styles.time, { color: mine ? colors.primaryForeground : colors.mutedForeground }]}>{format(new Date(item.timestamp), "d MMM, HH:mm")}</Text>
                </View>
              </View>
            );
          }}
        />
      ) : null}
      {messages.data && canInteract && !messages.error ? (
        <View>
          {isStaff ? <ResponderPicker isAdmin={isAdmin} advisors={advisors.data ?? []} value={responder} onChange={setChosen} ownName={ownName} /> : null}
          {error ? <Text style={[styles.err, { color: colors.destructive }]}>{error}</Text> : null}
          <Composer value={text} onChange={setText} onSend={submit} pending={send.isPending} placeholder="Write a message…" bottomInset={Platform.OS === "web" ? 24 : insets.bottom} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bubble: { maxWidth: "84%", borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontFamily: "Nunito_700Bold", fontSize: 12.5, marginBottom: 2 },
  msg: { fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 21 },
  time: { fontFamily: "Nunito_400Regular", fontSize: 11, marginTop: 4, opacity: 0.75 },
  err: { fontFamily: "Nunito_700Bold", fontSize: 13, paddingHorizontal: 16, paddingTop: 6 },
});
