import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCycle, PregnancyChanceLevel } from '@/hooks/useCycleContext';

const SAFE_SEX_TIPS = [
  'Use condoms consistently and correctly to lower the risk of both pregnancy and sexually transmitted infections.',
  'Condoms are the only method that also protects against most STIs.',
  'For reliable pregnancy prevention, ask a clinician about the pill, implant, IUD, or injection.',
  'Emergency contraception can help within 72 to 120 hours after unprotected sex - the sooner the better.',
  'Tracking alone (the rhythm method) is not a reliable way to prevent pregnancy.',
];

export function CycleInsights() {
  const colors = useColors();
  const { getPregnancyChance, getDaysPeriodLate, getFertileWindow, getPredictedNextPeriod } = useCycle();

  const chance = getPregnancyChance();
  const daysLate = getDaysPeriodLate();
  const fertile = getFertileWindow();
  const nextPeriod = getPredictedNextPeriod();

  const levelColor = (level: PregnancyChanceLevel): string => {
    switch (level) {
      case 'High': return colors.primary;
      case 'Moderate': return '#C9952B';
      case 'Low': return colors.accent;
      default: return colors.muted;
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Intimacy & Safe Sex</Text>

      {chance ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chanceHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Pregnancy chance</Text>
            <View style={[styles.badge, { backgroundColor: levelColor(chance.level) }]}>
              <Text style={styles.badgeText}>{chance.level}</Text>
            </View>
          </View>
          <Text style={[styles.cardBody, { color: colors.foreground }]}>{chance.message}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            Based on your last {chance.protectedSex ? 'protected' : 'unprotected'} intimacy on {format(parseISO(chance.date), 'MMM d, yyyy')}.
          </Text>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
            Log intimacy to see your estimated chance of pregnancy and tailored guidance.
          </Text>
        </View>
      )}

      {daysLate > 0 && (
        <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
          <View style={styles.rowTitle}>
            <Feather name="alert-circle" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Period is {daysLate} day{daysLate === 1 ? '' : 's'} late</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.foreground }]}>
            {daysLate < 5
              ? 'Cycles naturally vary from month to month, so give it a few more days.'
              : 'Consider taking a home pregnancy test. If it is negative but your period still does not arrive, or you feel unwell, please see a doctor.'}
          </Text>
        </View>
      )}

      {fertile && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rowTitle}>
            <Feather name="calendar" size={18} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Best days to avoid pregnancy</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.foreground }]}>
            Your most fertile days are around {format(fertile.start, 'MMM d')} - {format(fertile.end, 'MMM d')}. To lower the chance of conceiving, avoid unprotected sex during this window and the few days just before it.
          </Text>
          {nextPeriod && (
            <Text style={[styles.cardBody, { color: colors.foreground, marginTop: 8 }]}>
              You are least likely to conceive in the days right after your period and just before your next one (around {format(nextPeriod, 'MMM d')}). This is only an estimate, not a reliable form of birth control.
            </Text>
          )}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowTitle}>
          <Feather name="shield" size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Safe sex tips</Text>
        </View>
        {SAFE_SEX_TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  chanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  cardBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  meta: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
});
