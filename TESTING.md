# Tripon verification

Executed on 2026-10-18 in desktop Chrome with an isolated profile, including a 390 × 844 mobile viewport, light/dark device emulation, and a 1440px desktop viewport. These are automated browser checks, not a physical Android test.

## Passed

- **10 Node tests:** exact centavo parsing, zero/decimal input, invalid/negative/overprecision rejection, PHP formatting, empty/demo separation, person/week/trip totals, goal remaining and percentage clamping, person deletion across weeks, week deletion and fallback selection, date boundaries, and backup round-trip/schema rejection/sanitization.
- **15 browser checks:** first-run choices; actual amount editing; goal/destination editing; adding and renaming; week creation/date editing/navigation; saved records after closing and reopening a page; Light/Dark/System switching, system changes and remembered preference; JSON download and invalid-file rejection; person/week deletion confirmation and cancellation; replacement confirmation/cancellation/restoration; mobile width and sticky name column; install fallback instructions; PNG dimensions and standalone manifest; actual service-worker cache and offline reload/edit/reload; clearly labeled demo and reset; simulated local-storage write failure; and corrupt-data preservation.
- No uncaught browser JavaScript errors during the main workflow.
- Syntax checks for application modules and worker, manifest fields, and icon presence.
- Visual inspection of mobile dark and desktop light layouts and the transparent logo wordmark. Mobile light screenshot was also captured.

Browser test screenshots and a machine-readable result are written to ignored `work/qa/`. Tests use fabricated amounts and names. No real contribution records are committed to this repository.

## Requires a real Android phone

1. Open the final HTTPS hosting URL in Chrome. If hosting is owner-private, sign in to that host first. Tripon itself does not have accounts. Check that the full shell reaches **Offline ready**.
2. Trigger the browser's real install prompt or use Chrome's menu. Verify icon appearance/cropping, app name **Tripon**, standalone launch, Android task switcher and splash screen.
3. Enter contributions using the phone's decimal keypad, including zero and two decimal places. Check touch targets, horizontal table swiping and the pinned name column on the actual screen.
4. Close Chrome/the installed app, reopen, and confirm data and appearance remain. Change the Android system theme with **System** selected.
5. Enable airplane mode after the initial cache completes. Relaunch from the home screen, edit an amount, close/reopen, then reconnect and verify the edit remains.
6. Download a backup to Android Files and restore it using the actual file picker. Repeat after transferring the file to another device if desired. Records do not sync automatically.
7. On an app update, close every Tripon tab/window and reopen. Verify the new worker activates and existing contributions remain.

Desktop emulation cannot establish Android installation eligibility, the operating system's storage persistence/eviction behavior, native file picker integration, or launcher behavior. Chrome controls install-prompt availability.
