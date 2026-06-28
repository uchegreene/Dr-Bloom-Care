---
name: Expo keyboard-controller + action button placement
description: Why bottom action buttons in scrollable forms become untappable on device, and the fix.
---

# Action buttons in keyboard forms must sit in a fixed footer, not inside the ScrollView

In the mobile app, an action button placed at the bottom *inside* a `ScrollView`
appears and works in the web preview but is unresponsive on a real device
(Expo Go): the on-screen keyboard covers it, so taps land on the keyboard or
just dismiss it instead of pressing the button.

**Why:** The app wraps everything in `react-native-keyboard-controller`'s
`KeyboardProvider`. React Native's own `react-native` `KeyboardAvoidingView` does
NOT cooperate with it — using the RN one does not lift content, so the button
stays under the keyboard. There is no on-screen keyboard on web, which is why the
bug is invisible in the web preview / e2e.

**How to apply:**
- Import `KeyboardAvoidingView` from `react-native-keyboard-controller` (NOT from
  `react-native`), use `behavior="padding"`.
- Put the primary action button in a fixed footer `<View>` that is a sibling of
  the `ScrollView` (both inside the KAV) — mirror the proven pattern in
  `pregnancy-log.tsx` / `post-create.tsx` (action in a fixed header/footer, form
  scrolls between). Do not leave the button as the last child inside the scroll.
- Surface validation failures with `Alert.alert` (in addition to inline text) so
  a failed tap is never silent — on web `Alert` may be a no-op, so keep the inline
  message too.
