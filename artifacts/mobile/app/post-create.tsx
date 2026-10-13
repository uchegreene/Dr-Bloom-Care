import React, { useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCommunityPost,
  useListAdvisors,
  useRequestCommunityUpload,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { errorMessage, useMedicalAccess } from "@/hooks/useMedicalAccess";
import { AdvisorChips, Notice, ScreenHeader } from "@/components/MedicalUi";

const TAGS = ["Journey", "Advice", "Health"] as const;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof TYPES)[number];

export default function PostCreate() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { userId, ready, isPaid } = useMedicalAccess();
  const canInteract = ready && isPaid;
  const advisors = useListAdvisors({ query: { queryKey: ["advisors", userId], enabled: ready && canInteract } });
  const createPost = useCreateCommunityPost();
  const requestUpload = useRequestCommunityUpload();
  const [text, setText] = useState("");
  const [tag, setTag] = useState<(typeof TAGS)[number] | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [tagged, setTagged] = useState<number[]>([]);
  const [stage, setStage] = useState<"" | "Preparing photo…" | "Uploading photo…" | "Publishing…">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!ready) return null;
  if (!canInteract) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Write a post" />
      <View style={{ padding: 20, gap: 18 }}>
        <Notice icon="lock">Posting, commenting and tagging medical profiles require an active subscription. Free accounts can still read the timeline. Your account and posts have not been deleted.</Notice>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={{ padding: 16, backgroundColor: colors.primary, borderRadius: 14 }}>
          <Text style={{ color: colors.primaryForeground, fontFamily: "Nunito_700Bold" }}>View subscription plans</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/community-demo" as never)} style={{ padding: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Nunito_700Bold" }}>Try posting, likes and comments with sample data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  if (done) return <Redirect href="/(tabs)/community" />;

  const pick = async () => {
    setError("");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setAsset(result.assets[0]);
  };

  const toggleTag = (id: number) => {
    setError("");
    setTagged((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) {
        setError("You can tag up to 3 verified profiles.");
        return cur;
      }
      return [...cur, id];
    });
  };

  const submit = async () => {
    if (stage) return;
    if (!text.trim() && !asset) {
      setError("Write something or add a photo first.");
      return;
    }
    setError("");
    try {
      let imageId: string | null = null;
      if (asset) {
        setStage("Preparing photo…");
        const blob = await (await fetch(asset.uri)).blob();
        const type = (blob.type || asset.mimeType || "") as ImageType;
        if (!TYPES.includes(type)) throw new Error("Photos must be JPEG, PNG or WebP.");
        if (blob.size > MAX_BYTES || blob.size < 1) throw new Error("Photos must be 8 MB or smaller.");
        const upload = await requestUpload.mutateAsync({ data: { contentType: type, size: blob.size } });
        setStage("Uploading photo…");
        const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: blob });
        if (!put.ok) throw new Error("The photo upload failed. Please try again.");
        imageId = upload.imageId;
      }
      setStage("Publishing…");
      await createPost.mutateAsync({
        data: { text: text.trim(), tag, imageId, advisorIds: tagged },
      });
      await qc.invalidateQueries({ queryKey: ["community"] });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e, "Could not publish your post."));
      setStage("");
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="New post"
        right={
          <TouchableOpacity onPress={submit} disabled={!!stage} style={[styles.post, { backgroundColor: colors.primary, opacity: stage ? 0.6 : 1 }]}>
            {stage ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.postText, { color: colors.primaryForeground }]}>Post</Text>}
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Share an experience or ask the community…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={6000}
          style={[styles.input, { color: colors.foreground }]}
        />
        {asset ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: asset.uri }} style={styles.preview} contentFit="cover" />
            <TouchableOpacity onPress={() => setAsset(null)} style={[styles.remove, { backgroundColor: colors.card }]} accessibilityLabel="Remove photo">
              <Feather name="x" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={pick} style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="image" size={18} color={colors.primary} />
            <Text style={[styles.photoText, { color: colors.foreground }]}>Add a photo</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.label, { color: colors.foreground }]}>Topic</Text>
        <View style={styles.tagRow}>
          {TAGS.map((t) => {
            const on = tag === t;
            return (
              <TouchableOpacity key={t} onPress={() => setTag(on ? null : t)} style={[styles.chip, { backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border }]}>
                <Text style={[styles.chipText, { color: on ? colors.primaryForeground : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>Tag verified professionals ({tagged.length}/3)</Text>
        <View style={{ marginBottom: 12 }}>
          <Notice icon="eye">
            Tagged profiles and Bloom's authorised medical team can see and answer this post. The post itself is visible to all members. Do not share details you want kept private; use a private message for those. Bloom is not an emergency service.
          </Notice>
        </View>
        {advisors.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {advisors.error ? <Text style={[styles.err, { color: colors.destructive }]}>Could not load profiles.</Text> : null}
        <AdvisorChips advisors={advisors.data ?? []} selected={tagged} onToggle={toggleTag} />
        {stage ? <Text style={[styles.stage, { color: colors.primary }]}>{stage}</Text> : null}
        {error ? <Text style={[styles.err, { color: colors.destructive }]}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: Platform.OS === "web" ? 60 : 40 },
  post: { minWidth: 64, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  postText: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  input: { fontFamily: "Nunito_400Regular", fontSize: 17, lineHeight: 25, minHeight: 130, textAlignVertical: "top" },
  photoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginTop: 14 },
  photoText: { fontFamily: "Nunito_600SemiBold", fontSize: 15 },
  previewWrap: { marginTop: 14, borderRadius: 16, overflow: "hidden" },
  preview: { width: "100%", height: 220 },
  remove: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, marginTop: 22, marginBottom: 10 },
  tagRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 14 },
  stage: { fontFamily: "Nunito_700Bold", fontSize: 13, marginTop: 14 },
  err: { fontFamily: "Nunito_700Bold", fontSize: 13, marginTop: 12 },
});
