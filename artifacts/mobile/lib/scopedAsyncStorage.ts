import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import { useMemo } from "react";

export function useScopedStorage() {
  const { isSignedIn, userId } = useAuth();
  const scope = isSignedIn && userId ? `member:${userId}` : "signed-out";
  // Capture the scope so an old async write can never affect a newly signed-in user.
  return useMemo(() => ({
    getItem(key: string) {
      return AsyncStorage.getItem(`bloom:${scope}:${key}`);
    },
    setItem(key: string, value: string) {
      return AsyncStorage.setItem(`bloom:${scope}:${key}`, value);
    },
  }), [scope]);
}
