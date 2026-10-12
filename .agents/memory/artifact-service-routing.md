---
name: Artifact service routing
description: Use registered HTTP paths rather than directory names when constructing native API URLs.
---

Artifact directory names do not determine their public HTTP prefixes. Use registered service paths and the API contract to construct native-app URLs.

**Why:** A nonexistent backend prefix can reach a mobile application's catch-all route and return HTML with HTTP 200, making an incorrect address look like a successful API response.

**How to apply:** Verify the service routing configuration and response content type before wiring an absolute native API base. Keep generated endpoint prefixes from being duplicated.
