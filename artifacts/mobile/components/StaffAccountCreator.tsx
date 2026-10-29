import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateStaffAccount, useListAdminAdvisors, useListMedicalTeam } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useConfirmation } from "@/hooks/useConfirmation";

export function StaffAccountCreator({ userId }: { userId: string }) {
  const colors = useColors();
  const client = useQueryClient();
  const advisors = useListAdminAdvisors({ query: { queryKey: ["/admin/advisors"], retry: false } });
  const team = useListMedicalTeam({ query: { queryKey: ["/admin/medical-team", userId], retry: false } });
  const create = useCreateStaffAccount();
  const { confirm, confirmationDialog } = useConfirmation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "medical_team">("medical_team");
  const [advisorId, setAdvisorId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const label = { color: colors.foreground, fontFamily: "Nunito_700Bold", fontSize: 15 };
  const input = { borderWidth: 1, borderColor: colors.border, color: colors.foreground, borderRadius: 10, padding: 12 };
  const choices = advisors.data?.filter(a => a.isVerified && a.isActive && !team.data?.some(t => t.advisorId === a.id)) ?? [];
  const submit = async () => {
    if (!await confirm("Create staff account?", `Create ${email.trim()} as ${role === "admin" ? "a sub-admin who can manage app operations, but cannot add staff or other admins" : "medical staff with access to the shared care inbox" }? They will set their own password by email verification.`, "Create account", "Cancel")) return;
    setMessage("");
    try {
      const result = await create.mutateAsync({ data: {
        email: email.trim(), name: name.trim(), role, ...(role === "medical_team" ? { advisorId: advisorId! } : {}),
      } });
      setMessage(`Account created for ${result.email}. Ask them to open the admin portal, select “Forgot password?”, and verify their email to choose a private password. They must complete their profile on first sign-in. No invitation email has been sent.`);
      setEmail(""); setName(""); setAdvisorId(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["/admin/assignments", userId] }),
        client.invalidateQueries({ queryKey: ["/admin/members"] }),
        team.refetch(),
      ]);
    } catch (error) {
      const problem = error as { data?: { error?: string }; message?: string };
      setMessage(problem.data?.error || "Account could not be created. The email may already be registered; use the existing-account assignment tools for registered users.");
    }
  };
  return <View style={{ gap: 12, borderWidth: 1, borderColor: colors.border, padding: 18, borderRadius: 16, backgroundColor: colors.card }}>
    <Text style={[label, { fontSize: 19 }]}>Create staff account</Text>
    <Text style={{ color: colors.mutedForeground }}>Super admin only. Staff cannot register through this portal. Medical access does not grant general administrator permissions.</Text>
    <TextInput accessibilityLabel="Staff personal name" placeholder="Staff personal name" placeholderTextColor={colors.mutedForeground} value={name} onChangeText={setName} editable={!create.isPending} style={input} />
    <TextInput accessibilityLabel="Staff email" placeholder="Staff email" placeholderTextColor={colors.mutedForeground} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!create.isPending} style={input} />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {(["medical_team", "admin"] as const).map(option => <TouchableOpacity key={option} disabled={create.isPending} onPress={() => setRole(option)} accessibilityRole="radio" accessibilityState={{ checked: role === option }} style={[input, { borderColor: role === option ? colors.primary : colors.border }]}>
        <Text style={label}>{option === "admin" ? "Sub-admin" : "Medical staff"}</Text>
      </TouchableOpacity>)}
    </View>
    {role === "medical_team" ? <>
      <Text style={label}>Assigned professional profile name</Text>
      <Text style={{ color: colors.mutedForeground }}>Choose the public name this professional will use for advice and medical replies. It is separate from their personal account name and cannot be changed in staff setup.</Text>
      {advisors.isLoading || team.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {advisors.error || team.error ? <TouchableOpacity onPress={() => { advisors.refetch(); team.refetch(); }}><Text style={{ color: colors.destructive }}>Could not load profiles. Tap to retry.</Text></TouchableOpacity> : choices.map(a => <TouchableOpacity key={a.id} disabled={create.isPending} onPress={() => setAdvisorId(a.id)} style={[input, { borderColor: advisorId === a.id ? colors.primary : colors.border }]}>
        <Text style={label}>{a.name} · {a.title}{advisorId === a.id ? " · Selected" : ""}</Text>
      </TouchableOpacity>)}
      {!advisors.isLoading && !team.isLoading && !advisors.error && !team.error && choices.length === 0 ? <Text style={{ color: colors.mutedForeground }}>Add and verify an unassigned professional profile below before creating medical staff.</Text> : null}
    </> : null}
    {message ? <Text accessibilityRole="alert" style={{ color: colors.foreground, lineHeight: 22 }}>{message}</Text> : null}
    <TouchableOpacity accessibilityRole="button" onPress={submit} disabled={create.isPending || !email.trim() || name.trim().length < 2 || (role === "medical_team" && (!advisorId || Boolean(advisors.error) || Boolean(team.error)))} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: "center" }}>
      {create.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Create staff account</Text>}
    </TouchableOpacity>
    {confirmationDialog}
  </View>;
}
