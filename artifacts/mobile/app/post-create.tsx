import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '@/hooks/useSocialContext';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

const TAGS = ['Journey', 'Advice', 'Health'];

export default function PostCreate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPost } = useSocial();

  const [text, setText] = useState('');
  const [tag, setTag] = useState<string | undefined>(undefined);

  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addPost(trimmed, tag);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!text.trim()}
          hitSlop={8}
        >
          <Text style={[styles.post, { color: text.trim() ? colors.primary : colors.mutedForeground }]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Share your thoughts with the community..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          autoFocus
          style={[styles.input, { color: colors.foreground }]}
        />

        <Text style={[styles.tagLabel, { color: colors.mutedForeground }]}>Add a topic (optional)</Text>
        <View style={styles.tagRow}>
          {TAGS.map(t => {
            const active = tag === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTag(active ? undefined : t)}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
  cancel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  post: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  input: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    lineHeight: 26,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  tagLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
  },
});
