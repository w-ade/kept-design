# Kept backend roadmap

> Generated from `docs/roadmap/roadmap.json` by `node scripts/roadmap.mjs`. Edit the JSON, not this file.

Wire Kept's finished UI (a pixel copy of the kept-ui lab) to Supabase: Postgres, Auth, Storage and two Edge Functions, behind the exact functions the screens already call, so no screen changes.

**Progress:** 2 of 72 issues done.

## How it fits together

```text
Browser · kept.design (Vite SPA, same screens as kept-ui)
│
├── supabase-js  (publishable key, user JWT)
│     ├── Auth      password + TOTP → AAL2; signup off
│     ├── Postgres  RLS on every table: owner_id = auth.uid() AND aal2
│     └── Storage   private bucket kept-assets/<owner>/<ref>/{full,thumb}.jpg
│
├── Edge Function  sign-in   username → email, then password sign-in
└── Edge Function  board     /m/:token → rows + short-lived signed image URLs
                             (the only path that works signed out)
```

## The seam

What each function in `src/kept/session.ts` and `src/kept/repository.ts` becomes.

| Function | Backed by | Issue |
| --- | --- | --- |
| `getSession()` | Cached Supabase session + AAL, read synchronously after boot | KEPT-13 |
| `signInWithPassword(username, password)` | Edge Function `sign-in` → `auth.setSession()` | KEPT-12 |
| `completeMfaForLab()` | Replaced by TOTP enroll / verify | KEPT-15 |
| `signOut()` | `auth.signOut()` | KEPT-13 |
| `listCollections()` · `getCollection(id)` | `collection_summaries` view, slug as the id | KEPT-18 |
| `createCollection(name)` · `updateCollection(id, patch)` | RPC `create_collection` · update on `collections` | KEPT-18 |
| `listReferences(id)` · `listAllReferences()` | One nested select + batched signed URLs | KEPT-19 |
| `updateReference(cid, rid, patch)` | Notes update; RPCs `set_ref_tags`, `set_ref_pins` | KEPT-20 |
| `addUploads(cid, files, onProgress)` | On-device resize → rows → Storage uploads | KEPT-21 |
| `getShare` · `publishCollection` · `rotateShare` · `unpublishCollection` | `collection_shares` + token RPCs | KEPT-23 |
| `getBoard(token)` | Edge Function `board` (no sign-in) | KEPT-24 |
| `requestInvite(request)` | RPC `request_invite` (anon) | KEPT-26 |

## Ground rules

- kept-ui is the source of truth and is never written to from here. New screens (two-factor, later box annotations and renaming) are designed there first, then synced.
- `npm run sync-kept-ui` must never overwrite the real data layer (KEPT-6).
- Same function names and return shapes. If kept-ui changes a shape, the typecheck fails before anything ships.
- Only the publishable key reaches the browser. The service-role key lives in Edge Function secrets and a local seed script, never behind a `VITE_` prefix.
- Without Supabase env vars the app falls back to the mocks (D-4).
- The pixel sweep is re-run once real data flows: the UI must still match kept-ui.

## Decisions

### D-1 · How usernames sign in — Open

Kept signs in by username, but Supabase Auth signs in by email. Something has to turn a username into an email without letting anyone look up whose account is whose.

- **Edge Function `sign-in`** _(recommended)_: The browser sends username + password to a function that looks up the email with the service role and signs in server-side. Emails never leave the server, and an unknown username gives the same error as a wrong password.
- **Synthetic emails**: Each account's email is `username@users.kept.design`. No server code, but no real inbox for recovery or notices.
- **Public lookup function**: An anon-callable `email_for_username()`. Simplest, but it lets anyone enumerate usernames and read their emails. Not recommended.

### D-2 · How board images are served — Open

Library images stay in a private bucket. Boards are opened by people who aren't signed in, so their images need a different path.

- **Signed URLs from the `board` function** _(recommended)_: The function checks the token and returns URLs that expire (about an hour). Unpublish and New link take effect immediately for new visits. One bucket, nothing public.
- **Public copies of published images**: Publishing copies files into a public bucket. Links never expire and CDN caching is simpler, but every publish, rotate and unpublish has to copy or delete files.

### D-3 · Where Supabase is provisioned — Open

Supabase can be created directly on supabase.com or through the Vercel Marketplace integration.

- **Vercel Marketplace integration** _(recommended)_: Billed through Vercel; env vars sync to Production, Preview and Development automatically. Vite only exposes `VITE_`-prefixed vars, so `vite.config` adds the integration's `NEXT_PUBLIC_SUPABASE_` prefix to `envPrefix`.
- **supabase.com directly**: Billed by Supabase; env vars are copied into Vercel by hand. Nothing else changes.

### D-4 · Keep the mocks as a fallback — Open

When Supabase env vars are missing (a fresh clone, a preview without secrets), the app can either fall back to kept-ui's mocks or refuse to start.

- **Fall back to the mocks** _(recommended)_: `repository.ts` picks the Supabase implementation when configured, else the synced mock. The lab account `wade / 1234` keeps working locally. This matches the v0 spec.
- **Require Supabase everywhere**: Simpler code paths, but every preview and fresh clone needs real credentials.

### D-5 · Collection images in git — Open

PR #3 already committed the 320 moode-matcha files to main (the repo is public). Once they're in Storage, the copies in `public/collections/` aren't needed.

- **Remove them after the seed** _(recommended)_: Delete `public/collections/` from main once KEPT-28 has moved them into Storage. They stay in git history, but the app stops depending on them.
- **Keep them in the repo**: Useful for the mock fallback on previews. Costs repo size and keeps the images public.

### D-6 · How the iOS app is built — **Decided: React Native**

The UI rebuild happens once. Capacitor was the original plan, chosen to avoid rebuilding the UI; the goal has since changed to an app that feels genuinely native in the hand, which a web view cannot deliver for an image-heavy, gesture-heavy app.

- **React Native** _(recommended, chosen)_: Real native views. Reanimated runs animations on the UI thread, so gestures track 1:1 and stay interruptible. Keeps React and TypeScript, so the mental model and the data contract carry over. Base UI does not, so the 16 screens are rebuilt. This is what apps like Phantom use.
- **Native SwiftUI**: The highest ceiling and the most Apple-native feel, at the cost of a new language and paradigm, and the furthest distance from everything already built.
- **Capacitor wrapper**: The original `/ios` plan: the Vite build inside a WKWebView. By far the cheapest, and keeps one codebase. Rejected: a web view cannot hold 120fps on a 300-image grid or give interruptible gesture physics, and Kept is exactly that kind of app.

### D-7 · The app name and bundle identifier — Open

A bundle identifier is permanent once an app is public: a new one is a new app, with new reviews and no upgrade path for anyone who installed the old one. The display name can change; the identifier cannot. Today this costs nothing to settle.

- **Stay Kept — `design.kept.app`**: Closes the question. Matches the domain, the repo and everything already written.
- **Rename before the Xcode project**: If the name is going to change, this is the cheapest moment in the project's life to do it. Blocks KEPT-40 until it lands.
- **Throwaway id now, decide before TestFlight**: Build on a scratch identifier and replace it before the first external build. Buys time; costs a pass over Universal Links, App Groups and the App Store Connect record.

### D-8 · Expo or bare React Native — **Decided: Expo with a development build**

React Native can be set up bare or through Expo. The share extension and App Groups both need custom native code, which used to be the reason to avoid Expo and no longer is.

- **Expo with a development build** _(chosen)_: Config plugins generate the native project, so custom native code (share extension, App Groups, associated domains) still works. EAS handles signing and TestFlight uploads. Much less Xcode time.
- **Bare React Native**: Total control of the Xcode project, and no dependency on Expo's release cadence. More setup, more signing work, and every native change is done by hand.

### D-9 · Where the design system lives once there are two renderers — **Decided: Tokens become the shared layer**

`tokens.css` is web-only, and Base UI cannot run on iOS. The rule that kept-ui is the single source of truth for the UI was written when there was one renderer, and the rebuild breaks it.

- **Tokens become the shared layer** _(chosen)_: Colors, type scale, spacing and radii move to `tokens.json`, which generates the CSS custom properties for web and a typed object for native. kept-ui stays the source of truth for web layout and design intent; tokens become the source for both.
- **kept-ui stays the source, native copies by hand**: No new tooling. Every token change has to be mirrored into the native app manually, and they will drift.
- **Let iOS have its own design system**: Fastest in the short term, and guarantees the two apps stop looking like the same product.

### D-10 · Where the session lives on the device — **Decided: Keychain via `expo-secure-store`**

The web app keeps its session in `sessionStorage` so a refresh mid-2FA stays on the MFA step. A phone app is expected to stay signed in for months, which makes the storage choice a security decision rather than a convenience one.

- **Keychain via `expo-secure-store`** _(chosen)_: Refresh tokens live in the iOS keychain, protected by the device passcode and wiped on uninstall. Supabase's auth client takes a custom storage adapter, so this is a small amount of code.
- **`AsyncStorage`**: The common default in React Native examples. It is an unencrypted file in the app container — acceptable for preferences, not for a refresh token that grants access to the whole library.

## Phases

### Ground work (2/7)

Get PR #4 onto main, settle the open calls, and protect the data layer from the sync script. _Target: Before any backend code._

- [x] **KEPT-0** Recreate the kept-ui UI in kept-design — Done, High
- [x] **KEPT-1** Merge PR #4 into main — Done, Urgent
- [ ] **KEPT-2** Decide how usernames sign in (D-1) — Todo, High
- [ ] **KEPT-3** Decide how board images are served (D-2) — Todo, High
- [ ] **KEPT-4** Decide where Supabase is provisioned (D-3) — Todo, High
- [ ] **KEPT-5** Decide on the mock fallback (D-4) — Todo, Medium
- [ ] **KEPT-6** Stop the sync script from overwriting the data layer — Todo, High

### Supabase foundation (0/5)

Project, migrations, row-level security enforcing owner + two-factor, a private image bucket, generated types. _Target: Schema, RLS, Storage._

