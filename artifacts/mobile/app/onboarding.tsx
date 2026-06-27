import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/hooks/useProfileContext';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { completeOnboarding } = useProfile();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<'cycle' | 'pregnant' | null>(null);

  const handleComplete = async () => {
    if (!name.trim() || !mode) return;
    await completeOnboarding({ name: name.trim(), mode, bio: '' });
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome to Bloom</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A safe, warm place for your body and your journey.</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.foreground }]}>What should we call you?</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>What are you tracking?</Text>
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: mode === 'cycle' ? colors.primary : colors.border, backgroundColor: mode === 'cycle' ? colors.secondary : colors.card }
            ]}
            onPress={() => setMode('cycle')}
          >
            <Text style={[styles.modeText, { color: mode === 'cycle' ? colors.primary : colors.foreground }]}>My Cycle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: mode === 'pregnant' ? colors.primary : colors.border, backgroundColor: mode === 'pregnant' ? colors.secondary : colors.card }
            ]}
            onPress={() => setMode('pregnant')}
          >
            <Text style={[styles.modeText, { color: mode === 'pregnant' ? colors.primary : colors.foreground }]}>My Pregnancy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: name.trim() && mode ? colors.primary : colors.muted }]}
          disabled={!name.trim() || !mode}
          onPress={handleComplete}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Begin Journey</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  spacer: {
    flex: 1,
  },
  button: {
    borderRadius: 30,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
});
