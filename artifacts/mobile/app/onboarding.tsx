import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { parseISO, isValid, isFuture, differenceInYears } from 'date-fns';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/hooks/useProfileContext';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { completeOnboarding } = useProfile();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [mode, setMode] = useState<'cycle' | 'pregnant' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    const parsed = parseISO(dob);
    if (!dob.trim() || !isValid(parsed)) {
      setError('Please enter your date of birth as YYYY-MM-DD.');
      return false;
    }
    if (isFuture(parsed)) {
      setError('Date of birth cannot be in the future.');
      return false;
    }
    const age = differenceInYears(new Date(), parsed);
    if (age < 13) {
      setError('You must be at least 13 years old to use HER BLOOM.');
      return false;
    }
    if (age > 120) {
      setError('Please enter a valid date of birth.');
      return false;
    }
    if (!mode) {
      setError('Please choose what you would like to track.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleComplete = async () => {
    if (!validate() || !mode) return;
    await completeOnboarding({ name: name.trim(), dateOfBirth: dob.trim(), mode, bio: '' });
    router.replace(mode === 'pregnant' ? '/(tabs)/pregnancy' : '/(tabs)/cycle');
  };

  const canSubmit = !!name.trim() && !!dob.trim() && !!mode;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: (Platform.OS === 'web' ? 48 : insets.top) + 24, paddingBottom: (Platform.OS === 'web' ? 48 : insets.bottom) + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Welcome to HER BLOOM</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A safe, warm place for your body and your journey. Let's set up your account.</Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.foreground }]}>Full name</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Your full name"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={(t) => { setName(t); if (error) setError(null); }}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.foreground }]}>Date of birth</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          value={dob}
          onChangeText={(t) => { setDob(t); if (error) setError(null); }}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>What are you tracking?</Text>
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: mode === 'cycle' ? colors.primary : colors.border, backgroundColor: mode === 'cycle' ? colors.secondary : colors.card }
          ]}
          onPress={() => { setMode('cycle'); if (error) setError(null); }}
        >
          <Text style={[styles.modeText, { color: mode === 'cycle' ? colors.primary : colors.foreground }]}>My Cycle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: mode === 'pregnant' ? colors.primary : colors.border, backgroundColor: mode === 'pregnant' ? colors.secondary : colors.card }
          ]}
          onPress={() => { setMode('pregnant'); if (error) setError(null); }}
        >
          <Text style={[styles.modeText, { color: mode === 'pregnant' ? colors.primary : colors.foreground }]}>My Pregnancy</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={[styles.error, { color: colors.primary }]}>{error}</Text>}

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
        onPress={handleComplete}
        activeOpacity={0.85}
      >
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Begin Journey</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
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
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginTop: 16,
  },
  spacer: {
    height: 32,
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
