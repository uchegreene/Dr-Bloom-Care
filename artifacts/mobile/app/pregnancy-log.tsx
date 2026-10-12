import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePregnancy } from '@/hooks/usePregnancyContext';
import { Redirect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useProfile } from '@/hooks/useProfileContext';

const SYMPTOM_OPTIONS = [
  'Nausea',
  'Fatigue',
  'Back pain',
  'Cravings',
  'Heartburn',
  'Swelling',
  'Headache',
  'Mood swings',
];

export default function PregnancyLog() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addLog } = usePregnancy();
  const { profile } = useProfile();

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };

  const handleSave = async () => {
    const parsedWeight = parseFloat(weight);
    await addLog({
      date: format(new Date(), 'yyyy-MM-dd'),
      symptoms,
      notes: notes.trim(),
      weight: isNaN(parsedWeight) ? undefined : parsedWeight,
    });
    router.back();
  };

  const canSave = symptoms.length > 0 || weight.trim() !== '' || notes.trim() !== '';

  if (
    !profile?.subscriptionActive ||
    profile.subscriptionPlan !== "pregnancy" ||
    profile.mode !== "pregnant"
  ) return <Redirect href="/(tabs)/community" />;

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Daily Log</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave} hitSlop={8}>
          <Text style={[styles.save, { color: canSave ? colors.primary : colors.mutedForeground }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {format(new Date(), 'EEEE, MMMM d')}
        </Text>

        <Text style={[styles.label, { color: colors.foreground }]}>How are you feeling?</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOM_OPTIONS.map(s => {
            const active = symptoms.includes(s);
            return (
              <TouchableOpacity
                key={s}
                onPress={() => toggleSymptom(s)}
                style={[
                  styles.symptomChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.symptomText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 28 }]}>Weight (kg)</Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          placeholder="e.g. 65.5"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />

        <Text style={[styles.label, { color: colors.foreground, marginTop: 28 }]}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything you'd like to remember about today"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />
      </ScrollView>
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
  save: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  date: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    marginBottom: 14,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  symptomText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});
