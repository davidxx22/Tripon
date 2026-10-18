# Tripon

A clean group travel savings tracker. Initial destination: **Samal**. No accounts or login required.

**Live app:** https://tripon-david.vercel.app

## Navigation

The bottom navigation separates **Home** (savings overview), **Transactions** (daily contribution table and weeks), **People** (person totals with week/month filters), and **Settings** (profile, appearance, group sharing and backups). Only the content pane scrolls; the header and navigation occupy separate app rows sized to the visual viewport, and the chat button is anchored above the navigation. Settings hides the trip selector, Add Trip control, and destination heading; they remain available in other views. The old footer is removed. Installation help lives beside backups in Settings, and save failures still show a visible alert. There is no Google sign-in or account requirement.

## Your local profile

First-time setup offers a display name and optional photo. Tap the top-right profile icon, or **Settings → Edit profile**, to edit the name, change the picture, or remove it. Names can contain up to 60 characters. JPG, PNG and WebP photos up to 8 MB are cropped/resized in the browser into a small 256×256 JPEG; the original is not uploaded. Missing photos show initials.

The profile is stored separately on the current device under `tripon.profile.v1`. It works offline, persists after reopening, and is not a login or a way to verify a contributor's identity. Profile names do not rename people in trip records. Group sharing and JSON backups never include the profile or photo; joining/restoring a group leaves this phone's profile intact. Clearing browser data removes it. Each phone can use its own profile.

The **Dark mode** switch now lives in **Settings → Appearance**. Run `npm run test:profile` for setup, photo validation, cancel/save, offline persistence, storage failures, and profile isolation between phones.

## Offline assistant and person totals

Open **Tripon assistant** and enter one simple command at a time:

- `David contributed 50 pesos this week` splits a weekly total across the five days.
- `David give 50 pesos for this week, distribute them 10 each day this week` checks that the daily amounts equal the weekly total.
- `Vince 10 each day week 2` fills five daily amounts in an existing week.
- `Kian 25 on day 3` fills a single day in the selected week.
- `Add person Azel` adds a person with no contributions.
- `Add next week` creates five days after the latest saved week's end, then selects it.
- `Add week starting September 28, 2026` or `Add week from 2026-09-28` creates five days starting on a specific date (include the year).
- `David 50 on 2026-10-01` records one day in an existing week containing that date. If weeks overlap, specify `in week 2`. Missing weeks, invalid dates, and duplicate start dates show an error without changing records.
- `Add week starting October 05, 2026 to October 09, 2026` accepts an explicit five-day range. The year may appear only at the end, such as `September 28 to October 2, 2026`. Other lengths are rejected because the table has five consecutive days.
- `David gave 50 pesos for September 28 to October 2, 2026, split 10 each day` uses the existing week matching that exact range, and checks that the five daily amounts equal the total.
- `David, Azel, and Kian gave 50 today, split equally this week` lists multiple existing people. The preview requires choosing **₱50 per person** or **₱50 combined**, plus **Add** or **Replace** if any named person has existing entries. All changes are validated together before any are applied. With `today, split equally this week`, the contribution is allocated to the selected week's daily entries, rather than today's cell alone.
- `How much does Azel payment total?` shows all-time, selected-week, and current-month records.
- `Show Azel total week 2` or `Show Azel total month 2026-10` asks about a specific period.

The assistant is a deterministic offline command parser, not an online AI service. It works only within the selected trip. Names must match existing full names for contributions and queries; duplicate names need renaming. Unsupported wording shows guidance without making changes. Every mutation requires a preview and **Confirm & save**. Existing daily records require an explicit **Add** or **Replace** choice; untouched days are preserved. Splits use exact centavos, assigning any remainder to the earliest days. Queries never change records. Confirmed edits use the same persistence, sync queue, and conflict review as manual edits. Messages themselves are not stored or sent to an AI service.

In **People totals**, choose **All time**, **Selected week**, or **Month** and pick a month. Monthly totals sum each daily entry by its actual date, including weeks crossing month/year boundaries. “This week” in a command means the selected week; “this month” means the current calendar month on the device. These are recorded contributions, not verified payments.

Run `npm run test:assistant` against the local server (or set `TRIPON_TEST_URL` to a deployment). It checks preview/cancel, add/replace, person/week creation, period queries, month boundaries, offline persistence, mobile themes, and syncing between independent profiles.

Run `npm run test:ranges` for the reported date-range wording, multi-person allocation, dock/navigation layout, offline persistence and group syncing. Mobile browser chrome behavior should also be checked on a physical iPhone/Android device; automated viewport scroll/resize tests cannot fully simulate the operating system's toolbars.

## Multiple trips

Use **Add Trip** to create a destination with its own savings goal, people, weeks and contributions. Choose a trip from the selector at the top. New trips start with no people and zero contributions; IDs and records are separate from every other trip. A group supports up to 50 trips.

