---
name: Cancelled test-browser resource cleanup
description: Leftover browser processes can exhaust memory and make Node commands hang before producing output.
---

Cancelled browser tests may leave their Chromium processes alive. A large abandoned renderer can exhaust available memory and make new Node, TypeScript and bundling commands time out with no output.

**Why:** A stopped multi-account test left a high-CPU browser running; closing its abandoned browser processes immediately restored Node startup and verification.

**How to apply:** When unrelated Node commands all hang before printing anything, check memory and process RSS before retrying or changing dependencies. Identify and close only browser processes belonging to completed/cancelled agent tests, never active tests, application workflows or platform services.
