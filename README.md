# Tripon

A clean group travel savings tracker. Initial destination: **Samal**. No accounts or login required.

**Live app:** https://tripon-travel-savings.stonykiwi.chatgpt.site

## Sync across phones

1. On the phone containing the tracker to share, choose **Share group → Create shared group**. This uploads the current destination, goal, people, weeks and contributions. A copy of the previous personal tracker is retained on that device.
2. Choose **Copy link** and send the complete group invite link privately to your group.
3. Everyone opens that exact link, confirms **Join group**, and can install Tripon from Chrome's menu.

**Anyone with a group link can view and edit its records.** Keep it private. There are no separate owner/viewer accounts. Opening the public homepage alone does not join a group. Existing local records are not uploaded automatically.

Updates are checked about every five seconds while visible and on reconnecting. The group bar shows sync/pending/error/conflict states. Theme and selected week remain personal to each phone.

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
- **Invite link → Leave on this device** returns to the previous personal tracker without deleting the group. Sync pending edits first; export before leaving if needed.

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

The service worker caches only the app shell, never `/api/`. Increment its cache version when changing shell files. New workers wait until all older Tripon windows close. **Close all Tripon tabs/windows and reopen after this update** to activate sharing and the simplified design. Existing local `tripon.v1` records survive the update.

## Install on Android

Open the group invite link in Chrome, join, wait for **Offline ready**, and choose **Install app** or **⋮ → Add to home screen → Install**. Launch Tripon from the home screen. First-time joining requires internet; offline edits afterward queue until reconnecting. Appearance defaults to System with Light/Dark controls in the header.

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

- `public/`: UI, calculation/schema logic, sync client, manifest, worker, logos/icons.
- `worker/api.js`: group creation, authorized reads, durable conflict-aware updates.
- `drizzle/`: database schema migration and journal.
- `scripts/`: build, local API/SQLite server, asset generation and checks.
- `tests/`: unit/API and single-/two-device browser tests.
- `public/assets/tripon-wordmark-light.svg` / `-dark.svg`: wordmarks with matching transparent PNGs.
- `public/assets/tripon-icon-light.svg` / `-dark.svg`: compact marks with matching transparent PNGs.
- `public/assets/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`: installation icons with safe padding.

The original logo combines a travel case, two companion coins, and a rising route arrow. It remains in the simplified header, favicon, and installed icons.
