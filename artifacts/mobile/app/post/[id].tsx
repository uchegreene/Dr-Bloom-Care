import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '@/hooks/useSocialContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useProfile } from '@/hooks/useProfileContext';

export default function PostDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, likePost, addComment } = useSocial();
  const { profile } = useProfile();
  const canInteract = profile?.subscriptionActive === true;
  const [text, setText] = useState('');

  const post = posts.find(p => p.id === id);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Post not found.</Text>
      </View>
    );
  }

  const handleLike = () => {
    if (!canInteract) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost(post.id);
  };

  const handleComment = async () => {
    if (!canInteract) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    await addComment(post.id, trimmed);
    setText('');
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.postHeader}>
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

        {canInteract ? (
          <TouchableOpacity style={styles.likeRow} onPress={handleLike} activeOpacity={0.6}>
            <Feather name="heart" size={20} color={post.liked ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.likeText, { color: post.liked ? colors.primary : colors.mutedForeground }]}>
              {post.likes} {post.likes === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.likeRow}>
            <Feather name="heart" size={20} color={colors.mutedForeground} />
            <Text style={[styles.likeText, { color: colors.mutedForeground }]}>
              {post.likes} {post.likes === 1 ? 'like' : 'likes'}
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
          Comments ({post.comments.length})
        </Text>

        {post.comments.length === 0 ? (
          <Text style={[styles.noComments, { color: colors.mutedForeground }]}>
            {canInteract ? "No comments yet. Be the first to reply." : "No comments yet."}
          </Text>
        ) : (
          post.comments.map(c => (
            <View key={c.id} style={styles.comment}>
              <View style={[styles.commentAvatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.commentAvatarText, { color: colors.primary }]}>
                  {c.authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={[styles.commentBubble, { backgroundColor: colors.card }]}>
                <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{c.authorName}</Text>
                <Text style={[styles.commentText, { color: colors.foreground }]}>{c.text}</Text>
                <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                  {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {canInteract ? (
        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Platform.OS === 'web' ? 16 : insets.bottom + 8 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.commentInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={!text.trim()}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
          >
            <Feather name="send" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 17,
    lineHeight: 26,
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginTop: 16,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  likeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
  },
  commentsTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  noComments: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
  },
  comment: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
  commentBubble: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  commentAuthor: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
  },
  commentText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  commentTime: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
