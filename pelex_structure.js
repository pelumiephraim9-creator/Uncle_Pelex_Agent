/* PELEX STRUCTURE
   Shared, on-device structural engine for positioned PDF text and OCR words.
   It reconstructs rows, extracts document fields and line items, and provides
   an editable review. It never saves data; callers own confirmation and saving. */
(function(){
 'use strict';
 var NUM=/^-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$|^-?\d+(?:\.\d{1,2})?$/;
 function toNum(s){return Number(String(s).replace(/,/g,''))}
 function isNum(s){return NUM.test(String(s).trim())}
 function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
 function groupRows(items,tol){
  tol=Number(tol)||6;
  var sorted=(items||[]).filter(function(i){return i&&i.str&&String(i.str).trim()&&isFinite(Number(i.x))&&isFinite(Number(i.y))})
   .slice().sort(function(a,b){return Number(b.y)-Number(a.y)||Number(a.x)-Number(b.x)});
  var rows=[];
  sorted.forEach(function(it){
   var y=Number(it.y),row=null,best=Infinity;
   for(var i=0;i<rows.length;i++){var delta=Math.abs(rows[i].y-y);if(delta<=tol&&delta<best){row=rows[i];best=delta}}
   if(!row){row={y:y,cells:[]};rows.push(row)}
   row.cells.push(it);
  });
  return rows.map(function(r){
   r.cells.sort(function(a,b){return Number(a.x)-Number(b.x)});
   r.parts=r.cells.reduce(function(out,c){
    // PDF.js may return an entire table row as one text item. Split that item
    // into ordered tokens so mixed description/numeric cells remain readable.
    var tokens=String(c.str).trim().match(/(?:[A-Za-z][A-Za-z0-9'’&./-]*\d[A-Za-z0-9'’&./-]*|[A-Za-z][A-Za-z'’&./-]*|[-+]?\d[\d,]*(?:\.\d{1,2})?|[^\s])/g)||[];
    return out.concat(tokens);
   },[]);
   r.text=r.parts.join(' ');
   return r;
  });
 }
 function readLines(rows){
  var lines=[];
  (rows||[]).forEach(function(r){
   var p=r.parts||[],nums=p.filter(isNum);
   if(!nums.length)return;
   var label=p.filter(function(x){return !isNum(x)}).join(' ').replace(/\s+/g,' ').trim();
   if(!label||/subtotal|grand total|total|vat|tax|cash|change|balance|payment|status|currency|date|reference|receipt|invoice|description|qty|quantity|unit price|line total|business type|testing instruction|fictional|nothing has been|no transaction rows/i.test(label))return;
   var line;
   if(nums.length>=3)line={description:label,qty:toNum(nums[0]),unit_price:toNum(nums[1]),line_total:toNum(nums[nums.length-1])};
   else if(nums.length===2)line={description:label,qty:toNum(nums[0]),unit_price:null,line_total:toNum(nums[1])};
   else line={description:label,qty:1,unit_price:null,line_total:toNum(nums[0])};
   if(line.qty>0&&line.line_total>0)lines.push(line);
  });
  return lines;
 }
 function readFields(text){
  var t=String(text||'');
  function grab(re){var m=re.exec(t);return m?m[1].trim().replace(/\s+/g,' '):null}
  var total=grab(/(?:^|\n)\s*(?:grand\s*)?total\s*:?\s*(?:NGN|N|₦|\$)?\s*([\d][\d,]*(?:\.\d{1,2})?)/im);
  var sub=grab(/(?:^|\n)\s*subtotal\s*:?\s*(?:NGN|N|₦|\$)?\s*([\d][\d,]*(?:\.\d{1,2})?)/im);
  var date=grab(/(?:^|\n)\s*date\s*:?\s*(\d{1,2}\s+\w{3,9}\s+\d{4}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{2}-\d{2})/im);
  var ref=grab(/(?:^|\n)\s*(?:slip\s+reference|receipt\s*\/\s*reference|reference|ref|receipt|invoice(?:\s+no)?|slip)\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/im);
  var pay=grab(/(?:^|\n)\s*payment\s+method\s*:?\s*([A-Za-z ]{3,24}?)(?=\s+status|\s+currency|$)/im);
  var status=grab(/(?:^|\n)\s*status\s*:?\s*(Paid|Unpaid|Pending|Partly paid|Refunded|Void)/im);
  var cur=grab(/(?:^|\n)\s*currency\s*:?\s*([A-Z]{3})/im)||(/NGN|₦/.test(t)?'NGN':null);
  var kind=/invoice/i.test(t)?'invoice':/receipt|slip/i.test(t)?'receipt':/statement/i.test(t)?'statement':'document';
  return {type:kind,date:date,reference:ref,subtotal:sub?toNum(sub):null,total:total?toNum(total):null,payment_method:pay,status:status,currency:cur};
 }
 function structure(items){
  var rows=groupRows(items),text=rows.map(function(r){return r.text}).join('\n'),fields=readFields(text),lines=readLines(rows);
  var sum=lines.reduce(function(a,l){return a+(l.line_total||0)},0),warnings=[];
  if(!lines.length)warnings.push('No line items were found. Add them with Add row.');
  if(fields.total!=null&&lines.length&&Math.abs(sum-fields.total)>0.5)warnings.push('The line items add up to '+sum.toLocaleString()+' but the document total says '+fields.total.toLocaleString()+'. Check each line.');
  return {fields:fields,lines:lines,rows:rows,total_from_lines:sum,warnings:warnings,rows_found:rows.length,text:text};
 }
 function review(container,result,onConfirm){
  var lines=(result.lines||[]).map(function(l){return {description:l.description||'',qty:Number(l.qty)||1,unit_price:l.unit_price==null?null:Number(l.unit_price),line_total:Number(l.line_total)||0}});
  var f=Object.assign({},result.fields||{});
  function draw(){
   // Read the active app theme from the document that owns this review.
   // Inline styles are intentional: they also work when this component is mounted
   // inside a popup/container whose styles do not inherit the main page stylesheet.
   var themeDoc=container.ownerDocument||document;
   var themeRoot=themeDoc.documentElement;
   var themeWin=themeDoc.defaultView||window;
   var themeCss=themeWin.getComputedStyle(themeRoot);
   function themeVar(name,fallback){return (themeCss.getPropertyValue(name)||'').trim()||fallback}
   var panelColor='transparent';
   var inkColor='#0b1b4a';
   var lineColor='#0b1b4a';
   var mutedColor='#33466f';
   var themeBackground=(themeWin.getComputedStyle(themeRoot).getPropertyValue('--bg')||'#ffffff').trim();
   var darkReview=themeRoot.getAttribute('data-theme')==='dark'||/^#(?:0[0-9a-f]|1[0-9a-f]|2[0-9a-f])/i.test(themeBackground);
   var labelColor=darkReview?'#ffffff':'#0b1b4a';
   var fieldStyle='display:block;width:100%;min-width:0;box-sizing:border-box;padding:8px 10px;min-height:38px;border:2px solid #0b1b4a!important;border-radius:9px;background:#ffffff!important;background-color:#ffffff!important;color:#0b1b4a!important;-webkit-text-fill-color:#0b1b4a!important;-webkit-appearance:none!important;appearance:none!important;color-scheme:light!important;opacity:1!important;box-shadow:none!important';
   var labelStyle='display:block;color:'+labelColor+'!important;-webkit-text-fill-color:'+labelColor+'!important;font-weight:700';
   var total=lines.reduce(function(a,l){return a+(Number(l.line_total)||0)},0);
   var warnings=[];
   if(!lines.length)warnings.push('No line items are present. Add a row or cancel.');
   if(f.total!=null&&lines.length&&Math.abs(total-Number(f.total))>0.5)warnings.push('Rows total '+total.toLocaleString()+'; document total '+Number(f.total).toLocaleString()+'. Please reconcile before saving.');
   container.innerHTML='<div class="px-structure-review" style="font-family:Arial,Helvetica,sans-serif;max-width:100%;overflow:auto;color:'+labelColor+'!important;background:transparent!important">'+
    '<div style="font-weight:700">'+esc(f.type||'document')+' · '+esc(f.currency||'')+'</div>'+(result.testOnly?'<div style="padding:8px;margin:8px 0;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:12px">TEST SAMPLE · You can edit the extracted details and rows, but this sample cannot be saved to the business ledger.</div>':'')+
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0;font-size:13px">'+
    ['type','date','reference','payment_method','status','currency','subtotal'].map(function(k){return '<label style="'+labelStyle+'">'+esc(k.replace(/_/g,' '))+'<input data-f="'+k+'" value="'+esc(f[k]==null?'':f[k])+'" style="'+fieldStyle+'"></label>'}).join('')+'</div>'+
    '<div class="px-review-table-wrap" style="width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="px-review-table" style="width:100%;min-width:0;table-layout:fixed;border-collapse:collapse;font-size:12px"><colgroup><col style="width:39%"><col style="width:12%"><col style="width:20%"><col style="width:21%"><col style="width:8%"></colgroup><tr><th align="left" style="color:'+labelColor+'!important;overflow-wrap:anywhere">Description</th><th style="color:'+labelColor+'!important">Qty</th><th style="color:'+labelColor+'!important">Unit</th><th style="color:'+labelColor+'!important">Line total</th><th></th></tr>'+
    lines.map(function(l,i){return '<tr><td><input data-i="'+i+'" data-k="description" value="'+esc(l.description)+'" style="'+fieldStyle+';min-width:0"></td><td><input data-i="'+i+'" data-k="qty" type="number" min="0.01" step="any" value="'+esc(l.qty)+'" style="'+fieldStyle+';min-width:0"></td><td><input data-i="'+i+'" data-k="unit_price" type="number" min="0" step="any" value="'+esc(l.unit_price==null?'':l.unit_price)+'" style="'+fieldStyle+';min-width:0"></td><td><input data-i="'+i+'" data-k="line_total" type="number" min="0" step="0.01" value="'+esc(l.line_total)+'" style="'+fieldStyle+';min-width:0"></td><td><button type="button" data-del="'+i+'" style="color:'+inkColor+'!important;background:'+panelColor+'!important;border:1px solid '+lineColor+'!important">×</button></td></tr>'}).join('')+
    '</table></div><button type="button" data-add="1" style="margin-top:8px;padding:8px 12px;border:2px solid #0b1b4a!important;border-radius:9px;background:#ffffff!important;color:#0b1b4a!important;-webkit-text-fill-color:#0b1b4a!important">+ Add row</button>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;font-size:13px"><label style="'+labelStyle+'">Document total<input data-total="1" type="number" min="0" step="0.01" value="'+esc(f.total==null?'':f.total)+'" style="'+fieldStyle+'"></label><div><b style="color:'+inkColor+'!important">Total from rows: '+esc(total.toLocaleString())+'</b></div></div>'+
    warnings.map(function(w){return '<div style="color:#b45309;font-size:12px;margin-top:4px">'+esc(w)+'</div>'}).join('')+
    (result.warnings||[]).map(function(w){return '<div style="color:#64748b;font-size:12px;margin-top:4px">'+esc(w)+'</div>'}).join('')+
    '<button type="button" data-ok="1" style="margin-top:10px;width:100%;padding:10px;border:2px solid #ffffff;border-radius:999px;background:#0b1b4a;color:#ffffff;-webkit-text-fill-color:#ffffff">'+(result.testOnly?'Finish test review':'Confirm review')+'</button></div>';
   container.querySelectorAll('[data-f]').forEach(function(el){el.oninput=function(){f[el.getAttribute('data-f')]=el.value}});
   container.querySelectorAll('[data-total]').forEach(function(el){el.oninput=function(){f.total=el.value===''?null:Number(el.value)}});
   container.querySelectorAll('[data-i]').forEach(function(el){el.oninput=function(){var i=Number(el.getAttribute('data-i')),k=el.getAttribute('data-k');lines[i][k]=k==='description'?el.value:(el.value===''?null:Number(el.value))}});
   container.querySelectorAll('[data-del]').forEach(function(el){el.onclick=function(){lines.splice(Number(el.getAttribute('data-del')),1);draw()}});
   var add=container.querySelector('[data-add]');if(add)add.onclick=function(){lines.push({description:'',qty:1,unit_price:null,line_total:0});draw()};
   var ok=container.querySelector('[data-ok]');if(ok)ok.onclick=function(){
    var clean=lines.filter(function(l){return String(l.description||'').trim()&&Number(l.qty)>0&&Number(l.line_total)>0});
    var sum=clean.reduce(function(a,l){return a+Number(l.line_total)},0);
    if(!clean.length){warnings=['Add at least one valid line item before confirming.'];draw();return}
    if(f.total!=null&&Math.abs(sum-Number(f.total))>0.5){var proceed=container.ownerDocument.defaultView.confirm('The line items do not match the document total. Continue to the next review anyway?');if(!proceed)return}
    if(typeof onConfirm==='function')onConfirm({fields:f,lines:clean,total_from_lines:sum});
   };
  }
  draw();
 }
 var api={groupRows:groupRows,readLines:readLines,readFields:readFields,structure:structure,review:review};
 if(typeof window!=='undefined')window.pxStructure=api;
 if(typeof module!=='undefined')module.exports=api;
})();