- [ ] **KEPT-7** Create the Supabase project and local setup — Backlog, High
- [ ] **KEPT-8** Schema migration — Backlog, Urgent
- [ ] **KEPT-9** Row-level security: owner and two-factor on every row — Backlog, Urgent
- [ ] **KEPT-10** Private Storage bucket for images — Backlog, High
- [ ] **KEPT-11** Supabase client and generated types — Backlog, Medium

### Sign-in and two-factor (0/5)

Username sign-in through an Edge Function, a real session behind the synchronous getSession(), and TOTP. _Target: Real accounts._

- [ ] **KEPT-12** Username sign-in Edge Function — Backlog, Urgent
- [ ] **KEPT-13** Real session behind the synchronous getSession() — Backlog, Urgent
- [ ] **KEPT-14** Design the two-factor screen in kept-ui — Backlog, Urgent
- [ ] **KEPT-15** Wire TOTP enrollment and challenge — Backlog, Urgent
- [ ] **KEPT-16** Create your account by hand — Backlog, High

### iOS foundation (0/9)

The native app exists and can be run on your phone: framework, tokens, navigation, and the motion primitives everything else is built on. No backend dependency, so it runs alongside p1. _Target: A shell that feels right._

- [ ] **KEPT-37** Confirm the native framework and retire the Capacitor plan — Todo, Urgent
- [ ] **KEPT-38** Settle the app name and bundle identifier — Todo, Urgent
- [ ] **KEPT-39** Join the Apple Developer Program — Backlog, High
- [ ] **KEPT-40** Create the React Native app — Backlog, Urgent
- [ ] **KEPT-41** Design tokens as shared data — Backlog, Urgent
- [ ] **KEPT-42** Native information architecture — Backlog, Urgent
- [ ] **KEPT-43** Type, fonts, dark mode and safe areas — Backlog, High
- [ ] **KEPT-44** Motion and gesture foundations — Backlog, Urgent
- [ ] **KEPT-45** The data contract on native — Backlog, Urgent

### Library data (0/6)

Collections, references, notes, tags, pins and uploads move from browser storage to Postgres and Storage. _Target: Same functions, real rows._

- [ ] **KEPT-17** Repository adapter structure — Backlog, High
- [ ] **KEPT-18** Collections: list, get, create, describe — Backlog, High
- [ ] **KEPT-19** References: list with signed image URLs — Backlog, Urgent
- [ ] **KEPT-20** Save notes, tags and pins — Backlog, High
- [ ] **KEPT-21** Uploads to Storage — Backlog, Urgent
- [ ] **KEPT-22** Keep search client-side for v0 — Backlog, Low

### Boards (0/3)

Publish, rotate and unpublish in Postgres; a signed-out Edge Function serves boards with short-lived image URLs. _Target: /m/:token for real._

- [ ] **KEPT-23** Publish, rotate and unpublish in Postgres — Backlog, High
- [ ] **KEPT-24** Board Edge Function for signed-out visitors — Backlog, Urgent
- [ ] **KEPT-25** Share links use kept.design — Backlog, Medium

### Invites (0/2)

Invite requests stored server-side, deduplicated by email, with a notification to you. _Target: Requests reach you._

- [ ] **KEPT-26** Store invite requests server-side — Backlog, High
- [ ] **KEPT-27** Tell you when someone asks for an invite — Backlog, Medium

### iOS library (0/10)

The screens that matter on a phone: collections, the reference grid, the viewer, pins, notes. Built against the contract on mocks, then wired to real data once p3 lands. _Target: Browsing that feels native._

- [ ] **KEPT-46** Collections home — Backlog, High
- [ ] **KEPT-47** The reference grid — Backlog, Urgent
- [ ] **KEPT-48** Reference viewer: pinch, pan and drag to dismiss — Backlog, Urgent
- [ ] **KEPT-49** Swipe between references — Backlog, High
- [ ] **KEPT-50** Pins on native — Backlog, High
- [ ] **KEPT-51** Notes, tags and titles — Backlog, High
- [ ] **KEPT-52** Search on device — Backlog, Medium
- [ ] **KEPT-53** The feel pass — Backlog, Urgent
- [ ] **KEPT-54** Image cache and offline reads — Backlog, High
- [ ] **KEPT-55** Wire the native library to Supabase — Backlog, Urgent

### iOS capture (0/5)

The reason the app exists: camera, photo library, and Share → Kept from Safari, Photos or Instagram, with an upload queue that survives losing signal. _Target: Capture from anywhere._

- [ ] **KEPT-56** Camera and photo library import — Backlog, Urgent
- [ ] **KEPT-57** Share extension — Backlog, Urgent
- [ ] **KEPT-58** App Group handoff — Backlog, Urgent
- [ ] **KEPT-59** Upload queue and background uploads — Backlog, Urgent
- [ ] **KEPT-60** Native share sheet for board links — Backlog, Medium

### Web v0 ship (0/4)

Seed moode-matcha into Storage, set env and secrets, re-verify pixel parity and RLS, deploy the web app. _Target: kept.design._

- [ ] **KEPT-28** Seed moode-matcha into Storage — Backlog, High
- [ ] **KEPT-29** Environment variables and secrets — Backlog, Urgent
- [ ] **KEPT-30** Verify the web app: pixel parity, end-to-end and RLS — Backlog, Urgent
- [ ] **KEPT-31** Ship the web app to kept.design — Backlog, Urgent

### iOS ship (0/7)

Universal Links, the App Store requirements that are not optional (account deletion, privacy manifest, minimum functionality), then TestFlight and review. _Target: On the App Store._

- [ ] **KEPT-61** Universal Links for boards — Backlog, High
- [ ] **KEPT-62** Delete your account, in the app — Backlog, Urgent
- [ ] **KEPT-63** Privacy manifest and App Store privacy answers — Backlog, Urgent
- [ ] **KEPT-64** App icon, launch screen and store assets — Backlog, High
- [ ] **KEPT-65** Guideline 4.2 readiness review — Backlog, Urgent
- [ ] **KEPT-66** TestFlight beta — Backlog, Urgent
- [ ] **KEPT-67** App Store submission — Backlog, Urgent

### Later (0/9)

Worth doing, not needed for v0: box annotations, renaming, server search, share previews, and the bigger platform bets (iPad, widgets, Android, a SwiftUI rewrite if the feel ceiling is ever hit). _Target: After v0._

- [ ] **KEPT-32** Box annotations — Backlog, Low
- [ ] **KEPT-33** Rename references — Backlog, Low
- [ ] **KEPT-34** Server-side search and a command palette — Backlog, Low
- [ ] **KEPT-35** Board link previews — Backlog, Low
- [ ] **KEPT-36** Move images to R2 if Storage costs bite — Backlog, No priority
- [ ] **KEPT-68** Revisit SwiftUI if the feel ceiling is hit — Backlog, No priority
- [ ] **KEPT-69** iPad — Backlog, Low
- [ ] **KEPT-70** Widgets, Live Activities and Shortcuts — Backlog, Low
- [ ] **KEPT-71** Android — Backlog, No priority

## Issues

### KEPT-0 · Recreate the kept-ui UI in kept-design

- **Status:** Done · **Priority:** High · **Estimate:** 8 pt · **Phase:** Ground work
- **Labels:** ui

**Why.** Every screen and state from the kept-ui lab now runs on real paths in kept-design, pixel-identical at 1440px and 390px in light and dark.

**Approach**

1. Synced `src/kept` with `scripts/sync-kept-ui.mjs`, which rewrites `#/kept/...` routes into paths.
2. Added `navigate.ts` and a `useSyncExternalStore` router so links don't reload and redirects aren't missed.
3. Removed the legacy home and map pages; matched kept-ui's dependency versions; added a typecheck to the build.

**Done when**

- [x] All 16 routes identical to kept-ui.vercel.app
- [x] Interactive states identical (dialogs, menus, search, lightbox, keyboard stepping, sign-in redirects)

**Notes.** Commits `969134d` and `7e9ddba` on `cursor/snapshot-kept-ui-a2a8`, open as PR #4.

### KEPT-1 · Merge PR #4 into main

- **Status:** Done · **Priority:** Urgent · **Estimate:** 1 pt · **Phase:** Ground work
- **Labels:** ops
- **Blocks:** KEPT-31

**Why.** The UI work lives on a branch. Main still has PR #3, an older snapshot of the same screens with the legacy home and map pages. Everything else builds on main.

**Approach**

1. Merge PR #4, resolving conflicts in favour of #4 (it's a superset of #3 and verified).
2. Keep #3's committed `public/collections/` images and drop #4's `.gitignore` line for them, so production has images until Storage takes over.
3. Build, then check the Vercel preview renders `/`, `/library`, and `/m/mm7q2x9kfa`.

**Done when**

- [x] main contains `7e9ddba`'s tree plus the images
- [x] `npm run build` passes on main
- [x] Vercel production shows the kept-ui landing

**Notes.** Merged 2026-09-19 as 4248833; Vercel deploy succeeded and kept.design serves the new UI.

### KEPT-2 · Decide how usernames sign in (D-1)

- **Status:** Todo · **Priority:** High · **Estimate:** 1 pt · **Phase:** Ground work
- **Labels:** decision, auth
- **Blocks:** KEPT-12

**Why.** Blocks the whole sign-in phase. See Decisions → D-1; the recommendation is an Edge Function so emails never reach the browser.

**Done when**

- [ ] D-1 marked decided

### KEPT-3 · Decide how board images are served (D-2)

- **Status:** Todo · **Priority:** High · **Estimate:** 1 pt · **Phase:** Ground work
- **Labels:** decision, storage
- **Blocks:** KEPT-10, KEPT-24

**Why.** Shapes the storage policies and the board function. See Decisions → D-2.

**Done when**

- [ ] D-2 marked decided

### KEPT-4 · Decide where Supabase is provisioned (D-3)

