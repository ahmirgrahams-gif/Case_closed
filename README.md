# Case Closed AI — Desktop Device Investigator

**Don't guess. Investigate.**

Case Closed AI is an installable Windows desktop application that combines **read-only native device diagnostics**, a branded cinematic startup animation, an animated evidence board and an optional **AI-guided investigation** for specific issues.

## Download Windows installer

1. Visit [Actions → Build Windows Review App](https://github.com/ahmirgrahams-gif/Case_closed/actions/workflows/windows-review.yml).
2. Open the **latest successful** build.
3. Under **Artifacts**, download **CaseClosedAI-Windows-review-unsigned**.
4. Extract the artifact ZIP and run the `CaseClosedAI-0.3.0-Setup.exe` installer.

The installer is **unsigned**. Windows SmartScreen may warn because the publisher is not verified. Only run builds you trust. The workflow must succeed before an installer is available; a commit does **not** mean a build is ready.

## Windows install and launch experience

The Windows NSIS installer installs **Case Closed AI** like a normal desktop program and creates **Start menu and desktop shortcuts**. On launch, a short branded intro displays the folder-and-magnifying-glass logo, cinematic scanning light and red evidence thread, then reveals the main investigation desk. The same logo is generated as a Windows app and installer icon.

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

Electron uses context isolation, sandboxing, disabled Node integration, and denies window navigation.

### What still needs development

The current app **does** offer optional AI reasoning via a user-supplied OpenAI API key, but it **does not** include autonomous malware signatures, system-log correlation, device-wide issue detection, automated repairs, rollback orchestration, ongoing monitoring, or measured post-repair verification. A one-time OS health scan is not a full forensic investigation. Mac/Linux builds are not yet supported as tested installers. Future versions should add richer Windows Event Log analysis, testable issue hypotheses, and explicit pre/post repair checks.

**Design:** clean professional dark interface, restrained folder-opening animation, investigative red threads and pinned evidence, and a case stamp when the user confirms resolution.
