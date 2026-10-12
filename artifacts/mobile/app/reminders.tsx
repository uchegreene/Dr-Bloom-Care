import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Modal, ActivityIndicator, Linking } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useReminders } from '@/hooks/useRemindersContext';
import { useProfile } from '@/hooks/useProfileContext';
import {
  ADVANCE_MINUTES, Reminder, ReminderType, medicineTimes, nextReminderTime, parseLocalAppointment,
} from '@/lib/pregnancyReminders';
import { format } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const advanceLabel = (m: number) => (m === 0 ? 'At time only' : m === 1440 ? '1 day before' : m === 60 ? '1 hour before' : `${m} min before`);

function countdown(target: Date | null, now: Date): string {
  if (!target) return '';
  const mins = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

const statusText = (r: Reminder, isWeb: boolean): string => {
  if (isWeb) return 'Saved on this device only. Web cannot send background alerts.';
  switch (r.notificationStatus) {
    case 'scheduled': return 'Alert scheduled on this device.';
    case 'past': return 'History entry. No alert is scheduled.';
    case 'blocked': return 'Not scheduled: notifications are not allowed.';
    case 'unsupported': return 'Not scheduled: this device cannot schedule alerts.';
    case 'error': return `Alert could not be scheduled${r.notificationError ? `: ${r.notificationError}` : '.'}`;
    default: return 'Alert status unknown.';
  }
};

export default function RemindersScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const rem = useReminders();
  const { profile, isLoading: profileLoading } = useProfile();
  const isWeb = Platform.OS === 'web';

  const [type, setType] = useState<ReminderType>('appointment');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [advance, setAdvance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<Reminder | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const { upcoming, past } = useMemo(() => {
    const up: Reminder[] = [], ps: Reminder[] = [];
    for (const r of rem.reminders) {
      if (r.type === 'appointment' && r.datetime && new Date(r.datetime).getTime() <= now.getTime()) ps.push(r);
      else up.push(r);
    }
    const key = (r: Reminder) => (nextReminderTime(r, now) ?? new Date(8.64e15)).getTime();
    up.sort((a, b) => key(a) - key(b));
    ps.sort((a, b) => (b.datetime ?? '').localeCompare(a.datetime ?? ''));
    return { upcoming: up, past: ps };
  }, [rem.reminders, now]);

  const nextOverall = useMemo(() => {
    let best: { r: Reminder; at: Date } | null = null;
    for (const r of upcoming) {
      const at = nextReminderTime(r, now);
      if (at && (!best || at < best.at)) best = { r, at };
    }
    return best;
  }, [upcoming, now]);

  if (profileLoading) return (
    <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.small, { color: colors.mutedForeground }]}>Loading your pregnancy reminders…</Text>
    </View>
  );
  if (!profile?.subscriptionActive) return <Redirect href="/(tabs)/community" />;

  const locked = !rem.canManage;
  const wrongPlan = profile.subscriptionPlan !== 'pregnancy';
  const wrongMode = profile.mode !== 'pregnant';

  const reset = () => {
    setEditingId(null); setTitle(''); setDateStr(''); setTimeStr(''); setTimes(['08:00']);
    setAdvance(0); setNotes(''); setError('');
  };

  const startEdit = (r: Reminder) => {
    setEditingId(r.id); setType(r.type); setTitle(r.title); setNotes(r.notes ?? ''); setError('');
    if (r.type === 'appointment' && r.datetime) {
      const d = new Date(r.datetime);
      setDateStr(Number.isFinite(d.getTime()) ? format(d, 'yyyy-MM-dd') : '');
      setTimeStr(Number.isFinite(d.getTime()) ? format(d, 'HH:mm') : '');
      setAdvance(r.advanceMinutes ?? 0);
    } else {
      setTimes(medicineTimes(r).length ? medicineTimes(r) : ['08:00']);
    }
  };

  const submit = async () => {
    if (rem.isBusy) return;
    setError('');
    if (!title.trim()) { setError('Please enter a title.'); return; }
    try {
      const n = notes.trim() || undefined;
      const payload = type === 'appointment'
        ? { type, title: title.trim(), datetime: parseLocalAppointment(dateStr.trim(), timeStr.trim()), advanceMinutes: advance, notes: n }
        : (() => {
            const clean = times.map(t => t.trim());
            if (clean.length < 1 || clean.length > 6 || clean.some(t => !CLOCK.test(t))) {
              throw new Error('Enter 1 to 6 daily times as HH:mm, for example 08:00 and 20:00.');
            }
            if (new Set(clean).size !== clean.length) throw new Error('Each daily time must be different.');
            return { type, title: title.trim(), times: clean, notes: n };
          })();
      if (editingId) await rem.updateReminder(editingId, payload);
      else await rem.addReminder(payload);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this reminder. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await rem.removeReminder(toDelete.id);
      if (editingId === toDelete.id) reset();
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this reminder.');
      setToDelete(null);
    }
  };

  const permissionBad = rem.notificationPermission === 'denied' || rem.notificationPermission === 'error';
  const permLabel: Record<string, string> = {
    unknown: 'Notification permission has not been checked yet.',
    granted: 'Notifications are allowed on this device.',
    denied: 'Notifications are turned off. Alerts cannot be delivered until you allow them.',
    unsupported: 'This device or browser cannot schedule alerts.',
    error: 'Notification setup hit an error. Alerts may not be scheduled.',
  };

  const renderItem = (r: Reminder, isPast: boolean) => {
    const at = isPast ? null : nextReminderTime(r, now);
    return (
      <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: editingId === r.id ? colors.primary : colors.border, opacity: isPast ? 0.8 : 1 }]}>
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
          <Feather name={r.type === 'appointment' ? 'calendar' : 'clock'} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{r.title}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {r.type === 'appointment' && r.datetime
              ? Number.isFinite(new Date(r.datetime).getTime())
                ? `${format(new Date(r.datetime), 'EEE, MMM d, yyyy, h:mm a')}${isPast ? '' : ` · ${advanceLabel(r.advanceMinutes ?? 0)}`}`
                : 'Invalid saved date — edit to fix'
              : `Daily at ${medicineTimes(r).join(', ')}`}
          </Text>
          {!!at && <Text style={[styles.countdown, { color: colors.primary }]}>Next {countdown(at, now)}</Text>}
          {!!r.notes && <Text style={[styles.notes, { color: colors.foreground }]}>{r.notes}</Text>}
          <Text style={[styles.status, { color: r.notificationStatus === 'error' || r.notificationStatus === 'blocked' ? colors.destructive : colors.mutedForeground }]}>
            {statusText(r, isWeb)}
          </Text>
        </View>
        {!locked && (
          <View>
            <TouchableOpacity testID={`edit-${r.id}`} disabled={rem.isBusy || rem.isLoading} onPress={() => startEdit(r)} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Edit reminder">
              <Feather name="edit-2" size={17} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity testID={`delete-${r.id}`} disabled={rem.isBusy || rem.isLoading} onPress={() => setToDelete(r)} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Delete reminder">
              <Feather name="trash-2" size={17} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const input = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || 16) + (isWeb ? 51 : 0), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Close">
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Appointments & medicine</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
        {rem.isLoading && <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />}
        {!!rem.loadError && (
          <View style={[styles.banner, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.bannerText, { color: colors.destructive }]}>Could not load saved reminders: {rem.loadError}</Text>
          </View>
        )}

        <View style={[styles.banner, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.bannerText, { color: colors.foreground }]}>
            Use the timing your clinician prescribed. Dr Bloom Care only reminds you; it does not recommend medicines or doses.
          </Text>
        </View>

        {nextOverall && (
          <View style={[styles.next, { backgroundColor: colors.primary }]}>
            <Text style={[styles.nextLabel, { color: colors.primaryForeground }]}>Next up {countdown(nextOverall.at, now)}</Text>
            <Text style={[styles.nextTitle, { color: colors.primaryForeground }]}>{nextOverall.r.title}</Text>
            <Text style={[styles.nextLabel, { color: colors.primaryForeground }]}>{format(nextOverall.at, 'EEE, MMM d, h:mm a')}</Text>
          </View>
        )}

        <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.bannerText, { color: colors.foreground }]}>
            {isWeb ? 'Web: reminders are saved on this device only. Background notifications are not supported here; use the mobile app for alerts.' : permLabel[rem.notificationPermission]}
          </Text>
          {!isWeb && permissionBad && (
            <View style={styles.row}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => {
                setError('');
                rem.retryNotifications().catch(e => setError(e instanceof Error ? e.message : 'Could not retry notifications.'));
              }} disabled={rem.isBusy || locked || rem.isLoading}>
                <Text style={[styles.smallBtnText, { color: colors.primaryForeground }]}>Retry notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={() => { Linking.openSettings().catch(() => setError('Could not open device settings.')); }}>
                <Text style={[styles.smallBtnText, { color: colors.foreground }]}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={[styles.small, { color: colors.mutedForeground }]}>Delivery still depends on your device notification and battery settings.</Text>
        </View>

        {locked ? (
          <View style={[styles.banner, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 8 }]}>Editing is locked</Text>
            <Text style={[styles.bannerText, { color: colors.foreground }]}>
              {wrongPlan
                ? 'Creating and editing reminders needs an active Pregnancy membership. Your current plan is for a different profile.'
                : wrongMode
                  ? 'Switch your profile to pregnant mode in settings to create or edit reminders. Dr Bloom Care will not change your mode automatically.'
                  : 'Creating and editing reminders is not available right now.'}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.heading, { marginTop: 8, color: colors.foreground }]}>{editingId ? 'Edit reminder' : 'New reminder'}</Text>
            <View style={styles.row}>
              {(['appointment', 'medication'] as ReminderType[]).map(t => {
                const on = type === t;
                return (
                  <TouchableOpacity key={t} testID={`type-${t}`} disabled={!!editingId} style={[styles.typeBtn, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.secondary : colors.card, opacity: editingId && !on ? 0.4 : 1 }]}
                    onPress={() => { setType(t); setError(''); }}>
                    <Feather name={t === 'appointment' ? 'calendar' : 'clock'} size={18} color={on ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.typeText, { color: on ? colors.primary : colors.foreground }]}>{t === 'appointment' ? 'Appointment' : 'Daily medicine'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>{type === 'appointment' ? 'Title' : 'Medicine name (shown only in this app)'}</Text>
            <TextInput style={input} placeholder={type === 'appointment' ? 'e.g. Antenatal checkup' : 'e.g. Prenatal vitamin'} placeholderTextColor={colors.mutedForeground} value={title} onChangeText={t => { setTitle(t); setError(''); }} maxLength={120} />

            {type === 'appointment' ? (
              <>
                <Text style={[styles.label, { color: colors.foreground }]}>Local date and time</Text>
                <View style={styles.row}>
                  <TextInput style={[...input, { flex: 1.3 }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} value={dateStr} onChangeText={t => { setDateStr(t); setError(''); }} keyboardType="numbers-and-punctuation" autoCapitalize="none" />
                  <TextInput style={[...input, { flex: 1 }]} placeholder="HH:mm" placeholderTextColor={colors.mutedForeground} value={timeStr} onChangeText={t => { setTimeStr(t); setError(''); }} keyboardType="numbers-and-punctuation" autoCapitalize="none" />
                </View>
                <Text style={[styles.small, { color: colors.mutedForeground }]}>24-hour time. You are alerted at the appointment time, plus an earlier alert if chosen. A past date is saved as history with no alert.</Text>
                <Text style={[styles.label, { color: colors.foreground }]}>Extra alert before</Text>
                <View style={styles.chips}>
                  {ADVANCE_MINUTES.map(m => {
                    const on = advance === m;
                    return (
                      <TouchableOpacity key={m} testID={`advance-${m}`} onPress={() => setAdvance(m)} style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.secondary : colors.card }]}>
                        <Text style={[styles.chipText, { color: on ? colors.primary : colors.foreground }]}>{advanceLabel(m)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: colors.foreground }]}>Daily times ({times.length}/6, 24-hour HH:mm)</Text>
                {times.map((t, i) => (
                  <View key={i} style={styles.row}>
                    <TextInput style={[...input, { flex: 1 }]} placeholder="08:00" placeholderTextColor={colors.mutedForeground} value={t} onChangeText={v => { setTimes(times.map((x, j) => (j === i ? v : x))); setError(''); }} keyboardType="numbers-and-punctuation" autoCapitalize="none" />
                    {times.length > 1 && (
                      <TouchableOpacity onPress={() => setTimes(times.filter((_, j) => j !== i))} style={styles.iconBtn} accessibilityLabel="Remove time">
                        <Feather name="minus-circle" size={22} color={colors.destructive} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {times.length < 6 && (
                  <TouchableOpacity onPress={() => setTimes([...times, ''])} style={styles.row} testID="add-time">
                    <Feather name="plus-circle" size={18} color={colors.primary} />
                    <Text style={[styles.chipText, { color: colors.primary }]}>Add another time</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.small, { color: colors.mutedForeground }]}>Enter the times your clinician prescribed. Lock-screen alerts stay generic and never show the medicine name.</Text>
              </>
            )}

            <Text style={[styles.label, { color: colors.foreground }]}>{type === 'appointment' ? 'Notes, e.g. clinic (optional)' : 'Notes, e.g. prescribed dose (optional)'}</Text>
            <TextInput style={[...input, styles.notesInput]} placeholder="Details to remember" placeholderTextColor={colors.mutedForeground} value={notes} onChangeText={setNotes} multiline maxLength={1000} />

            {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

            <TouchableOpacity testID="save-reminder" style={[styles.addBtn, { backgroundColor: colors.primary, opacity: rem.isBusy || rem.isLoading || rem.loadError ? 0.6 : 1 }]} onPress={submit} disabled={rem.isBusy || rem.isLoading || !!rem.loadError} activeOpacity={0.85}>
              {rem.isBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name={editingId ? 'check' : 'plus'} size={20} color={colors.primaryForeground} />}
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{rem.isBusy ? 'Saving...' : editingId ? 'Save changes' : 'Add reminder'}</Text>
            </TouchableOpacity>
            {!!editingId && (
              <TouchableOpacity onPress={reset} style={{ alignSelf: 'center', marginTop: 14 }} disabled={rem.isBusy}>
                <Text style={[styles.chipText, { color: colors.primary }]}>Cancel editing</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {locked && !!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

        <Text style={[styles.heading, { color: colors.foreground }]}>Upcoming</Text>
        {upcoming.length === 0 && !rem.isLoading ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>Nothing scheduled. Add an appointment or a daily medicine reminder.</Text>
        ) : upcoming.map(r => renderItem(r, false))}

        {past.length > 0 && (
          <>
            <Text style={[styles.heading, { color: colors.foreground }]}>Past appointments</Text>
            {past.map(r => renderItem(r, true))}
          </>
        )}
      </ScrollView>

      <Modal transparent visible={!!toDelete} animationType="fade" onRequestClose={() => setToDelete(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Delete this reminder?</Text>
            <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
              {toDelete ? `"${toDelete.title}" and its scheduled alerts will be removed from this device.` : ''}
            </Text>
            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => setToDelete(null)} disabled={rem.isBusy}>
                <Text style={[styles.smallBtnText, { color: colors.foreground }]}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-delete" style={[styles.smallBtn, { backgroundColor: colors.destructive, flex: 1, opacity: rem.isBusy ? 0.6 : 1 }]} onPress={confirmDelete} disabled={rem.isBusy}>
                <Text style={[styles.smallBtnText, { color: colors.primaryForeground }]}>{rem.isBusy ? 'Deleting...' : 'Delete'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  headerBtn: { padding: 8, width: 40 },
  iconBtn: { padding: 8 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18 },
  content: { padding: 24 },
  banner: { borderRadius: 16, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 20 },
  small: { fontFamily: 'Nunito_400Regular', fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 4 },
  next: { borderRadius: 20, padding: 18, marginBottom: 16, gap: 2 },
  nextLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  nextTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  smallBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  smallBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 18, marginTop: 24, marginBottom: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14 },
  typeText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  label: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, marginBottom: 8, marginTop: 14 },
  input: { fontFamily: 'Nunito_400Regular', fontSize: 16, borderWidth: 1, borderRadius: 12, padding: 14 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 16, marginTop: 16 },
  addBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 2 },
  countdown: { fontFamily: 'Nunito_700Bold', fontSize: 13, marginTop: 2 },
  notes: { fontFamily: 'Nunito_400Regular', fontSize: 14, marginTop: 4 },
  status: { fontFamily: 'Nunito_400Regular', fontSize: 12, marginTop: 6, lineHeight: 16 },
  empty: { fontFamily: 'Nunito_400Regular', fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 20, padding: 20, gap: 6 },
});
