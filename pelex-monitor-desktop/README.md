# Pelex Business Monitor desktop companion (test build)

Cross-platform Electron companion for Windows and macOS. It lists desktop windows, lets the user explicitly select a business window, performs local OCR on that window, and optionally repeats capture at a user-selected interval. The compact window is always-on-top by default.

## Build
- Install Node.js 20+.
- Run `npm install` in this directory.
- Run `npm test`.
- Run `npm start` to test locally.
- Windows package: `npm run dist:win`.
- macOS package: `npm run dist:mac`.

macOS requires the user to grant Screen Recording permission in System Settings. Windows may prompt for capture permissions depending on policy/security software.

## Safety limits
- Banking, wallet and trading window titles are blocked.
- OCR is local and not uploaded by this application.
- If banking-related terms are detected in OCR text, that capture is discarded and monitoring stops.
- No credentials are intentionally read; form controls are not applicable to native-window OCR, so users must not select sensitive windows.
- This is not a certified banking detector: false negatives are possible. Do not use it as a security boundary for regulated environments. Administrators should additionally restrict allowed applications and domains.
- It does not automatically save transactions to a project. Users review copied text and import it through Pelex.
- This is a test build. Run and package on target operating systems and verify OS permissions before production use.
