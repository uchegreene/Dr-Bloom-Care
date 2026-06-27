import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addMonths, subMonths } from 'date-fns';
import { useCycle } from '@/hooks/useCycleContext';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Calendar } from '@/components/Calendar';
import { useRouter } from 'expo-router';
import { HealthTipsCard } from '@/components/HealthTipsCard';
import { PHASE_TIPS } from '@/constants/healthTips';
import { isToday } from 'date-fns';

export default function CycleScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { logs, getCyclePhase, getPredictedNextPeriod, getFertileWindow, logPeriodStart } = useCycle();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const todayStr = format(selectedDate, 'yyyy-MM-dd');
  const phase = getCyclePhase(todayStr);
  const nextPeriod = getPredictedNextPeriod();
  const fertileWindow = getFertileWindow();
  const todayLog = logs[todayStr];

  const selectedIsToday = isToday(selectedDate);
  const tipGroup = PHASE_TIPS[phase] ?? PHASE_TIPS.Unknown;

  const handleLogPeriodStart = () => {
    logPeriodStart(todayStr);
  };

  const getPhaseColor = (dateStr: string) => {
    const p = getCyclePhase(dateStr);
    if (p === 'Menstruation') return colors.secondary; // blush
    if (p === 'Ovulation') return colors.accent; // sage green
    return null;
  };

  const getFlowMarker = (dateStr: string) => {
    return logs[dateStr]?.flow || null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Your Cycle</Text>
        </View>

        <View style={[styles.phaseCard, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.phaseLabel, { color: colors.primary }]}>Current Phase</Text>
          <Text style={[styles.phaseName, { color: colors.foreground }]}>{phase}</Text>
          {nextPeriod && (
            <Text style={[styles.prediction, { color: colors.mutedForeground }]}>
              Next period expected {format(nextPeriod, 'MMM d')}
            </Text>
          )}
          {fertileWindow && (
            <Text style={[styles.prediction, { color: colors.mutedForeground }]}>
              Fertile window {format(fertileWindow.start, 'MMM d')} - {format(fertileWindow.end, 'MMM d')}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.periodStartButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={handleLogPeriodStart}
        >
          <Feather name="droplet" size={18} color={colors.primaryForeground} />
          <Text style={[styles.periodStartText, { color: colors.primaryForeground }]}>
            {selectedIsToday ? 'Log period start today' : `Log period start on ${format(selectedDate, 'MMM d')}`}
          </Text>
        </TouchableOpacity>

        <View style={[styles.calendarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))}>
              <Feather name="chevron-left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.calendarMonth, { color: colors.foreground }]}>{format(currentDate, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))}>
              <Feather name="chevron-right" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <Calendar 
            currentDate={currentDate} 
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate}
            getPhaseColor={getPhaseColor}
            getFlowMarker={getFlowMarker}
          />
        </View>

        <View style={styles.logSummaryContainer}>
          <View style={styles.logSummaryHeader}>
            <Text style={[styles.logSummaryTitle, { color: colors.foreground }]}>Daily Log</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/cycle-log', params: { date: todayStr } })}>
              <Text style={[styles.editLogText, { color: colors.primary }]}>{todayLog ? 'Edit' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          
          {todayLog ? (
            <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {todayLog.flow && (
                <View style={styles.logRow}>
                  <Feather name="droplet" size={16} color={colors.primary} />
                  <Text style={[styles.logText, { color: colors.foreground }]}>Flow: <Text style={{ textTransform: 'capitalize' }}>{todayLog.flow}</Text></Text>
                </View>
              )}
              {todayLog.symptoms.length > 0 && (
                <View style={styles.logRow}>
                  <Feather name="activity" size={16} color={colors.accent} />
                  <Text style={[styles.logText, { color: colors.foreground }]}>Symptoms: {todayLog.symptoms.join(', ')}</Text>
                </View>
              )}
              {todayLog.mood && (
                <View style={styles.logRow}>
                  <Feather name="smile" size={16} color={colors.foreground} />
                  <Text style={[styles.logText, { color: colors.foreground }]}>Mood: {todayLog.mood}</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.emptyLogCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/cycle-log', params: { date: todayStr } })}
            >
              <Feather name="plus-circle" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyLogText, { color: colors.mutedForeground }]}>Log flow, symptoms, and mood</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tipsContainer}>
          <HealthTipsCard
            group={tipGroup}
            maxTips={3}
            onSeeMore={() => router.push('/health-tips')}
          />
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
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  date: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
  },
  phaseCard: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  phaseLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  phaseName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 36,
    marginBottom: 8,
  },
  prediction: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  periodStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  periodStartText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  tipsContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  calendarContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  calendarMonth: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  logSummaryContainer: {
    paddingHorizontal: 24,
  },
  logSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logSummaryTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },
  editLogText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  logCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  },
  emptyLogCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyLogText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  }
});
