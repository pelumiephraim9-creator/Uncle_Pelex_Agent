const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('pelex_addons.js', 'utf8');

test('Business, Pitch, Gmail and Spotlight use a two-column desktop card grid', () => {
  assert.match(source, /@media\s*\(min-width:\s*900px\)/);
  assert.match(source, /#v-business \.dash,#v-pitch \.dash,#v-gmail \.dash\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source, /#v-spotlight \.spot-list,#v-pitch \.spot-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source, /@media\s*\(min-width:1400px\)/);
});

test('phone layouts remain single-column and hidden dashboards remain hidden', () => {
  assert.match(source, /@media\s*\(max-width:899px\)/);
  assert.match(source, /#v-business \.dash,#v-pitch \.dash,#v-gmail \.dash\{display:flex;flex-direction:column\}/);
  assert.match(source, /#v-business \.dash\[hidden\],#v-pitch \.dash\[hidden\],#v-gmail \.dash\[hidden\]\{display:none!important\}/);
});

test('desktop grid rules are scoped to card-based agent views, not the General chat view', () => {
  const layout = source.slice(source.indexOf('/* BUSINESS / PITCH / GMAIL / SPOTLIGHT: responsive card layout.'));
  assert.doesNotMatch(layout, /#v-general|#v-chat/);
  assert.doesNotMatch(layout, /#v-business #bDash>\.dcard:first-child|#v-pitch #pDash>\.dcard:nth-child\(3\)/);
});

test('Business activity search and approval decision feedback are present', () => {
  assert.match(source, /id="pxActivitySearch"/);
  assert.match(source, /No activity matches that search/);
  assert.match(source, /Decision was not saved:/);
  assert.match(source, /await approvals\(\)/);
});

test('the add-on JavaScript parses', () => {
  assert.doesNotThrow(() => new vm.Script(source));
});


test('ambiguous slip templates require explicit money direction', () => {
  const templates = source.slice(0, source.indexOf('function pxNum'));
  for (const id of ['tax_invoice','commercial_invoice','proforma','simplified_invoice','till_receipt','supplier_invoice','credit_note','bank_transfer','delivery_note','general_document']) {
    const row = templates.split('\n').find(line => line.includes("id:'" + id + "'"));
    assert.ok(row, 'template exists: ' + id);
    assert.match(row, /direction:'unknown'/, id + ' must not guess cash direction');
  }
});

test('slip capture validates direction, date and positive amounts before saving', () => {
  assert.match(source, /type!=='receipt'&&type!=='expense'/);
  assert.match(source, /Please confirm whether this document records money in or money out/);
  assert.match(source, /Please enter a valid transaction date/);
  assert.match(source, /Every saved line needs an amount above zero/);
});


test('business CSV import preserves explicit accounting kind and category columns', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /var ck=findCol\(headers,/);
  assert.match(html, /var cCat=findCol\(headers,/);
  assert.match(html, /receivable_in/);
  assert.match(html, /kind:kind,category:category\|\|null/);
});

test('business financial dashboard calls the live monthly and yearly Supabase reports', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /business_project_dashboard_summary/);
  assert.match(html, /project_months/);
  assert.match(html, /month_income/);
  assert.match(html, /month_profit/);
});


test('editing legacy unclassified rows requires an explicit accounting classification', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /Choose classification for this older entry/);
  assert.match(html, /Choose the accounting classification before saving this older entry/);
});


test('business project currency and type are locked after project activity exists', () => {
  const migration = fs.readFileSync('supabase/migrations/20261111_business_project_configuration_guard.sql', 'utf8');
  assert.match(migration, /Currency is locked after this project has records/);
  assert.match(migration, /Business type is locked after this project has records/);
  assert.match(migration, /business_project_records/);
});

test('business register loads complete transaction pages and supports month drill-down', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /offset<50000/);
  assert.match(html, /\.range\(offset,offset\+batchSize-1\)/);
  assert.match(html, /data-px-month-open/);
  assert.match(html, /Select a month to open its detailed transactions/);
});

test('business dashboard defaults to a real project and keeps currencies separated', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const manager = fs.readFileSync('pelex_projects.js', 'utf8');
  assert.match(manager, /selected=projects\.some/);
  assert.match(manager, /projects\[0\]&&projects\[0\]\.id/);
  assert.match(manager, /px_project_/);
  assert.match(html, /project==='all'/);
  assert.match(html, /business_project_dashboard_summary/);
  assert.match(html, /receipts without an explicit accounting classification/i);
});

test('document reader accepts common office and business document formats and keeps reading separate from import', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /\.docx/);
  assert.match(html, /\.xlsx/);
  assert.match(html, /\.pptx/);
  assert.match(html, /\.odt/);
  assert.match(html, /\.ods/);
  assert.match(html, /Extracted document text/);
  assert.match(html, /Confirm and import transactions/);
  assert.match(html, /Nothing has been added to your ledger/);
});
