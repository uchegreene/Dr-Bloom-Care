import React from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Advisor } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = (Platform.OS === "web" ? 67 : insets.top) + 6;
  return (
    <View style={[s.header, { paddingTop: top, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[s.sub, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function VerifiedBadge({ label }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={s.badge} accessibilityLabel="Verified medical professional">
      <Feather name="check-circle" size={13} color={colors.verified} />
      {label ? <Text style={[s.badgeText, { color: colors.verified }]}>{label}</Text> : null}
    </View>
  );
}

export function Notice({ icon = "info", children, tone = "soft" }: { icon?: keyof typeof Feather.glyphMap; children: React.ReactNode; tone?: "soft" | "error" }) {
  const colors = useColors();
  const c = tone === "error" ? colors.destructive : colors.primary;
  return (
    <View style={[s.notice, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={c} style={{ marginTop: 2 }} />
      <Text style={[s.noticeText, { color: colors.foreground }]}>{children}</Text>
    </View>
  );
}

export const TEAM_DISCLOSURE =
  "Private messages are visible only to you and Dr Bloom Care's authorised medical team, who share one inbox. A team member answers under their own verified profile. Dr Bloom Care is not an emergency service: if you may be in danger, call your local emergency number or go to the nearest hospital.";

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useColors();
  return (
    <View style={[s.center]}>
      <Feather name="alert-circle" size={26} color={colors.destructive} />
      <Text style={[s.centerText, { color: colors.foreground }]}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={[s.btn, { backgroundColor: colors.primary }]}>
          <Text style={[s.btnText, { color: colors.primaryForeground }]}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Empty({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body?: string }) {
  const colors = useColors();
  return (
    <View style={s.center}>
      <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[s.centerTitle, { color: colors.foreground }]}>{title}</Text>
      {body ? <Text style={[s.centerText, { color: colors.mutedForeground }]}>{body}</Text> : null}
    </View>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  const colors = useColors();
  return (
    <View style={{ gap: 12, padding: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[s.skeleton, { backgroundColor: colors.muted }]} />
      ))}
    </View>
  );
}

export function AdvisorChips({
  advisors,
  selected,
  onToggle,
}: {
  advisors: Advisor[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      {advisors.map((a) => {
        const on = selected.includes(a.id);
        return (
          <TouchableOpacity
            key={a.id}
            onPress={() => onToggle(a.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[s.advisorRow, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.secondary : colors.card }]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[s.advisorName, { color: colors.foreground }]}>{a.name}</Text>
                {a.isVerified ? <VerifiedBadge /> : null}
              </View>
              <Text style={[s.sub, { color: colors.mutedForeground }]}>{a.title} · {a.specialty}</Text>
            </View>
            <Feather name={on ? "check-circle" : "circle"} size={20} color={on ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  pending,
  placeholder,
  bottomInset = 0,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  pending: boolean;
  placeholder: string;
  bottomInset?: number;
}) {
  const colors = useColors();
  const disabled = pending || value.trim().length === 0;
  return (
    <View style={[s.composer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: 10 + bottomInset }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={6000}
        style={[s.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={disabled}
        accessibilityLabel="Send"
        style={[s.send, { backgroundColor: colors.primary, opacity: disabled ? 0.5 : 1 }]}
      >
        {pending ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="send" size={18} color={colors.primaryForeground} />}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: "Nunito_700Bold", fontSize: 19 },
  sub: { fontFamily: "Nunito_400Regular", fontSize: 12.5, marginTop: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  notice: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  noticeText: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 12.5, lineHeight: 18 },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  centerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, textAlign: "center" },
  centerText: { fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  btn: { minHeight: 44, borderRadius: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  skeleton: { height: 92, borderRadius: 16 },
  advisorRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  advisorName: { fontFamily: "Nunito_700Bold", fontSize: 14.5 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: "Nunito_400Regular", fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

export function ResponderPicker({
  isAdmin,
  advisors,
  value,
  onChange,
  ownName,
}: {
  isAdmin: boolean;
  advisors: Advisor[];
  value: number | null;
  onChange: (id: number) => void;
  ownName?: string;
}) {
  const colors = useColors();
  if (!isAdmin) {
    return (
      <Text style={[s.sub, { color: colors.mutedForeground, paddingHorizontal: 16, paddingTop: 8 }]}>
        Replying under your own verified profile{ownName ? `: ${ownName}` : ""}.
      </Text>
    );
  }
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
      <Text style={[s.sub, { color: colors.mutedForeground, marginBottom: 6 }]}>Respond as (verified profile)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {advisors.filter((a) => a.isVerified && a.isActive).map((a) => {
          const on = value === a.id;
          return (
            <TouchableOpacity key={a.id} onPress={() => onChange(a.id)} style={{ borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : colors.card }}>
              <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 12, color: on ? colors.primaryForeground : colors.foreground }}>{a.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
