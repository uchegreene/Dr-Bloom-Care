import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial, Post } from '@/hooks/useSocialContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useListAdvice } from '@workspace/api-client-react';
import { useProfile } from '@/hooks/useProfileContext';

const FILTERS = ['All', 'Journey', 'Advice', 'Health'];

function PostCard({ post, canInteract }: { post: Post; canInteract: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { likePost } = useSocial();

  const handleLike = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost(post.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${post.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {post.authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.author, { color: colors.foreground }]}>{post.authorName}</Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
          </Text>
        </View>
        {post.tag && (
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{post.tag}</Text>
          </View>
        )}
      </View>

      {post.text ? <Text style={[styles.body, { color: colors.foreground }]}>{post.text}</Text> : null}

      {post.imageUri ? (
        <Image source={{ uri: post.imageUri }} style={styles.postImage} contentFit="cover" />
      ) : null}

      <View style={styles.cardFooter}>
        {canInteract ? (
          <>
            <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.6}>
              <Feather
                name="heart"
                size={18}
                color={post.liked ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.actionText, { color: post.liked ? colors.primary : colors.mutedForeground }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.action}
              onPress={() => router.push(`/post/${post.id}`)}
              activeOpacity={0.6}
            >
              <Feather name="message-circle" size={18} color={colors.mutedForeground} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                {post.comments.length}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.likes} likes · {post.comments.length} comments
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { posts, isLoading } = useSocial();
  const { profile } = useProfile();
  const adviceQuery = useListAdvice();
  const canPublish = profile?.subscriptionActive === true;
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? posts : posts.filter(p => p.tag === filter);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 100 : insets.bottom + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
         renderItem={({ item }) => <PostCard post={item} canInteract={canPublish} />}
        contentContainerStyle={{ paddingBottom: bottomInset, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingTop: topInset + 8 }}>
            <View style={styles.bannerWrap}>
              <Image
                source={require('@/assets/images/community-banner.png')}
                style={styles.banner}
                contentFit="cover"
              />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>Community</Text>
                <Text style={styles.bannerSubtitle}>Stories, advice, and support from mamas like you</Text>
              </View>
            </View>

            <FlatList
              data={FILTERS}
              keyExtractor={f => f}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
              renderItem={({ item }) => {
                const active = filter === item;
                return (
                  <TouchableOpacity
                    onPress={() => setFilter(item)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: active ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            {!canPublish && (
              <View style={[styles.readOnlyBanner, { backgroundColor: colors.secondary }]}>
                <Feather name="eye" size={16} color={colors.primary} />
                <Text style={[styles.readOnlyText, { color: colors.foreground }]}>
                  Free access: read community posts and verified care advice.
                </Text>
              </View>
            )}
            {(adviceQuery.data?.length ?? 0) > 0 && (
              <View style={styles.adviceSection}>
                <Text style={[styles.adviceHeading, { color: colors.foreground }]}>
                  Advice from verified professionals
                </Text>
                {adviceQuery.data?.slice(0, 6).map((advice) => (
                  <View key={advice.id} style={[styles.adviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.advisorLine}>
                      <Text style={[styles.advisorName, { color: colors.foreground }]}>
                        {advice.authorName}
                      </Text>
                      {advice.isVerified && (
                        <View style={styles.verifiedBadge} accessibilityLabel="Verified professional">
                          <Feather name="check" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.advisorCredentials, { color: colors.mutedForeground }]}>
                      {advice.credentials} · {advice.specialty}
                    </Text>
                    <Text style={[styles.adviceTitle, { color: colors.foreground }]}>{advice.title}</Text>
                    <Text style={[styles.adviceBody, { color: colors.foreground }]} numberOfLines={5}>
                      {advice.body}
                    </Text>
                    <Text style={[styles.adviceCategory, { color: colors.primary }]}>{advice.category}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="message-square" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                 No community posts here yet.
              </Text>
            </View>
          )
        }
      />

      {canPublish && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomInset + 8 }]}
          activeOpacity={0.85}
          onPress={() => router.push('/post-create')}
          accessibilityLabel="Create a community post"
        >
          <Feather name="edit-2" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  readOnlyBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 13, marginBottom: 12 },
  readOnlyText: { flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 13 },
  adviceSection: { marginBottom: 10 },
  adviceHeading: { fontFamily: "Nunito_700Bold", fontSize: 18, marginBottom: 10 },
  adviceCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 10 },
  advisorLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  advisorName: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, backgroundColor: "#1877F2", alignItems: "center", justifyContent: "center" },
  advisorCredentials: { fontFamily: "Nunito_400Regular", fontSize: 11, marginTop: 2 },
  adviceTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, marginTop: 10 },
  adviceBody: { fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 19, marginTop: 5 },
  adviceCategory: { fontFamily: "Nunito_700Bold", fontSize: 11, marginTop: 9 },
  bannerWrap: {
    height: 150,
    borderRadius: 24,
    overflow: 'hidden',
  },
  banner: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  bannerTitle: {
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
  },
  bannerSubtitle: {
    color: '#fff',
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  author: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  time: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
  },
  body: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 24,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
