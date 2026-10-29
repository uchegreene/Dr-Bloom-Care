import React, { useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { validatedStoreLink } from "@/lib/appStoreLinks";

export function AppStoreDownloads() {
  const colors = useColors();
  const [error, setError] = useState("");
  const stores = [
    { name: "App Store", icon: "logo-apple" as const, url: validatedStoreLink(process.env.EXPO_PUBLIC_APP_STORE_URL, "apple") },
    { name: "Google Play", icon: "logo-google-playstore" as const, url: validatedStoreLink(process.env.EXPO_PUBLIC_PLAY_STORE_URL, "google") },
  ];
  return <View style={[styles.section, { borderTopColor: colors.border }]}>
    <Text style={[styles.heading, { color: colors.foreground }]}>Get the mobile app</Text>
    <View style={styles.buttons}>{stores.map(store => <TouchableOpacity key={store.name}
      accessibilityRole="link" accessibilityLabel={`${store.name}${store.url ? "" : " — link not available yet"}`}
      accessibilityState={{ disabled: !store.url }} disabled={!store.url}
      onPress={async () => {
        if (!store.url) return;
        setError("");
        try { await Linking.openURL(store.url); } catch { setError("The store link couldn’t open. Please try again."); }
      }}
      style={[styles.button, { borderColor: colors.border, backgroundColor: colors.card, opacity: store.url ? 1 : 0.55 }]}>
      <Ionicons name={store.icon} size={25} color={colors.foreground} />
      <View><Text style={{ fontSize: 11, color: colors.mutedForeground }}>{store.url ? "Download on" : "Link not added yet"}</Text>
        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: colors.foreground }}>{store.name}</Text></View>
    </TouchableOpacity>)}</View>
    {stores.some(store => !store.url) ? <Text style={[styles.note, { color: colors.mutedForeground }]}>Store links haven’t all been added yet. You can keep using the web app here.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={[styles.note, { color: colors.destructive }]}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, marginTop: 26, paddingTop: 22, gap: 12 },
  heading: { fontFamily: "Nunito_700Bold", fontSize: 16, textAlign: "center" },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  button: { flex: 1, minWidth: 140, borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  note: { fontFamily: "Nunito_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },
});
