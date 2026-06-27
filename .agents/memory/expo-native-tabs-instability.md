---
name: Expo native-tabs break navigation
description: Why this app uses the classic Expo Router Tabs layout instead of unstable-native-tabs.
---

Do not route the tab bar through `expo-router/unstable-native-tabs` (the Liquid Glass / SwiftUI native tabs). Use the standard `Tabs` layout for all platforms.

**Why:** With native tabs, tapping Community/Chat/Profile did nothing on devices where `isLiquidGlassAvailable()` was true (iOS 26). The native (SwiftUI) tab controller breaks when triggers are added/removed dynamically (the cycle↔pregnancy swap) and when a route in the group has no trigger (the hidden `index` route). Web only ever exercised the classic layout, so the bug was invisible in the dev/web preview and only hit real iOS devices and the published build.

**How to apply:** In `app/(tabs)/_layout.tsx`, always render the classic `Tabs`-based layout. Hide mode-specific tabs with `href: null` (works reliably), not by omitting triggers. Only reconsider native tabs if upstream `unstable-native-tabs` becomes stable for dynamic/conditional trigger sets.

## Also avoid: floating/blur tab bar swallows taps on native
Do NOT style the classic tab bar with `tabBarStyle.position: "absolute"` + a custom `tabBarBackground` (BlurView/overlay View with `StyleSheet.absoluteFill`). On native (Expo Go iOS) this created dead touch zones — tapping Community/Chat/Profile did nothing, while web worked fine. Use the default solid tab bar (`backgroundColor` + tint colors only). **Why:** the absolutely-filled background overlay intercepts touches meant for the tab buttons on native; web tolerates it. Symptom is easy to miss because onboarding `router.replace`s straight into a tab, so no tab tap is ever exercised in a web test.

## Testing limitation
Web `runTest` (the only e2e available here) exercises the web build, NOT Expo Go / native. A green web test does NOT prove native tab/touch behavior. For native-only symptoms, reason about RN/Expo-Go specifics and ship a conservative, standard configuration.
