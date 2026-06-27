---
name: Expo context files need .tsx
description: Why React context/provider hook files in Expo apps must use the .tsx extension
---

In Expo/React Native TypeScript projects, any hook or context file that returns JSX
(e.g. `<SomeContext.Provider>...</SomeContext.Provider>`) must have the `.tsx`
extension, not `.ts`.

**Why:** `tsc` only parses JSX in `.tsx` files. A `.ts` file containing JSX produces
confusing low-level parse errors (TS1005 `'>' expected`, TS1161 unterminated regex,
etc.) rather than a clear "JSX not allowed" message, which makes the root cause easy
to miss.

**How to apply:** When creating or reviewing `use*Context` / provider files, check the
extension. Imports use no extension (`@/hooks/useFooContext`), so renaming `.ts` → `.tsx`
needs no import changes.
