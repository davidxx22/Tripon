# Tripon verification

Executed on 2026-10-18 in desktop Chrome with an isolated profile, including a 390 × 844 mobile viewport, light/dark device emulation, and a 1440px desktop viewport. These are automated browser checks, not a physical Android test.

## Passed

- **16 Node tests:** ten original calculation/schema tests, plus six shared-group tests covering independent-entry merges, explicit same-cell conflicts, device-only preferences, deletion races, shared restoration, bearer authorization, cross-origin rejection, concurrent revision checks, and idempotent retries against a real local SQLite adapter.
- **15 browser checks:** first-run choices; actual amount editing; goal/destination editing; adding and renaming; week creation/date editing/navigation; saved records after closing and reopening a page; Light/Dark/System switching, system changes and remembered preference; JSON download and invalid-file rejection; person/week deletion confirmation and cancellation; replacement confirmation/cancellation/restoration; mobile width and sticky name column; install fallback instructions; PNG dimensions and standalone manifest; actual service-worker cache and offline reload/edit/reload; clearly labeled demo and reset; simulated local-storage write failure; and corrupt-data preservation.
- No uncaught browser JavaScript errors during the main workflow.
- The seven two-phone sync scenarios also passed against the deployed public HTTPS server and its production D1 binding, using a separate fabricated test group.
- **8 two-phone browser checks:** no-account group creation/invite join; updates both ways; merging independent offline edits; conflict review/applying local fields; queued edits surviving reopening; synced people/weeks with local theme/selection; propagated deletion; group-wide import warning; and invite keys absent from backups; and confirmation before leaving with unsynced edits. Two independent profiles use the real local API/database.
- Syntax checks for application modules and worker, manifest fields, and icon presence.
- Visual inspection of mobile dark and desktop light layouts and the transparent logo wordmark. Mobile light screenshot was also captured.

Browser test screenshots and a machine-readable result are written to ignored `work/qa/`. Tests use fabricated amounts and names. No real contribution records are committed to this repository.

## Requires a real Android phone

1. Open the public HTTPS URL in Chrome. No sign-in should appear. Close old Tripon windows/tabs and reopen after updating; check that **Share group** appears and the app reaches **Offline ready**.
2. Trigger the browser's real install prompt or use Chrome's menu. Verify icon appearance/cropping, app name **Tripon**, standalone launch, Android task switcher and splash screen.
3. Enter contributions using the phone's decimal keypad, including zero and two decimal places. Check touch targets, horizontal table swiping and the pinned name column on the actual screen.
4. Close Chrome/the installed app, reopen, and confirm data and appearance remain. Change the Android system theme with **System** selected.
5. Enable airplane mode after the initial cache completes. Relaunch from the home screen, edit an amount, close/reopen, then reconnect and verify the edit remains.
6. Download a backup to Android Files and restore it using the actual file picker. Repeat after transferring the file to another device if desired. Records do not sync automatically.
7. On an app update, close every Tripon tab/window and reopen. Verify the new worker activates and existing contributions remain.
8. Create a group on the phone with your records, then open its complete invite link on another phone. Join and edit different days on both phones. Verify matching totals and test an intentional same-day conflict.

Desktop emulation cannot establish Android installation eligibility, the operating system's storage persistence/eviction behavior, native file picker integration, or launcher behavior. Chrome controls install-prompt availability.
