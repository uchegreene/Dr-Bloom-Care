---
name: Externalized SDK dependencies
description: Why an executable API service sometimes needs a direct SDK dependency even when its shared integration library already declares it.
---

When a shared integration library is bundled into an executable service but its provider SDK is externalized, keep that SDK in the executable service’s production dependencies as well.

**Why:** Strict pnpm dependency resolution resolves the remaining import from the service’s generated bundle, not from the original integration library. Type checks and mocked integration tests can pass while the real service fails at startup.

**How to apply:** Check the service bundler’s external patterns before removing an apparently redundant dependency. Verify the built service starts and makes one real provider request; do not rely only on type checking or mocks.
