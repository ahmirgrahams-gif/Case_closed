# Case Closed AI

**Don't guess. Investigate.**

A minimal, detective-inspired troubleshooting prototype for technical review. The application presents a guided issue investigation with a case-file animation, pinned evidence notes, safe troubleshooting suggestions, and a local casebook.

## Live browser demo

GitHub Pages can host the self-contained `index.html` without any dependencies.

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, select **GitHub Actions**.
3. Run **Deploy Case Closed AI Demo** from the **Actions** tab, if it has not started automatically.
4. After a successful deployment, open: https://ahmirgrahams-gif.github.io/Case_closed/

**GitHub Pages cannot inspect or repair your device.**

## Run as a desktop app

Requires a supported Node.js installation and internet access for the initial dependency download.

```bash
npm install
npm start
```

The Electron window loads the same offline-capable static UI. It does not access system information or run background scans.

## Build a Windows installer

On Windows:

```bash
npm install
npm run build:win
```

Or open **Actions → Build Windows Review App → Run workflow**. If the workflow succeeds, the downloadable unsigned installer is available in its run **Artifacts**. The workflow is present but a successful Windows build has not been verified in this conversation.

## What works

- Animated brand splash, case-file opening, pinned evidence notes, connecting red threads, and a closing stamp.
- Guided, rule-based questions and advice for Wi-Fi, Fiber, Computer, Phone, Printer, and Software.
- Local case history, user-confirmed resolution, and simple casebook management.

## What isn't implemented

- Live AI diagnosis or an integrated language model.
- Reading system logs, scanning for viruses, automatic repairs, rollback, or verified proof-of-fix.
- An actual connection to device hardware or operating-system diagnostics.

Clues are **based on answers supplied by users**, not real system findings. Do not enter credentials or sensitive information: local case history is stored without encryption in browser/app storage.

## Design

The interface intentionally favors an official dark desktop-tool appearance. Animations are restrained and tied to the investigation process. This repository contains a streamlined, independent review build rather than the complete asset-heavy earlier Windows shortcut ZIP.

## Repository files

- `index.html` — complete browser UI, CSS, and guided investigation logic.
- `desktop/main.cjs` — minimal Electron desktop launcher.
- `package.json` — start and Windows build commands.
- `.github/workflows/pages.yml` — static GitHub Pages deployment workflow.
- `.github/workflows/windows-review.yml` — Windows installer build and Actions artifact.

## Next improvements

Separate JS/CSS components, add validated device diagnostics with explicit permissions, evidence provenance, genuine post-fix testing, safe action approvals and rollback, automated tests, and installer code signing.
