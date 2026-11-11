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


test('ambiguous invoices and transfer documents require an explicit money direction', () => {
  const templates = source.slice(0, source.indexOf('function pxNum'));
  for (const id of ['tax_invoice','commercial_invoice','proforma','simplified_invoice','till_receipt','supplier_invoice','credit_note','bank_transfer','delivery_note','general_document']) {
    const row = templates.split('\\n').find(line => line.includes("id:'" + id + "'"));
    assert.ok(row, 'template exists: ' + id);
    assert.match(row, /direction:'unknown'/, id + ' must not be auto-classified as cash in/out');
  }
  assert.match(source, /Choose money in or money out/);
});

test('slip saving rejects unconfirmed direction, invalid date, and non-positive line amounts', () => {
  assert.match(source, /type!=='receipt'&&type!=='expense'/);
  assert.match(source, /Please confirm whether this document records money in or money out/);
  assert.match(source, /Please enter a valid transaction date/);
  assert.match(source, /Every saved line needs an amount above zero/);
});
