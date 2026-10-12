---
name: OpenAPI request-body components
description: A code-generation export collision to avoid when extending API operations.
---

Use named shared schema components for new OpenAPI request bodies instead of inline object bodies.

**Why:** The current generator exports inline operation-body names through both validation schemas and TypeScript models. Re-exporting both produces ambiguous duplicate exports even though generation itself succeeds.

**How to apply:** Give request input components names distinct from the operation's generated body name, reference them from operations, and run the normal code-generation command. Do not hand-edit generated files or remove validation exports to hide the conflict.
