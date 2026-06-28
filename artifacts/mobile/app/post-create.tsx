import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '@/hooks/useSocialContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const TAGS = ['Journey', 'Advice', 'Health'];

export default function PostCreate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPost } = useSocial();

  const [text, setText] = useState('');
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      // Image picking is unavailable in this environment; ignore silently.
    }
  };

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed && !imageUri) return;
    await addPost(trimmed, tag, imageUri);
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
          disabled={!text.trim() && !imageUri}
          hitSlop={8}
        >
          <Text style={[styles.post, { color: text.trim() || imageUri ? colors.primary : colors.mutedForeground }]}>
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

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            <TouchableOpacity
              style={[styles.removeImage, { backgroundColor: colors.background }]}
              onPress={() => setImageUri(undefined)}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Feather name="image" size={20} color={colors.primary} />
            <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Add a photo</Text>
          </TouchableOpacity>
        )}

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
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  photoBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
  },
  previewWrap: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 220,
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
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
