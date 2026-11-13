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
 assert.match(source,/'currency','subtotal'/);
 assert.match(source,/data-k="description"/);
 assert.match(source,/data-del=/);
});
test('bridge preserves a separate test-only marker and filters test boilerplate',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','pelex_structure_bridge.js'),'utf8');
 assert.match(source,/var testOnly=/);
 assert.match(source,/TESTING INSTRUCTION\|UPLOAD ONLY/);
 assert.match(source,/testOnly:testOnly/);
});

test('returns positioned rows for bridge cleanup and editable structure',()=>{
 const result=structure.structure([{str:'Item 1 2 100.00 200.00',x:0,y:20}]);
 assert.ok(Array.isArray(result.rows));
 assert.equal(result.rows.length,1);
 assert.equal(result.rows[0].text,'Item 1 2 100.00 200.00');
});
test('mobile capture uses a direct file input and no iframe picker',()=>{
 const runtime=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','pelex_addons_runtime.js'),'utf8');
 assert.match(runtime,/position:absolute;inset:0;width:100%;height:100%;opacity:0\.01/);
 assert.match(runtime,/build\(document,modal\.querySelector\('#pxSlipInlineBody'\)\)/);
 assert.doesNotMatch(runtime,/frame\.contentDocument/);
});
test('upload import checks duplicates before storage and handles thrown errors',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
 const start=html.indexOf('async function saveReviewed()');
 const fn=html.slice(start,html.indexOf('function wireUpload()',start));
 assert.ok(fn.indexOf('pxDuplicate(fh,projectId)')<fn.indexOf('.upload(path,pendingDoc.file'));
 assert.match(fn,/catch\(e\)/);
 assert.match(fn,/finally/);
});

test('groups mobile OCR words by printed line before rebuilding transaction rows',()=>{
 const previousWindow=global.window;
 global.window={};
 delete require.cache[require.resolve('../pelex_structure_bridge.js')];
 require('../pelex_structure_bridge.js');
 const words=[
  {text:"Men's",bbox:{x0:10,y0:100,y1:125},block_num:1,par_num:1,line_num:1},
  {text:'senator',bbox:{x0:90,y0:103,y1:128},block_num:1,par_num:1,line_num:1},
  {text:'fabric',bbox:{x0:180,y0:101,y1:126},block_num:1,par_num:1,line_num:1},
  {text:'2',bbox:{x0:360,y0:104,y1:127},block_num:1,par_num:1,line_num:1},
  {text:'18,500.00',bbox:{x0:430,y0:102,y1:126},block_num:1,par_num:1,line_num:1},
  {text:'37,000.00',bbox:{x0:570,y0:101,y1:126},block_num:1,par_num:1,line_num:1},
  {text:'Ready-made',bbox:{x0:10,y0:160,y1:185},block_num:1,par_num:1,line_num:2},
  {text:'shirt',bbox:{x0:140,y0:163,y1:187},block_num:1,par_num:1,line_num:2},
  {text:'1',bbox:{x0:360,y0:161,y1:186},block_num:1,par_num:1,line_num:2},
  {text:'22,000.00',bbox:{x0:430,y0:160,y1:185},block_num:1,par_num:1,line_num:2},
  {text:'22,000.00',bbox:{x0:570,y0:162,y1:187},block_num:1,par_num:1,line_num:2}
 ];
 const positioned=global.window.pxOcrWordsToItems(words,0);
 const result=structure.structure(positioned);
 assert.equal(result.rows.length,2);
 assert.equal(result.lines.length,2);
 assert.equal(result.lines[0].line_total,37000);
 assert.equal(result.lines[1].line_total,22000);
 global.window=previousWindow;
});

test('preserves Tesseract hierarchical line IDs when OCR word boxes vary vertically',()=>{
 const previousWindow=global.window;
 global.window={};
 delete require.cache[require.resolve('../pelex_structure_bridge.js')];
 require('../pelex_structure_bridge.js');
 const words=[
  {text:'Fresh',line_key:'block:0:0:0',bbox:{x0:10,y0:100,y1:124}},
  {text:'tomatoes',line_key:'block:0:0:0',bbox:{x0:75,y0:104,y1:128}},
  {text:'3',line_key:'block:0:0:0',bbox:{x0:300,y0:98,y1:123}},
  {text:'2,000.00',line_key:'block:0:0:0',bbox:{x0:380,y0:103,y1:127}},
  {text:'6,000.00',line_key:'block:0:0:0',bbox:{x0:500,y0:101,y1:125}}
 ];
 const positioned=global.window.pxOcrWordsToItems(words,0);
 assert.equal(new Set(positioned.map(x=>x.y)).size,1);
 const result=structure.structure(positioned);
 assert.equal(result.lines.length,1);
 assert.equal(result.lines[0].description,'Fresh tomatoes');
 assert.equal(result.lines[0].line_total,6000);
 global.window=previousWindow;
});
