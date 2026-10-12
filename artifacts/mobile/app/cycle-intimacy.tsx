import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useCycle } from '@/hooks/useCycleContext';
import { useProfile } from '@/hooks/useProfileContext';
import { format, parseISO } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CycleIntimacyScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { intimacyLogs, logIntimacy, removeIntimacy } = useCycle();
  const { profile } = useProfile();

  const existing = date ? intimacyLogs[date] : null;
  const [protectedSex, setProtectedSex] = useState<boolean>(existing?.protectedSex ?? true);

  if (
    !profile?.subscriptionActive ||
    profile.subscriptionPlan !== "cycle" ||
    profile.mode !== "cycle"
  ) return <Redirect href="/(tabs)/community" />;
  if (!date) return null;

  const handleSave = async () => {
    await logIntimacy(date, protectedSex);
    router.back();
  };

  const handleRemove = async () => {
    await removeIntimacy(date);
    router.back();
  };

  const Option = ({ value, label, icon, desc }: { value: boolean; label: string; icon: keyof typeof Feather.glyphMap; desc: string }) => {
    const selected = protectedSex === value;
    return (
      <TouchableOpacity
        style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.card }]}
        onPress={() => setProtectedSex(value)}
        activeOpacity={0.85}
      >
        <Feather name={icon} size={22} color={selected ? colors.primary : colors.mutedForeground} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionLabel, { color: selected ? colors.primary : colors.foreground }]}>{label}</Text>
          <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        </View>
        {selected && <Feather name="check-circle" size={20} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

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
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Log intimacy</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          This is private to you and helps estimate your chance of pregnancy.
        </Text>

        <View style={{ gap: 12, marginTop: 8 }}>
          <Option value={true} label="Protected" icon="shield" desc="Used a condom or other barrier method" />
          <Option value={false} label="Unprotected" icon="alert-triangle" desc="No barrier method used" />
        </View>

        {existing && (
          <TouchableOpacity style={[styles.removeBtn, { borderColor: colors.border }]} onPress={handleRemove} activeOpacity={0.8}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
            <Text style={[styles.removeText, { color: colors.destructive }]}>Remove this entry</Text>
          </TouchableOpacity>
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
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  optionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  optionDesc: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 28,
  },
  removeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
});
