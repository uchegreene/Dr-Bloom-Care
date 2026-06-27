# Bloom

A warm, supportive Expo (React Native) mobile app for women, mothers, and mothers-to-be: period/cycle tracking, a pregnancy tracker, a community feed, and 1:1 chat. Frontend-only with AsyncStorage persistence.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
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
- State + persistence: `artifacts/mobile/hooks/use*Context.tsx` — one AsyncStorage-backed React context per domain (Cycle, Pregnancy, Social, Chat, Profile)
- Theme: `artifacts/mobile/constants/colors.ts` (coral/blush/sage palette, light + dark, radius 16); read via `hooks/useColors.ts`
- Shared Calendar UI: `artifacts/mobile/components/Calendar.tsx`

## Architecture decisions

- Frontend-only by design: all data lives in AsyncStorage; there is no backend for app features. The `api-server` artifact is unrelated scaffolding.
- Context files that render JSX providers are `.tsx` (not `.ts`), or `tsc` fails to parse the JSX.
- Tab set is conditional on `profile.mode`: `cycle` shows the Cycle tab, `pregnant` shows the Pregnancy tab, `none` ("Just Browsing") hides both and lands on Community. Both the root redirect (`app/index.tsx`) and the tab layout branch on this.
- Pregnancy EDD uses Naegele's rule (LMP + 280 days) in `usePregnancyContext`; recomputed on every date edit.
- Chat messages are stored newest-first to feed an inverted FlatList directly.
- Context mutators use functional state updates (`setState(prev => ...)`) and persist the computed next state, to avoid lost writes from rapid taps.

## Product

- Cycle tracking: calendar with flow/symptom/mood logging; phase, next-period, and fertile-window prediction.
- Pregnancy tracker: EDD via LMP, week/day/trimester/countdown, weekly notes, daily symptom/weight log.
- Community: post, like, comment, with category tags (Journey/Advice/Health).
- Friends + 1:1 chat.
- Profile + onboarding with tracking-mode selection.

## User preferences

- No emojis anywhere in the UI or seed data. Use Feather icons (`@expo/vector-icons`) instead.

## Gotchas

- Context provider files must use the `.tsx` extension (they contain JSX).
- Verify the mobile app with `pnpm --filter @workspace/mobile run typecheck`, not `build`.
- Dates: validate user-entered dates with `isValid`/`isFuture` before persisting — `parseISO` on a malformed string yields an Invalid Date that later throws in `format`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
