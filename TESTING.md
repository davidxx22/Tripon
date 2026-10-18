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

## Multi-trip update

- 23 unit/API tests pass, including legacy single-trip migration, isolated people/weeks/goals/totals, device-only trip selection, concurrent trip additions, scoped edits on different trips, old queued edits targeting only the original trip, and malformed multi-trip backups.
- Six multi-trip browser workflows pass: migration of an existing populated tracker; adding/switching/reopening separate trips; all trips shared by one invite link; offline edits on different trips; all-trip backup export and legacy single-trip restore; and requested table alignment, removed arrows/helper band, and mobile page width.
- The prior 15 browser regression checks still pass with dropdown-only week navigation and version 2 backups. Shared-group regression checks cover the existing conflict/offline flows.
- Physical Android still needs its install/update, native selector, file picker, and cross-phone airplane-mode checks. Close all old Tripon windows and reopen to activate the updated service worker before checking Add Trip.

## Delete Trip update

- 27 unit/API tests pass. Added tests verify other trips remain byte-for-byte unchanged by deletion, last-trip deletion yields a valid empty workspace, concurrent changes to other trips survive, conflicts on the deleted trip require review, and stale offline edits cannot resurrect it.
- Five deletion browser workflows cover cancellation; named group-wide confirmation; a second phone viewing the removed trip falling back to the survivor; exact survivor people/weeks/goals/entries; offline deletion surviving reload and later syncing; deleting the last trip; rejecting a stale offline edit; and adding a new shared trip from the empty state.
- Delete Trip is available through the destination pencil/settings dialog. Existing backups can restore deleted records; deletion does not revoke the group invite link.

## Appearance switch update

The appearance dropdown is replaced with an accessible Dark mode switch. On means dark; off means light. New trackers and older System preferences open in light mode; existing explicit dark/light choices are preserved. Backups still accept legacy System values for compatibility, but there is no System UI option and changing the device theme no longer changes the app.

Existing browser checks now operate the switch and verify light/dark rendering, persistence after reopening, backup restoration, and independence from the device theme.
