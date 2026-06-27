import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/hooks/useProfileContext';
import { useCycle } from '@/hooks/useCycleContext';
import { usePregnancy } from '@/hooks/usePregnancyContext';
import { format } from 'date-fns';
import {
  PHASE_TIPS,
  TRIMESTER_TIPS,
  SYMPTOM_TIPS,
  TipGroup,
} from '@/constants/healthTips';

function TipSection({ group }: { group: TipGroup }) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name={group.icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{group.title}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{group.subtitle}</Text>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        {group.tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Feather name="check" size={16} color={colors.primary} style={{ marginTop: 3 }} />
            <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HealthTipsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { getCyclePhase, getRecentSymptoms } = useCycle();
  const { getStats } = usePregnancy();

  const mode = profile?.mode ?? 'cycle';
  const today = format(new Date(), 'yyyy-MM-dd');

  let primary: TipGroup;
  let contextLine: string;
  if (mode === 'pregnant') {
    const stats = getStats();
    const trimester = stats.trimester || 1;
    primary = TRIMESTER_TIPS[trimester] ?? TRIMESTER_TIPS[1];
    contextLine = `Based on Week ${stats.week}, Trimester ${trimester}`;
  } else {
    const phase = getCyclePhase(today);
    primary = PHASE_TIPS[phase] ?? PHASE_TIPS.Unknown;
    contextLine = `Based on your current phase: ${primary.title}`;
  }

  const recentSymptoms = mode === 'pregnant' ? [] : getRecentSymptoms();
  const symptomTips = recentSymptoms
    .map(s => ({ symptom: s, tip: SYMPTOM_TIPS[s] }))
    .filter(t => !!t.tip);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || 16), borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Health Tips</Text>
          <Text style={[styles.contextLine, { color: colors.mutedForeground }]}>{contextLine}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <TipSection group={primary} />

        {symptomTips.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="activity" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>For Your Recent Symptoms</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                  Tailored to what you have logged lately
                </Text>
              </View>
            </View>
            <View style={{ gap: 12 }}>
              {symptomTips.map(({ symptom, tip }) => (
                <View key={symptom} style={styles.tipRow}>
                  <Feather name="check" size={16} color={colors.primary} style={{ marginTop: 3 }} />
                  <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          These tips are general wellness guidance and not a substitute for advice from your doctor or midwife.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
  },
  contextLine: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
  closeBtn: {
    padding: 8,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  sectionSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  disclaimer: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
});
