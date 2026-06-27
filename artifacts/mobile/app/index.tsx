import { Redirect } from "expo-router";
import { useProfile } from "@/hooks/useProfileContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { profile, isLoading } = useProfile();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  if (profile.mode === "pregnant") {
    return <Redirect href="/(tabs)/pregnancy" />;
  }

  if (profile.mode === "none") {
    return <Redirect href="/(tabs)/community" />;
  }

  return <Redirect href="/(tabs)/cycle" />;
}
