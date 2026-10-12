import { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useProfile } from "@/hooks/useProfileContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NotificationResponse } from "expo-notifications";

/** Remote notifications contain only a generic route, never private health data. */
export function DailyTipNotificationBridge() {
  const router = useRouter();
  const { profile } = useProfile();
  const eligible = Boolean(profile?.profileComplete && profile.subscriptionActive);
  useEffect(() => {
    if (Platform.OS === "web" || !eligible) return;
    let alive = true;
    let remove: (() => void) | undefined;
    const handle = async (response: NotificationResponse | null) => {
      if (!response || response.notification.request.content.data?.route !== "/daily-tips") return;
      const id = response.notification.request.identifier;
      try {
        const last = await AsyncStorage.getItem("drbloom.lastDailyTipNotification");
        if (!alive || id === last) return;
        await AsyncStorage.setItem("drbloom.lastDailyTipNotification", id);
        if (alive) router.push("/daily-tips" as Href);
      } catch { /* A notification tap must not crash app navigation. */ }
    };
    import("expo-notifications").then(async notifications => {
      if (!alive) return;
      const listener = notifications.addNotificationResponseReceivedListener(response => void handle(response));
      remove = () => listener.remove();
      await handle(await notifications.getLastNotificationResponseAsync());
    }).catch(() => undefined);
    return () => { alive = false; remove?.(); };
  }, [eligible, profile?.userId, router]);
  return null;
}
