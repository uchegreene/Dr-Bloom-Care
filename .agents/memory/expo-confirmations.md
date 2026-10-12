---
name: Cross-platform confirmations
description: Avoid silent payment-request and activation failures in Expo web previews.
---

Use an in-app modal for critical confirmation actions and visible inline success/error messages rather than relying on React Native `Alert.alert`.

**Why:** Native Alert callbacks silently did nothing in the web preview, so pressing the payment-request button neither displayed a confirmation nor sent the request.

**How to apply:** Any confirmation that gates a membership change or other important write must work in both React Native and react-native-web. Native-only convenience alerts are not sufficient evidence that the flow works.
