import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { TipGroup } from '@/constants/healthTips';

interface Props {
  group: TipGroup;
  maxTips?: number;
  onSeeMore?: () => void;
}

export function HealthTipsCard({ group, maxTips = 3, onSeeMore }: Props) {
  const colors = useColors();
  const shown = group.tips.slice(0, maxTips);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name={group.icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Health Tips</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{group.subtitle}</Text>
        </View>
      </View>

      <View style={styles.tipList}>
        {shown.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Feather name="check" size={16} color={colors.primary} style={{ marginTop: 3 }} />
            <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
          </View>
        ))}
      </View>

      {onSeeMore && (
        <TouchableOpacity style={styles.seeMore} onPress={onSeeMore} activeOpacity={0.7}>
          <Text style={[styles.seeMoreText, { color: colors.primary }]}>See all tips</Text>
          <Feather name="arrow-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  header: {
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
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  subtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  tipList: {
    gap: 12,
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
  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  seeMoreText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
});
