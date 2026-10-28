import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateAdvice,
  useCreateAdvisor,
  useAssignMedicalTeamMember,
  useListMedicalTeam,
  useRevokeMedicalTeamMember,
  useListAdminAdvisors,
  useListAdminMembers,
  useListPlans,
  useUpdatePlanPrice,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useConfirmation } from "@/hooks/useConfirmation";
import { useProfile } from "@/hooks/useProfileContext";
import { AdminAccessManager } from "@/components/AdminAccessManager";

const formatNaira = (value: number) => `₦${value.toLocaleString("en-NG")}`;
const CATEGORIES = [
  "Cycle health",
  "Pregnancy",
  "Sexual health",
  "Newborn care",
  "General",
] as const;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
        ]}
      />
    </View>
  );
}

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const plansQuery = useListPlans();
  const membersQuery = useListAdminMembers({ query: { queryKey: ["/admin/members"], enabled: isAdmin, retry: false } });
  const advisorsQuery = useListAdminAdvisors({ query: { queryKey: ["/admin/advisors"], enabled: isAdmin, retry: false } });
  const teamQuery = useListMedicalTeam({ query: { queryKey: ["/admin/medical-team", profile?.userId], enabled: isAdmin, retry: false } });
  const assignTeam = useAssignMedicalTeamMember();
  const revokeTeam = useRevokeMedicalTeamMember();
  const [teamSearch, setTeamSearch] = useState("");
  const [teamUser, setTeamUser] = useState<string | null>(null);
  const [teamAdvisor, setTeamAdvisor] = useState<number | null>(null);
  const updatePlan = useUpdatePlanPrice();
  const createAdvisor = useCreateAdvisor();
  const createAdvice = useCreateAdvice();
  const [cyclePrice, setCyclePrice] = useState("");
  const [pregnancyPrice, setPregnancyPrice] = useState("");
  const [feedback, setFeedback] = useState("");
  const { confirm, confirmationDialog } = useConfirmation();
  const [advisorName, setAdvisorName] = useState("");
  const [advisorTitle, setAdvisorTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [credentials, setCredentials] = useState("");
  const [advisorBio, setAdvisorBio] = useState("");
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<number | null>(null);
  const [adviceTitle, setAdviceTitle] = useState("");
  const [adviceBody, setAdviceBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("General");

  useEffect(() => {
    if (!plansQuery.data) return;
    const cycle = plansQuery.data.find((plan) => plan.plan === "cycle");
    const pregnancy = plansQuery.data.find((plan) => plan.plan === "pregnancy");
    if (cycle) setCyclePrice(String(cycle.priceNaira));
    if (pregnancy) setPregnancyPrice(String(pregnancy.priceNaira));
  }, [plansQuery.data]);

  if (profile?.role !== "admin") return <Redirect href="/" />;
  if (!profile.profileComplete) return (
    <View style={{ flex: 1, justifyContent: "center", padding: 28, gap: 18, backgroundColor: colors.background }}>
      <Text style={{ color: colors.foreground, fontFamily: "Nunito_700Bold", fontSize: 20 }}>Complete your administrator account</Text>
      <Text style={{ color: colors.mutedForeground }}>Your verified identity is authorized. Complete your account details before using administrative tools.</Text>
      <TouchableOpacity onPress={() => router.replace("/onboarding")}><Text style={{ color: colors.primary }}>Complete account setup</Text></TouchableOpacity>
    </View>
  );

  const savePrice = async (plan: "cycle" | "pregnancy", value: string) => {
    const priceNaira = Number(value);
    if (!Number.isSafeInteger(priceNaira) || priceNaira < 0) {
      setFeedback("Enter a whole-number monthly price in naira.");
      return;
    }
    try {
      await updatePlan.mutateAsync({ plan, data: { priceNaira } });
      await plansQuery.refetch();
      setFeedback(`${plan === "cycle" ? "Cycle" : "Pregnancy"} fee saved.`);
    } catch {
      setFeedback("Could not save the fee. Check your connection and try again.");
    }
  };

  const saveAdvisor = async () => {
    if (!credentialsVerified) {
      setFeedback("Confirm the advisor’s identity and credentials before assigning a verified badge.");
      return;
    }
    try {
      await createAdvisor.mutateAsync({
        data: {
          name: advisorName.trim(),
          title: advisorTitle.trim(),
          specialty: specialty.trim(),
          credentials: credentials.trim(),
          bio: advisorBio.trim(),
          credentialsVerified: true,
        },
      });
      setAdvisorName("");
      setAdvisorTitle("");
      setSpecialty("");
      setCredentials("");
      setAdvisorBio("");
      setCredentialsVerified(false);
      setFeedback("Verified advisor profile added.");
      await advisorsQuery.refetch();
    } catch {
      setFeedback("Could not add the advisor. Complete all fields and try again.");
    }
  };

  const publishAdvice = async () => {
    if (!selectedAdvisor) {
      setFeedback("Choose an advisor profile first.");
      return;
    }
    try {
      await createAdvice.mutateAsync({
        data: {
          advisorId: selectedAdvisor,
          title: adviceTitle.trim(),
          body: adviceBody.trim(),
          category,
        },
      });
      setAdviceTitle("");
      setAdviceBody("");
      setFeedback("Advice published to the member feed.");
      await queryClient.invalidateQueries();
    } catch {
      setFeedback("Could not publish advice. Check the fields and try again.");
    }
  };

  const authorizeTeam = async () => {
    if (!teamUser || !teamAdvisor) {
      setFeedback("Choose a registered member and a verified advisor profile.");
      return;
    }
    try {
      await assignTeam.mutateAsync({ data: { userId: teamUser, advisorId: teamAdvisor } });
      setTeamUser(null);
      setTeamAdvisor(null);
      setFeedback("Medical-team access authorised.");
      await queryClient.invalidateQueries();
    } catch {
      setFeedback("Could not authorise this account.");
    }
  };

  const revokeMember = async (member: { userId: string; username: string }) => {
    const ok = await confirm("Revoke medical-team access", `@${member.username} will lose access to the shared inbox and can no longer answer under a verified profile.`, "Revoke access");
    if (!ok) return;
    try {
      await revokeTeam.mutateAsync({ userId: member.userId });
      setFeedback(`Revoked @${member.username}.`);
      await queryClient.invalidateQueries();
    } catch {
      setFeedback("Could not revoke access.");
    }
  };


  return (
    <ScrollView
      style={[styles.page, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{profile.isSuperAdmin ? "Super admin tools" : "Admin tools"}</Text>
      </View>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        Fees, member subscription status, and professional advice publishing. Paid subscriptions do not require admin approval.
      </Text>
      <TouchableOpacity onPress={() => router.push("/daily-tip-review" as never)} style={{ paddingVertical: 8 }}>
        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: colors.primary }}>Review daily health tips</Text>
      </TouchableOpacity>
      {feedback ? <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}
      {membersQuery.error || advisorsQuery.error || plansQuery.error ? (
        <Text style={[styles.feedback, { color: "#B42318" }]}>
          Could not load admin data. Check your connection and reopen this page.
        </Text>
      ) : null}

      {profile.isSuperAdmin ? <AdminAccessManager members={membersQuery.data ?? []} currentUserId={profile.userId} /> : null}
      <Section title="Monthly plan fees">
        <Field label="Cycle plan (₦)" value={cyclePrice} onChangeText={setCyclePrice} keyboardType="number-pad" />
        <TouchableOpacity
          onPress={() => savePrice("cycle", cyclePrice)}
          disabled={updatePlan.isPending}
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Save cycle fee</Text>
        </TouchableOpacity>
        <Field label="Pregnancy plan (₦)" value={pregnancyPrice} onChangeText={setPregnancyPrice} keyboardType="number-pad" />
        <TouchableOpacity
          onPress={() => savePrice("pregnancy", pregnancyPrice)}
          disabled={updatePlan.isPending}
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Save pregnancy fee</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Add a care professional">
        <Field label="Display name" value={advisorName} onChangeText={setAdvisorName} placeholder="Dr. Amina Okafor" />
        <Field label="Professional title" value={advisorTitle} onChangeText={setAdvisorTitle} placeholder="Obstetrician & gynaecologist" />
        <Field label="Specialty" value={specialty} onChangeText={setSpecialty} placeholder="Women’s reproductive health" />
        <Field label="Credentials" value={credentials} onChangeText={setCredentials} placeholder="Qualifications and license details" />
        <Field label="Short profile" value={advisorBio} onChangeText={setAdvisorBio} multiline placeholder="A short professional biography" />
        <TouchableOpacity
          onPress={() => setCredentialsVerified((value) => !value)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: credentialsVerified }}
        >
          <Feather name={credentialsVerified ? "check-square" : "square"} size={20} color={colors.primary} />
          <Text style={[styles.checkText, { color: colors.foreground }]}>
            I checked this person’s identity and professional credentials; the blue verified badge is accurate.
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={saveAdvisor}
          disabled={createAdvisor.isPending || !credentialsVerified}
          style={[styles.actionButton, { backgroundColor: colors.primary, opacity: credentialsVerified ? 1 : 0.55 }]}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>
            {createAdvisor.isPending ? "Adding…" : "Add verified profile"}
          </Text>
        </TouchableOpacity>
        {(advisorsQuery.data ?? []).map((advisor) => (
          <TouchableOpacity
            key={advisor.id}
            onPress={() => setSelectedAdvisor(advisor.id)}
            style={[
              styles.listRow,
              { borderColor: selectedAdvisor === advisor.id ? colors.primary : colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                {advisor.name}  {advisor.isVerified ? "✓" : ""}
              </Text>
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>
                {advisor.title} · {advisor.specialty}
              </Text>
            </View>
            <Text style={[styles.selectLabel, { color: colors.primary }]}>
              {selectedAdvisor === advisor.id ? "Selected" : "Select"}
            </Text>
          </TouchableOpacity>
        ))}
      </Section>

      <Section title="Publish professional advice">
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>
          New advice appears with the advisor’s name, credentials, and verified badge.
        </Text>
        <Field label="Advice title" value={adviceTitle} onChangeText={setAdviceTitle} placeholder="A clear, helpful title" />
        <Field label="Advice" value={adviceBody} onChangeText={setAdviceBody} multiline placeholder="Write the advice for members…" />
        <View style={styles.chips}>
          {CATEGORIES.map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setCategory(value)}
              style={[
                styles.chip,
                { backgroundColor: category === value ? colors.primary : colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: category === value ? colors.primaryForeground : colors.foreground, fontFamily: "Nunito_600SemiBold", fontSize: 12 }}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={publishAdvice}
          disabled={createAdvice.isPending || !selectedAdvisor}
          style={[styles.actionButton, { backgroundColor: colors.primary, opacity: selectedAdvisor ? 1 : 0.55 }]}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>
            {createAdvice.isPending ? "Publishing…" : "Publish advice"}
          </Text>
        </TouchableOpacity>
      </Section>

      <Section title="Medical team access">
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>
          Link a registered member to an existing verified advisor profile. They answer under that profile and share the team inbox.
        </Text>
        {(teamQuery.data ?? []).map((m) => (
          <View key={m.userId} style={[styles.listRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{m.name} (@{m.username})</Text>
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>Responds as {m.advisorName}</Text>
            </View>
            <TouchableOpacity onPress={() => revokeMember(m)} disabled={revokeTeam.isPending}>
              <Text style={[styles.selectLabel, { color: colors.destructive }]}>Revoke</Text>
            </TouchableOpacity>
          </View>
        ))}
        {teamQuery.error ? <Text style={[styles.caption, { color: colors.destructive }]}>Could not load the medical team.</Text> : null}
        <Field label="Find a member" value={teamSearch} onChangeText={setTeamSearch} placeholder="Name, username or email" />
        {teamSearch.trim().length > 0
          ? (membersQuery.data ?? [])
              .filter((m) => `${m.name ?? ""} ${m.username ?? ""} ${m.email}`.toLowerCase().includes(teamSearch.trim().toLowerCase()))
              .slice(0, 6)
              .map((m) => (
                <TouchableOpacity key={m.userId} onPress={() => setTeamUser(m.userId)} style={[styles.listRow, { borderColor: teamUser === m.userId ? colors.primary : colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]}>{m.name || m.username || m.email}</Text>
                    <Text style={[styles.caption, { color: colors.mutedForeground }]}>{m.email}</Text>
                  </View>
                  <Text style={[styles.selectLabel, { color: colors.primary }]}>{teamUser === m.userId ? "Selected" : "Select"}</Text>
                </TouchableOpacity>
              ))
          : null}
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>Responding profile</Text>
        <View style={styles.chips}>
          {(advisorsQuery.data ?? []).filter((a) => a.isVerified).map((a) => (
            <TouchableOpacity key={a.id} onPress={() => setTeamAdvisor(a.id)} style={[styles.chip, { backgroundColor: teamAdvisor === a.id ? colors.primary : colors.card, borderColor: colors.border }]}>
              <Text style={{ color: teamAdvisor === a.id ? colors.primaryForeground : colors.foreground, fontFamily: "Nunito_600SemiBold", fontSize: 12 }}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={authorizeTeam}
          disabled={assignTeam.isPending || !teamUser || !teamAdvisor}
          style={[styles.actionButton, { backgroundColor: colors.primary, opacity: teamUser && teamAdvisor ? 1 : 0.55 }]}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>{assignTeam.isPending ? "Authorising…" : "Authorise medical-team access"}</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Member subscriptions">
        {membersQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {(membersQuery.data ?? []).map((member) => {
          return (
            <View key={member.userId} style={[styles.memberCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                {member.name || member.username || member.email}
              </Text>
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>
                {member.email} · @{member.username || "no username"}
              </Text>
              <Text style={[styles.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
                Plan: {member.subscriptionPlan ?? "Free"} · Status: {member.subscriptionStatus}
              </Text>
              <Text style={[styles.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
                {member.subscriptionExpiresAt ? `Expires: ${new Date(member.subscriptionExpiresAt).toLocaleString()}` : "No active paid period"}
              </Text>
            </View>
          );
        })}
        {!membersQuery.isLoading && (membersQuery.data?.length ?? 0) === 0 ? (
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>No member accounts yet.</Text>
        ) : null}
      </Section>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        Bloom does not collect or renew payments. Verify each external payment before granting access.
      </Text>
      {confirmationDialog}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: 50 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  back: { padding: 4 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 26 },
  caption: { fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  feedback: { fontFamily: "Nunito_700Bold", fontSize: 13, marginTop: 12 },
  section: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 18 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 18 },
  label: { fontFamily: "Nunito_600SemiBold", fontSize: 13, marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Nunito_400Regular", fontSize: 14 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  actionButton: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginTop: 10 },
  actionText: { fontFamily: "Nunito_700Bold", fontSize: 14, textAlign: "center" },
  checkRow: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginTop: 14 },
  checkText: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 19 },
  listRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  rowTitle: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  selectLabel: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  memberCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  disclaimer: { fontFamily: "Nunito_400Regular", fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: "center" },
});
