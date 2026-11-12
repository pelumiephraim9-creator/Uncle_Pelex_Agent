const BANK_BLOCK = /(^|[.-])(bank|banking|bankapp|internetbanking|mobilebanking)([.-]|$)|\b(bank|banking|internet banking|mobile banking|account balance|bank statement|transfer receipt)\b/i;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PELEX_CAPTURE_RESULT") {
    chrome.storage.session.set({ lastCapture: { ...message.payload, url: sender.tab?.url || "", title: sender.tab?.title || "", capturedAt: new Date().toISOString() } })
      .then(() => sendResponse({ ok: true })).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ approvedOrigins: [] }).then(({ approvedOrigins }) => chrome.storage.local.set({ approvedOrigins }));
});
