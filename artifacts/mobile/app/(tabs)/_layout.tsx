import { Redirect, Tabs, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/hooks/useProfileContext";

function ClassicTabLayout({
  canUseCycle,
  canUsePregnancy,
}: {
  canUseCycle: boolean;
  canUsePregnancy: boolean;
}) {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          ...(isWeb ? { height: 84 } : {}),
        },
      }}
    >
      <Tabs.Screen
        name="cycle"
        options={{
          title: "Cycle",
          href: canUseCycle ? "/(tabs)/cycle" : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="pregnancy"
        options={{
          title: "Pregnancy",
          href: canUsePregnancy ? "/(tabs)/pregnancy" : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart" tintColor={color} size={24} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.3" tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          href: "/(tabs)/chat",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="message" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.crop.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      {/* Hide index from tabs */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { profile } = useProfile();
  const pathname = usePathname();
  const canUseCycle =
    profile?.subscriptionActive === true &&
    profile.subscriptionPlan === "cycle" &&
    profile.mode === "cycle";
  const canUsePregnancy =
    profile?.subscriptionActive === true &&
    profile.subscriptionPlan === "pregnancy" &&
    profile.mode === "pregnant";

  if (!profile?.profileComplete) return <Redirect href="/" />;
  if (pathname.endsWith("/cycle") && !canUseCycle) {
    return <Redirect href="/(tabs)/community" />;
  }
  if (pathname.endsWith("/pregnancy") && !canUsePregnancy) {
    return <Redirect href="/(tabs)/community" />;
  }

  return (
    <ClassicTabLayout
      canUseCycle={canUseCycle}
      canUsePregnancy={canUsePregnancy}
    />
  );
}
