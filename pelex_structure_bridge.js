/* PELEX STRUCTURE BRIDGE
   Reads positioned PDF text or image OCR and passes it to pelex_structure.js.
   The prior general reader remains available for non-PDF/image formats.
   Nothing is saved here; the caller controls review and saving. */
(function(){
 'use strict';
 var PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
 var PDF_WORKER_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
 var TESS_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
 function loadScript(url,ok){
  return new Promise(function(resolve,reject){
   if(ok())return resolve(true);
   var existing=document.querySelector('script[data-px-src="'+url+'"]');
   if(existing){existing.addEventListener('load',function(){ok()?resolve(true):reject(new Error('A document-reading library did not initialise.'))},{once:true});existing.addEventListener('error',function(){reject(new Error('Could not load a document-reading library.'))},{once:true});return}
   var s=document.createElement('script');s.src=url;s.async=true;s.dataset.pxSrc=url;
   s.onload=function(){ok()?resolve(true):reject(new Error('A document-reading library did not initialise.'))};
   s.onerror=function(){reject(new Error('Could not load a document-reading library. Check the connection and try again.'))};
   document.head.appendChild(s);
  });
 }
 async function ensurePdf(){
  await loadScript(PDFJS_URL,function(){return !!window.pdfjsLib});
  if(window.pdfjsLib.GlobalWorkerOptions)window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER_URL;
 }
 async function ensureOcr(){await loadScript(TESS_URL,function(){return !!window.Tesseract})}
 async function ocrBlob(blob){
  await ensureOcr();
  var r=await window.Tesseract.recognize(blob,'eng');
  return (r&&r.data&&r.data.words)||[];
 }
 async function pdfItems(file){
  await ensurePdf();
  var doc=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,items=[],warnings=[];
  var max=Math.min(doc.numPages,20);
  for(var p=1;p<=max;p++){
   var page=await doc.getPage(p),content=await page.getTextContent(),pageItems=[];
   (content.items||[]).forEach(function(it){
    if(it.str&&it.str.trim())pageItems.push({str:it.str,x:it.transform[4],y:it.transform[5]});
   });
   if(pageItems.length){
    // Keep pages separate in the vertical sort: subtracting the offset ensures
    // page 1 remains before page 2 when the engine sorts from top to bottom.
    var offset=(p-1)*100000;
    pageItems.forEach(function(it){items.push({str:it.str,x:it.x,y:it.y-offset})});
   }else{
    var touchDevice=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches),viewport=page.getViewport({scale:touchDevice?1.35:1.8}),canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    var ctx=canvas.getContext('2d');
    await page.render({canvasContext:ctx,viewport:viewport}).promise;
    var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png')});
    if(blob){
     var words=await ocrBlob(blob);
     words.forEach(function(w){var b=w.bbox||{x0:0,y0:0};if(w.text&&w.text.trim())items.push({str:w.text,x:b.x0,y:-offset-(b.y1==null?b.y0:b.y1)})});
     canvas.width=0;canvas.height=0;
     if(page.cleanup)page.cleanup();
    }
   }
  }
  if(doc.numPages>max)warnings.push('Only the first '+max+' of '+doc.numPages+' pages were read.');
  return {items:items,warnings:warnings};
 }
 async function pictureItems(file){
  var source=file;
  if(/heic|heif/i.test((file&&file.type||'')+' '+(file&&file.name||''))){
   if(typeof createImageBitmap!=='function')throw new Error('This iPhone photo is in HEIC format, which this browser cannot decode. Choose a JPEG photo or export the image as PDF and try again.');
   var bitmap;try{bitmap=await createImageBitmap(file)}catch(e){throw new Error('This iPhone HEIC photo could not be decoded here. Choose a JPEG photo or export it as PDF and try again.')}
   var canvas=document.createElement('canvas'),scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);if(bitmap.close)bitmap.close();
   source=await new Promise(function(resolve,reject){canvas.toBlob(function(blob){canvas.width=0;canvas.height=0;blob?resolve(blob):reject(new Error('The iPhone photo could not be prepared for reading.'))},'image/jpeg',0.9)});
  }
  var words=await ocrBlob(source);
  return words.filter(function(w){return w.text&&w.text.trim()}).map(function(w){var b=w.bbox||{x0:0,y0:0};return {str:w.text,x:b.x0,y:-(b.y1==null?b.y0:b.y1)}});
 }
 function isStructuredFile(file){
  return !!file&&(/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||'')||/^image\//i.test(file.type)||/\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name||''));
 }
 window.pxReadFileStructured=async function(file){
  if(!window.pxStructure||typeof window.pxStructure.structure!=='function')return {source:'local',kind:'error',lines:[],fields:{},warnings:['The Pelex structure engine did not load. Refresh and try again.'],note:'',text:''};
  try{
   var items=[],kind='document',warnings=[];
   if(/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||'')){var p=await pdfItems(file);items=p.items;warnings=warnings.concat(p.warnings);kind='pdf'}
   else if(/^image\//i.test(file.type)||/\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name||'')){items=await pictureItems(file);kind='picture'}
   else return {source:'local',kind:'unsupported',lines:[],fields:{},warnings:['This structural reader accepts PDFs and pictures. Other file types use the existing reader.'],note:'',text:''};
   if(!items.length)return {source:'local',kind:kind,lines:[],fields:{},warnings:warnings.concat(['No readable text was found. Add the rows by hand.']),note:'',text:''};
   var s=window.pxStructure.structure(items);
   // Remove non-transactional test boilerplate from the editable review text.
   // Keep the test marker separately so callers can enforce read-only mode.
   var testOnly=/synthetic sample|not a real transaction|testing instruction|fictional names|nothing has been added to your ledger|test data/i.test(s.text||'');
   var cleanRows=(s.rows||[]).filter(function(row){
    return !/PELEX BUSINESS AGENT TEST DATA|SYNTHETIC SAMPLE|NOT A REAL TRANSACTION|TAX INVOICE|TESTING INSTRUCTION|UPLOAD ONLY|MATCHING BUSINESS PROJECT|CHECK EXTRACTED|FICTIONAL NAMES|NOTHING HAS BEEN ADDED|TEST DATA|FOR TESTING ONLY/i.test(row.text||'');
   });
   var cleanText=cleanRows.map(function(row){return row.text}).join('\n');
   var cleanLines=window.pxStructure.readLines(cleanRows);
   var cleanFields=window.pxStructure.readFields(cleanText);
   var cleanSum=cleanLines.reduce(function(sum,line){return sum+(Number(line.line_total)||0)},0);
   var cleanWarnings=[];
   if(!cleanLines.length)cleanWarnings.push('No line items were found. Add them with Add row.');
   if(cleanFields.total!=null&&cleanLines.length&&Math.abs(cleanSum-cleanFields.total)>0.5)cleanWarnings.push('The line items do not match the document total. Check each row.');
   return {source:'local',kind:kind,fields:cleanFields,lines:cleanLines,total_from_lines:cleanSum,warnings:warnings.concat(cleanWarnings),text:cleanText,testOnly:testOnly,note:'Read locally on this device. Nothing has been saved.'};
  }catch(e){return {source:'local',kind:'error',lines:[],fields:{},warnings:[e&&e.message||'This file could not be read on this device. Add the rows by hand.'],note:'',text:''}}
 };
 // Preserve every existing file reader for spreadsheets, CSV, Word and other formats.
 var older=window.pxLocalRead;
 window.pxLocalRead=async function(file){
  if(isStructuredFile(file)){
   var r=await window.pxReadFileStructured(file),f=r.fields||{};
   var total=f.total!=null?f.total:(r.total_from_lines||0);
   return Object.assign({},r,{total:total,number:f.reference||null,date:f.date||null,template:f.type||r.kind,name:file&&file.name||'',note:r.note||((r.warnings||[]).join(' '))});
  }
  if(typeof older==='function')return older(file);
  return {source:'local',kind:'unsupported',text:'',lines:[],fields:{},warnings:['No compatible reader is available for this file type.'],note:'',total:0};
 };
 window.pxOpenStructuredReview=async function(file,container,onConfirm){
  container.textContent='Reading on this device…';
  var r=await window.pxReadFileStructured(file);
  if(r.kind==='error'||r.kind==='unsupported'){container.textContent=(r.warnings||['This file could not be read.']).join(' ');return r}
  if(!window.pxStructure||typeof window.pxStructure.review!=='function'){container.textContent='The Pelex review table did not load.';return r}
  window.pxStructure.review(container,r,onConfirm);
  return r;
 };
})();