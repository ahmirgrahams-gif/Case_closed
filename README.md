# Case Closed AI — Desktop Device Investigator

**Don't guess. Investigate.**

Case Closed AI is an installable Windows desktop application combining **native device diagnostics**, **an opt-in AI investigation**, a detective-themed animated evidence board, and **ongoing local checks while resident in the system tray**. It can explain a user-selected file and offer a confirmed Move to Recycle Bin action. It is not an independent antivirus scanner.

## Download Windows installer

1. Visit [Actions → Build Windows Review App](https://github.com/ahmirgrahams-gif/Case_closed/actions/workflows/windows-review.yml).
2. Open the **latest successful** build.
3. Under **Artifacts**, download **CaseClosedAI-Windows-review-unsigned**.
4. Extract the artifact ZIP and run the `CaseClosedAI-0.4.0-Setup.exe` installer.

The installer is **unsigned**. Windows SmartScreen may warn because the publisher is not verified. Only run builds you trust. The workflow must succeed before an installer is available; a commit does **not** mean a build is ready.

## Windows install and launch experience

The Windows NSIS installer installs **Case Closed AI** like a normal desktop program and creates **Start menu and desktop shortcuts**. On launch, a short branded intro displays the folder-and-magnifying-glass logo, cinematic scanning light and red evidence thread, then reveals the main investigation desk. The same logo is generated as a Windows app and installer icon.


## Background monitoring, walking file mascot and updates

The **Alerts & files** screen lets you enable or pause monitoring, notifications and optional Start at Windows sign-in. While background monitoring is enabled, local read-only checks run approximately every 15 minutes; new evidence can trigger a Windows notification and an animated walking case-file alert near the bottom-right of the desktop.

**Closing the main window** keeps Case Closed AI in the **Windows system tray** so monitoring can continue. To actually stop monitoring and exit, right-click the tray icon and select **Quit Case Closed AI**. It does not monitor after quitting or when Windows is shut down. Windows sign-in launch is optional and requires an installed app.

The **Update log** screen and [CHANGELOG.md](CHANGELOG.md) show changes by version.

## Suspicious-file review and safe removal

This app does not use filenames alone to call something malware. Choose a specific file from **Alerts & files → Choose a file to inspect**. It reports the file type, full path, size, last modified date, and a SHA-256 digest for files up to 256 MiB. It also checks whether any queried Microsoft Defender history references the selected file. Such history is not conclusive proof that the file is currently infected.

**Move to Recycle Bin** is available for a user-selected ordinary file **outside protected system and program locations**. The action always displays a second native Windows confirmation explaining the exact path and that malware status has not been verified. No background job deletes files, and no permanent deletion feature is implemented. Files that changed since inspection must be inspected again.

Threat-history availability depends on Defender and local permissions. Review actual security alerts in **Windows Security**. Case Closed AI never claims malware has been removed just because a notification appeared.

## What the desktop application actually scans

| Check | Source | Meaning |
| --- | --- | --- |
| Available RAM | Native OS memory counters | Flags low available memory (under 10%) |
| Short CPU sample | Native OS CPU counters | Flags very high utilization (90%+) |
| Fixed drives | Windows CIM (Win32_LogicalDisk) | Flags low storage (under 10% free) |
| Microsoft Defender status | Get-MpComputerStatus | Reports antivirus and real-time-protection status |
| Firewall profiles | Get-NetFirewallProfile | Reports on/off state of Windows Firewall profiles |
| Optional connectivity | DNS lookup + HTTPS request | Checks if selected endpoints can be reached |

**You control the scan.** Nothing runs continuously in the background. The optional network check contacts `example.com` and `www.microsoft.com` only when its checkbox is selected.

**Microsoft Defender Quick Scan:** A separate confirmation button invokes Windows’ built-in `Start-MpScan -ScanType QuickScan` command. It requires Microsoft Defender to be enabled and may be blocked by organizational policy. Review progress and detections in Windows Security. **Case Closed AI is not its own antivirus engine and cannot promise a device is virus-free.**

The app does **not** delete files, modify security settings, install drivers, change the registry, or perform automatic repairs.

## Actual case-specific AI investigation (optional)

Open **AI investigation** or use **Investigate with AI** after describing your issue. The app offers an optional integration with the **OpenAI Responses API**, using an API key supplied by the user. API use is billed separately from ChatGPT subscriptions. The model sees the specific symptom, prior answers and any native OS observations you explicitly attach, and provides focused follow-up questions, evidence-based hypotheses, safe suggested steps and original-symptom verification checks.

- An API key is needed for this feature and is held **only in the running app's main-process memory**, not saved to localStorage, disk, or the casebook. It must be entered again after a restart.
- Data is sent to OpenAI **only when you press Investigate**, not when you run basic native scans.
- Do not submit passwords, financial details, customer information or secrets. AI suggestions can be mistaken.
- The app does **not** diagnose autonomously without a user API key, and does not automatically execute AI-recommended repairs.
- The old rule-based **Guided case** option remains available offline for people without API access, but it is a simpler questionnaire, not true AI understanding.

## How the investigation works

1. Open **Device scan** in the installed desktop application.
2. Click **Scan this device** and optionally allow external connectivity tests.
3. Review the real measurements displayed as pinned clues on the animated evidence board.
4. Select **Open case from finding** to carry an observed issue into guided troubleshooting.
5. From the finding, choose the intelligent investigation and optionally supply an API key to reason about the specific symptom, or use the offline guided case.
6. Follow suggested steps; any final resolution is marked as **user-confirmed**, not independently verified.

Scan findings are transient in the interface unless you deliberately carry one into the casebook. Casebook records are kept locally on this device in app storage, unencrypted. Avoid entering passwords or personal secrets.

## Browser demo

The [web-only preview](https://ahmirgrahams-gif.github.io/Case_closed/) is a guided demonstration. Browsers cannot retrieve desktop OS diagnostic information here. The demo **does not fabricate scan data** and displays a desktop-required notice. The Pages deployment requires GitHub Pages to be enabled in repository Settings → Pages → GitHub Actions.

## Developer setup

Requires Node.js and npm on a desktop computer:

```bash
npm install
npm test
npm start
```

For a Windows installer:

```bash
npm run build:win
```

The workflow uses Windows runners and uploads a ZIP containing the unsigned installer. No GitHub Personal Access Token is required for the artifact.

## App architecture and safety

- `index.html` — investigation interface, animations, and casebook.
- `desktop/main.cjs` — Electron main process; only an explicit small set of IPC commands is exposed.
- `desktop/preload.cjs` — context-isolated API bridge.
- `desktop/diagnostics.cjs` — OS measurements, platform checks, security status, user-approved Defender scan action.
- `desktop/investigator.cjs` — opt-in AI case reasoning with bounded evidence and structured results.
- `desktop/splash.html` — cinematic boot splash with branded animated logo.
- `assets/case-closed-mark.svg` and `scripts/generate-icon.cjs` — logo and Windows icon generation.
- `test/diagnostics.test.cjs` — logic tests for health findings and unavailable data.
- `.github/workflows/windows-review.yml` — builds the installer.
- `.github/workflows/validate.yml` — checks syntax and runs tests.
- `desktop/monitor.cjs` — periodic local checks and newly appearing findings.
- `desktop/defender-history.cjs` — Windows Defender detection-history evidence.
- `desktop/file-review.cjs` — user-selected file inspection and confirmed Recycle Bin action.
- `desktop/mascot.html` and `desktop/mascot.js` — animated walking notification character.
- `CHANGELOG.md` — versioned update history.

Electron uses context isolation, sandboxing, disabled Node integration, and denies window navigation.

### What still needs development

The current app offers optional AI reasoning via a separately billed user-supplied OpenAI API key and periodic local health monitoring while resident. It **does not** contain an autonomous malware engine, automated repair system, independent malware classification, advanced event-log correlation, backups, comprehensive rollback or verified post-repair tests. A one-time OS health scan is not a full forensic investigation. Mac/Linux builds are not yet supported as tested installers. Future versions should add richer Windows Event Log analysis, testable issue hypotheses, and explicit pre/post repair checks.

**Design:** clean professional dark interface, restrained folder-opening animation, investigative red threads and pinned evidence, and a case stamp when the user confirms resolution.
