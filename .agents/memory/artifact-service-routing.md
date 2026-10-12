---
name: Artifact service routing
description: Verify registered service paths and actual Expo preview hosts rather than inferring URLs.
---

Artifact directory names do not determine their public HTTP prefixes. Use registered service paths and the API contract to construct native-app URLs.

**Why:** A nonexistent backend prefix can reach a mobile application's catch-all route and return HTML with HTTP 200, making an incorrect address look like a successful API response.

**How to apply:** Verify the service routing configuration and response content type before wiring an absolute native API base. Keep generated endpoint prefixes from being duplicated.

Expo's web preview and the shared API can use different development hosts.

**Why:** The shared host's root may serve a different document, so testing frontend assets there can incorrectly report that an icon or page is missing.

**How to apply:** Use the actual Expo URL returned by the preview tools for frontend-page and favicon checks. Keep using the registered shared API host and prefix for backend requests.
