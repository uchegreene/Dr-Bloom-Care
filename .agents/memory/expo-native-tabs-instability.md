---
name: Expo native-tabs break navigation
description: Why this app uses the classic Expo Router Tabs layout instead of unstable-native-tabs.
---

Do not route the tab bar through `expo-router/unstable-native-tabs` (the Liquid Glass / SwiftUI native tabs). Use the standard `Tabs` layout for all platforms.

**Why:** With native tabs, tapping Community/Chat/Profile did nothing on devices where `isLiquidGlassAvailable()` was true (iOS 26). The native (SwiftUI) tab controller breaks when triggers are added/removed dynamically (the cycle↔pregnancy swap) and when a route in the group has no trigger (the hidden `index` route). Web only ever exercised the classic layout, so the bug was invisible in the dev/web preview and only hit real iOS devices and the published build.

**How to apply:** In `app/(tabs)/_layout.tsx`, always render the classic `Tabs`-based layout. Hide mode-specific tabs with `href: null` (works reliably), not by omitting triggers. The classic layout still looks native on iOS via `SymbolView` (SF Symbols) + `BlurView`. Only reconsider native tabs if upstream `unstable-native-tabs` becomes stable for dynamic/conditional trigger sets.
