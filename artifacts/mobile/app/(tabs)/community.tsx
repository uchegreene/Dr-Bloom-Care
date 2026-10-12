import React, { useState } from "react";
import { FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  useListAdvice,
  useListCommunityPosts,
  useToggleCommunityLike,
  type CommunityPost,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { POLL_MS, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { Empty, ErrorBox, Notice, SkeletonRows, VerifiedBadge } from "@/components/MedicalUi";

const FILTERS = ["All", "Journey", "Advice", "Health"];

function PostCard({ post, canInteract, onLike, liking }: { post: CommunityPost; canInteract: boolean; onLike: () => void; liking: boolean }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${post.id}` as Href)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{post.authorName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.author, { color: colors.foreground }]}>{post.authorName}</Text>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>
            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
          </Text>
        </View>
        {post.tag ? (
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{post.tag}</Text>
          </View>
        ) : null}
      </View>
      {post.text ? <Text style={[styles.body, { color: colors.foreground }]}>{post.text}</Text> : null}
      {post.imageUri ? <Image source={{ uri: post.imageUri }} style={styles.image} contentFit="cover" /> : null}
      {post.taggedAdvisors.length > 0 ? (
        <View style={styles.taggedRow}>
          <Feather name="at-sign" size={13} color={colors.mutedForeground} />
          {post.taggedAdvisors.map((a) => (
            <View key={a.id} style={[styles.taggedChip, { borderColor: colors.border }]}>
              <Text style={[styles.taggedText, { color: colors.foreground }]}>{a.name}</Text>
              {a.isVerified ? <VerifiedBadge /> : null}
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        {canInteract ? <TouchableOpacity onPress={onLike} disabled={liking} style={styles.action} hitSlop={8} accessibilityLabel="Like">
          <Feather name="heart" size={18} color={post.liked ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{post.likes}</Text>
        </TouchableOpacity> : <Text style={[styles.muted, { color: colors.mutedForeground }]}>{post.likes} likes</Text>}
        <View style={styles.action}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{post.comments.length}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { userId, ready, isPaid, isStaff } = useMedicalAccess();
  const canInteract = ready && isPaid;
  const [segment, setSegment] = useState<"posts" | "advice">("posts");
  const [filter, setFilter] = useState("All");
  const [notice, setNotice] = useState("");

  const posts = useListCommunityPosts({
    query: { queryKey: ["community", "posts", userId], enabled: ready, refetchInterval: POLL_MS },
  });
  const advice = useListAdvice({ query: { queryKey: ["advice", userId], enabled: ready, refetchInterval: POLL_MS } });
  const like = useToggleCommunityLike();

  const toggleLike = async (id: number) => {
    try {
      await like.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ["community"] });
    } catch {
      setNotice("Could not update your like. Try again.");
    }
  };

  const top = Platform.OS === "web" ? 67 : insets.top;
  const list = (posts.data ?? []).filter((p) => filter === "All" || p.tag === filter);
  const active = segment === "posts" ? posts : advice;

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
        {isStaff ? (
          <TouchableOpacity onPress={() => router.push("/medical-team" as Href)} style={[styles.pill, { backgroundColor: colors.secondary }]}>
            <Feather name="inbox" size={15} color={colors.primary} />
            <Text style={[styles.pillText, { color: colors.primary }]}>Team inbox</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={[styles.segment, { backgroundColor: colors.muted }]}>
        {(["posts", "advice"] as const).map((k) => (
          <TouchableOpacity key={k} onPress={() => setSegment(k)} style={[styles.segBtn, segment === k && { backgroundColor: colors.card }]}>
            <Text style={[styles.segText, { color: segment === k ? colors.foreground : colors.mutedForeground }]}>
              {k === "posts" ? "Member posts" : "Professional advice"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!canInteract && ready && !isStaff ? (
        <View style={{ marginBottom: 12 }}>
          <Notice icon="lock">
            Free accounts can read posts and advice. An active plan lets you post, comment, like, tag a verified care professional and message the care team.
          </Notice>
        </View>
      ) : null}
      {notice ? <Text style={[styles.err, { color: colors.destructive }]}>{notice}</Text> : null}
      {segment === "posts" ? (
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: filter === f ? colors.primary : colors.card, borderColor: filter === f ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipText, { color: filter === f ? colors.primaryForeground : colors.foreground }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (active.isLoading) body = <SkeletonRows />;
  else if (active.error) body = <ErrorBox message="Could not load this feed." onRetry={() => active.refetch()} />;

  return (
    <View style={[styles.page, { backgroundColor: colors.background, paddingTop: top }]}>
      {segment === "posts" ? (
        <FlatList
          data={body ? [] : list}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={posts.isRefetching} onRefresh={() => posts.refetch()} tintColor={colors.primary} />}
          ListHeaderComponent={header}
          ListEmptyComponent={body ?? <Empty icon="users" title="No posts yet" body={canInteract ? "Start the conversation." : "Members' posts will appear here."} />}
          renderItem={({ item }) => (
            <PostCard post={item} canInteract={canInteract} liking={like.isPending} onLike={() => toggleLike(item.id)} />
          )}
        />
      ) : (
        <FlatList
          data={body ? [] : advice.data ?? []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={advice.isRefetching} onRefresh={() => advice.refetch()} tintColor={colors.primary} />}
          ListHeaderComponent={header}
          ListEmptyComponent={body ?? <Empty icon="book-open" title="No advice yet" body="Verified professionals publish here." />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{item.category}</Text>
              </View>
              <Text style={[styles.adviceTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.body, { color: colors.foreground }]}>{item.body}</Text>
              <View style={[styles.row, { marginTop: 12 }]}>
                <Text style={[styles.author, { color: colors.foreground }]}>{item.authorName}</Text>
                {item.isVerified ? <VerifiedBadge label="Verified" /> : null}
              </View>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{item.credentials}</Text>
            </View>
          )}
        />
      )}
      {canInteract ? (
        <TouchableOpacity
          onPress={() => router.push("/post-create" as Href)}
          accessibilityLabel="Write a post"
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Feather name="edit-2" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 18, paddingBottom: 120 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 28 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  segText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13 },
  err: { fontFamily: "Nunito_700Bold", fontSize: 13, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  author: { fontFamily: "Nunito_700Bold", fontSize: 14.5 },
  muted: { fontFamily: "Nunito_400Regular", fontSize: 12.5 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  body: { fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22, marginTop: 12 },
  adviceTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, marginTop: 8 },
  image: { width: "100%", height: 210, borderRadius: 14, marginTop: 12 },
  taggedRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 12 },
  taggedChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 },
  taggedText: { fontFamily: "Nunito_600SemiBold", fontSize: 12 },
  actions: { flexDirection: "row", gap: 22, marginTop: 14 },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4 },
});
