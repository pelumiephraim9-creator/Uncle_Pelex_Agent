const BANK_TERMS = /\b(bank|banking|internet banking|mobile banking|bank statement|account balance|beneficiary|sort code|swift code|iban|routing number|debit card|credit card statement|bank transfer)\b/i;
const SECRET_TERMS = /\b(password|passcode|one.time.password|otp|security code|cvv|pin number)\b/i;
const BLOCKED_WINDOW = /\b(bank|banking|internet banking|mobile banking|wallet|crypto exchange|trading account)\b/i;
function isBlockedSource(sourceName = "") {
  return BLOCKED_WINDOW.test(String(sourceName));
}
function isBlockedContent(text = "") {
  return BANK_TERMS.test(String(text));
}
function sanitizeOcrText(text = "") {
  return String(text).split(/\r?\n/).filter(line => !SECRET_TERMS.test(line)).join("\n").slice(0, 20000);
}
module.exports = { isBlockedSource, isBlockedContent, sanitizeOcrText };
