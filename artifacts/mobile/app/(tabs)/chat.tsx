import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat, Friend } from '@/hooks/useChatContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { friends, addFriend } = useChat();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 100 : insets.bottom + 90;

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addFriend(trimmed);
    setName('');
    setModalVisible(false);
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{item.avatarInitials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
        {!!item.lastMessage && (
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="user-plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        keyExtractor={f => f.id}
        renderItem={renderFriend}
        contentContainerStyle={{ paddingBottom: bottomInset, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No friends yet. Add someone to start chatting.
            </Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add a friend</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Friend's name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setName(''); setModalVisible(false); }} style={styles.modalBtn}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: 12 }]}>
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 30,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  name: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
  },
  preview: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
});
