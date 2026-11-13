const test = require('node:test');
const assert = require('node:assert/strict');
const structure = require('../pelex_structure.js');

test('reconstructs positioned receipt rows and reconciles the total', () => {
  const items = [
    {str:'Fashion retail sales receipt',x:0,y:100},
    {str:'Date: 12 Nov 2026',x:0,y:90},
    {str:'Slip reference: PXL-TEST-018',x:0,y:80},
    {str:'Description Qty Unit price (NGN) Line total (NGN)',x:0,y:70},
    {str:"Men's senator fabric 2 18,500.00 37,000.00",x:0,y:60},
    {str:'Tailoring accessories set 1 7,500.00 7,500.00',x:0,y:50},
    {str:'Ready-made shirt 1 22,000.00 22,000.00',x:0,y:40},
    {str:'Subtotal: NGN 66,500.00',x:0,y:30},
    {str:'Total: NGN 66,500.00',x:0,y:20},
    {str:'Payment method: Cash',x:0,y:10},
    {str:'Status: Paid Currency: NGN',x:0,y:0}
  ];
  const result = structure.structure(items);
  assert.equal(result.fields.date, '12 Nov 2026');
  assert.equal(result.fields.reference, 'PXL-TEST-018');
  assert.equal(result.fields.total, 66500);
  assert.equal(result.fields.currency, 'NGN');
  assert.equal(result.lines.length, 3);
  assert.equal(result.total_from_lines, 66500);
  assert.deepEqual(result.lines.map(x => x.line_total), [37000,7500,22000]);
  assert.equal(result.warnings.length, 0);
});

test('keeps pages separate and in reading order', () => {
  const rows = structure.groupRows([
    {str:'Page two',x:0,y:-99300},
    {str:'Page one',x:0,y:700}
  ]);
  assert.equal(rows[0].text, 'Page one');
  assert.equal(rows[1].text, 'Page two');
});

test('does not treat footer testing instructions as line items', () => {
  const result = structure.structure([
    {str:'Men senator fabric 2 18,500.00 37,000.00',x:0,y:30},
    {str:'This document has no transaction rows to import. Nothing has been added to your ledger.',x:0,y:10}
  ]);
  assert.equal(result.lines.length, 1);
});

test('new bridge and slip integration scripts parse without syntax errors', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  for (const file of ['pelex_structure.js','pelex_structure_bridge.js','pelex_addons_runtime.js']) {
    new vm.Script(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'), {filename:file});
  }
  const html = fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
  const marker = html.indexOf('async function readDoc()');
  const scriptStart = html.lastIndexOf('<script', marker);
  const scriptBody = html.indexOf('>', scriptStart) + 1;
  const scriptEnd = html.indexOf('</script>', marker);
  assert.ok(marker >= 0 && scriptStart >= 0 && scriptEnd > scriptBody, 'document reading inline script should be present');
  new vm.Script(html.slice(scriptBody,scriptEnd), {filename:'index.html document reader'});
});

test('review editor exposes editable receipt metadata and line items in test-only mode',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','pelex_structure.js'),'utf8');
 assert.match(source,/result\.testOnly\?/);
 assert.match(source,/Finish test review/);
 assert.match(source,/data-f="currency"/);
 assert.match(source,/data-k="description"/);
 assert.match(source,/data-del=/);
});
test('bridge preserves a separate test-only marker and filters test boilerplate',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','pelex_structure_bridge.js'),'utf8');
 assert.match(source,/var testOnly=/);
 assert.match(source,/TESTING INSTRUCTION\|UPLOAD ONLY/);
 assert.match(source,/testOnly:testOnly/);
});
