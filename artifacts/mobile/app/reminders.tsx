import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useReminders, ReminderType } from '@/hooks/useRemindersContext';
import { format, parseISO, isValid } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isValidTime = (t: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);

export default function RemindersScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reminders, addReminder, removeReminder } = useReminders();

  const [type, setType] = useState<ReminderType>('appointment');
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDateStr('');
    setTimeStr('');
    setNotes('');
    setError('');
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!isValidTime(timeStr)) {
      setError('Please enter a valid time as HH:MM (24-hour).');
      return;
    }

    if (type === 'appointment') {
      const parsed = parseISO(dateStr);
      if (dateStr.length !== 10 || !isValid(parsed)) {
        setError('Please enter a valid date as YYYY-MM-DD.');
        return;
      }
      const [h, m] = timeStr.split(':').map(Number);
      const when = new Date(parsed);
      when.setHours(h, m, 0, 0);
      if (when.getTime() <= Date.now()) {
        setError('Please choose a date and time in the future.');
        return;
      }
      await addReminder({ type, title: title.trim(), datetime: when.toISOString(), notes: notes.trim() || undefined });
    } else {
      await addReminder({ type, title: title.trim(), time: timeStr, notes: notes.trim() || undefined });
    }
    reset();
  };

  const appointments = reminders.filter(r => r.type === 'appointment').sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''));
  const medications = reminders.filter(r => r.type === 'medication').sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Reminders</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, { borderColor: type === 'appointment' ? colors.primary : colors.border, backgroundColor: type === 'appointment' ? colors.secondary : colors.card }]}
            onPress={() => { setType('appointment'); setError(''); }}
          >
            <Feather name="calendar" size={18} color={type === 'appointment' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.typeText, { color: type === 'appointment' ? colors.primary : colors.foreground }]}>Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, { borderColor: type === 'medication' ? colors.primary : colors.border, backgroundColor: type === 'medication' ? colors.secondary : colors.card }]}
            onPress={() => { setType('medication'); setError(''); }}
          >
            <Feather name="clock" size={18} color={type === 'medication' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.typeText, { color: type === 'medication' ? colors.primary : colors.foreground }]}>Daily medication</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Title</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder={type === 'appointment' ? 'e.g. Antenatal checkup' : 'e.g. Prenatal vitamin'}
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={(t) => { setTitle(t); if (error) setError(''); }}
        />

        {type === 'appointment' && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={dateStr}
              onChangeText={(t) => { setDateStr(t); if (error) setError(''); }}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={[styles.label, { color: colors.foreground }]}>Time (24-hour)</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="HH:MM"
          placeholderTextColor={colors.mutedForeground}
          value={timeStr}
          onChangeText={(t) => { setTimeStr(t); if (error) setError(''); }}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Any details to remember"
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {!!error && <Text style={[styles.error, { color: colors.primary }]}>{error}</Text>}

        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} activeOpacity={0.85}>
          <Feather name="plus" size={20} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add reminder</Text>
        </TouchableOpacity>

        {Platform.OS === 'web' && (
          <Text style={[styles.webNote, { color: colors.mutedForeground }]}>
            Notifications are delivered on the mobile app. On web, reminders are saved but not sent as alerts.
          </Text>
        )}

        {appointments.length > 0 && (
          <>
            <Text style={[styles.listHeading, { color: colors.foreground }]}>Appointment alerts</Text>
            {appointments.map(r => (
              <View key={r.id} style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.reminderIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="calendar" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderTitle, { color: colors.foreground }]}>{r.title}</Text>
                  <Text style={[styles.reminderMeta, { color: colors.mutedForeground }]}>
                    {r.datetime ? format(parseISO(r.datetime), 'EEE, MMM d • h:mm a') : ''}
                  </Text>
                  {!!r.notes && <Text style={[styles.reminderNotes, { color: colors.foreground }]}>{r.notes}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeReminder(r.id)} style={styles.iconButton} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {medications.length > 0 && (
          <>
            <Text style={[styles.listHeading, { color: colors.foreground }]}>Daily medication reminders</Text>
            {medications.map(r => (
              <View key={r.id} style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.reminderIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="clock" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderTitle, { color: colors.foreground }]}>{r.title}</Text>
                  <Text style={[styles.reminderMeta, { color: colors.mutedForeground }]}>Every day at {r.time}</Text>
                  {!!r.notes && <Text style={[styles.reminderNotes, { color: colors.foreground }]}>{r.notes}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeReminder(r.id)} style={styles.iconButton} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {reminders.length === 0 && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No reminders yet. Add an appointment alert or a daily medication reminder above.
          </Text>
        )}
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
    width: 40,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  typeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginTop: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
  },
  addBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  webNote: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    textAlign: 'center',
  },
  listHeading: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    marginTop: 28,
    marginBottom: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  reminderMeta: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    marginTop: 2,
  },
  reminderNotes: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    marginTop: 4,
  },
  empty: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 22,
  },
});