To delete the selected trip, choose **Home → Delete trip** or open its **pencil → Delete Trip**. The named confirmation lists its people, weeks and contribution total. Confirming removes only that trip for everyone in the group; all other trips remain unchanged. Export a backup first if needed. After the last trip is deleted, the group stays connected with an empty state and **Add Trip** available. Offline deletion queues until reconnecting; a conflicting newer edit requires review. Old offline edits cannot recreate a deleted trip.

All trips in a shared group use the **same invite link**. Adding trips and editing their records syncs to everyone, while each phone keeps its own selected trip, selected weeks and appearance. Switching trips never adds their totals together.

Existing single-trip records migrate into the first trip without changing contributions, people or dates. Exports now include **all trips** in a version 2 backup. Restoring a version 2 backup replaces all trips after confirmation; importing an older version 1 backup replaces only the selected trip and keeps other trips. Invite credentials remain separate from backups.

The week selector sits flush with the left edge of the table. Navigation arrows and the helper band below the table are removed; save errors appear in the alert above the tracker and updates are announced through the app's status/toast feedback.

## Cash and GCash labels

When editing a daily amount, choose **Not specified**, **Cash**, or **GCash**. Recorded entries display a small method label below the amount. Older contributions stay **Not specified**; no payment method is guessed. Labels do not alter savings totals, process money, or verify a transfer.

Assistant examples: `Azel gave 50 this week via GCash`, `David gave 25 this week in cash`, or `David and Kian gave 50 today, split equally this week using GCash`. The preview includes a payment-method selector and shows the resulting labels. Commands with no method preserve existing labels. Adding a positive amount through another method combines labels (for example **Cash + GCash** or **GCash + Not specified**); replacing an amount uses the selected method. Combined labels do not quantify each method's share of the total.

Optional `paymentMethods` arrays alongside each week's existing numeric `entries` keep legacy backups compatible. New backups, import validation, shared-group creation, offline queues, and sync preserve the labels. An amount and its label sync together in one contribution operation, so conflicting edits require review instead of silently mismatching money and method. Legacy numeric edit operations remain accepted. Deleting a person/week removes the associated labels too. The hosted sync API must be updated before publishing a client that sends labeled contributions; no database-table migration is needed.

Run `npm run test:payments` for manual/assistant labels, combined labels, backup restoration, offline method-only changes, shared conflicts, and stationary navigation while the content pane actually scrolls.

## Sync across phones

1. On the phone containing the tracker to share, choose **Share group → Create shared group**. This uploads the current destination, goal, people, weeks and contributions. A copy of the previous personal tracker is retained on that device.
2. Choose **Copy link** and send the complete group invite link privately to your group.
3. Everyone opens that exact link, confirms **Join group**, and can install Tripon from Chrome's menu.

**Anyone with a group link can view and edit its records.** Keep it private. There are no separate owner/viewer accounts. Opening the public homepage alone does not join a group. Existing local records are not uploaded automatically.

Updates are checked about every five seconds while visible and on reconnecting. The group bar shows sync/pending/error/conflict states. Theme, selected trip and each trip’s selected week remain personal to each phone.

Offline edits persist in a local queue, including after closing/reopening. Different cells merge automatically. If two phones edit the same record, **Review edits** offers export, use group records, or explicitly apply your local changes. Removed people/weeks are not silently resurrected by old edits. Reopen the app online to send/receive updates; a closed app does not continuously sync.

Use one active editing tab per browser. Different phones have independent queues. Clearing browser data can erase unsynced edits and group credentials. Keep the invite link and JSON backups somewhere safe.

**Tripon records contributions. It does not collect, transfer, verify, or hold money.** Shared records are stored in the hosted database and cached locally. Device-only records stay local until explicitly shared.

## Tracking and backups

- Start empty or explore the visibly labeled ₱10/day demo. Demo values remain samples until explicitly starting an empty tracker.
- Tap amounts to edit; zero is allowed, negatives/invalid/overprecision values are rejected. All calculations use integer centavos. Blank cells count as zero.
- Tap names to manage people. Each week has five consecutive calendar dates; set Day 1 and Day 5 is computed. Week numbering follows creation order. Avoid entering the same payment in overlapping weeks.
- Weekly/person/all-week totals derive from recorded entries once each. The goal never adds to contributions.
- Deleting people/weeks requires confirmation and removes their contributions for everyone in a shared group. At least one week is retained.
- **Export backup** includes the tracker and local appearance, but never invite keys or sync queues. A backup does not grant access to its original group.
- **Restore JSON** validates and confirms replacement. In a shared group it replaces records for everyone, subject to conflict checks against newer edits. Invalid files leave records unchanged.
- **Invite link → Leave on this device** returns to the previous personal tracker without deleting the group. Leaving with pending edits requires confirmation that they will be discarded locally. Export a backup first if needed.

