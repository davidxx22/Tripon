# Tripon

**Save a little. Go together.** A mobile-first, offline-capable travel contribution tracker. Initial destination: **Samal**. Original suitcase / companion-coin logo, thin table borders, teal accents, and Light, Dark, and System themes.

## Use the app

- Choose **Start empty tracker** for real records, or explore the visibly labeled **demo** with four people × five ₱10 entries (₱200 in sample contributions). Demo records remain labeled in the app and JSON export. **Start empty tracker** clears demo data after confirmation; demo values are never silently converted into actual records.
- Edit the destination and goal with the pencil or target button. A zero goal means unset. The target never adds to contributions.
- Tap an amount to edit; tap a person's name to rename or remove them. New people appear across every week with blank contributions.
- Create weeks and navigate with the selector or arrows. Weekly totals, each person's all-week total, and trip savings are calculated from the same entries, once each.
- Appearance is in the header. **System** is the default; explicit selections persist and are included in backups.
- Records are saved automatically to this browser's local storage. “Saved on this device” confirms success. A saving error means edits remain in memory: export before closing.

**This is a record, not a wallet. Tripon does not collect, transfer, verify, or hold money.** Records do not sync between people, browsers, devices, or different hosting URLs. Clearing browser data, private browsing, or browser storage eviction can erase records. Keep backups.

## Run locally

Install Node.js 20 or later, clone the repository, and run:

```sh
git clone https://github.com/davidxx22/Tripon.git
cd Tripon
npm start
```

Open **http://127.0.0.1:4173**. The app has **no runtime dependencies** and needs no build or package installation to run. `npm run build` checks syntax, the manifest, and icon files; the deployable app is already in `dist/`.

Localhost supports service workers on the same computer. A phone visiting a computer's plain HTTP LAN address will not have normal PWA capabilities: use HTTPS hosting for Android. Do not open `index.html` directly with a `file:` URL.

## Deploy over HTTPS

Deploy the **contents of `dist/`**, including `sw.js`, `manifest.webmanifest`, and `assets/`, to any static HTTPS host. No environment variables, accounts inside the app, APIs, or database are needed. Relative asset paths support a subdirectory such as `/Tripon/`.

- **Netlify:** drag the `dist` directory into its static/manual deploy interface, or connect the repository with no build command and publish directory `dist`.
- **Cloudflare Pages:** connect the repository, select no framework, no build command, and output directory `dist`.
- **GitHub Pages:** the included `.github/workflows/pages.yml` can publish `dist`. Enable Pages → GitHub Actions in repository settings, then run the workflow manually. GitHub may require a paid plan for Pages on a private repository; public static hosts above are alternatives. The workflow never changes repository visibility.
- **Sites:** `.openai/hosting.json` binds this source to its Sites deployment. New Sites hosting is owner-private by default; this is a hosting access gate, not a Tripon user account system. Make hosting public separately if you want unauthenticated group access. That will not add record syncing.

For updates, change the cache version in `dist/sw.js` whenever shell files change. The new worker caches the complete shell and waits until all older Tripon tabs/windows close, avoiding mixed app versions. Reopen to activate the update. Contributions are stored separately from the app cache and survive shell updates. Do not cache exported backups or add analytics scripts that read local storage.

If deploying the GitHub Pages workflow, ensure the repository's default branch is `main`. Any branch may be chosen when manually running it. Static hosts should serve `.webmanifest` as `application/manifest+json`, JS as JavaScript, and `sw.js` without long-lived HTTP caching.

## Install from Chrome on Android

1. Open the deployed **HTTPS** link in Chrome and choose an empty tracker or demo.
2. Wait for **Offline ready** in the page footer. This confirms that the complete app shell has been cached.
3. Tap **Install app** if Chrome offers the prompt. Otherwise tap Chrome's **⋮ → Add to home screen → Install** (wording varies by Chrome version).
4. Launch **Tripon** from the home screen. The manifest requests standalone mode. After the first successful load and offline setup, you can view and edit without a connection.

Chrome decides when an install prompt is available; dismissals, prior installation, browser policy, and engagement can affect it. The button always provides fallback instructions. A normal home-screen shortcut may behave differently from a full PWA installation.

## Export and restore

**Export backup** downloads a `tripon-YYYY-MM-DD.json` file (`tripon-DEMO-…` for sample records). Save it somewhere durable. It contains the destination, goal in integer centavos, people and IDs, all weeks and daily entries, selected week, appearance, and demo flag. Treat it as your group's financial record.

**Restore JSON** selects a backup, validates it, and shows a replacement confirmation with its destination, people, weeks, and total. Cancel keeps current records. Restore replaces the whole tracker, including theme; it does not merge records. Invalid JSON, invalid amounts/dates, unknown people, duplicate IDs, and unsupported versions are rejected before replacement. Files are limited to 5 MB. Existing unreadable data is not overwritten automatically; a recovery download is offered.

## Decisions and limits

- Each week contains **five consecutive calendar dates**. You set Day 1; Day 5 is four days later. Dates are date-only values and displayed without timezone drift. The first week begins today, using the device's calendar date.
- Week numbering follows creation order. Weeks may overlap, but each is an independent record; the app sums every recorded entry once. Avoid recording the same payment in two weeks.
- Zero is allowed; blank cells count as zero. Once you edit one day in a blank row, its other four days become explicit zero entries. Input accepts digits and an optional decimal part of one or two digits (no currency sign, grouping commas, exponents, or negatives). Maximum per entry or goal is **₱9,999,999.99**; storage limits are 200 people and 1,000 weeks. These bounds keep integer totals exact.
- Removing a person deletes all of their entries across all weeks. Deleting a week removes that week's entries and reduces totals. At least one week is retained. Both actions require a dialog confirmation and recommend an export first.
- Closing the first-run choice without selecting anything leaves an unsaved empty preview. The first subsequent edit saves it as a real empty tracker.
- Export/import is manual transfer, not automatic group synchronization. Everyone using their own phone has an independent tracker.

## Tests

```sh
npm test
npm run build
# Optional browser QA and asset regeneration:
npm install
npx playwright install chromium
npm start                 # keep running in another terminal
npm run test:browser
npm run assets
```

Browser tests use an isolated temporary profile; they do not touch your own Chrome records. Optional environment variables: `TRIPON_TEST_URL`, `TRIPON_CHROME` (an existing Chrome executable), `TRIPON_NODE_MODULES` (an existing package directory). See [TESTING.md](TESTING.md) for executed checks and real-phone follow-up.

## Files and logo

- `dist/`: complete installable static app, manifest, worker, and assets.
- `dist/assets/tripon-wordmark-light.svg` / `-dark.svg`: original logo with wordmark for light/dark backgrounds; matching 920 × 256 transparent PNGs.
- `dist/assets/tripon-icon-light.svg` / `-dark.svg`: compact icon; matching 512 × 512 transparent PNGs. The teal mark works in both themes.
- `dist/assets/icon.svg`: header and favicon mark.
- `dist/assets/icon-192.png`, `icon-512.png`: regular installed icons.
- `dist/assets/icon-maskable-512.png`: opaque maskable icon with safe padding; its source SVG is included.
- `scripts/generate-assets.mjs`: reproducible vector design and PNG generation with Sharp.
- `tests/`: money/date/schema tests and browser workflow tests.

Logo concept: a friendly travel case contains two companion coins and a rising route arrow — saving toward a shared destination. PNG wordmarks render system fonts during generation; SVG wordmarks include a portable font stack.
