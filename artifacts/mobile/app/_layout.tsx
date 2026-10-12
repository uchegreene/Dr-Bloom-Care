import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import * as SecureStore from "expo-secure-store";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DailyTipNotificationBridge } from "@/components/DailyTipNotificationBridge";

// Mock contexts (we will implement them next)
import { AppProviders } from "@/components/Providers";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
};

setBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? null);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="cycle-log" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="cycle-intimacy" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="pregnancy-log" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="reminders" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="post-create" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="medical-team" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="health-tips" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="daily-tips" options={{ headerShown: false }} />
      <Stack.Screen name="daily-tip-review" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthenticatedApp() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  // Configure before the profile provider can start its first authenticated query.
  setAuthTokenGetter(isLoaded ? () => getToken() : null);

  return (
    <AppProviders key={isSignedIn ? userId ?? "signed-in" : "signed-out"}>
      <DailyTipNotificationBridge />
      <RootLayoutNav />
    </AppProviders>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <ClerkProvider
                publishableKey={publishableKey}
                tokenCache={tokenCache}
                proxyUrl={process.env.EXPO_PUBLIC_CLERK_PROXY_URL}
              >
                <ClerkLoaded>
                  <AuthenticatedApp />
                </ClerkLoaded>
              </ClerkProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
