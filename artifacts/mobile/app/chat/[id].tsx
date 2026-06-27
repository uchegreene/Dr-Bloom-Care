import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat, ChatMessage } from '@/hooks/useChatContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function ChatThread() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { friends, messages, sendMessage } = useChat();
  const [text, setText] = useState('');

  const friend = friends.find(f => f.id === id);
  const thread = messages[id ?? ''] ?? [];
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !id) return;
    setText('');
    await sendMessage(id, trimmed);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === 'me';
    return (
      <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? colors.primary : colors.card,
              borderColor: colors.border,
              borderWidth: mine ? 0 : 1,
              borderBottomRightRadius: mine ? 4 : 18,
              borderBottomLeftRadius: mine ? 18 : 4,
            },
          ]}
        >
          <Text style={[styles.bubbleText, { color: mine ? colors.primaryForeground : colors.foreground }]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, { color: mine ? colors.primaryForeground : colors.mutedForeground }]}>
            {format(new Date(item.timestamp), 'h:mm a')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.headerAvatarText, { color: colors.primary }]}>
            {friend?.avatarInitials ?? '?'}
          </Text>
        </View>
        <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
          {friend?.name ?? 'Chat'}
        </Text>
      </View>

      <FlatList
        data={thread}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.empty, { transform: [{ scaleY: -1 }] }]}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Say hello to start the conversation.
            </Text>
          </View>
        }
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Platform.OS === 'web' ? 16 : insets.bottom + 8 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
        >
          <Feather name="send" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
  headerName: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTime: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
