---
name: expo-router modal route + router.replace navigation
description: Why navigating away from a route declared presentation:"modal" can silently fail
---

A full-screen gate route (e.g. onboarding/registration) must NOT be declared with
`presentation: "modal"` in the root Stack if it calls `router.replace`/`router.push`
to navigate away on completion.

**Why:** Calling `router.replace("/(tabs)/...")` from inside a route registered as a
modal is flaky — on web especially the navigation can do nothing, so the action
button appears "dead" (taps register, handler runs, but the screen never changes).

**How to apply:** For routes that are conceptually full-screen flows (onboarding,
auth gates), register them as normal stack screens (`headerShown:false`,
optionally `gestureEnabled:false`), not modals. Navigate directly to the concrete
destination route rather than bouncing through an index redirect. Reserve
`presentation:"modal"` for genuine overlays (compose/log sheets) that dismiss with
`router.back()`.
