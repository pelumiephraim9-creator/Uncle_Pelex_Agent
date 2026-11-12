/* Pelex local document reader. File bytes are processed in this browser; no upload or AI request. */
(function(){
'use strict';
var MAX_TEXT=100000,MAX_PAGES=20;
function clean(s){return String(s||'').replace(/\u0000/g,'').replace(/[\t ]+\n/g,'\n').trim().slice(0,MAX_TEXT)}
function ext(file){return String(file.name||'').toLowerCase().split('.').pop()}
async function ocr(blob){
 if(!window.Tesseract)throw new Error('On-device OCR library did not load. Refresh and try again.');
 var result=await window.Tesseract.recognize(blob,'eng',{logger:function(){}});return clean(result.data&&result.data.text);
}
async function pdf(file){
 if(!window.pdfjsLib)throw new Error('PDF reader did not load.');
 var doc=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,parts=[],hasText=false;
 for(var n=1;n<=Math.min(doc.numPages,MAX_PAGES);n++){
  var page=await doc.getPage(n),content=await page.getTextContent();
  var text=content.items.map(function(x){return x.str||''}).join(' ').trim();
  if(text.length>15){hasText=true;parts.push('[Page '+n+'] '+text);continue}
  var vp=page.getViewport({scale:1.7}),canvas=document.createElement('canvas');
  canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png')});
  if(blob){var scanned=await ocr(blob);if(scanned)parts.push('[Page '+n+' OCR] '+scanned)}
 }
 if(doc.numPages>MAX_PAGES)parts.push('[Only first '+MAX_PAGES+' pages were read.]');
 return {text:clean(parts.join('\n\n')),kind:hasText?'pdf_text':'pdf_ocr'};
}
async function zipText(file,patterns){
 if(!window.JSZip)throw new Error('Office document reader did not load.');
 var z=await window.JSZip.loadAsync(await file.arrayBuffer()),names=Object.keys(z.files).filter(function(n){return patterns.test(n)&&!z.files[n].dir}).sort(),out=[];
 for(var i=0;i<names.length&&i<80;i++){var xml=await z.files[names[i]].async('text');var d=new DOMParser().parseFromString(xml,'application/xml');out.push(d.documentElement.textContent||'')}
 return clean(out.join('\n'));
}
async function read(file){
 var e=ext(file),text='',kind=e;
 if(e==='pdf'){var p=await pdf(file);text=p.text;kind=p.kind}
 else if(/^(png|jpe?g|webp|bmp|gif|tiff?)$/.test(e)){text=await ocr(file);kind='image_ocr'}
 else if(/^(xlsx|xlsm|xlsb|xls)$/.test(e)){
  if(!window.XLSX)throw new Error('Spreadsheet reader did not load.');
  var wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
  text=wb.SheetNames.map(function(n){return 'SHEET: '+n+'\n'+window.XLSX.utils.sheet_to_csv(wb.Sheets[n])}).join('\n\n');kind='spreadsheet';
 } else if(e==='csv'||e==='tsv'){text=await file.text();kind='delimited'}
 else if(/^(docx|docm|dotx|dotm)$/.test(e)){
  if(!window.mammoth)throw new Error('Word reader did not load.');
  var r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=r.value;kind='word';
 } else if(/^(pptx|pptm|ppsx)$/.test(e)){text=await zipText(file,/^ppt\/slides\/slide\d+\.xml$/);kind='presentation'}
 else if(e==='odt'){text=await zipText(file,/^content\.xml$/);kind='open_document'}
 else if(e==='ods'){text=await zipText(file,/^content\.xml$/);kind='open_spreadsheet'}
 else if(e==='odp'){text=await zipText(file,/^content\.xml$/);kind='open_presentation'}
 else if(/^(txt|md|json|xml|html?|rtf|log)$/.test(e)){text=await file.text();kind='text'}
 else throw new Error('This file type is not supported yet.');
 return {source:'local',kind:kind,text:clean(text),name:file.name,note:'Read locally in this browser. Nothing has been saved.'};
}
window.pxLocalRead=read;
})();