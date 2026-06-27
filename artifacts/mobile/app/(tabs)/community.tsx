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

const FILTERS = ['All', 'Journey', 'Advice', 'Health'];

function PostCard({ post }: { post: Post }) {
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

      <Text style={[styles.body, { color: colors.foreground }]}>{post.text}</Text>

      <View style={styles.cardFooter}>
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
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { posts, isLoading } = useSocial();
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? posts : posts.filter(p => p.tag === filter);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 100 : insets.bottom + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
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
                No posts here yet. Be the first to share.
              </Text>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomInset + 8 }]}
        activeOpacity={0.85}
        onPress={() => router.push('/post-create')}
      >
        <Feather name="edit-2" size={22} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