- **Status:** Todo · **Priority:** High · **Estimate:** 1 pt · **Phase:** Ground work
- **Labels:** decision, infra
- **Blocks:** KEPT-7

**Why.** Needed before the project exists. See Decisions → D-3.

**Done when**

- [ ] D-3 marked decided

### KEPT-5 · Decide on the mock fallback (D-4)

- **Status:** Todo · **Priority:** Medium · **Estimate:** 1 pt · **Phase:** Ground work
- **Labels:** decision
- **Blocks:** KEPT-6

**Why.** Decides how `repository.ts` is structured. See Decisions → D-4.

**Done when**

- [ ] D-4 marked decided

### KEPT-6 · Stop the sync script from overwriting the data layer

- **Status:** Todo · **Priority:** High · **Estimate:** 2 pt · **Phase:** Ground work
- **Labels:** data, ops
- **Blocked by:** KEPT-5
- **Blocks:** KEPT-17

**Why.** `npm run sync-kept-ui` copies every file in kept-ui's `src/kept`, including the mock `repository.ts`, `session.ts` and `uploads.ts`. Once those are real, one sync would silently put the mocks back.

**Approach**

1. Sync kept-ui's `repository.ts` to `repository.mock.ts`, `session.ts` to `session.mock.ts`, and `uploads.ts` to `uploads.mock.ts` (rename on write), rewriting their relative imports.
2. kept-design owns `repository.ts` and `session.ts`: they re-export the types from the mocks and pick an implementation (D-4).
3. Screens keep importing `./repository.ts`; nothing in the synced screens changes.
4. Keep `prepareUpload()` from the mock uploads module: the on-device resize is shared by both implementations.

**Done when**

- [ ] Running the sync twice leaves `repository.ts` and `session.ts` untouched
- [ ] If kept-ui changes a function or type the screens use, `npm run build` fails on the typecheck
- [ ] README documents which files are synced, renamed, or owned here

### KEPT-7 · Create the Supabase project and local setup

- **Status:** Backlog · **Priority:** High · **Estimate:** 2 pt · **Phase:** Supabase foundation
- **Labels:** infra
- **Blocked by:** KEPT-4
- **Blocks:** KEPT-8, KEPT-10, KEPT-29

**Why.** Everything else needs a project, the CLI, and migrations in the repo so the schema is reviewable.

**Approach**

1. Create the project (per D-3) in the region closest to you.
2. Auth settings: disable signups, keep email confirmations on, set Site URL to `https://kept.design` and add `http://localhost:5173` to redirect URLs.
3. `npx supabase init`, `supabase link`, migrations under `supabase/migrations/`.
4. Add `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; real values in `.env.local` (git-ignored) and Vercel.

**Done when**

- [ ] `supabase db push` applies cleanly to an empty project
- [ ] Signups are off (a sign-up call is rejected)
- [ ] No keys are committed

### KEPT-8 · Schema migration

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** Supabase foundation
- **Labels:** db
- **Blocked by:** KEPT-7
- **Blocks:** KEPT-9, KEPT-11

**Why.** Turns the shapes in `repository.ts` into tables. A Reference is the unit of meaning; its Asset carries the file facts; v0 has one asset and one collection per reference.

**Approach**

1. Write `0001_schema.sql` with the tables below; UUID primary keys, `owner_id` on every row for RLS.
2. Collections keep a `slug` because the UI uses it as the collection id in URLs (`/library/moode-matcha`). References keep a short `public_id` for `/library/:c/:r`.
3. `references` is a reserved word in SQL, so the table is `refs`.
4. Add `updated_at` triggers, and a generated `search` tsvector on refs for later server search (KEPT-34).

**Sketch**

```text
profiles      id uuid pk → auth.users · username citext unique (2–32 [a-z0-9._-])
collections   id uuid pk · owner_id · slug text · name text (≤80) · description text
              created_at · updated_at · unique (owner_id, slug)
refs          id uuid pk · public_id text unique · owner_id · collection_id → collections
              title · notes · capture_url (null = uploaded) · added_at · updated_at
              search tsvector generated
assets        id uuid pk · ref_id → refs (cascade) · owner_id · path_full · path_thumb
              file_name · file_type · width · height · bytes
tags          id uuid pk · owner_id · name citext · unique (owner_id, name)
ref_tags      ref_id → refs · tag_id → tags · pk (ref_id, tag_id)
annotations   id uuid pk · ref_id → refs (cascade) · owner_id · kind ('pin'|'box')
              x · y · w · h (null for pins) · caption · position int
collection_shares  collection_id pk → collections (cascade) · token text unique
                   published_at · rotated_at
invite_requests    id uuid pk · name · email citext unique · note (≤500)
                   requested_at · status ('waiting'|'invited'|'declined')
```

**Done when**

- [ ] Every field the UI reads maps to a column (see the seam table)
- [ ] Slugs unique per owner; tokens and public ids unique globally
- [ ] Migration is idempotent against a fresh project

### KEPT-9 · Row-level security: owner and two-factor on every row

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Supabase foundation
- **Labels:** db, security
- **Blocked by:** KEPT-8
- **Blocks:** KEPT-12, KEPT-26

**Why.** The browser talks straight to Postgres, so RLS is the whole security model. Checking `aal2` in the policies means a stolen password without the second factor reads nothing.

**Approach**

1. Enable RLS on every table. No policies on `invite_requests` or `collection_shares` for anon.
2. One permissive policy per table for select/insert/update/delete: `owner_id = auth.uid()`.
3. One restrictive policy per table: `(auth.jwt() ->> 'aal') = 'aal2'`.
4. `profiles`: a user reads and updates only their own row; usernames are set by you, not the user.
5. Signed-out access goes only through SECURITY DEFINER functions with narrow return shapes (board, invite).

**Sketch**

```text
create policy "own rows" on refs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "require mfa" on refs as restrictive for all to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2');
```

**Done when**

- [ ] pgTAP (or SQL) tests: user B can't select, update or delete user A's rows in any table
- [ ] An aal1 session reads zero rows
- [ ] anon reads zero rows from every table

### KEPT-10 · Private Storage bucket for images

- **Status:** Backlog · **Priority:** High · **Estimate:** 2 pt · **Phase:** Supabase foundation
- **Labels:** storage, security
- **Blocked by:** KEPT-7, KEPT-3
- **Blocks:** KEPT-19

**Why.** Images replace IndexedDB blobs and `public/collections/`. The upload path already makes a 1600px full and a 480px thumb on the device, so no server-side transforms are needed.

**Approach**

1. Bucket `kept-assets`, private, 10 MB limit, allowed types `image/jpeg`, `image/png`, `image/webp`.
2. Object paths `<owner_id>/<ref_id>/full.jpg` and `thumb.jpg`.
3. Policies on `storage.objects`: `(storage.foldername(name))[1] = auth.uid()::text` plus aal2, for select, insert, update and delete.

**Done when**

- [ ] A signed-in user can upload and sign URLs only under their own folder
- [ ] Unsigned object URLs return 400/404
- [ ] Another user's paths can't be signed

### KEPT-11 · Supabase client and generated types

- **Status:** Backlog · **Priority:** Medium · **Estimate:** 1 pt · **Phase:** Supabase foundation
- **Labels:** data
- **Blocked by:** KEPT-8
- **Blocks:** KEPT-13, KEPT-17

**Why.** One client module the data layer shares, and types generated from the schema so column typos fail the build.

**Approach**

1. `src/kept/supabase.ts` creates the client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`, or exports `null` when they're missing (D-4).
2. `npm run db:types` runs `supabase gen types typescript` into `src/kept/db.types.ts`.
3. Add `@supabase/supabase-js` as the only new runtime dependency.

**Done when**

- [ ] Typecheck passes with generated types
- [ ] App still runs on mocks with no env vars

### KEPT-12 · Username sign-in Edge Function

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Sign-in and two-factor
- **Labels:** auth, edge function, security
- **Blocked by:** KEPT-2, KEPT-9
- **Blocks:** KEPT-16

**Why.** Implements D-1. The login screen stays exactly as it is: username, password, the same four error messages.

**Approach**

1. `supabase/functions/sign-in`: POST `{ username, password }`.
2. With the service role, find `profiles.username` → user id → `auth.admin.getUserById()` → email.
3. Call `signInWithPassword({ email, password })` with an anon client inside the function and return `{ access_token, refresh_token }`.
4. Unknown username and wrong password return the same 400 and the same message: “Username or password is incorrect.”
5. Basic rate limit per IP and per username (a small table with timestamps is enough for v0).
6. Client: `signInWithPassword()` in `session.ts` calls the function, then `supabase.auth.setSession()`.

**Done when**

- [ ] The existing login error states still render identically
- [ ] No response ever contains an email
- [ ] 10 bad attempts in a minute are refused

### KEPT-13 · Real session behind the synchronous getSession()

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Sign-in and two-factor
- **Labels:** auth
- **Blocked by:** KEPT-11
- **Blocks:** KEPT-15, KEPT-55

**Why.** Screens and the auth gate call `getSession()` synchronously and expect `{ username, aal }`. Supabase's session API is async, so the app has to load the session once before the first render and keep a cache.

**Approach**

1. In `main.tsx`, before `createRoot().render`, await `session.init()`: `auth.getSession()`, `auth.mfa.getAuthenticatorAssuranceLevel()` (both read the local JWT, so this is fast), and the user's `profiles.username`.
2. Keep a module-level cache; update it from `onAuthStateChange` (sign-in, token refresh, sign-out) and notify the router so the gate re-evaluates.
3. `getSession()` returns the cache synchronously: `{ username, aal: currentLevel }`.
4. `signOut()` calls `auth.signOut()` and clears the cache.

**Done when**

- [ ] Reloading `/library` while signed in never flashes the sign-in page
- [ ] Signing out in one tab signs out other tabs
- [ ] Token refresh happens without a visible change

### KEPT-14 · Design the two-factor screen in kept-ui

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Sign-in and two-factor
- **Labels:** kept-ui first, ui
- **Blocks:** KEPT-15

