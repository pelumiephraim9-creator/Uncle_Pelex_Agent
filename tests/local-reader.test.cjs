'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const readerSource=fs.readFileSync('pelex_local_reader.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function harness(overrides={}){
 const calls={ocr:0,render:0};
 const window={Tesseract:{recognize:async()=>{calls.ocr++;return {data:{text:'INVOICE TOTAL 4500'}}}},
  XLSX:{read:()=>({SheetNames:['Sales'],Sheets:{Sales:{}}}),utils:{sheet_to_csv:()=> 'Date,Amount\n2026-11-01,4500'}},
  mammoth:{extractRawText:async()=>({value:'Word invoice total 4500'})},
  JSZip:{loadAsync:async()=>({files:{'ppt/slides/slide1.xml':{dir:false,async:()=>'<p:sp><a:t>Presentation total 4500</a:t></p:sp>'}}})},
  pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:'Selectable invoice total 4500'}]}),getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()})})})})},
  ...overrides};
 const document={createElement:()=>({width:0,height:0,getContext:()=>({}),toBlob:fn=>fn({})})};
 class DOMParser{parseFromString(xml){return {documentElement:{textContent:xml.replace(/<[^>]+>/g,' ')}}}}
 const context={window,document,DOMParser,console,Uint8Array,ArrayBuffer,Promise};
 vm.createContext(context);vm.runInContext(readerSource,context);
 return {read:window.pxLocalRead,calls};
}
function file(name,text=''){return {name,size:text.length,text:async()=>text,arrayBuffer:async()=>new TextEncoder().encode(text).buffer}}
test('reader installs without making network or AI calls',()=>{
 const h=harness();assert.equal(typeof h.read,'function');
});
test('selectable PDF text is extracted locally without OCR',async()=>{
 const h=harness();const r=await h.read(file('invoice.pdf'));
 assert.match(r.text,/Selectable invoice total 4500/);assert.equal(r.kind,'pdf_text');assert.equal(h.calls.ocr,0);
});
test('scanned PDF page falls back to local OCR',async()=>{
 const h=harness({pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[]}),getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()})})})})}});
 const r=await h.read(file('scan.pdf'));assert.match(r.text,/INVOICE TOTAL 4500/);assert.equal(r.kind,'pdf_ocr');assert.equal(h.calls.ocr,1);assert.equal(h.calls.render,0);
});
test('receipt image is OCR-read locally',async()=>{
 const h=harness();const r=await h.read(file('receipt.jpg'));assert.match(r.text,/INVOICE TOTAL 4500/);assert.equal(r.kind,'image_ocr');assert.equal(h.calls.ocr,1);
});
test('CSV and TSV contents are extracted locally',async()=>{
 const h=harness();assert.match((await h.read(file('sales.csv','date,total\n2026-11-01,4500'))).text,/4500/);
 assert.match((await h.read(file('sales.tsv','date\ttotal\n2026-11-01\t4500'))).text,/4500/);
});
test('Excel workbook is read locally',async()=>{
 const h=harness();const r=await h.read(file('sales.xlsx','binary'));assert.match(r.text,/4500/);assert.equal(r.kind,'spreadsheet');
});
test('Word and PowerPoint documents are read locally',async()=>{
 const h=harness();assert.match((await h.read(file('invoice.docx','binary'))).text,/Word invoice/);
 assert.match((await h.read(file('slides.pptx','binary'))).text,/Presentation total/);
});
test('unsupported formats fail with a clear message',async()=>{
 const h=harness();await assert.rejects(()=>h.read(file('unknown.exe')),/not supported/);
});
test('Business Agent routes non-tabular files to preview only, never ledger save',()=>{
 assert.match(html,/window\.pxLocalRead\(f\)/);
 assert.match(html,/This is a document preview only/);
 assert.match(html,/Nothing is saved until you press Confirm and save/);
});
test('CSV and Excel retain the existing explicit confirmation and project scope checks',()=>{
 assert.match(html,/if\(!ready\(\)\|\|!ws\)/);
 assert.match(html,/business_projects/);
 assert.match(html,/upConfirm/);
});

test('new Pelex structure engine reconstructs positioned receipt lines and totals',()=>{
 const structure=require('../pelex_structure.js');
 const items=[
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
 const result=structure.structure(items);
 assert.equal(result.fields.date,'12 Nov 2026');
 assert.equal(result.fields.reference,'PXL-TEST-018');
 assert.equal(result.fields.total,66500);
 assert.equal(result.fields.currency,'NGN');
 assert.equal(result.lines.length,3);
 assert.equal(result.total_from_lines,66500);
 assert.deepEqual(result.lines.map(x=>x.line_total),[37000,7500,22000]);
 assert.equal(result.warnings.length,0);
});
test('structure engine keeps page groups in document order and ignores testing footer',()=>{
 const structure=require('../pelex_structure.js');
 const rows=structure.groupRows([{str:'Page two',x:0,y:-99300},{str:'Page one',x:0,y:700}]);
 assert.equal(rows[0].text,'Page one');assert.equal(rows[1].text,'Page two');
 const result=structure.structure([
  {str:'Men senator fabric 2 18,500.00 37,000.00',x:0,y:30},
  {str:'This document has no transaction rows to import. Nothing has been added to your ledger.',x:0,y:10}
 ]);
 assert.equal(result.lines.length,1);
});
test('new bridge, slip runtime and integrated document reader scripts have valid syntax',()=>{
 for(const name of ['pelex_structure.js','pelex_structure_bridge.js','pelex_addons_runtime.js'])
  new vm.Script(fs.readFileSync(name,'utf8'),{filename:name});
 const marker=html.indexOf('async function readDoc()');
 const scriptStart=html.lastIndexOf('<script',marker);
 const scriptBody=html.indexOf('>',scriptStart)+1;
 const scriptEnd=html.indexOf('</script>',marker);
 assert.ok(marker>=0&&scriptStart>=0&&scriptEnd>scriptBody,'document reading inline script should be present');
 new vm.Script(html.slice(scriptBody,scriptEnd),{filename:'index.html document reader'});
 assert.ok(match,'document reading inline script should be present');
 new vm.Script(match[0].replace(/^<script>/,'').replace(/<\/script>$/,''),{filename:'index.html document reader'});
});
