# Pelex Business Monitor — iOS behavior and test guide

## iOS capability notice
iOS does not permit a normal third-party app or Safari page to continuously inspect another app's screen in the background. Minimizing Pelex and switching to Sheets, a cashier app, or another app does not create a background capture permission. Pelex must not claim otherwise.

## Supported mobile workflow
1. Open Pelex Business Agent and select the correct business project.
2. Choose Import Transaction / Import Slip.
3. Use the iOS Files picker, Photos picker, or Share Sheet to deliberately select a receipt, invoice, POS slip, spreadsheet, or PDF.
4. Preview the selected file in Pelex.
5. Extract text locally where supported; otherwise show a clear processing/unavailable message.
6. Review and edit extracted values, then confirm saving to the selected project.
7. Provide Cancel and Remove before saving.

Bank statements and bank-origin transaction slips are not monitored in the background. A user may manually import a bank receipt only if the product's financial-document policy allows it; this is a user-initiated upload, not bank-app access. Do not request bank credentials or read banking app screens.

## iOS QA checklist
- [ ] Explain background monitoring restriction before user starts.
- [ ] Select a PDF using Files and cancel without saving.
- [ ] Select an image using Photos and preview it.
- [ ] Share a supported file to Pelex, if installed as a share target.
- [ ] Verify the project selector is required before import.
- [ ] Verify extraction is review-only and never auto-posts a ledger entry.
- [ ] Verify duplicate detection and project isolation.
- [ ] Verify unsupported/scanned files produce an honest error, not a false success.
