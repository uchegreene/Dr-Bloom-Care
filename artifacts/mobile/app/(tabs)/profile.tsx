import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile, ProfileMode } from '@/hooks/useProfileContext';
import { useSocial } from '@/hooks/useSocialContext';
import { Feather } from '@expo/vector-icons';

const MODES: { key: ProfileMode; label: string; icon: keyof typeof Feather.glyphMap; desc: string }[] = [
  { key: 'cycle', label: 'Cycle Tracking', icon: 'calendar', desc: 'Track your period and symptoms' },
  { key: 'pregnant', label: 'Pregnancy', icon: 'heart', desc: 'Follow your pregnancy journey' },
  { key: 'none', label: 'Just Browsing', icon: 'coffee', desc: 'Explore the community only' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const { posts } = useSocial();

  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saved, setSaved] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 100 : insets.bottom + 90;

  const myPosts = posts.filter(p => p.authorId === 'me').length;

  const handleSave = async () => {
    await updateProfile({ name: name.trim(), bio: bio.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleModeChange = async (mode: ProfileMode) => {
    await updateProfile({ mode });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>

      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(name || 'B').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.avatarName, { color: colors.foreground }]}>{name || 'Bloom Member'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{myPosts}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {MODES.find(m => m.key === profile?.mode)?.label.split(' ')[0] ?? '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Mode</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About You</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />
      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Share a little about yourself"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[styles.input, styles.bioInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Feather name={saved ? 'check' : 'save'} size={18} color={colors.primaryForeground} />
        <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
          {saved ? 'Saved' : 'Save changes'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 28 }]}>Tracking Mode</Text>
      <View style={{ gap: 12 }}>
        {MODES.map(mode => {
          const active = profile?.mode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeRow,
                {
                  backgroundColor: colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => handleModeChange(mode.key)}
            >
              <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={mode.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeLabel, { color: colors.foreground }]}>{mode.label}</Text>
                <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>{mode.desc}</Text>
              </View>
              {active && <Feather name="check-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 30,
    marginBottom: 20,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
    fontSize: 36,
  },
  avatarName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  saveBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  modeDesc: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
});
