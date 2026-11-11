'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const marker = '/* PELEX BUSINESS TRANSACTION REGISTER';
const at = html.indexOf(marker);
assert.notEqual(at, -1, 'business transaction register must be installed in index.html');
const open = html.lastIndexOf('<script>', at);
const close = html.indexOf('</script>', at);
assert.ok(open >= 0 && close > at, 'register must be inside an inline script');
const registerScript = html.slice(open + '<script>'.length, close);

test('business transaction register JavaScript parses', () => {
  assert.doesNotThrow(() => new vm.Script(registerScript));
});

test('register uses authenticated, workspace-scoped Supabase transaction RPCs', () => {
  assert.match(registerScript, /business_list_transactions/);
  assert.match(registerScript, /business_add_transaction/);
  assert.match(registerScript, /business_update_transaction/);
  assert.match(registerScript, /p_workspace:ws\(\)/);
  assert.match(registerScript, /p_project:activeProject/);
});

test('register supports chronological records, search, year and month filters', () => {
  for (const id of ['pxTrProject','pxTrYear','pxTrMonth','pxTrSearch','pxTrRows']) {
    assert.ok(html.includes('id="'+id+'"'), 'missing register control '+id);
  }
  assert.match(registerScript, /newest first/);
  assert.match(registerScript, /ORDER BY le.entry_date DESC,le.id DESC/);
});

test('principal, receivable collection, savings and capital stay distinct from operating profit', () => {
  for (const kind of ['principal_out','principal_in','receivable_in','savings_in','capital']) {
    assert.ok(registerScript.includes("'" + kind + "'"), 'missing accounting kind '+kind);
  }
  assert.match(html, /Payment received against an existing invoice/);
  assert.match(html, /Owner capital introduced/);
});
