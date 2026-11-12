# Pelex Business Monitor browser extension (test build)

This is an isolated, user-initiated Chrome/Edge test extension. It does not modify the Pelex frontend, backend, Supabase schema, authentication, or ledger routes.

## Install for testing
1. Open Chrome or Edge and visit `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. Open a company business dashboard (not a bank page).
5. Open the Pelex Business Monitor extension and approve that site.
6. Click **Capture visible transactions**. Review the extracted text and copy it into Pelex's existing import/review workflow.

## Safety and limitations
- Access is granted per website origin by the user and can be revoked.
- Known banking hostnames and pages with banking-related titles are blocked.
- Form controls, password inputs and editable fields are excluded; the extension reads visible page text only.
- Capture is user-initiated in this test build; it does not continuously watch tabs and does not save directly to the ledger.
- Site allowlisting is not a guarantee that every page on a mixed-purpose host is safe. Never approve banking or personal-finance sites.
- The extension cannot inspect native Mac/Windows applications. That requires the separate desktop companion.
- iOS does not support this browser extension workflow; use the Pelex website's explicit file-import/share workflow instead.
- This is a test harness, not the completed native desktop monitor.
