import { Redirect, type Href } from "expo-router";
import { useProfile } from "@/hooks/useProfileContext";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@clerk/expo";

export default function Index() {
  const { profile, isLoading, profileError, refreshAccount } = useProfile();
  const { isLoaded, isSignedIn } = useAuth();
  const colors = useColors();

  if (!isLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href={"/(auth)/sign-in" as Href} />;
  }

  if (profileError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 28, backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground, fontFamily: "Nunito_600SemiBold", textAlign: "center" }}>
          {profileError}
        </Text>
        <TouchableOpacity onPress={refreshAccount} style={{ marginTop: 20, alignSelf: "center" }}>
          <Text style={{ color: colors.primary, fontFamily: "Nunito_700Bold" }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile?.profileComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (profile.subscriptionActive && profile.mode === "pregnant" && profile.subscriptionPlan === "pregnancy") {
    return <Redirect href="/(tabs)/pregnancy" />;
  }

  if (profile.subscriptionActive && profile.mode === "cycle" && profile.subscriptionPlan === "cycle") {
    return <Redirect href="/(tabs)/cycle" />;
  }

  if (!profile.subscriptionActive || profile.mode === "none" || !profile.mode) {
    return <Redirect href="/(tabs)/community" />;
  }

  return <Redirect href="/(tabs)/community" />;
}
