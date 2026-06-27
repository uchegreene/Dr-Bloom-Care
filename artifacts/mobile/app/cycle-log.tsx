import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useCycle } from '@/hooks/useCycleContext';
import { format, parseISO } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FLOW_OPTIONS = ['light', 'medium', 'heavy'];
const SYMPTOM_OPTIONS = ['cramps', 'headache', 'fatigue', 'bloating', 'acne'];
const MOOD_OPTIONS = ['happy', 'sensitive', 'sad', 'anxious', 'calm'];

export default function CycleLogScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logs, addLog } = useCycle();

  const existingLog = date ? logs[date] : null;

  const [flow, setFlow] = useState<any>(existingLog?.flow || null);
  const [symptoms, setSymptoms] = useState<string[]>(existingLog?.symptoms || []);
  const [mood, setMood] = useState<string | null>(existingLog?.mood || null);

  const toggleSymptom = (sym: string) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter(s => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  const handleSave = async () => {
    if (!date) return;
    await addLog({
      date,
      flow,
      symptoms,
      mood: mood || undefined,
    });
    router.back();
  };

  if (!date) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{format(parseISO(date), 'MMM d, yyyy')}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
          <Feather name="check" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Flow</Text>
        <View style={styles.chipRow}>
          {FLOW_OPTIONS.map(opt => {
            const isSelected = flow === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setFlow(isSelected ? null : opt)}
              >
                <Text style={[styles.chipText, { color: isSelected ? colors.primaryForeground : colors.foreground, textTransform: 'capitalize' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 32 }]}>Symptoms</Text>
        <View style={styles.chipRow}>
          {SYMPTOM_OPTIONS.map(opt => {
            const isSelected = symptoms.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: isSelected ? colors.accent : colors.card,
                    borderColor: isSelected ? colors.accent : colors.border
                  }
                ]}
                onPress={() => toggleSymptom(opt)}
              >
                <Text style={[styles.chipText, { color: isSelected ? colors.accentForeground : colors.foreground, textTransform: 'capitalize' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 32 }]}>Mood</Text>
        <View style={styles.chipRow}>
          {MOOD_OPTIONS.map(opt => {
            const isSelected = mood === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: isSelected ? colors.secondary : colors.card,
                    borderColor: isSelected ? colors.secondary : colors.border
                  }
                ]}
                onPress={() => setMood(isSelected ? null : opt)}
              >
                <Text style={[styles.chipText, { color: isSelected ? colors.secondaryForeground : colors.foreground, textTransform: 'capitalize' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
  }
});
