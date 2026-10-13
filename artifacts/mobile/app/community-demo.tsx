import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useScopedStorage } from "@/lib/scopedAsyncStorage";
import { createDemoState, demoReducer, type DemoAction, type DemoState } from "@/lib/communityDemo";
import { Notice, ScreenHeader } from "@/components/MedicalUi";
import { useConfirmation } from "@/hooks/useConfirmation";

const KEY = "community_test_sandbox";
export default function CommunityDemo() {
  const colors = useColors();
  const storage = useScopedStorage();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { confirm, confirmationDialog } = useConfirmation();
  const [data, setData] = useState<DemoState>(() => createDemoState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"timeline" | "chat">(() => params.tab === "chat" ? "chat" : "timeline");
  const latest = useRef(data);
  const writes = useRef(Promise.resolve(true));
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const button = useMemo(() => ({ padding: 12, borderRadius: 12, backgroundColor: colors.secondary }), [colors.secondary]);
  const label = { color: colors.primary, fontFamily: "Nunito_700Bold", fontSize: 14 };
  const input = { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.foreground, backgroundColor: colors.card, fontFamily: "Nunito_400Regular", fontSize: 15 };
  useEffect(() => {
    let alive = true;
    setReady(false);
    storage.getItem(KEY).then(raw => {
      if (!alive) return;
      if (raw) {
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved.posts) || !Array.isArray(saved.messages)) throw new Error("Invalid test data.");
        latest.current = saved;
        setData(saved);
      }
      setReady(true);
    }).catch(() => { if (alive) { setError("Saved sample data could not be loaded. Use New samples to reset only this test area."); setReady(true); } });
    return () => { alive = false; };
  }, [storage]);
  const save = (change: DemoState | DemoAction) => {
    const operation = writes.current.then(async () => {
      const next = "posts" in change ? change : demoReducer(latest.current, change);
      try {
        await storage.setItem(KEY, JSON.stringify(next));
        latest.current = next;
        setData(next);
        setError("");
        return true;
      } catch { setError("Your test change could not be saved. Please try again."); return false; }
    });
    writes.current = operation;
    return operation;
  };
  const act = (action: DemoAction) => save(action);
  const key = () => `sample-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const submit = async () => {
    if (!text.trim() || !ready) return;
    if (await act({ type: tab === "timeline" ? "post" : "message", text, key: key() })) setText("");
  };
  const reset = async () => {
    if (await confirm("Generate new samples?", "Only posts and messages in this test area will be reset. Real posts, chats, health logs and subscriptions stay unchanged.", "New samples", "Cancel")) {
      if (await save(createDemoState())) { setText(""); setComments({}); }
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Community test area" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Notice icon="info">Sample data only. Try posts, likes, comments and chat without payment. Changes stay on this device, separate from real accounts and conversations. Do not enter private medical information; this is not medical advice.</Notice>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <TouchableOpacity onPress={() => { setTab("timeline"); setText(""); }} style={button}><Text style={label}>Sample timeline{tab === "timeline" ? " ✓" : ""}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setTab("chat"); setText(""); }} style={button}><Text style={label}>Sample chat{tab === "chat" ? " ✓" : ""}</Text></TouchableOpacity>
          <TouchableOpacity onPress={reset} disabled={!ready} style={button}><Text style={label}>New samples</Text></TouchableOpacity>
        </View>
        {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
        <TextInput accessibilityLabel={tab === "timeline" ? "Sample post text" : "Sample message"} value={text} onChangeText={setText} multiline maxLength={2000} placeholder={tab === "timeline" ? "Write a sample post…" : "Write a sample message…"} placeholderTextColor={colors.mutedForeground} style={[input, { minHeight: 70 }]} />
        <TouchableOpacity onPress={submit} disabled={!ready || !text.trim()} style={[button, { opacity: ready && text.trim() ? 1 : 0.5 }]}><Text style={label}>{tab === "timeline" ? "Publish sample post" : "Send sample message"}</Text></TouchableOpacity>
        {tab === "timeline" ? data.posts.map(p => (
          <View key={p.id} style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Nunito_700Bold", fontSize: 16 }}>{p.author} · {p.tag}</Text>
            <Text style={{ color: colors.foreground, fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22 }}>{p.text}</Text>
            <TouchableOpacity disabled={!ready} onPress={() => act({ type: "like", id: p.id })} accessibilityLabel={`Like ${p.author}'s sample post`} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Feather name="heart" color={p.liked ? colors.primary : colors.mutedForeground} size={20} /><Text style={label}>{p.likes} likes · {p.comments.length} comments</Text>
            </TouchableOpacity>
            {p.comments.map(c => <Text key={c.id} style={{ color: colors.mutedForeground, fontFamily: "Nunito_400Regular" }}>{c.text}</Text>)}
            <TextInput accessibilityLabel={`Comment on ${p.author}'s sample post`} style={input} value={comments[p.id] ?? ""} onChangeText={v => setComments(old => ({ ...old, [p.id]: v }))} maxLength={1000} placeholder="Write a sample comment…" placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity disabled={!ready || !comments[p.id]?.trim()} onPress={async () => {
              if (await act({ type: "comment", id: p.id, text: comments[p.id] ?? "", key: key() })) setComments(old => ({ ...old, [p.id]: "" }));
            }} style={button}><Text style={label}>Add sample comment</Text></TouchableOpacity>
          </View>
        )) : data.messages.map(m => (
          <View key={m.id} style={{ padding: 16, borderRadius: 16, backgroundColor: m.mine ? colors.secondary : colors.card, alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: "90%" }}>
            <Text style={label}>{m.mine ? "You (demo)" : "Demo conversation"}</Text>
            <Text style={{ color: colors.foreground, marginTop: 8, fontFamily: "Nunito_400Regular", fontSize: 15 }}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>
      {confirmationDialog}
    </View>
  );
}
