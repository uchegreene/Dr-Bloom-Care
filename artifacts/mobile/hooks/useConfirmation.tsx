import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

export function useConfirmation() {
  const colors = useColors();
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const finish = useCallback((accepted: boolean) => {
    resolver.current?.(accepted);
    resolver.current = null;
    setRequest(null);
  }, []);
  useEffect(() => () => resolver.current?.(false), []);

  const confirm = useCallback((
    title: string,
    message: string,
    confirmLabel = "Continue",
    cancelLabel = "Cancel",
  ) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setRequest({ title, message, confirmLabel, cancelLabel });
  }), []);

  const confirmationDialog = (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityViewIsModal>
          <Text style={[styles.title, { color: colors.foreground }]}>{request?.title}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{request?.message}</Text>
          <TouchableOpacity
            onPress={() => finish(true)}
            style={[styles.button, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{request?.confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => finish(false)} style={styles.cancel} accessibilityRole="button">
            <Text style={[styles.buttonText, { color: colors.mutedForeground }]}>{request?.cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  return { confirm, confirmationDialog };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, borderRadius: 20, padding: 22, borderWidth: 1 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 20 },
  body: { fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 20 },
  button: { minHeight: 48, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: "Nunito_700Bold", fontSize: 14, textAlign: "center" },
  cancel: { padding: 14, alignItems: "center" },
});
