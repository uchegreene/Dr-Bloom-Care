import React, { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  useCreateCommunityComment,
  useGetCommunityPost,
  useListAdvisors,
  useToggleCommunityLike,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { POLL_MS, errorMessage, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { Composer, ErrorBox, Notice, ResponderPicker, ScreenHeader, SkeletonRows, VerifiedBadge } from "@/components/MedicalUi";

export default function PostDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { userId, ready, canInteract, isPaid, isAdmin, isStaff, ownAdvisorId } = useMedicalAccess();
  const post = useGetCommunityPost(id, {
    query: { queryKey: ["community", "post", userId, id], enabled: ready && Number.isFinite(id), refetchInterval: POLL_MS },
  });
  const advisors = useListAdvisors({ query: { queryKey: ["advisors", userId], enabled: ready && isStaff } });
  const comment = useCreateCommunityComment();
  const like = useToggleCommunityLike();
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [error, setError] = useState("");

  const data = post.data;
  const responder = isAdmin ? chosen ?? data?.taggedAdvisors[0]?.id ?? advisors.data?.[0]?.id ?? null : ownAdvisorId;

  const send = async () => {
    setError("");
    if (isStaff && !responder) {
      setError("Choose a verified profile to respond as.");
      return;
    }
    try {
      await comment.mutateAsync({ id, data: { text: text.trim(), ...(isStaff ? { advisorId: responder } : {}) } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["community"] });
    } catch (e) {
      setError(errorMessage(e, "Could not post your comment."));
    }
  };

  const toggleLike = async () => {
    try {
      await like.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ["community"] });
    } catch {
      setError("Could not update your like.");
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title="Post" />
      {post.isLoading ? <SkeletonRows count={2} /> : null}
      {post.error ? <ErrorBox message="Could not load this post." onRetry={() => post.refetch()} /> : null}
      {data ? (
        <FlatList
          data={data.comments}
          keyExtractor={(c) => String(c.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 14 }}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{data.authorName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.author, { color: colors.foreground }]}>{data.authorName}</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{formatDistanceToNow(new Date(data.timestamp), { addSuffix: true })}</Text>
                </View>
                {data.tag ? <Text style={[styles.tag, { color: colors.primary, backgroundColor: colors.secondary }]}>{data.tag}</Text> : null}
              </View>
              {data.text ? <Text style={[styles.body, { color: colors.foreground }]}>{data.text}</Text> : null}
              {data.imageUri ? <Image source={{ uri: data.imageUri }} style={styles.image} contentFit="cover" /> : null}
              {data.taggedAdvisors.length > 0 ? (
                <View style={{ marginTop: 14, gap: 6 }}>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>Asked of</Text>
                  {data.taggedAdvisors.map((a) => (
                    <View key={a.id} style={[styles.tagged, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.author, { color: colors.foreground }]}>{a.name}</Text>
                        <Text style={[styles.muted, { color: colors.mutedForeground }]}>{a.title} · {a.specialty}</Text>
                      </View>
                      {a.isVerified ? <VerifiedBadge label="Verified" /> : null}
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={[styles.row, { marginTop: 14, gap: 20 }]}>
                <TouchableOpacity onPress={toggleLike} disabled={!isPaid || like.isPending} style={styles.row} hitSlop={8}>
                  <Feather name="heart" size={20} color={data.liked ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{data.likes}</Text>
                </TouchableOpacity>
                <View style={styles.row}>
                  <Feather name="message-circle" size={20} color={colors.mutedForeground} />
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{data.comments.length}</Text>
                </View>
              </View>
              {!canInteract ? (
                <View style={{ marginTop: 14 }}>
                  <Notice icon="lock">Free accounts are read-only. An active plan lets you comment and like.</Notice>
                </View>
              ) : null}
              <Text style={[styles.section, { color: colors.foreground }]}>Replies</Text>
              {data.comments.length === 0 ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>No replies yet.</Text> : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.comment, { backgroundColor: item.isVerified ? colors.secondary : colors.card, borderColor: item.isVerified ? colors.primary : colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.author, { color: colors.foreground }]}>{item.authorName}</Text>
                {item.isVerified ? <VerifiedBadge label="Verified professional" /> : null}
              </View>
              {item.credentials ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{item.credentials}</Text> : null}
              <Text style={[styles.body, { color: colors.foreground, marginTop: 8 }]}>{item.text}</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground, marginTop: 6 }]}>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</Text>
            </View>
          )}
        />
      ) : null}
      {data && canInteract ? (
        <View>
          {isStaff ? (
            <ResponderPicker isAdmin={isAdmin} advisors={advisors.data ?? []} value={responder} onChange={setChosen}
              ownName={advisors.data?.find(advisor => advisor.id === ownAdvisorId)?.name} />
          ) : null}
          {error ? <Text style={[styles.err, { color: colors.destructive }]}>{error}</Text> : null}
          <Composer value={text} onChange={setText} onSend={send} pending={comment.isPending} placeholder="Write a reply…" bottomInset={Platform.OS === "web" ? 24 : insets.bottom} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Nunito_700Bold", fontSize: 17 },
  author: { fontFamily: "Nunito_700Bold", fontSize: 14.5 },
  muted: { fontFamily: "Nunito_400Regular", fontSize: 12.5 },
  tag: { fontFamily: "Nunito_700Bold", fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: "hidden" },
  body: { fontFamily: "Nunito_400Regular", fontSize: 15.5, lineHeight: 23, marginTop: 14 },
  image: { width: "100%", height: 240, borderRadius: 14, marginTop: 14 },
  tagged: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 10 },
  section: { fontFamily: "Nunito_700Bold", fontSize: 17, marginTop: 22, marginBottom: 8 },
  comment: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  err: { fontFamily: "Nunito_700Bold", fontSize: 13, paddingHorizontal: 16, paddingTop: 6 },
});
