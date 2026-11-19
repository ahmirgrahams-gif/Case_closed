# Case Closed AI — Update Log

## v0.4.0 — November 19, 2026
- Added an in-app Update Log view with prior version summaries.
- Added background device-health monitoring on a 15-minute schedule while the application stays active in the Windows system tray.
- Closing the main window hides it to the system tray; **Quit** from the tray stops the app and monitoring.
- Added optional Run at Windows sign-in and user controls to pause recurring monitoring or disable notifications.
- Added native Windows notifications and animated walking case-file mascot near the lower-right corner for newly observed review findings.
- Added an Alerts & files screen with actual monitored findings and Microsoft Defender detection **history**; history is not automatically classified as an active infection.
- Added user-selected file inspection: size, path, modification date, SHA-256 for files up to 256 MiB, type and Defender history reference.
- Added individually confirmed **Move to Recycle Bin** for an inspected ordinary file outside protected Windows/application locations; no automatic deletion or permanent erasure.
- Added unit tests for how the monitor distinguishes health findings from transient CPU activity and remediated Defender history.

## v0.3.0 — November 19, 2026
- Branded Windows NSIS installer, desktop and Start menu shortcuts.
- Cinematic logo startup with folder, magnifying glass, light sweep and animated evidence thread.
- Optional OpenAI API-powered case-specific investigation using user supplied API key, symptoms, previous answers and explicitly attached OS observations.
- User-selectable save of AI case summaries in the local casebook.

## v0.2.0 — November 19, 2026
- Native on-demand CPU, memory, storage, firewall and Microsoft Defender protection status checks.
- Optional DNS and HTTPS connectivity tests.
- User-approved Microsoft Defender Quick Scan request.
- Evidence board visualizations from measured device observations.

## v0.1.0 — November 19, 2026
- First desktop and browser review app: case files, animated investigation board, guided questions and casebook.

## Security and current limitations
Case Closed AI is **not a replacement for Microsoft Defender** and does not detect malware independently. A filename or extension alone is never sufficient to identify a file as malicious. Background monitoring does not operate after choosing Quit, when the computer is shut down, or when the application is not running. AI investigation requires an optional, separately billed API key and may produce incorrect advice. File removal requires explicit confirmation and uses the Recycle Bin, not permanent deletion. Not all Windows Security history records indicate an active threat.
