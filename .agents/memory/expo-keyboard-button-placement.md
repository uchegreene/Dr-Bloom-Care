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

**Root cause of the silent Subscribe failure:** imperative `router.replace(...)`
called from the onboarding handler silently no-ops on a real device (works on web).
It fails with no popup and no error; two different replace targets AND a
`setTimeout(..., 0)` deferral all failed identically — that combination is the tell
that the imperative router call itself is the problem, not timing or the target.

**Fix that worked:** use the DECLARATIVE `<Redirect href=... />` component instead.
Set a `done` state in the success path (`setDone(true)` after `completeOnboarding`),
then early-return `<Redirect href={mode === 'pregnant' ? '/(tabs)/pregnancy' : '/(tabs)/cycle'} />`.
**Why:** `<Redirect>` is the one navigation primitive proven to work on this device —
it is how `app/index.tsx` routes to `/onboarding` in the first place. Prefer
declarative `<Redirect>` over imperative `router.replace`/`router.push` for
post-state-change navigation in this app.

**How to apply:**
- Keep action buttons as the last child INSIDE the `ScrollView`; keep
  `keyboardShouldPersistTaps="handled"`. Do NOT move them to a fixed footer outside
  the scroll — that broke taps on device here.
- After profile completion, set a success state and render `<Redirect href="/" />`;
  let the launch-time redirect choose the destination based on mode and entitlement.
- Surface failures as inline text or a cross-platform in-app modal so failures
  remain visible in both the web preview and native app.
