import { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { NotificationPermissionsStatus } from "expo-notifications";
import { useListDailyTipNotices } from "@workspace/api-client-react";
import { useProfile } from "@/hooks/useProfileContext";

export const TIP_POLL_MS = 60_000;
const DEVICE_KEY = "drbloom.dailyTipDeviceId";

/** Paid, active, with a cycle or pregnancy plan. */
export function useTipEligibility() {
  const { profile, isLoading } = useProfile();
  const eligible = Boolean(
    profile?.profileComplete && profile.subscriptionActive &&
    (profile.subscriptionPlan === "cycle" || profile.subscriptionPlan === "pregnancy"),
  );
  return { profile, loading: isLoading, eligible, userId: profile?.userId ?? "" };
}

export function useUnreadTipCount() {
  const { eligible, userId } = useTipEligibility();
  const q = useListDailyTipNotices({
    query: { queryKey: ["daily-tips", "notices", userId], enabled: eligible, refetchInterval: TIP_POLL_MS },
  });
  return eligible ? (q.data ?? []).filter((n) => n.readAt == null).length : 0;
}

export async function getTipDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function useTipDeviceId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getTipDeviceId().then((v) => alive && setId(v)).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return id;
}

export function getProjectId(): string | null {
  const c = Constants as unknown as {
    easConfig?: { projectId?: string };
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
  };
  const v = c.easConfig?.projectId ?? c.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return v && v.trim() ? v.trim() : null;
}

/** Throws a readable Error on any failure. */
export async function registerForTipPush(): Promise<string> {
  if (Platform.OS === "web") throw new Error("Phone notifications are only available in the native app.");
  if (Constants.executionEnvironment === "storeClient") throw new Error("Daily phone alerts require a native build published through Replit Launch. They are not available in Expo Go.");
  const projectId = getProjectId();
  if (!projectId) throw new Error("Native push requires a configured Expo project/build.");
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("dr-bloom-daily-tips", {
      name: "Daily health education",
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  let perm = await Notifications.getPermissionsAsync();
  const ok = (p: NotificationPermissionsStatus) =>
    p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!ok(perm)) perm = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false, allowProvisional: true } });
  if (!ok(perm)) throw new Error("Notification permission was not granted. You can allow it in system settings.");
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!/^(Expo|Exponent)PushToken\[.+\]$/.test(data)) throw new Error("Received an unexpected push token format.");
  return data;
}
