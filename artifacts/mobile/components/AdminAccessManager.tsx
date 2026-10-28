import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useListAdminAssignments, useSetAdminAssignment, type AdminMember } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useConfirmation } from "@/hooks/useConfirmation";

export function AdminAccessManager({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  const colors = useColors();
  const assignments = useListAdminAssignments({ query: { queryKey: ["/admin/assignments", currentUserId], refetchInterval: 15000, retry: false } });
  const mutation = useSetAdminAssignment();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const { confirm, confirmationDialog } = useConfirmation();
  const membersById = new Map(members.map(member => [member.userId, member]));
  const active = assignments.data?.filter(entry => entry.active) ?? [];
  const candidates = members.filter(member => member.userId !== currentUserId
    && `${member.name} ${member.email} ${member.username}`.toLowerCase().includes(search.toLowerCase())).slice(0, 12);
  const label = { color: colors.foreground, fontFamily: "Nunito_700Bold", fontSize: 15 };
  const change = async (member: Pick<AdminMember, "userId" | "email">, enabled: boolean) => {
    if (!await confirm(enabled ? "Assign administrator?" : "Remove administrator access?",
      `${member.email}${enabled ? " will be able to manage fees, professional profiles and medical-team assignments. Only you can assign other administrators." : " will lose administrator permissions immediately. Their account, membership and records will remain."}`,
      enabled ? "Assign administrator" : "Remove access", "Cancel")) return;
    try {
      await mutation.mutateAsync({ userId: member.userId, data: { active: enabled } });
      await assignments.refetch();
      setMessage(enabled ? "Administrator assigned. They can refresh their account to access admin tools." : "Administrator access removed.");
    } catch { setMessage("Access could not be changed. Check the account is verified and try again."); }
  };
  return <View style={{ marginVertical: 20, padding: 18, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
    <Text style={[label, { fontSize: 19 }]}>Administrator access</Text>
    <Text style={{ color: colors.mutedForeground, fontFamily: "Nunito_400Regular" }}>Super admin only. Assign registered, verified accounts. Medical-team membership is managed separately below.</Text>
    {message ? <Text accessibilityRole="alert" style={{ color: colors.foreground }}>{message}</Text> : null}
    {assignments.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {assignments.error ? <TouchableOpacity onPress={() => assignments.refetch()}><Text style={label}>Could not load administrator access. Tap to retry.</Text></TouchableOpacity> : null}
    <Text style={label}>Current administrators</Text>
    <Text style={{ color: colors.mutedForeground }}>You · Super admin · protected</Text>
    {active.map(entry => <View key={entry.userId} style={{ gap: 6 }}>
      <Text style={{ color: colors.foreground }}>{membersById.get(entry.userId)?.name || entry.email}</Text>
      <TouchableOpacity disabled={mutation.isPending} accessibilityLabel={`Remove administrator access for ${entry.email}`} onPress={() => change(entry, false)} style={{ paddingVertical: 10 }}>
        <Text style={{ color: "#B42318", fontFamily: "Nunito_700Bold" }}>Remove administrator access</Text>
      </TouchableOpacity>
    </View>)}
    {!assignments.isLoading && !assignments.error && active.length === 0 ? <Text style={{ color: colors.mutedForeground }}>No other administrators assigned.</Text> : null}
    <TextInput accessibilityLabel="Search registered accounts" value={search} onChangeText={setSearch}
      placeholder="Search by name, username or email" placeholderTextColor={colors.mutedForeground}
      autoCapitalize="none" style={{ borderWidth: 1, borderColor: colors.border, color: colors.foreground, borderRadius: 10, padding: 12 }} />
    {search.trim() ? candidates.filter(member => !active.some(entry => entry.userId === member.userId)).map(member =>
      <TouchableOpacity key={member.userId} disabled={mutation.isPending || assignments.isLoading || Boolean(assignments.error)}
        onPress={() => change(member, true)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={label}>{member.name || member.username || member.email}</Text>
        <Text style={{ color: colors.mutedForeground }}>{member.email}</Text>
        <Text style={{ color: colors.primary, fontFamily: "Nunito_700Bold", marginTop: 6 }}>Assign administrator</Text>
      </TouchableOpacity>) : <Text style={{ color: colors.mutedForeground }}>Search for a registered account to assign an administrator.</Text>}
    {confirmationDialog}
  </View>;
}
