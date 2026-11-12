const test=require("node:test");
const assert=require("node:assert/strict");
const {isBlockedSource,isBlockedContent,sanitizeOcrText}=require("../security");
test("blocks banking and wallet window titles",()=>{for(const name of ["Online Banking - ACME","Bank app","Mobile Wallet"])assert.equal(isBlockedSource(name),true,name);});
test("allows ordinary business application windows",()=>{for(const name of ["Google Sheets - Sales","Trello - Orders","POS Cashier Dashboard"])assert.equal(isBlockedSource(name),false,name);});
test("blocks OCR text containing bank-related transaction context",()=>{assert.equal(isBlockedContent("Sales total NGN 5000"),false);assert.equal(isBlockedContent("Bank statement account balance"),true);});
test("redacts lines containing credentials and bounds OCR text",()=>{assert.equal(sanitizeOcrText("Invoice total 500\nPassword: secret\nPaid"),"Invoice total 500\nPaid");assert.ok(sanitizeOcrText("x".repeat(30000)).length<=20000);});