**Why.** `/login/mfa` is a placeholder in both projects. kept-ui is the source of truth, so the real screen is designed and approved there (with a mock) before kept-design wires it.

**Approach**

1. In kept-ui, add two states to `/login/mfa`: **Set up** (QR code, the secret as text for manual entry, a six-digit field) and **Verify** (a six-digit field only).
2. Add mock functions to kept-ui's `session.ts` that the screen calls, e.g. `getMfaStatus()`, `startTotpEnrollment()`, `verifyTotp(code)`. These become the seam.
3. Errors in the existing style: “Enter the six-digit code.”, “That code didn’t work. Try the newest one.”
4. Approve it in the lab, then `npm run sync-kept-ui`.

**Done when**

- [ ] kept-ui has the approved screen and mock functions
- [ ] kept-design matches it pixel for pixel after the sync

**Notes.** This is the one issue that touches kept-ui. It's lab work done with your approval, like the other screens, not a change pushed from kept-design. Since D-6, there are two renderers: kept-ui remains the source for the web screen, and the native two-factor screen is designed separately under KEPT-42's information architecture. The seam functions (`getMfaStatus`, `startTotpEnrollment`, `verifyTotp`) are shared by both.

### KEPT-15 · Wire TOTP enrollment and challenge

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Sign-in and two-factor
- **Labels:** auth, security
- **Blocked by:** KEPT-13, KEPT-14
- **Blocks:** KEPT-16

**Why.** Makes the aal2 requirement real. Supabase's MFA API does enroll → challenge → verify and upgrades the session to aal2.

**Approach**

1. `startTotpEnrollment()` → `auth.mfa.enroll({ factorType: 'totp' })`, returning the QR SVG and secret.
2. `verifyTotp(code)` → `auth.mfa.challenge()` then `auth.mfa.verify()`; on success refresh the session cache to aal2.
3. The gate already sends aal1 sessions to `/login/mfa`; the screen shows Set up when no factor is verified, else Verify.
4. Recovery: Supabase has no backup codes. Enroll a second TOTP factor (another device or a password manager) and document the dashboard reset as the last resort.

**Done when**

- [ ] Fresh account: sign in → set up → library
- [ ] Next sign-in asks only for the code
- [ ] An aal1 session can't read data even by calling the API directly (KEPT-9)

### KEPT-16 · Create your account by hand

- **Status:** Backlog · **Priority:** High · **Estimate:** 1 pt · **Phase:** Sign-in and two-factor
- **Labels:** auth, ops
- **Blocked by:** KEPT-12, KEPT-15
- **Blocks:** KEPT-28

**Why.** Signups are off and Kept is invite-only, so accounts are made in the dashboard. This is also the procedure for approving invites.

**Approach**

1. Dashboard → Authentication → Add user: your real email, a strong password, auto-confirm.
2. Insert the profile: `insert into profiles (id, username) values ('<user id>', 'wade');`
3. Sign in, enroll TOTP, and confirm the library loads (empty until KEPT-28).

**Done when**

- [ ] You can sign in as `wade` with a real password and TOTP
- [ ] The lab password `1234` no longer works outside the mock fallback

### KEPT-17 · Repository adapter structure

- **Status:** Backlog · **Priority:** High · **Estimate:** 2 pt · **Phase:** Library data
- **Labels:** data
- **Blocked by:** KEPT-6, KEPT-11
- **Blocks:** KEPT-18, KEPT-19, KEPT-23

**Why.** Implements D-4 and KEPT-6's split. Screens import one module; it routes each call to Supabase or the mock.

**Approach**

1. `repository.ts`: `export * from types`, then each function delegates to `supabaseRepository` when the client exists, else to `repository.mock.ts`.
2. `repository.supabase.ts` holds the real implementations, one per exported function, with identical signatures.
3. Shared helpers: slug ↔ uuid map for collections, public_id ↔ uuid for refs, signed-URL cache.

**Done when**

- [ ] With no env vars the app behaves exactly like today
- [ ] With env vars every function hits Supabase
- [ ] No screen file changes

### KEPT-18 · Collections: list, get, create, describe

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** Library data
- **Labels:** data, db
- **Blocked by:** KEPT-17

**Why.** The library home needs names, counts, updated dates, descriptions and up to four cover thumbnails per collection.

**Approach**

1. View `collection_summaries`: collection columns + `count(refs)` + the four newest thumb paths.
2. `listCollections()` selects the view, signs cover paths in one batch, maps `slug` to `id`.
3. `getCollection(id)` by slug.
4. `createCollection(name)` calls RPC `create_collection(name)`, which makes a unique slug per owner in SQL (no race between two tabs).
5. `updateCollection(id, { description })` updates by slug.

**Done when**

- [ ] Library count line and tiles match the mock for the same data
- [ ] Creating “Type specimens” twice gives `type-specimens` and `type-specimens-2`

### KEPT-19 · References: list with signed image URLs

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** Library data
- **Labels:** data, storage
- **Blocked by:** KEPT-17, KEPT-10
- **Blocks:** KEPT-20, KEPT-21, KEPT-55

**Why.** The collection grid, list, reference page and All references all read `listReferences()`. It must return complete `Reference` objects, image URLs included, fast enough for 160+ items.

**Approach**

1. One query: `refs` with nested `assets`, `ref_tags(tags(name))` and `annotations`, ordered newest first.
2. Map rows to `Reference`: `id` = public_id, `collectionId` = slug, pins from annotations of kind pin (normalized x/y + caption).
3. Sign thumbs and fulls with `storage.createSignedUrls()` in one call per 100 paths; cache by path until 5 minutes before expiry.
4. `listAllReferences()` runs the same query without the collection filter.

**Done when**

- [ ] The moode-matcha grid loads with images in one round trip plus two signing calls
- [ ] Reference page ← → still steps through the same order
- [ ] Search still finds titles, tags, notes, source, file names and pin captions (it runs on the loaded list)

### KEPT-20 · Save notes, tags and pins

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** Library data
- **Labels:** data, db
- **Blocked by:** KEPT-19

**Why.** `updateReference()` takes a partial `{ notes, tags, pins }` and returns the updated reference. Tags and pins are lists that should be replaced atomically.

**Approach**

