import React, { useEffect, type ReactNode } from "react";
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { useAuth, useClerk } from "@clerk/expo";
import { usePathname, useRootNavigationState, useRouter } from "expo-router";
import { useProfile } from "@/hooks/useProfileContext";
import { useColors } from "@/hooks/useColors";
import { isAdminPortalHost } from "@/lib/adminPortal";

/** The host selects the entry point, never the authorization decision. APIs verify all privileges. */
export function AdminPortalGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { profile, isLoading, profileError, refreshAccount } = useProfile();
  const router = useRouter();
  const path = usePathname();
  const navigation = useRootNavigationState();
  const colors = useColors();
  const portal = Platform.OS === "web" && typeof window !== "undefined" && isAdminPortalHost(window.location.hostname);
  const login = path === "/sign-in";
  const admin = profile?.role === "admin" || profile?.role === "medical_team";
  const destination = !profile?.profileComplete ? "/onboarding" : profile.role === "medical_team" ? "/medical-team" : "/admin";
  useEffect(() => {
    if (!portal || !navigation?.key || !isLoaded) return;
    if (!isSignedIn && !login) router.replace("/(auth)/sign-in");
    if (isSignedIn && !isLoading && admin && (path === "/" || login || path === "/sign-up")) router.replace(destination);
  }, [portal, navigation?.key, isLoaded, isSignedIn, login, admin, isLoading, path, router, destination]);
  const blocked = portal && (!isLoaded || (isSignedIn ? (isLoading || !admin || path === "/" || login) : !login));
  return <View style={{ flex: 1 }}>
    {/* Keep the root navigator mounted so login redirects are safe on web and native. */}
    <View style={{ flex: 1, display: blocked ? "none" : "flex" }}>{children}</View>
    {blocked ? <View style={{ flex: 1, justifyContent: "center", padding: 28, gap: 18, backgroundColor: colors.background }}>
      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 24, color: colors.foreground }}>Dr Bloom Care · Admin portal</Text>
      {!isLoaded || isLoading || (!isSignedIn) || (admin && (path === "/" || login)) ? <ActivityIndicator color={colors.primary} /> :
        profileError ? <>
          <Text style={{ color: colors.foreground }}>{profileError}</Text>
          <TouchableOpacity onPress={refreshAccount}><Text style={{ color: colors.primary }}>Retry account verification</Text></TouchableOpacity>
        </> : <>
          <Text style={{ color: colors.foreground }}>Administrator access required. Signing up or buying a subscription does not grant access to this portal.</Text>
          <TouchableOpacity onPress={() => signOut()} style={{ paddingVertical: 12 }}><Text style={{ color: colors.primary }}>Sign in with another account</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://drbloomcare.com")}><Text style={{ color: colors.primary }}>Go to the member app</Text></TouchableOpacity>
        </>}
    </View> : null}
  </View>;
}
