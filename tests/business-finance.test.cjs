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
});

test('principal, receivable collection, savings and capital stay distinct from operating profit', () => {
  for (const kind of ['principal_out','principal_in','receivable_in','savings_in','capital']) {
    assert.ok(registerScript.includes("'" + kind + "'"), 'missing accounting kind '+kind);
  }
  assert.match(html, /Payment received against an existing invoice/);
  assert.match(html, /Owner capital introduced/);
});

test('register exposes payment status and requires a valid project for every new transaction', () => {
  assert.match(registerScript, /function paymentStatus/);
  assert.match(registerScript, /Part-paid/);
  assert.match(registerScript, /Choose the business project for this transaction/);
  assert.match(registerScript, /pxFProject/);
  assert.match(registerScript, /activeProject==='all'/);
});

test('dashboard reporting variables and inventory summary are unambiguous in PostgreSQL', () => {
  const dashboard = fs.readFileSync('supabase/migrations/20261111_business_project_dashboard_summary.sql', 'utf8');
  const reporting = fs.readFileSync('supabase/migrations/20261111_business_project_reporting.sql', 'utf8');
  assert.match(dashboard, /v_start_date/);
  assert.match(dashboard, /v_end_date/);
  assert.doesNotMatch(dashboard, /\bstart_date\b/);
  assert.doesNotMatch(dashboard, /\bend_date\b/);
  assert.match(reporting, /select g\.item,g\.qin,g\.qout,g\.qadj/);
  assert.match(reporting, /from grouped as g order by g\.item/);
});

test('business access hardening leaves the type catalogue read-only and protects private workspace data', () => {
  const security = fs.readFileSync('supabase/migrations/20261111_business_agent_access_hardening.sql', 'utf8');
  assert.match(security, /revoke all on table public\.workspaces[\s\S]*from public, anon/);
  assert.match(security, /grant select on table public\.business_types to anon, authenticated/);
  assert.match(security, /revoke all on function public\.create_workspace\(text,text\) from public, anon/);
  assert.match(security, /grant execute on function public\.create_workspace\(text,text\) to authenticated/);
});