Limits: 200 people, 1,000 weeks, ₱9,999,999.99 per entry/goal, and 5 MB per backup/request.

## Run locally

Use **Node.js 22.13+** (Node 24 recommended). No runtime npm packages are required.

```sh
git clone https://github.com/davidxx22/Tripon.git
cd Tripon
npm start
```

Open http://127.0.0.1:4173. The server serves `public/` and the real group API with a local SQLite database at ignored `work/tripon.sqlite`. Local and production databases are separate. Use hosted HTTPS on Android; plain LAN HTTP does not support the full PWA.

## Build and deploy

```sh
npm test
npm run build
```

The build embeds `public/` and the API into one Worker ESM at `dist/server/index.js`. `.openai/hosting.json` retains the Sites project and declares D1 binding **DB**. `drizzle/0000_shared_groups.sql` is a schema-only migration, applied by Sites before deployment. Future schema changes should use additive migrations and preserve existing data.

Publish through the Sites source/version/deployment workflow with its public audience preserved. Sync requires a Worker and database; static-only GitHub Pages cannot provide it, so its old workflow was removed. Another Worker host needs a D1-compatible `DB` binding, the SQL migration applied once, and the built ESM fetch handler. No external backend subscription or secret API key is embedded in the app.

The database stores only a SHA-256 hash of each 256-bit invite key. Clients send keys in an authorization header. Invite links keep keys in URL fragments, outside HTTP request URLs. The API exposes no group list. Reads/writes require the group key; API responses are never cached. Revision-checked updates and bounded batch receipts make retries idempotent. Shared-link access provides group editing, not identity verification or per-person permissions.

The service worker caches only the app shell, never `/api/`. Increment its cache version when changing shell files. New workers wait until all older Tripon windows close. **Close all Tripon tabs/windows and reopen after this update** to activate sharing and the simplified design. Existing local `tripon.v1` records survive the update and migrate to a version 2 multi-trip document.

## Install on Android

Open the group invite link in Chrome, join, wait for **Offline ready**, and choose **Install app** or **⋮ → Add to home screen → Install**. Launch Tripon from the home screen. First-time joining requires internet; offline edits afterward queue until reconnecting. Appearance uses a **Dark mode** switch in **Settings → Appearance**: on for dark, off for light. The selection is saved on each device; new trackers start in light mode. Existing dark/light choices are preserved. Older System backup preferences open in light mode.

Real Android launcher, install prompt, file picker, and airplane-mode behavior still need a physical-phone check. See [TESTING.md](TESTING.md).

## Optional browser tests and logo generation

```sh
npm install
npx playwright install chromium
npm run test:browser  # keep npm start running separately
npm run test:sync     # defaults to port 4174; set TRIPON_TEST_URL as needed
npm run assets
```

Browser tests accept `TRIPON_TEST_URL`, `TRIPON_CHROME`, and `TRIPON_NODE_MODULES`. They use fabricated contributions and isolated profiles. Production smoke tests create a separate test group.

## Files

- `public/`: UI, calculation/schema logic, multi-trip migration, sync client, manifest, worker, logos/icons.
- `worker/api.js`: group creation, authorized reads, durable conflict-aware updates.
- `drizzle/`: database schema migration and journal.
- `scripts/`: build, local API/SQLite server, asset generation and checks.
- `tests/`: unit/API and single-/two-device browser tests.
- `public/assets/tripon-wordmark-light.svg` / `-dark.svg`: wordmarks with matching transparent PNGs.
- `public/assets/tripon-icon-light.svg` / `-dark.svg`: compact marks with matching transparent PNGs.
- `public/assets/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`: installation icons with safe padding.

The original logo combines a travel case, two companion coins, and a rising route arrow. It remains in the simplified header, favicon, and installed icons.

## Vercel deployment

Import `davidxx22/Tripon`, name the Vercel project `tripon` (lowercase), keep Root Directory `./` and preset **Other**. The tracked `vercel.json` sets build command `node scripts/check.mjs`, output directory `public`, and a production-only dependency install. No environment variables are required.

Vercel serves the PWA and a Node.js API proxy at `api/sync.js`. The proxy forwards only the group authorization header and JSON request to the fixed existing Sites API. This preserves existing groups and the existing D1 database; it does not migrate the database into Vercel or add another paid data service. Keep the existing Sites API online. Vercel sync requests are limited to 4 MB. There are no user accounts in Tripon.

Browser-local records and installed-app data do not move automatically between different hosting domains. On Vercel, paste your existing Sites group invite into **Join group** to reconnect to the same shared records; new invite links use the Vercel domain. For device-only records, export from the old URL and restore the JSON on the new URL. Install the new Vercel URL from Chrome if switching your home-screen app.

Vercel's Node.js function and project configuration references: https://vercel.com/docs/functions/runtimes/node-js and https://vercel.com/docs/project-configuration/vercel-json.
