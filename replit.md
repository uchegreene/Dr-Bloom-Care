# HER BLOOM

A warm, supportive Expo (React Native) mobile app for women, mothers, and mothers-to-be: period/cycle tracking, pregnancy tracking, a community feed, and private topic-based conversations with a shared medical team. Clerk handles email/password accounts. The API and PostgreSQL persist profiles, memberships, professional advice, community posts/comments/likes/tags, medical conversations and explicit professional-account assignments. Private health trackers remain account-scoped on-device storage. Onboarding collects a public username, name, date of birth (stored as `YYYY-MM-DD`, age 13–120), and women-only self-attestation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on its configured `PORT`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- App code: `artifacts/mobile` (Expo, expo-router file-based routing)
- Screens: `artifacts/mobile/app` — `(tabs)/` holds the tab screens (cycle, pregnancy, community, chat, profile); modals and detail routes at the app root (`onboarding`, `cycle-log`, `pregnancy-log`, `post-create`, `post/[id]`, `chat/[id]`)
- State + persistence: Cycle, Pregnancy and Reminder contexts use account-scoped on-device storage. Profile and community/medical-team screens use authenticated generated API hooks. Old local Social/Chat contexts and records are retained but no longer drive the active screens.
- Theme: `artifacts/mobile/constants/colors.ts` (coral/blush/sage palette, light + dark, radius 16); read via `hooks/useColors.ts`
- Shared Calendar UI: `artifacts/mobile/components/Calendar.tsx`

## Architecture decisions

- Accounts, memberships, configurable fees, verified advice, community questions and medical DMs use PostgreSQL. Shared posts and inboxes refresh every 15 seconds, not WebSockets. Health tracker records remain on-device.
- Community photos use private App Storage with authenticated upload requests, ownership/metadata checks and short-lived read URLs; never save photo bytes or local device URIs in PostgreSQL.
- Medical-team accounts are explicitly linked to one verified professional profile by an administrator. Specialists may read the shared inbox, reply under their own profile and publish advice without buying a subscription; they cannot change fees or activate memberships.
- DMs are visible only to their member and authorized medical team/admins. Ordinary members require an active plan for private access or any community write. Public tags identify the addressed profile; reply attribution identifies the actual responding specialist.
- Run `pnpm --filter @workspace/api-server run test:care` for isolated synthetic-cohort permission, persistence and real App Storage checks. The test cleans its records and objects and never adds auth bypasses to the running app.
- Pregnancy appointments and daily medicine schedules use account-scoped device storage and native `expo-notifications`, not server push. Web saves records and shows countdowns but cannot schedule native background alerts. Permission/scheduling failures are shown explicitly.
- Appointments support an at-time alert and optional advance alert; medicine supports up to six daily local times. Editing replaces alerts, deletion cancels them, and sign-out cancels account-owned alerts. Mode switching does not cancel existing schedules.
- Notification content is generic to protect lock-screen health privacy. Android exact-alarm manifest changes require a new native build; delivery still depends on OS permissions and battery settings.
- Reminder regression tests: bundle `artifacts/mobile/test/reminders.test.ts` with the existing API package's esbuild into the mobile package's ignored `node_modules/.cache`, then execute the bundle with Node. Tests use an injected notification driver, not actual phone delivery.
- Context files that render JSX providers are `.tsx` (not `.ts`), or `tsc` fails to parse the JSX.
- Tab set is conditional on `profile.mode`: `cycle` shows the Cycle tab, `pregnant` shows the Pregnancy tab, `none` ("Just Browsing") hides both and lands on Community. Both the root redirect (`app/index.tsx`) and the tab layout branch on this.
- Pregnancy EDD uses Naegele's rule (LMP + 280 days) in `usePregnancyContext`; recomputed on every date edit.
- Chat messages are stored newest-first to feed an inverted FlatList directly.
- Context mutators use functional state updates (`setState(prev => ...)`) and persist the computed next state, to avoid lost writes from rapid taps.

## Product

- Cycle tracking: calendar with flow/symptom/mood logging; phase, next-period, and fertile-window prediction.
- Pregnancy tracker: EDD via LMP, week/day/trimester/countdown, weekly notes, daily symptom/weight log.
- Community: shared posts, likes, comments, topics and up to three verified medical-profile tags.
- Paid private medical discussions by topic; shared specialist inbox with named, verified replies.
- Profile + onboarding with tracking-mode selection.

## User preferences

- No emojis anywhere in the UI or seed data. Use Feather icons (`@expo/vector-icons`) instead.

## Gotchas

- Context provider files must use the `.tsx` extension (they contain JSX).
- Verify the mobile app with `pnpm --filter @workspace/mobile run typecheck`, not `build`.
- Dates: validate user-entered dates with `isValid`/`isFuture` before persisting — `parseISO` on a malformed string yields an Invalid Date that later throws in `format`.
- expo-router typed routes: after adding a new screen/route, `typecheck` fails with TS2322/TS2345 "not assignable" on the new path until the route types regenerate. Restart the `artifacts/mobile: expo` workflow (which regenerates `.expo/types`), then re-run typecheck.
- Pregnancy-chance estimate derives from the last *unprotected* intimacy log (`getLastUnprotectedSex`), not the most recent log overall — a later protected entry must never mask earlier unprotected risk.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
