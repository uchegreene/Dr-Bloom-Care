---
name: Expo onboarding action buttons — keep inside the ScrollView
description: Device-only tap failures in the onboarding form; what actually broke taps and where the real bug was.
---

# Onboarding action buttons must stay INSIDE the ScrollView (with keyboardShouldPersistTaps)

In the mobile onboarding form, action buttons (`Continue`, `Subscribe`) work in
the web preview/e2e but mis-behaved on a real device (Expo Go). Several keyboard
fixes were tried and none were the cause.

**What actually happened (evidence, not theory):**
- With buttons placed at the bottom *inside* the `ScrollView` (with
  `keyboardShouldPersistTaps="handled"`), tap registration was FINE — `Continue`
  advanced the step on device.
- Moving the buttons OUT into a fixed footer `<View>` (sibling of the ScrollView)
  BROKE taps on device — even `Continue` stopped responding. So the fixed-footer
  pattern is the wrong move here, not the fix.
- Therefore the original `Subscribe` failure was never a tap/keyboard problem: the
  tap registered but logic inside the handler failed silently.

**Root cause of the silent Subscribe failure:** a direct group-route jump
(`router.replace('/(tabs)/cycle' | '/(tabs)/pregnancy')`) right after async
`completeOnboarding` could no-op on device while working on web. Validation errors
were also only shown as easily-missed inline text.

**How to apply:**
- Keep action buttons as the last child INSIDE the `ScrollView`; keep
  `keyboardShouldPersistTaps="handled"`. Do NOT move them to a fixed footer outside
  the scroll — that broke taps on device here.
- After `completeOnboarding`, navigate via `router.replace('/')` and let
  `app/index.tsx`'s Redirect route by `profile.mode`. Reuse the launch-time
  redirect rather than a direct group-route replace.
- Surface failures with `Alert.alert` (in addition to inline text). In the catch,
  show the REAL error (`e instanceof Error ? e.message : String(e)`) so a failed
  tap is never silent and the actual native error is visible.
