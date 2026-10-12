import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePregnancy } from '@/hooks/usePregnancyContext';
import { Feather } from '@expo/vector-icons';
import { format, parseISO, isValid, isFuture } from 'date-fns';
import { useRouter } from 'expo-router';
import { HealthTipsCard } from '@/components/HealthTipsCard';
import { TRIMESTER_TIPS } from '@/constants/healthTips';

const WEEKLY_NOTES: Record<number, string> = {
  4: 'Your baby is the size of a poppy seed. The neural tube, which becomes the brain and spine, is forming.',
  8: 'About the size of a raspberry. Tiny fingers and toes are starting to form and the heart is beating steadily.',
  12: 'Around the size of a lime. Reflexes are developing and your baby can now make tiny movements.',
  16: 'About the size of an avocado. Your baby can hear sounds and is growing fine hair called lanugo.',
  20: 'Halfway there, the size of a banana. You may start feeling those first gentle kicks.',
  24: 'About the size of an ear of corn. Your baby is developing taste buds and a regular sleep pattern.',
  28: 'Around the size of an eggplant. Eyes can open and close, and your baby is putting on baby fat.',
  32: 'About the size of a squash. Bones are hardening and your baby is practicing breathing movements.',
  36: 'Around the size of a head of romaine. Your baby is getting into position for birth.',
  40: 'Full term, about the size of a small pumpkin. Your baby is ready to meet you any day now.',
};

function getWeeklyNote(week: number): string {
  const keys = Object.keys(WEEKLY_NOTES).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) {
    if (week >= k) best = k;
  }
  return WEEKLY_NOTES[best];
}

export default function PregnancyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, getStats, updateDates } = usePregnancy();

  const [lmpInput, setLmpInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [dateError, setDateError] = useState('');

  const stats = getStats();
  const hasData = !!data?.lmpDate || !!data?.dueDate;
  const recentLogs = Object.values(data?.logs || {})
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const handleSaveDates = async () => {
    const parsed = parseISO(lmpInput);
    if (lmpInput.length !== 10 || !isValid(parsed)) {
      setDateError('Please enter a valid date as YYYY-MM-DD.');
      return;
    }
    if (isFuture(parsed)) {
      setDateError('The date cannot be in the future.');
      return;
    }
    setDateError('');
    await updateDates(lmpInput, undefined);
    setIsEditing(false);
    setLmpInput('');
  };

  if (!hasData || isEditing) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled">
        <View style={styles.setupContainer}>
          <Feather name="heart" size={48} color={colors.primary} style={{ marginBottom: 24 }} />
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>Pregnancy Setup</Text>
          <Text style={[styles.setupSubtitle, { color: colors.mutedForeground }]}>
            Enter the first day of your last period to calculate your estimated due date.
          </Text>
          
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: dateError ? colors.primary : colors.border, backgroundColor: colors.card }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
            value={lmpInput}
            onChangeText={(t) => { setLmpInput(t); if (dateError) setDateError(''); }}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />

          {!!dateError && (
            <Text style={[styles.errorText, { color: colors.primary }]}>{dateError}</Text>
          )}

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: lmpInput.length === 10 ? colors.primary : colors.muted }]}
            onPress={handleSaveDates}
            disabled={lmpInput.length !== 10}
          >
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Calculate Due Date</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reminderCard, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/reminders')} accessibilityLabel="Appointments and medicine reminders">
            <Feather name="bell" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.reminderTitle, { color: colors.foreground }]}>Appointments & medicine</Text>
              <Text style={[styles.reminderSubtitle, { color: colors.mutedForeground }]}>
                Set care reminders even before entering your due date
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setIsEditing(false)}>
              <Text style={{ color: colors.primary, fontFamily: 'Nunito_600SemiBold', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', height: 200 }}>
        <Image 
          source={require('@/assets/images/pregnancy-banner.png')} 
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', padding: 24 }]}>
          <Text style={{ color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 32 }}>Week {stats.week}</Text>
          <Text style={{ color: '#fff', fontFamily: 'Nunito_600SemiBold', fontSize: 18 }}>Trimester {stats.trimester}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.statsRow]}>
          <View style={[styles.statBox, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Due Date</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.edd ? format(stats.edd, 'MMM d, yyyy') : '--'}</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Days Left</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.daysRemaining}</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Your Baby This Week</Text>
          <Text style={[styles.infoCardText, { color: colors.foreground }]}>
            {getWeeklyNote(stats.week)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.reminderCard, { backgroundColor: colors.secondary }]}
          activeOpacity={0.85}
          onPress={() => router.push('/reminders')}
        >
          <View style={[styles.reminderIcon, { backgroundColor: colors.card }]}>
            <Feather name="bell" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reminderTitle, { color: colors.foreground }]}>Appointments & medicine</Text>
            <Text style={[styles.reminderSubtitle, { color: colors.mutedForeground }]}>
              Appointment alerts and daily medicine reminders, at the times your clinician prescribed
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <HealthTipsCard
            group={TRIMESTER_TIPS[stats.trimester] ?? TRIMESTER_TIPS[1]}
            maxTips={3}
            onSeeMore={() => router.push('/health-tips')}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24, marginBottom: 12 }]}>Pregnancy Log</Text>
        <TouchableOpacity
          style={[styles.logButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          activeOpacity={0.7}
          onPress={() => router.push('/pregnancy-log')}
        >
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={[styles.logButtonText, { color: colors.foreground }]}>Log symptoms or weight</Text>
        </TouchableOpacity>

        {recentLogs.length > 0 && (
          <View style={{ marginTop: 16, gap: 12 }}>
            {recentLogs.map(log => (
              <View key={log.date} style={[styles.logEntry, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.logEntryDate, { color: colors.mutedForeground }]}>
                  {format(parseISO(log.date), 'MMM d, yyyy')}
                </Text>
                {typeof log.weight === 'number' && (
                  <Text style={[styles.logEntryText, { color: colors.foreground }]}>Weight: {log.weight} kg</Text>
                )}
                {log.symptoms.length > 0 && (
                  <Text style={[styles.logEntryText, { color: colors.foreground }]}>Symptoms: {log.symptoms.join(', ')}</Text>
                )}
                {!!log.notes && (
                  <Text style={[styles.logEntryText, { color: colors.foreground }]}>{log.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  setupTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  input: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  content: {
    padding: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
  },
  statLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  editLink: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
  infoCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    marginTop: 16,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  reminderSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  infoCardTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    marginBottom: 12,
  },
  infoCardText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
  },
  logButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  logEntry: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  logEntryDate: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logEntryText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
});