1. `notes`: update `refs.notes`.
2. `tags`: RPC `set_ref_tags(ref, names text[])` upserts tag names (case-insensitive, like the UI's duplicate rule) and replaces `ref_tags` in one transaction.
3. `pins`: RPC `set_ref_pins(ref, pins jsonb)` replaces the ref's pin annotations in one transaction, keeping order.
4. Coalesce rapid edits (typing notes, dragging a caption) into one write per pause, as the mock's localStorage writes never had to.

**Done when**

- [ ] Edits survive reload and show up on another device
- [ ] Two quick tag edits never leave a half-applied state

### KEPT-21 · Uploads to Storage

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** Library data
- **Labels:** data, storage
- **Blocked by:** KEPT-19
- **Blocks:** KEPT-28, KEPT-55, KEPT-59

**Why.** The upload dialog's rows (Waiting, Adding…, Added, “Couldn’t read this file”) and its running count stay the same; only where the files go changes.

**Approach**

1. Keep `prepareUpload()` (on-device decode, 1600px full, 480px thumb, metadata stripped).
2. Per file: RPC `create_ref(collection, title, file facts)` returns ids and paths → upload full and thumb → mark added.
3. On failure, delete the rows and any uploaded object, then report `failed` for that file only.
4. Bump the collection's `updated_at` once at the end, as the mock does.

**Done when**

- [ ] Uploading 12 phone photos shows the same progress UI and lands them first in the grid
- [ ] A corrupt file fails alone without leaving an orphan row or object
- [ ] Nothing is written to IndexedDB any more

### KEPT-22 · Keep search client-side for v0

- **Status:** Backlog · **Priority:** Low · **Estimate:** 1 pt · **Phase:** Library data
- **Labels:** data

**Why.** `ReferenceBrowser` filters the loaded list, which is instant at this size. No backend work until a library outgrows it; the tsvector column is already there for KEPT-34.

**Done when**

- [ ] Search behaves identically on real data

### KEPT-23 · Publish, rotate and unpublish in Postgres

- **Status:** Backlog · **Priority:** High · **Estimate:** 2 pt · **Phase:** Boards
- **Labels:** data, db
- **Blocked by:** KEPT-17
- **Blocks:** KEPT-24, KEPT-25, KEPT-28, KEPT-60

**Why.** The share dialog's states (not shared, shared with a link, new link, unpublished) move from localStorage to `collection_shares`.

**Approach**

1. `getShare(id)` selects the share by collection.
2. RPC `publish_collection(collection)` makes a 10-character base36 token with `gen_random_bytes` (same format as the mock) and returns the share; idempotent.
3. RPC `rotate_share(collection)` replaces the token; the old one stops resolving at once.
4. `unpublishCollection` deletes the row.
5. `Share.owner` comes from the owner's `profiles.username`.

**Done when**

- [ ] The share dialog's copy, New link and Unpublish states render as today
- [ ] A rotated token 404s on the next board load

### KEPT-24 · Board Edge Function for signed-out visitors

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Boards
- **Labels:** edge function, storage, security
- **Blocked by:** KEPT-23, KEPT-3
- **Blocks:** KEPT-30, KEPT-61

**Why.** Implements D-2. `/m/:token` has to work with no session, so it can't go through RLS as a user.

**Approach**

1. `supabase/functions/board`: GET `?token=`; with the service role, find the share → collection → refs with assets, tags and pins.
2. Return the `Board` shape (`collection`, `references`, `share`) with signed URLs (about an hour).
3. Unknown, rotated or unpublished tokens: 404 → the existing “This board isn't available” state.
4. Short `Cache-Control` (a minute) so unpublish takes effect quickly; never cache 404s long.
5. `getBoard(token)` calls the function without an auth header.

**Done when**

- [ ] The board and lightbox render identically, signed out, on another device
- [ ] Unpublish → the next load shows the unavailable state
- [ ] The response contains no owner email or ids beyond what the board shows

### KEPT-25 · Share links use kept.design

- **Status:** Backlog · **Priority:** Medium · **Estimate:** 1 pt · **Phase:** Boards
- **Labels:** ui
- **Blocked by:** KEPT-23

**Why.** `boardAbsoluteUrl()` builds links from the current origin, so preview deployments hand out preview URLs.

**Approach**

1. Add `VITE_PUBLIC_ORIGIN` (`https://kept.design` in production) and fall back to `window.location.origin`.
2. This is a kept-design-only helper; the sync rewrite keeps pointing kept-ui's share URL at it.

**Done when**

- [ ] Links copied from production are `https://kept.design/m/…`

### KEPT-26 · Store invite requests server-side

- **Status:** Backlog · **Priority:** High · **Estimate:** 2 pt · **Phase:** Invites
- **Labels:** db, security
- **Blocked by:** KEPT-9
- **Blocks:** KEPT-27, KEPT-30

**Why.** Today requests live only in the requester's browser, so you never see them. The form, its errors and the two confirmation states stay the same.

**Approach**

1. RPC `request_invite(name, email, note)`, SECURITY DEFINER, executable by anon: validate lengths and email shape, `insert … on conflict (email) do nothing`, return `{ alreadyRequested }`.
2. Honeypot field + a per-IP rate limit to keep bots out; add Turnstile later only if spam shows up.
3. `requestInvite()` in the repository calls the RPC.

**Done when**

- [ ] “You’re on the list.” and “You’re already on the list.” work across devices
- [ ] anon still can't select from `invite_requests`

### KEPT-27 · Tell you when someone asks for an invite

- **Status:** Backlog · **Priority:** Medium · **Estimate:** 2 pt · **Phase:** Invites
- **Labels:** edge function, ops
- **Blocked by:** KEPT-26

**Why.** A request nobody sees is the same as no request.

**Approach**

1. Database webhook on `invite_requests` insert → Edge Function `notify-invite` → email to you via Resend (or a Slack webhook).
2. Approving = KEPT-16's steps for their account, then set `status = 'invited'`.

**Done when**

- [ ] A test request reaches your inbox within a minute

### KEPT-28 · Seed moode-matcha into Storage

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** Web v0 ship
- **Labels:** data, ops
- **Blocked by:** KEPT-21, KEPT-23, KEPT-16
- **Blocks:** KEPT-30

**Why.** Your real collection has to move from `public/collections/` and `data/moode-matcha.json` into your account.

**Approach**

1. `scripts/seed-moode-matcha.mjs`, run locally with the service-role key from `.env.local` (never committed).
2. Create the collection `moode-matcha` for `wade`, upload all 160 full and thumb files, insert refs and assets with the file facts from the JSON.
3. Publish it with the existing token `mm7q2x9kfa` so the board link you've already shared keeps working.
4. Idempotent: re-running skips what exists.

**Done when**

- [ ] Library shows 1 collection, 160 references with images
- [ ] `/m/mm7q2x9kfa` works signed out

### KEPT-29 · Environment variables and secrets

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 1 pt · **Phase:** Web v0 ship
- **Labels:** infra, security
- **Blocked by:** KEPT-7
- **Blocks:** KEPT-31

**Why.** Only the publishable key may reach the browser.

**Approach**

1. Vercel (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_ORIGIN`.
2. Edge Function secrets: service-role key, Resend key.
3. Local: `.env.local` for the app and the seed script; `.env.example` committed without values.
4. Check the production bundle for anything that looks like a service key before the first deploy.

**Done when**

- [ ] `grep` of `dist/` finds no service-role key
- [ ] Previews without secrets fall back to the mocks (D-4)

### KEPT-30 · Verify the web app: pixel parity, end-to-end and RLS

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** Web v0 ship
- **Labels:** security, ui
- **Blocked by:** KEPT-28, KEPT-24, KEPT-26
- **Blocks:** KEPT-31

**Why.** Real data mustn't change how anything looks, and the security model needs proof, not assumption.

**Approach**

1. Re-run the pixel sweep against kept-ui with the same collection seeded: every route and state identical (share URLs excepted).
2. End to end: sign in → TOTP → create collection → upload → pin → tag → notes → publish → open board signed out → New link → Unpublish → invite request.
3. RLS tests from KEPT-9 pass against the deployed project.
4. Log a health run (`health/log.csv`) for the release.

**Done when**

- [ ] All three pass on the production project before the domain switch

### KEPT-31 · Ship the web app to kept.design

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 1 pt · **Phase:** Web v0 ship
- **Labels:** ops
- **Blocked by:** KEPT-30, KEPT-29, KEPT-1
- **Blocks:** KEPT-61

**Why.** The finish line for v0.

**Approach**

1. Merge to main → Vercel production deploy.
2. Point `kept.design` at the project; check `/`, `/library` (signed in), and a board signed out.
3. Tick “Ship to kept.design” in Kept's own To do page.

**Done when**

- [ ] kept.design serves the real app with real data

### KEPT-32 · Box annotations

- **Status:** Backlog · **Priority:** Low · **Estimate:** 5 pt · **Phase:** Later
- **Labels:** kept-ui first, ui

**Why.** Pins only today. The schema already allows `kind = 'box'` with `w`/`h`. Design the drag-to-draw interaction in kept-ui first.

### KEPT-33 · Rename references

- **Status:** Backlog · **Priority:** Low · **Estimate:** 2 pt · **Phase:** Later
- **Labels:** kept-ui first, ui

**Why.** Uploads take the file name as the title. Needs an editable title in kept-ui, then `updateReference` accepts `title`.

### KEPT-34 · Server-side search and a command palette

- **Status:** Backlog · **Priority:** Low · **Estimate:** 5 pt · **Phase:** Later
- **Labels:** db, ui

**Why.** When the library outgrows client filtering: an RPC over the `search` tsvector (titles, notes, tags, pin captions), and a Base UI Combobox palette designed in kept-ui.

### KEPT-35 · Board link previews

- **Status:** Backlog · **Priority:** Low · **Estimate:** 3 pt · **Phase:** Later
- **Labels:** edge function

**Why.** A preview card when a board link is pasted into a chat. A tiny OG endpoint for `/m/:token`, without moving the app to Next.js.

### KEPT-36 · Move images to R2 if Storage costs bite

- **Status:** Backlog · **Priority:** No priority · **Estimate:** 3 pt · **Phase:** Later
- **Labels:** storage, infra

**Why.** Out of scope for v0 by design. Revisit only if egress or storage costs become real.

### KEPT-37 · Confirm the native framework and retire the Capacitor plan

- **Status:** Todo · **Priority:** Urgent · **Estimate:** 1 pt · **Phase:** iOS foundation
- **Labels:** decision, ios
- **Blocks:** KEPT-40

**Why.** The `/ios` page in the app still describes a Capacitor wrapper, chosen when the goal was "don't rebuild the UI". The goal is now an app that feels native in the hand, which points somewhere else (D-6). The old plan has to be retired in writing or it will keep resurfacing.

**Approach**

1. Record the call in D-6 with the reasoning, not just the choice.
2. Rewrite `src/kept/KeptIos.tsx` so `/ios` describes the real plan. Four things in it are already wrong: it says hash routes work unchanged (kept-design uses real paths), it says `pnpm` (this repo is npm), it points at `kept-ui.vercel.app` as "today", and it hardcodes a LAN IP in a public repo.
3. Rewrite the AGENTS.md rule that kept-ui is the single source of truth for the UI: true for web, false once a second renderer exists.
4. Write down the condition that would reopen D-6, so it is a test rather than a mood: KEPT-44 failing its frame budget on device.

**Done when**

- [ ] D-6 has a chosen option and a recorded reason
- [ ] `/ios` describes the current plan and contains no stale claims
- [ ] AGENTS.md says which source of truth applies to which renderer

**Notes.** Nothing in the backend roadmap (p1–p6) is affected by this decision. Schema, RLS, Storage, Auth and both Edge Functions serve a native client exactly as they serve the browser.

### KEPT-38 · Settle the app name and bundle identifier

- **Status:** Todo · **Priority:** Urgent · **Estimate:** 1 pt · **Phase:** iOS foundation
- **Labels:** decision, ios, ops
- **Blocks:** KEPT-39, KEPT-40, KEPT-64

**Why.** A bundle identifier is permanent once the app is public. Changing it after release means a new App Store listing, new reviews, and no upgrade path for anyone who already installed it. The name question has been open and low-priority; for iOS it stops being low-priority at KEPT-40.

**Approach**

1. Settle D-7.
2. Pick the reverse-DNS identifier (`design.kept.app` if the name stands) and write it down in exactly one place that the Xcode project, the App Group, the associated domain and App Store Connect all read from.
3. Reserve the name in App Store Connect once KEPT-39 is done — reservation is first-come and free.

**Done when**

- [ ] D-7 has a chosen option
- [ ] The identifier is recorded once and referenced everywhere else
- [ ] The name is reserved in App Store Connect

**Notes.** The App Store display name can be changed later. The bundle identifier and the App Group identifier cannot, in practice.

### KEPT-39 · Join the Apple Developer Program

- **Status:** Backlog · **Priority:** High · **Estimate:** 1 pt · **Phase:** iOS foundation
- **Labels:** ios, ops
- **Blocked by:** KEPT-38

**Why.** $99 a year. Required for TestFlight, the App Store, Universal Links, App Groups and push. A free Apple ID can only sideload to your own device, and the install expires after seven days — enough to prove KEPT-44, not enough to live with the app.

**Approach**

1. Enroll. Individual or company changes the seller name shown publicly on the App Store; switching afterwards is a support process, not a settings toggle.
2. Two-factor on the Apple ID is mandatory for App Store Connect.
3. Create the app record in App Store Connect and reserve the name from KEPT-38.

**Done when**

- [ ] Membership is active
- [ ] App Store Connect has the app record with the agreed bundle identifier

**Notes.** Enrolling as an individual publishes your legal name as the seller. If that matters, sort out the entity before enrolling rather than after.

### KEPT-40 · Create the React Native app

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS foundation
- **Labels:** ios, native
- **Blocked by:** KEPT-37, KEPT-38
- **Blocks:** KEPT-58

**Why.** The project itself: Expo with a development build (D-8), TypeScript strict, the agreed bundle identifier, and the one Info.plist flag without which the app is capped at 60fps on a 120Hz phone.

**Approach**

1. `npx create-expo-app` with the TypeScript template; add `expo-dev-client` so custom native code is possible from day one.
2. Set the bundle identifier from KEPT-38 in `app.config.ts`.
3. Set `CADisableMinimumFrameDurationOnPhone` to `YES` in Info.plist. Without it iOS caps the app at 60fps on ProMotion devices and every animation silently loses half its frames.
4. EAS build profiles: `development` (dev client on device), `preview` (internal distribution), `production` (TestFlight and App Store).
5. Decide repo layout: a sibling repo, or a folder in a monorepo alongside the web app. The only thing that genuinely needs sharing is tokens (KEPT-41) and the data contract (KEPT-45).

**Sketch**

```text
app.config.ts
  ios.bundleIdentifier   design.kept.app          (D-7)
  ios.infoPlist          CADisableMinimumFrameDurationOnPhone: true
  ios.supportsTablet     false                    (iPad is a later bet)
  plugins                expo-dev-client, expo-font, expo-image,
                         expo-secure-store, expo-image-picker
```

**Done when**

- [ ] A development build runs on your iPhone over the cable
- [ ] A test animation measurably runs above 60fps on device
- [ ] The bundle identifier matches KEPT-38 everywhere it appears

### KEPT-41 · Design tokens as shared data

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS foundation
- **Labels:** ui, ios, data

**Why.** `tokens.css` is web-only, so today there is no way for the two apps to agree on a colour. Implements D-9: one source of truth that generates both.

**Approach**

1. Extract `src/kept/tokens.css` into `tokens.json`: colour (light and dark), spacing scale, radii, type scale, weights, and the motion constants from KEPT-44.
2. A generator emits CSS custom properties for the web app and a typed TS object for native.
3. The web app keeps importing the generated CSS, so nothing changes visually and the pixel sweep still passes.
4. Lint rule or review habit: no raw hex, no magic spacing numbers in native screen code.

**Done when**

- [ ] Changing one value in `tokens.json` changes both apps
- [ ] The web app is pixel-identical before and after the extraction
- [ ] Native screens reference tokens, never literals

**Notes.** This is the concrete moment kept-ui stops being the single source of truth for the UI. It stays the source for web layout and design intent; tokens become the shared layer beneath both.

### KEPT-42 · Native information architecture

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS foundation
- **Labels:** ios, ui, kept-ui first
- **Blocks:** KEPT-46

**Why.** The web app is a three-pane desktop layout across 16 routes. A phone is not a small desktop: the screens have to be re-planned, not ported. Getting this wrong is expensive because every later screen sits inside it.

**Approach**

1. Decide the root: a tab bar (Library · Search · Add · You) or a single stack with a prominent capture action.
2. Map each of the 16 web routes to a native screen, a sheet, or explicitly nothing. `/map`, `/ios`, `/todo` and `/referral` are almost certainly nothing.
3. Decide what a modal sheet is and what is a pushed screen — a rule, applied consistently, not a per-screen judgement call.
4. Design it before building it. Whether that is kept-ui, Figma or paper matters less than it being approved before KEPT-46 starts.

**Done when**

- [ ] Every web route has a native counterpart or a written "not on phone"
- [ ] The navigation shape is approved before any library screen is built

**Notes.** Kept's job on a phone is capture and browse. The long tail of account screens can be thin or absent without hurting the product.

### KEPT-43 · Type, fonts, dark mode and safe areas

- **Status:** Backlog · **Priority:** High · **Estimate:** 2 pt · **Phase:** iOS foundation
- **Labels:** ui, ios

**Why.** The chrome that makes a native app feel like it belongs to the same product as the website.

**Approach**

1. Load Geist and Geist Mono with `expo-font`; fall back to the system face while they load rather than flashing.
2. Light and dark from `useColorScheme`, reading the same tokens as the web (KEPT-41).
3. Safe areas with `react-native-safe-area-context` — the notch, the home indicator, and the keyboard.
4. Decide the Dynamic Type position: full support, or a capped scale. Accessibility text sizes will break a dense image grid if ignored entirely.

**Done when**

- [ ] Light and dark match the web tokens side by side
- [ ] Nothing is obscured by the notch or the home indicator on a modern iPhone
- [ ] Text at the largest accessibility size is still usable

### KEPT-44 · Motion and gesture foundations

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** iOS foundation
- **Labels:** ios, motion, native
- **Blocks:** KEPT-46, KEPT-47

**Why.** The whole reason for rebuilding instead of wrapping. These primitives get set once, before any screen depends on them, and they are also the test of whether the framework choice was right.

**Approach**

1. `react-native-reanimated` and `react-native-gesture-handler`. Every animation runs on the UI thread from a shared value — never driven by React state, which puts it back on the JS thread and back at the mercy of a render.
2. One shared spring configuration in tokens, so every surface in the app decelerates the same way.
3. The rule, written down: every animation is interruptible. Anything you can start with a gesture, you can catch mid-flight and reverse.
4. Velocity carries from the gesture into the animation. A flung sheet keeps the speed of the finger that threw it.
5. Build a throwaway test screen: 300 images, fast scroll, a pinch, a drag-dismiss. Profile it on a real device, not the simulator.
6. Load the `apple-design` and `gesture-ui` guidance before setting the spring values, rather than guessing at numbers.

**Done when**

- [ ] A scroll of 300 images holds 120fps on device
- [ ] A sheet can be caught mid-animation and reversed without snapping
- [ ] Nothing animates through React state

**Notes.** If this issue cannot hit its frame budget, D-6 gets reopened here — before sixteen screens are built on top of it, not after.

### KEPT-45 · The data contract on native

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS foundation
- **Labels:** data, ios
- **Blocks:** KEPT-46, KEPT-55

**Why.** The seam is the most valuable thing in the web repo: screens call `repository.ts` and `session.ts`, and swapping mocks for Supabase touches no screen. The native app gets the same seam, so its screens can be built on mocks while the backend is still being built.

**Approach**

1. Same function names and return shapes as the web: `listCollections`, `getCollection`, `listReferences`, `updateReference`, `addUploads`, `getSession`, `signInWithPassword`.
2. Share the generated database types from KEPT-11 rather than redeclaring them; a drift here should fail a typecheck, not surface as a bug.
3. `supabase-js` in React Native needs `react-native-url-polyfill` and a storage adapter for auth — the keychain one from D-10.
4. Port the mock repository so every screen in p9 can be built and demoed before p3 lands.

**Done when**

- [ ] Native screens compile against the same types the web app uses
- [ ] Every p9 screen runs on mocks with no backend
- [ ] Swapping mocks for Supabase touches one module

**Notes.** Depends on KEPT-11 only for the generated types. Everything else here can start immediately.

### KEPT-46 · Collections home

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** iOS library
- **Labels:** ios, ui
- **Blocked by:** KEPT-42, KEPT-44, KEPT-45
- **Blocks:** KEPT-47, KEPT-51

**Why.** The root screen: your collections, and a way into All references. The first screen built on the KEPT-42 navigation and the KEPT-44 primitives, so it is also where both get proven.

**Approach**

1. Collection list or grid with cover images and counts.
2. Pull to refresh; empty state; skeletons that match the token type scale rather than generic grey bars.
3. Create a collection from here, as a sheet.
4. Open transition into a collection uses the shared spring, not a stock push.

**Done when**

- [ ] Matches the approved KEPT-42 design
- [ ] Runs entirely on mocks
- [ ] Cold open to interactive in under a second on device

### KEPT-47 · The reference grid

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 8 pt · **Phase:** iOS library
- **Labels:** ios, ui, motion
- **Blocked by:** KEPT-44, KEPT-46
- **Blocks:** KEPT-48, KEPT-52, KEPT-54

**Why.** The screen Kept lives or dies on, and the one a web view could never do properly: hundreds of images, scrolled fast, at 120fps, without the app being killed for memory. moode-matcha alone is 320 files.

**Approach**

1. `@shopify/flash-list` for recycling. A plain list keeps every row mounted and will not survive a real library.
2. `expo-image` for decode and caching — it is backed by SDWebImage on iOS and handles memory and disk caching properly.
3. Thumbnails in the grid (480px), never the full image. The full 1600px asset is only ever loaded by the viewer.
4. Prefetch ahead of the scroll direction; cancel prefetches that scroll past.
5. Set an explicit memory ceiling for the image cache and test against the largest collection, not a demo one.
6. Fixed aspect tiles or a measured masonry layout — decide before building, since masonry with recycling is materially harder.

**Done when**

- [ ] 300+ references scroll at 120fps on device with no blank tiles
- [ ] Memory stays flat over a long scroll; the app is not jetsammed
- [ ] A cold open with a warm disk cache shows images without a flash

**Notes.** This is the issue that proves or disproves the whole rebuild. Worth profiling on the oldest phone you intend to support, not just yours.

### KEPT-48 · Reference viewer: pinch, pan and drag to dismiss

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 8 pt · **Phase:** iOS library
- **Labels:** ios, motion
- **Blocked by:** KEPT-47
- **Blocks:** KEPT-49, KEPT-50, KEPT-53

**Why.** Opening a reference is the most-repeated gesture in the app. It is also the clearest single signal of whether an app feels native, because everyone has Photos.app as a reference point.

**Approach**

1. Shared-element transition from the grid tile into the viewer: the tile becomes the image, it does not cross-fade.
2. Pinch to zoom with two-finger pan, tracking the fingers exactly, with rubber-banding past the bounds and a spring back.
3. Drag down to dismiss, with the background dimming in proportion to the drag and the image returning to its tile if released early.
4. Velocity decides the outcome: a fast flick dismisses even from a short distance.
5. Every part of it interruptible — you can catch a dismissing image and drag it back.

**Done when**

- [ ] Pinch tracks the fingers with no perceptible lag
- [ ] A dismiss can be reversed mid-flight
- [ ] The image lands exactly on its grid tile when it returns
- [ ] Holds 120fps throughout on device

**Notes.** Load the `apple-design` and `gesture-ui` guidance before building this one. It is the issue most worth over-investing in.

### KEPT-49 · Swipe between references

- **Status:** Backlog · **Priority:** High · **Estimate:** 5 pt · **Phase:** iOS library
- **Labels:** ios, motion
- **Blocked by:** KEPT-48

**Why.** Once a reference is open, moving to the next one should be a flick, not a trip back to the grid.

**Approach**

1. Horizontal paging within the viewer, sharing the zoom state machine from KEPT-48 so a zoomed image pans instead of paging.
2. Preload the neighbours on both sides; release images more than two away.
3. Keep the grid's scroll position in sync, so dismissing returns you to the reference you ended on rather than the one you started from.

**Done when**

- [ ] Swiping through twenty references never shows a loading state
- [ ] Dismissing lands on the correct tile after paging
- [ ] Zoomed panning never accidentally pages

### KEPT-50 · Pins on native

- **Status:** Backlog · **Priority:** High · **Estimate:** 5 pt · **Phase:** iOS library
- **Labels:** ios, ui
- **Blocked by:** KEPT-48
- **Blocks:** KEPT-53

**Why.** Pins are what make a reference a reference rather than a photo. Placing one on a phone is a different interaction from placing one with a mouse.

**Approach**

1. Long-press to place, drag to position, with the pin offset above the finger so it is not hidden by it.
2. A magnifier or offset preview while dragging, since the finger covers the target.
3. Caption entry as a sheet, with the keyboard handled so the pin stays visible.
4. Haptic on placement and on hitting a snap threshold, not on every frame of the drag.
5. Pins live in image coordinates, not screen coordinates, so they survive zoom and rotation.

**Done when**

- [ ] A pin can be placed accurately at the top and bottom edges of the image
- [ ] Pin positions match the web app exactly for the same reference
- [ ] Captions are readable and editable with the keyboard up

### KEPT-51 · Notes, tags and titles

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** iOS library
- **Labels:** ios, ui
- **Blocked by:** KEPT-46

**Why.** The editing surfaces. Mostly unremarkable, except that keyboard handling on iOS is where otherwise-good apps fall apart.

**Approach**

1. Notes as a sheet with the keyboard pushing content rather than covering it.
2. Tag entry with autocomplete from existing tags; creating a tag is the same gesture as picking one.
3. Save on dismiss, not with an explicit Save button; show that it saved without a modal.
4. Same field-level errors and copy as the web app.

**Done when**

- [ ] The caret is never hidden behind the keyboard
- [ ] Dismissing the sheet mid-edit does not lose the edit
- [ ] Tags created on the phone appear on the web and the reverse

### KEPT-52 · Search on device

- **Status:** Backlog · **Priority:** Medium · **Estimate:** 3 pt · **Phase:** iOS library
- **Labels:** ios, ui
- **Blocked by:** KEPT-47

**Why.** Matches the web app's v0 position (KEPT-22): filter what is already loaded rather than build server search. Revisit with KEPT-34 when either client outgrows it.

**Approach**

1. Filter across titles, notes, tags and pin captions — the same fields the web filters.
2. Debounced, running off the main thread if the library is large.
3. Recent searches; an empty state that offers something rather than shrugging.

**Done when**

- [ ] Search over a 500-reference library stays responsive while typing
- [ ] Results match the web app for the same query

### KEPT-53 · The feel pass

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** iOS library
- **Labels:** ios, motion
- **Blocked by:** KEPT-48, KEPT-50
- **Blocks:** KEPT-64, KEPT-66

**Why.** A dedicated pass over the whole app for the things that separate "works" from "feels amazing". Deliberately its own issue, because polish that is left as a sub-task of every other issue never happens.

**Approach**

1. Haptics bound to gesture thresholds and state changes, never to taps for their own sake. A haptic that fires on everything stops meaning anything.
2. Audit every transition for interruptibility; anything that cannot be caught mid-flight gets rebuilt.
3. Remove every stock animation that was left at its default while building.
4. Check the whole app under Reduce Motion: every spring becomes a fade, nothing becomes a jump.
5. Profile on device, holding 120fps through the grid, the viewer and every sheet.
6. Hand the app to someone who has not seen it and watch where their thumb hesitates.

**Done when**

- [ ] 120fps held across the main flows on device
- [ ] Reduce Motion produces a calm app, not a broken one
- [ ] No default-looking transitions remain

**Notes.** This is the issue that the whole rebuild was justified by. If it gets cut for time, the rebuild was not worth doing.

### KEPT-54 · Image cache and offline reads

- **Status:** Backlog · **Priority:** High · **Estimate:** 5 pt · **Phase:** iOS library
- **Labels:** ios, storage
- **Blocked by:** KEPT-47

**Why.** A phone loses signal. A reference library that goes blank on the underground is not a library you trust.

**Approach**

1. Disk cache for thumbnails with an explicit size ceiling and an eviction policy.
2. Cache collection and reference metadata so the grid renders offline even when images are still arriving.
3. Signed Storage URLs expire — cache the image bytes, never the URL, and re-sign on demand.
4. An honest offline state: show what is cached, say what is not, never an infinite spinner.

**Done when**

- [ ] Airplane mode still shows previously-browsed collections and thumbnails
- [ ] Expired signed URLs re-sign without the user noticing
- [ ] The cache respects its ceiling over a week of real use

### KEPT-55 · Wire the native library to Supabase

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** iOS library
- **Labels:** ios, data
- **Blocked by:** KEPT-45, KEPT-19, KEPT-21, KEPT-13
- **Blocks:** KEPT-56, KEPT-58, KEPT-60

**Why.** The moment the phone and the web become one product: the same account, the same collections, the same images, from either device. This is what "sign into the website and see what I collected on my phone" actually means.

**Approach**

1. Swap the mock adapter for the Supabase implementation behind the KEPT-45 contract — one module, no screen changes.
2. Sign-in through the same `sign-in` Edge Function as the web, then TOTP to reach AAL2.
3. Session in the keychain (D-10), with refresh handled on resume so the app is not signed out after a week in the background.
4. Verify row-level security from the device: a second account must see nothing of yours.

**Done when**

- [ ] A collection made on the phone appears on the web without a reload, and the reverse
- [ ] The app stays signed in across relaunches and a week of backgrounding
- [ ] RLS holds from the native client, tested with a second account

### KEPT-56 · Camera and photo library import

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 5 pt · **Phase:** iOS capture
- **Labels:** ios, storage
- **Blocked by:** KEPT-55
- **Blocks:** KEPT-57, KEPT-59

**Why.** The most obvious thing an app can do that a website cannot: put what is in front of you, or already on your phone, into a collection in two taps.

**Approach**

1. `expo-image-picker` for camera and library, with multi-select from the library.
2. Permission strings in Info.plist written in Kept's voice — they are user-facing copy, not boilerplate.
3. Use the limited photo library selection properly; do not nag for full access.
4. Reuse the existing on-device resize (1600px full, 480px thumb, metadata stripped) so phone uploads match web uploads exactly.
5. Strip location metadata. A reference library has no business recording where a photo was taken.

**Done when**

- [ ] A photo goes from camera to a collection in two taps
- [ ] Limited photo access works without repeated prompting
- [ ] Uploads from the phone are byte-comparable to the same file uploaded on the web

### KEPT-57 · Share extension

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 8 pt · **Phase:** iOS capture
- **Labels:** ios, native
- **Blocked by:** KEPT-58, KEPT-56
- **Blocks:** KEPT-65

**Why.** The single best reason for this app to exist. Share → Kept from Safari, Photos or Instagram is how a visual reference library actually gets filled, and it is also what makes the app more than a website in a wrapper under App Store guideline 4.2.

**Approach**

1. A share extension target, added through an Expo config plugin (D-8) so it survives a prebuild.
2. Accept images, URLs and text. A shared URL becomes a reference with `capture_url` set, matching the web's captured references.
3. Pick a destination collection inside the extension, without launching the app.
4. Extensions get a hard memory limit — around 120MB — and are killed without ceremony. Hand large images off rather than processing them in the extension.
5. The extension UI is small: it must still look like Kept, using the shared tokens.

**Done when**

- [ ] Share → Kept works from Safari, Photos and Instagram
- [ ] A shared URL lands as a reference with its capture URL set
- [ ] Sharing ten large photos at once does not crash the extension
- [ ] The destination collection can be chosen without opening the app

**Notes.** The biggest single piece of native work in the plan, and the one that most changes how Kept is used day to day.

### KEPT-58 · App Group handoff

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS capture
- **Labels:** ios, native, infra
- **Blocked by:** KEPT-40, KEPT-55
- **Blocks:** KEPT-57

**Why.** A share extension is a separate process with its own sandbox. An App Group is the only way it can hand files and state to the app.

**Approach**

1. Create the App Group identifier alongside the bundle identifier (KEPT-38); like the bundle id, it is painful to change later.
2. Shared container for handed-off files; shared defaults for the queue.
3. The extension writes to the container and enqueues; the app drains the queue on next launch or resume.
4. Share the auth session across the group so the extension knows who is signed in without its own sign-in flow.
5. Clean up handed-off files after a successful upload, and on a schedule for ones that failed.

**Done when**

- [ ] The app picks up items shared while it was closed
- [ ] The extension knows the signed-in account
- [ ] Nothing accumulates indefinitely in the shared container

### KEPT-59 · Upload queue and background uploads

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 8 pt · **Phase:** iOS capture
- **Labels:** ios, storage
- **Blocked by:** KEPT-56, KEPT-21
- **Blocks:** KEPT-66

**Why.** Phone uploads are not desktop uploads: the network drops, the app gets backgrounded, and iOS suspends processes without warning. An upload that only works in the foreground on good wifi is not an upload.

**Approach**

1. A persistent queue that survives app termination — on disk, not in memory.
2. Per-item state matching the web's upload dialog: Waiting, Adding…, Added, failed. Same copy, same running count.
3. Background upload via `URLSession` background transfers so uploads continue after the app is suspended.
4. Retry with backoff; distinguish a failed file from a lost connection and say which.
5. One failure never takes down the batch — the web app's rule, kept.
6. Show the queue somewhere honest. An upload silently failing is worse than one visibly retrying.

**Done when**

- [ ] Twenty photos queued, app backgrounded immediately, all arrive
- [ ] Killing the app mid-upload loses nothing; it resumes on next launch
- [ ] Airplane mode queues and drains automatically on reconnect
- [ ] One corrupt file fails alone, with no orphan rows or objects

### KEPT-60 · Native share sheet for board links

- **Status:** Backlog · **Priority:** Medium · **Estimate:** 2 pt · **Phase:** iOS capture
- **Labels:** ios, ui
- **Blocked by:** KEPT-55, KEPT-23

**Why.** Publishing a board on the phone should hand you the system share sheet, not a copy-to-clipboard toast borrowed from the web.

**Approach**

1. The native share sheet for a published board link.
2. Links use `https://kept.design/m/…` (KEPT-25), never a local or preview origin.
3. Keep copy-to-clipboard as the secondary action, with the native haptic confirmation.

**Done when**

- [ ] Sharing a board offers Messages, Mail and the rest
- [ ] The shared link is the public kept.design URL

### KEPT-61 · Universal Links for boards

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** iOS ship
- **Labels:** ios, infra
- **Blocked by:** KEPT-24, KEPT-31
- **Blocks:** KEPT-67

**Why.** A board link sent to someone who has the app should open the app, not Safari. It is also the thing that makes the two surfaces feel like one product from the outside.

**Approach**

1. Serve `apple-app-site-association` from `https://kept.design/.well-known/`, as JSON, no extension, no redirect, correct content type.
2. Associated Domains entitlement (`applinks:kept.design`) in the app.
3. Handle `/m/:token` as a cold start, not just while running — the common bug is only handling the warm case.
4. Anyone without the app must still get the web board. The link is public and sign-in-free by design.
5. Test from Messages and Notes; Safari's address bar deliberately does not trigger Universal Links.

**Done when**

- [ ] A board link opens the app when installed, the website when not
- [ ] Cold start on a link lands on the right board
- [ ] The association file validates

### KEPT-62 · Delete your account, in the app

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS ship
- **Labels:** ios, security
- **Blocks:** KEPT-66

**Why.** App Store guideline 5.1.1(v): an app that supports account creation must let people delete the account from inside the app. Kept is invite-only and accounts are made by hand, which does not exempt it. This is a common rejection.

**Approach**

1. A delete path in the app that actually deletes: auth user, rows, and every Storage object.
2. Confirmation that makes the consequence plain, and is hard to trigger accidentally.
3. A server-side function does the deletion; the client must not be trusted to cascade it.
4. Published boards die with the account.
5. Decide and state the retention position — immediate, or a grace period — and make the copy match what actually happens.

**Done when**

- [ ] An account can be fully deleted from inside the app
- [ ] No orphaned rows or Storage objects survive
- [ ] Published board links stop resolving

**Notes.** Worth building on the web app too. The requirement is Apple's, but the capability is not iOS-specific.

### KEPT-63 · Privacy manifest and App Store privacy answers

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS ship
- **Labels:** ios, security
- **Blocks:** KEPT-66

**Why.** Apple requires a privacy manifest and accurate data-collection answers. Getting these wrong is both a rejection risk and a trust problem, since the answers are shown publicly on the listing.

**Approach**

1. `PrivacyInfo.xcprivacy` declaring data types collected and the reasons for any required-reason APIs.
2. Check the manifests of every third-party SDK that ships in the binary; they aggregate into yours.
3. Answer the App Store Connect privacy questions honestly: user content, identifiers, what is linked to the user, what is used for tracking (nothing).
4. A privacy policy at a stable URL on kept.design; the listing requires one.
5. If location metadata is stripped at import (KEPT-56), say so — it is a genuine selling point.

**Done when**

- [ ] The manifest covers the app and its dependencies
- [ ] The privacy answers match what the app actually does
- [ ] A privacy policy is live at a permanent URL

### KEPT-64 · App icon, launch screen and store assets

- **Status:** Backlog · **Priority:** High · **Estimate:** 3 pt · **Phase:** iOS ship
- **Labels:** ios, ui
- **Blocked by:** KEPT-38, KEPT-53
- **Blocks:** KEPT-66

**Why.** The first thing anyone sees, and the last thing anyone leaves time for.

**Approach**

1. App icon at every required size; test it on both light and dark home screens, and at the smallest size it will ever be drawn.
2. Launch screen that matches the app's first frame so launch reads as instant rather than as a flash.
3. App Store screenshots for the required device sizes, showing real collections rather than lorem ipsum.
4. Listing copy: name, subtitle, description, keywords. The subtitle does a lot of work.
5. Decide whether the icon reflects the KEPT wordmark or stands apart from it.

**Done when**

- [ ] The icon reads clearly at the smallest size, in light and dark
- [ ] Launch does not flash a mismatched colour
- [ ] Screenshots show the real app

### KEPT-65 · Guideline 4.2 readiness review

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 2 pt · **Phase:** iOS ship
- **Labels:** ios, app store
- **Blocked by:** KEPT-57
- **Blocks:** KEPT-67

**Why.** Apple rejects apps that are a website in a wrapper. The rebuild makes this a much easier argument than the Capacitor plan would have, but it is still worth checking deliberately before submitting rather than discovering it in review.

**Approach**

1. Write down the native capabilities the website cannot have: share extension, camera capture, offline library, Universal Links, haptics, background uploads.
2. Confirm the app is not merely a mirror of kept.design — the IA from KEPT-42 should already differ.
3. Prepare reviewer notes explaining the invite-only model, with a working demo account. Invite-only apps get rejected for being untestable far more often than for anything else.
4. Make sure the demo account has real content; an empty library looks broken to a reviewer.

**Done when**

- [ ] A written 4.2 argument exists before submission
- [ ] Reviewer notes include working credentials and a populated demo account

**Notes.** The demo account is the single most common avoidable rejection for invite-only apps. Set it up before you need it.

### KEPT-66 · TestFlight beta

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS ship
- **Labels:** ios, ops
- **Blocked by:** KEPT-53, KEPT-59, KEPT-62, KEPT-63, KEPT-64
- **Blocks:** KEPT-67

**Why.** Real devices, real hands, before the App Store. Also the first time the app runs without a cable and a debugger attached.

**Approach**

1. EAS production build uploaded to App Store Connect.
2. Internal testers first (up to 100, no review). External testing needs a beta review, which is lighter than App Store review but not instant.
3. Builds expire after 90 days — plan the cadence rather than being surprised.
4. Set up crash reporting before the first tester, not after the first crash.
5. Ask testers for one specific thing: does it feel good in the hand? Everything else is easier to find yourself.

**Done when**

- [ ] A build is installable from TestFlight on a device that has never been cabled to your Mac
- [ ] Crashes report with symbols
- [ ] At least a handful of testers have used it on a real library

### KEPT-67 · App Store submission

- **Status:** Backlog · **Priority:** Urgent · **Estimate:** 3 pt · **Phase:** iOS ship
- **Labels:** ios, app store
- **Blocked by:** KEPT-66, KEPT-65, KEPT-61

**Why.** The finish line for iOS v1.

**Approach**

1. Final build, listing, screenshots, privacy answers and reviewer notes.
2. Age rating, export compliance (the app uses HTTPS, which is the usual answer), content rights.
3. Submit, then expect a round of review feedback rather than being surprised by it.
4. Plan the release: manual release rather than automatic, so the launch happens when you choose.
5. Tick it off in Kept's own To do page.

**Done when**

- [ ] The app is on the App Store
- [ ] A phone-only user can be invited, sign in and build a library end to end

### KEPT-68 · Revisit SwiftUI if the feel ceiling is hit

- **Status:** Backlog · **Priority:** No priority · **Estimate:** 8 pt · **Phase:** Later
- **Labels:** ios, decision

**Why.** React Native gets very close to native feel and is not native. If KEPT-53 keeps finding things that cannot be fixed from JavaScript, the ceiling is real and this is the escape hatch.

**Done when**

- [ ] Only opened if a specific, repeated feel problem traces to the framework rather than the implementation

**Notes.** Deliberately parked, not rejected. Reopening this without a concrete failing test from KEPT-44 or KEPT-53 is relitigating D-6.

### KEPT-69 · iPad

- **Status:** Backlog · **Priority:** Low · **Estimate:** 5 pt · **Phase:** Later
- **Labels:** ios, ui

**Why.** A reference library on a larger screen is genuinely compelling — closer to the desktop three-pane layout than the phone is. Out of scope for v1: it is a second IA to design and maintain.

**Done when**

- [ ] Revisit once the phone app is in real use

### KEPT-70 · Widgets, Live Activities and Shortcuts

- **Status:** Backlog · **Priority:** Low · **Estimate:** 5 pt · **Phase:** Later
- **Labels:** ios, native

**Why.** A widget showing a rotating reference from a collection is an obvious fit for a visual library, and Shortcuts would let Kept be scripted into other capture flows.

**Done when**

- [ ] Revisit after the App Store release

### KEPT-71 · Android

- **Status:** Backlog · **Priority:** No priority · **Estimate:** 8 pt · **Phase:** Later
- **Labels:** native

**Why.** React Native makes this cheaper than it would otherwise be, but it is not free: platform-specific IA, its own store process, its own test devices. No demand for it yet.

**Done when**

- [ ] Only if someone actually asks

**Notes.** One of the few upsides of React Native over SwiftUI that has no cost until you choose to use it.
