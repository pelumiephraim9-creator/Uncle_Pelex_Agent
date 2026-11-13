/* PELEX INVOICE AND RECEIPT TEMPLATES
   Twelve common kinds of invoice, receipt and slip. The system reads the text, works out which kind it is,
   and reads its number, date, lines and totals with that kind's rules. The owner always confirms before saving. */
var PX_DOC_TEMPLATES = [
 {id:'tax_invoice', name:'Tax (VAT) invoice', direction:'unknown', category:'Sales and income',
  words:[/tax\s+invoice/i,/vat\s*(no|number|reg)/i,/vat\s*\d/i], total:/(grand\s*total|total\s*(incl|inc|due|payable)|amount\s*due|total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$|USD)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
  sub:/(sub\s*total|total\s*excl\w*|net\s*amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i, tax:/(vat|tax)\s*(\d{1,2}%)?\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'commercial_invoice', name:'Commercial (export) invoice', direction:'unknown', category:'Goods bought',
  words:[/commercial\s+invoice/i,/hs\s*code/i,/country\s+of\s+origin/i,/incoterm/i], total:/(total\s*(value|amount)|invoice\s*value|total)\s*[:\-]?\s*(?:USD|\$|EUR|GBP|NGN|N)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'proforma', name:'Proforma invoice (estimate, not yet paid)', direction:'unknown', category:'Sales and income', draft:true,
  words:[/pro\s*-?\s*forma/i,/not\s+a\s+tax\s+invoice/i,/valid\s+until/i], total:/(total|grand\s*total|estimate)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'simplified_invoice', name:'Simplified or cash invoice', direction:'unknown', category:'Sales and income',
  words:[/simplified\s+invoice/i,/\bcash\s+(sale|invoice)\b/i,/\binvoice\b/i], total:/(total|amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'till_receipt', name:'Till or POS receipt', direction:'unknown', category:'Other',
  words:[/\breceipt\b/i,/thank\s*you/i,/\bcashier\b/i,/\btill\b|\bpos\b/i,/\bchange\b/i], total:/(total|amount\s*paid|grand\s*total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'supplier_invoice', name:'Supplier or purchase invoice (goods bought)', direction:'unknown', category:'Goods bought',
  words:[/supplier/i,/bill\s+from/i,/purchase\s+(order|invoice)|\bpo\s*(no|number)/i,/delivered\s+to|delivery/i], total:/(total|amount\s*due|grand\s*total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'utility_bill', name:'Utility or service bill', direction:'out', category:'Rent and utilities',
  words:[/electricity|power\s+supply|disco\b/i,/water\s+(bill|supply)/i,/internet|data\s+plan|airtime/i,/account\s*(no|number)|meter\s*(no|number)/i,/bill\s+for|billing\s+period/i], total:/(amount\s*(due|payable)|total|bill\s*amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'fuel_receipt', name:'Fuel or transport receipt', direction:'out', category:'Transport and fuel',
  words:[/\blit(re|er)s?\b|\bltr\b|\bl\b\s*@/i,/petrol|diesel|\bpms\b|\bago\b|fuel|pump/i,/\bpump\s*(no|price)\b/i], total:/(total|amount)\s*[:\-]?\s*(?:NGN|N|\u20a6)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'credit_note', name:'Credit note or refund', direction:'unknown', category:'Other',
  words:[/credit\s+note/i,/\brefund\b/i,/\breturn(ed)?\s+goods\b/i], total:/(total|credit\s*amount|refund\s*amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'bank_transfer', name:'Bank transfer receipt', direction:'unknown', category:'Sales and income',
  words:[/transfer/i,/beneficiary|sender|narration/i,/transaction\s*(ref|reference|id)/i,/\bdebit\b|\bcredit\b/i], total:/(amount|transfer\s*amount|total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'delivery_note', name:'Delivery note or waybill', direction:'unknown', category:'Goods bought', draft:true,
  words:[/delivery\s+note/i,/waybill/i,/dispatch/i,/received\s+by/i], total:/(total|quantity\s*total)\s*[:\-]?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'general_document', name:'General document (check the total)', direction:'unknown', category:'Other',
  words:[], total:/(total|amount|grand\s*total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i}
];

function pxNum(v){ var n=parseFloat(String(v||'').replace(/[,\s]/g,'')); return isNaN(n)?0:n }
function pxDateFrom(text){
  var m=/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/.exec(text) ; if(m) return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  m=/\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text); if(m) return m[0];
  return null;
}
function pxNumberFrom(text){
  var pref=/(invoice|receipt|credit\s*note|bill|order)\s*(no\.?|number|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i.exec(text);
  if(pref && /\d/.test(pref[3])) return pref[3];
  var re=/(invoice|receipt|bill|credit\s*note|ref(erence)?|no\.?|number)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/gi, m;
  while((m=re.exec(text))){ var v=m[m.length-1]; if(/\d/.test(v)) return v; }
  return null;
}
// the final total: the largest amount on a line labelled as a total, skipping subtotal, VAT, cash and change lines
function pxTotalFrom(text){
  var best=0;
  String(text||'').split(/\r?\n/).forEach(function(l){
    if(/sub\s*-?total|excl|\bvat\b|\btax\b|\bchange\b|\bcash\b|\bbalance\b/i.test(l)) return;
    if(/(grand\s*total|\btotal\b|amount\s*(due|paid|payable)|balance\s*due|transfer\s*amount|\bamount\b)/i.test(l)){
      var nums=l.match(/[0-9][0-9,]*(?:\.\d{1,2})?/g);
      if(nums){ var v=pxNum(nums[nums.length-1]); if(v>best) best=v; }
    }
  });
  if(!best){
    var all=(String(text||'').match(/[0-9]{1,3}(?:,[0-9]{3})+(?:\.\d{1,2})?|[0-9]+\.\d{2}|[0-9]{4,}/g)||[]).map(pxNum);
    best=all.length?Math.max.apply(null,all):0;
  }
  return best;
}
// pick the template with the most matching words; general is the fallback
function pxDetectTemplate(text){
  var best=null,score=-1;
  PX_DOC_TEMPLATES.forEach(function(t){
    if(t.id==='general_document')return;
    var s=t.words.reduce(function(a,re){return a+(re.test(text)?1:0)},0);
    if(s>score){score=s;best=t}
  });
  if(!best||score<1) return PX_DOC_TEMPLATES[PX_DOC_TEMPLATES.length-1];
  return best;
}
// line items: a description followed by numbers; the last number on the line is the line total
function pxLines(text){
  var out=[];
  String(text||'').split(/\r?\n/).forEach(function(raw){
    var l=raw.replace(/\s+/g,' ').trim(); if(l.length<4) return;
    if(/(total|subtotal|vat|tax|amount due|balance|date|invoice no|receipt no|tel|phone|email|address)/i.test(l)) return;
    var nums=l.match(/[0-9][0-9,]*(?:\.\d{1,2})?/g); if(!nums||nums.length<1) return;
    var last=pxNum(nums[nums.length-1]); if(last<=0) return;
    var desc=l.replace(/[0-9][0-9,]*(?:\.\d{1,2})?/g,' ').replace(/\s+/g,' ').replace(/[@xX\u20a6$]/g,' ').trim();
    if(desc.length<2) return;
    out.push({description:desc.slice(0,120), amount:last});
  });
  return out;
}
// read one document: its kind, number, date, totals and lines
function pxReadDocument(text){
  var t=pxDetectTemplate(text);
  var total=pxTotalFrom(text);
  var lines=pxLines(text);
  if(!total && lines.length) total=lines.reduce(function(a,x){return a+x.amount},0);
  return {template:t.id, templateName:t.name, direction:t.direction, category:t.category, draft:!!t.draft,
    number:pxNumberFrom(text), date:pxDateFrom(text), total:total, lines:lines};
}
if(typeof window!=='undefined') window.pxReadDocument=pxReadDocument;

/* run once the page is ready, even if the script arrives after the load event */
function pxReady(fn){ if(document.readyState==='complete') setTimeout(fn,0); else window.addEventListener('load',fn); }

/* SLIP CAPTURE: a small floating window (Chrome or Edge on a computer) where a PDF or picture slip is dropped,
   read, confirmed and saved to the business project's daily activity. Nothing is saved until you confirm. */
(function(){
 var pip=null;
 function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
 function wsId(){try{return localStorage.getItem('pelex_ws')||''}catch(e){return ''}}
 function todayISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
 // The amount on a slip: the value after "total" or "amount", otherwise the largest amount on the page.
 function findTotal(text){
  var t=String(text||'');
  var m=/(grand\s*total|total\s*amount|total|amount\s*paid|amount)\s*[:\-]?\s*(?:NGN|N|\u20a6)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i.exec(t);
  if(m){var v=parseFloat(m[2].replace(/[,\s]/g,''));if(v>0)return v}
  var all=(t.match(/[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{2}/g)||[]).map(function(x){return parseFloat(x.replace(/,/g,''))}).filter(function(x){return x>0});
  return all.length?Math.max.apply(null,all):0;
 }
 async function readPdf(file){
  if(!window.pdfjsLib)return {text:'',note:'PDF reader is not loaded on this page. Type the amount.'};
  var buf=await file.arrayBuffer();
  var doc=await window.pdfjsLib.getDocument({data:buf}).promise;
  var out='';
  for(var i=1;i<=Math.min(doc.numPages,5);i++){var pg=await doc.getPage(i);var c=await pg.getTextContent();out+=c.items.map(function(x){return x.str}).join(' ')+'\n'}
  return {text:out,note:''};
 }
 function build(doc,mount){
  var root=mount||doc.body;
  if(!mount){doc.body.innerHTML='';doc.body.style.cssText='margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;color:#0b1b4a;padding:12px;box-sizing:border-box'}
  root.innerHTML='';
  var box=doc.createElement('div');box.id='slipBox';box.style.cssText='font-family:Arial,Helvetica,sans-serif;color:#0b1b4a;max-width:100%;overflow:auto';
  box.innerHTML=
   '<div style="font-weight:700;margin-bottom:8px">Capture a slip</div>'+
   '<label id="slipDrop" style="position:relative;display:block;border:2px dashed #94a3b8;border-radius:12px;padding:18px 14px;text-align:center;font-size:13px;background:#fff;cursor:pointer;overflow:hidden">Choose a PDF or picture · Tap here'+
   '<input id="slipFile" type="file" accept="application/pdf,image/*,.heic,.heif" aria-label="Choose a PDF or picture" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.01;cursor:pointer">'+
   '</label>'+
   '<div id="slipForm" style="margin-top:10px"></div><div id="slipMsg" role="status" aria-live="polite" style="font-size:12px;margin-top:8px;color:#5d6980"></div>';
  root.appendChild(box);
  var drop=box.querySelector('#slipDrop'),input=box.querySelector('#slipFile');
  drop.ondragover=function(e){e.preventDefault()};
  drop.ondrop=function(e){e.preventDefault();if(e.dataTransfer&&e.dataTransfer.files[0])handle(doc,e.dataTransfer.files[0]).catch(function(err){var m=box.querySelector('#slipMsg');if(m)m.textContent='Could not read this file: '+(err&&err.message||'Please try another file.');});};
  input.onchange=function(){if(input.files&&input.files[0])handle(doc,input.files[0]).catch(function(e){var m=box.querySelector('#slipMsg');if(m)m.textContent='Could not read this file: '+(e&&e.message||'Please try another file.');});};
 }
 function slipDate(value){
  if(!value)return '';
  var s=String(value).trim(),m=/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/.exec(s);
  if(m){var months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12},n=months[m[2].slice(0,3).toLowerCase()];if(n)return m[3]+'-'+String(n).padStart(2,'0')+'-'+String(Number(m[1])).padStart(2,'0')}
  m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
  if(m)return m[3]+'-'+String(Number(m[2])).padStart(2,'0')+'-'+String(Number(m[1])).padStart(2,'0');
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
 }
 async function handle(doc,file){
  var msg=doc.getElementById('slipMsg');msg.textContent='Reading '+file.name+'…';
  var isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||''),isImage=/^image\//i.test(file.type)||/\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name||'');
  if((isPdf||isImage)&&typeof window.pxReadFileStructured==='function'&&window.pxStructure){
   var structured=await window.pxReadFileStructured(file);
   if(structured.kind==='error'||structured.kind==='unsupported'){msg.textContent=(structured.warnings||['Could not read this file.']).join(' ');return}
   var host=doc.getElementById('slipForm'),fields=structured.fields||{};
   if(structured.testOnly){
    structured.testOnly=true;
    window.pxStructure.review(host,structured,function(confirmed){
     var f=confirmed.fields||{},count=confirmed.lines.length;
     host.innerHTML='<div style="font-weight:700;color:#92400e">Test review completed</div><div style="font-size:13px;margin-top:6px">Reviewed '+count+' editable line item(s). This synthetic sample was not saved to the ledger.</div><div style="font-size:13px;margin-top:6px">Reference: '+esc(f.reference||'Not detected')+' · Date: '+esc(f.date||'Not detected')+' · Total: '+esc(f.total==null?'Not entered':Number(f.total).toLocaleString())+' · Payment: '+esc(f.payment_method||'Not detected')+'</div><button type="button" data-px-test-again style="margin-top:8px;padding:8px 12px">Edit again</button>';
     host.querySelector('[data-px-test-again]').onclick=function(){window.pxStructure.review(host,structured,function(){msg.textContent='Test review completed. Nothing was saved.'})};
     msg.textContent='Test review completed. Nothing was saved or imported.';
    });
    msg.textContent='Synthetic test sample detected. Review and edit the extracted fields; nothing can be saved.';
    return;
   }
   if(!structured.lines.length){
    form(doc,{amount:fields.total==null?'':fields.total,date:slipDate(fields.date)||todayISO(),party:(fields.reference?fields.reference+' ':'')+file.name.replace(/\.[^.]+$/,'').slice(0,50),file:file.name,doc:{template:fields.type||structured.kind,templateName:fields.type||'Document',direction:'unknown',category:'Other',number:fields.reference,date:slipDate(fields.date),total:fields.total||0,lines:[]}},(structured.warnings||[]).join(' ')||'No line items were detected. Check the document total and classify the transaction before saving.');
    return;
   }
   window.pxStructure.review(host,structured,function(confirmed){
    var f=confirmed.fields||{},d={template:f.type||structured.kind,templateName:f.type||'Document',direction:'unknown',category:'Other',number:f.reference||null,date:slipDate(f.date),total:f.total==null?confirmed.total_from_lines:Number(f.total),lines:confirmed.lines.map(function(x){return {description:x.description,amount:Number(x.line_total),qty:Number(x.qty)||1,unit_price:x.unit_price}})};
    form(doc,{amount:d.total||'',date:d.date||todayISO(),party:(d.number?d.number+' ':'')+file.name.replace(/\.[^.]+$/,'').slice(0,50),file:file.name,doc:d},'Structural review complete. Choose the accounting direction and category, then confirm Save. Nothing has been saved yet.');
   });
   return;
  }
  // Compatibility path for non-structured file types and older reader callers.
  var text='',note='';
  try{if(isPdf){var old=await readPdf(file);text=old.text;note=old.note}else note='This file type uses the existing reader. Check the amount before saving.'}
  catch(e){note='Could not read the file here. Type the amount.'}
  var d=window.pxReadDocument?window.pxReadDocument(text):{total:0,lines:[],template:'general_document',templateName:'General document',direction:'unknown',category:'Other',number:null,date:null};
  form(doc,{amount:d.total||'',date:d.date||todayISO(),party:(d.number?d.number+' ':'')+file.name.replace(/\.[^.]+$/,'').slice(0,50),file:file.name,doc:d},note);
 }
 function form(doc,v,note){
  var f=doc.getElementById('slipForm'); var d=v.doc||{}; var lines=d.lines||[];
  var cats='<option>Goods bought</option><option>Staff pay</option><option>Upkeep and maintenance</option><option>Rent and utilities</option><option>Transport and fuel</option><option>Sales and income</option><option>Loan given</option><option>Loan repayment</option><option>Other</option>';
  var kindLabel=d.templateName?('<div class="dnote" style="margin-bottom:6px"><b>Detected:</b> '+esc(d.templateName)+(d.draft?' <span style="color:#b91c1c">(estimate, not final money)</span>':'')+'</div>'):'';
  var linesHtml=lines.length?('<div class="dnote" style="margin-top:6px"><b>Lines found</b> (untick a line to leave it out)</div>'+lines.map(function(x,i){
    return '<div class="irow" style="display:flex;gap:6px;align-items:center;font-size:12px"><input type="checkbox" class="slLine" data-i="'+i+'" checked><span style="flex:1">'+esc(x.description)+'</span><span>'+esc(x.amount)+'</span></div>'+
     '<select class="slLineCat" data-i="'+i+'" style="width:100%;padding:4px;margin:2px 0 6px;font-size:12px">'+cats.replace('<option>'+esc(d.category||'Other')+'</option>','<option selected>'+esc(d.category||'Other')+'</option>')+'</select>';
  }).join('')):'';
  f.innerHTML=kindLabel+
   '<label style="font-size:12px">Type<select id="slType" style="width:100%;padding:6px;margin:2px 0 8px">'+(d.direction==='unknown'?'<option value="" selected disabled>Choose transaction direction</option>':'')+'<option value="receipt"'+(d.direction==='in'?' selected':'')+'>Money in</option><option value="expense"'+(d.direction==='out'?' selected':'')+'>Money out</option><option value="loan">Loan given</option></select></label>'+
   '<label style="font-size:12px">Total<input id="slAmount" type="number" min="0" step="0.01" value="'+esc(v.amount||'')+'" style="width:100%;padding:6px;margin:2px 0 8px"></label>'+
   '<label style="font-size:12px">Date<input id="slDate" type="date" value="'+esc(v.date)+'" style="width:100%;padding:6px;margin:2px 0 8px"></label>'+
   '<label style="font-size:12px">Party or description<input id="slParty" type="text" value="'+esc(v.party)+'" style="width:100%;padding:6px;margin:2px 0 8px"></label>'+
   linesHtml+
   (lines.length?'':'<label style="font-size:12px">What it was for<select id="slCat" style="width:100%;padding:6px;margin:2px 0 8px">'+cats+'</select></label>')+
   '<div style="display:flex;gap:8px;margin-top:6px"><button id="slSave" type="button" style="flex:1;padding:8px;border:0;border-radius:999px;background:#0b1b4a;color:#fff">Save</button><button id="slCancel" type="button" style="padding:8px;border:1px solid #cbd5e1;border-radius:999px;background:#fff">Cancel</button></div>';
  doc.getElementById('slipMsg').textContent=note||('Read '+file.name+'. Check the lines and the total, then save.');
  doc.getElementById('slCancel').onclick=function(){f.innerHTML='';doc.getElementById('slipMsg').textContent=''};
  doc.getElementById('slSave').onclick=function(){save(doc,lines)};
 }
 async function save(doc,lines){
  var msg=doc.getElementById('slipMsg');
  var type=doc.getElementById('slType').value;
  var date=doc.getElementById('slDate').value;
  if(type!=='receipt'&&type!=='expense'){msg.textContent='Please confirm whether this document records money in or money out.';return}
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date+'T00:00:00'))){msg.textContent='Please enter a valid transaction date.';return}
  var party=doc.getElementById('slParty').value;
  var rows=[];
  if(lines&&lines.length){
    doc.querySelectorAll('.slLine').forEach(function(cb){
      if(!cb.checked)return;
      var i=Number(cb.getAttribute('data-i'));
      var cat=(doc.querySelector('.slLineCat[data-i="'+i+'"]')||{}).value||null;
      rows.push({amount:lines[i].amount,party:(party?party+' \u00b7 ':'')+lines[i].description,category:cat});
    });
  }else{
    var amount=parseFloat(doc.getElementById('slAmount').value);
    var cat2=(doc.getElementById('slCat')||{}).value||null;
    rows.push({amount:amount,party:party,category:cat2});
  }
  if(!rows.length){msg.textContent='Nothing ticked to save.';return}
  var bad=rows.filter(function(x){return !(x.amount>0)});
  if(bad.length){msg.textContent='Every saved line needs an amount above zero.';return}
  var projectId='';try{projectId=localStorage.getItem('px_project_'+wsId())||''}catch(e){}
  if(!projectId||projectId==='all'){msg.textContent='Select a business project before saving this slip.';return}
  var done=0,currency='NGN';try{var project=await window.sb.from('business_projects').select('id,currency').eq('id',projectId).eq('workspace_id',wsId()).maybeSingle();if(project.error||!project.data){msg.textContent='The selected business project could not be verified. Refresh and select it again.';return}currency=project.data.currency||currency}catch(e){msg.textContent='Could not verify the selected project: '+(e.message||e);return}
  for(var i=0;i<rows.length;i++){
    var r=await window.sb.rpc('add_slip',{p_workspace:wsId(),p_project:projectId,p_type:type,p_amount:rows[i].amount,p_date:date,p_party:rows[i].party,p_currency:currency,p_category:rows[i].category});
    if(r.error){msg.textContent='Saved '+done+' of '+rows.length+'. Not saved: '+r.error.message;return}
    done++;
  }
  msg.textContent='Saved '+done+' line'+(done===1?'':'s')+'. Each is linked to your project and to its day in Data entry.';
  doc.getElementById('slipForm').innerHTML='';
  if(window.__lsLoad)window.__lsLoad();
 }
 function openInlineCapture(){
  var existing=document.getElementById('pxSlipModal');if(existing){existing.hidden=false;return}
  var modal=document.createElement('div');modal.id='pxSlipModal';modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(10,20,40,.55);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box';
  modal.innerHTML='<div class="px-slip-card" style="width:min(520px,100%);max-height:92dvh;border-radius:16px;overflow:auto;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.25)"><div class="px-slip-header" style="position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--line);z-index:1"><b>Capture a slip</b><button type="button" id="pxSlipClose" class="px-slip-close" style="border:0;border-radius:8px;padding:8px 12px">Close</button></div><div id="pxSlipInlineBody" class="px-slip-body" style="padding:12px;overflow:auto"></div></div>';
  document.body.appendChild(modal);build(document,modal.querySelector('#pxSlipInlineBody'));
  modal.querySelector('#pxSlipClose').onclick=function(){modal.remove()};modal.addEventListener('click',function(e){if(e.target===modal)modal.remove()});
 }
 window.pxOpenSlipCapture=async function(){
  if(pip){try{pip.focus();return}catch(e){pip=null}}
  if('documentPictureInPicture' in window){try{pip=await documentPictureInPicture.requestWindow({width:360,height:620});build(pip.document);pip.addEventListener('pagehide',function(){pip=null});return}catch(e){/* use the in-page fallback */}}
  openInlineCapture();
 };
 window.pxBuildSlipUI=build;
 document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('#pxSlipOpen');
  if(b)window.pxOpenSlipCapture();
 });
 pxReady(function(){
  var w=setInterval(function(){
   var host=document.getElementById('lsWrap');
   if(host&&!document.getElementById('pxSlipOpen')){var bt=document.createElement('button');bt.id='pxSlipOpen';bt.type='button';bt.className='btn';bt.textContent='Capture a slip';bt.style.margin='8px 0';host.insertBefore(bt,host.firstChild);clearInterval(w)}
  },1000);
  setTimeout(function(){clearInterval(w)},30000);
 });
})();


/* BUSINESSES, ACTIVITY, KNOWLEDGE AND APPROVALS
   One owner can run several businesses. Each has its own team, setup, projects, records and knowledge base.
   Switching business shows that business only; a new business starts empty until its setup is saved. */
(function(){
 function $(i){return document.getElementById(i)}
 function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
 function wsId(){try{return localStorage.getItem('pelex_ws')||''}catch(e){return ''}}
 function setWs(id){try{localStorage.setItem('pelex_ws',id)}catch(e){}}
 var TYPES=[];
 function projectId(){try{return localStorage.getItem('px_project_'+wsId())||''}catch(e){return ''}}
 function hostCard(){
  var cards=document.querySelectorAll('#lsWrap .dcard');
  for(var i=0;i<cards.length;i++){var t=(cards[i].querySelector('h2')||{}).textContent||'';if(t==='Project management')return cards[i]}
  return null;
 }
 function section(card,id){
  var el=document.getElementById(id);
  if(!el){el=document.createElement('div');el.id=id;el.style.marginTop='12px';card.appendChild(el)}
  return el;
 }
 // ---- business switcher (top of Project management) ----
 async function switcher(){
  var card=hostCard(); if(!card||!window.sb)return;
  var box=section(card,'pxBusinesses');
  var r=await window.sb.rpc('list_my_businesses',{});
  var list=r.data||[];
  var cur=wsId();
  if(!list.length){box.innerHTML='<div class="muted dnote">No businesses yet.</div>';return}
  box.innerHTML='<div class="dnote"><b>Your businesses</b></div>'+
   '<select id="pxBizSel" style="width:100%;padding:8px;margin:6px 0">'+list.map(function(b){return '<option value="'+esc(b.id)+'"'+(b.id===cur?' selected':'')+'>'+esc(b.name)+' \u00b7 '+esc(b.business_type)+'</option>'}).join('')+'</select>'+
   '<button type="button" id="pxBizNew" class="btn alt" style="margin-right:6px">New business</button>'+

   '<button type="button" id="pxKnow" class="btn alt" style="margin-right:6px">Knowledge base</button>'+
   '<button type="button" id="pxApprovals" class="btn alt">Approvals</button>'+
   '<div id="pxBizPanel"></div>';
 }
 document.addEventListener('change',function(e){
  if(e.target&&e.target.id==='pxBizSel'){setWs(e.target.value);location.reload()}
 });
 document.addEventListener('click',async function(e){
  var t=e.target;
  if(t.id==='pxBizNew'){showNewBusinessForm();return}
  if(t.id==='pxBizCancel'){var form=$('pxBizCreateForm');if(form)form.remove();return}
  if(t.id==='pxBizCreateSubmit'){
   e.preventDefault();
   var name=$('pxBizName').value.trim(),kind=$('pxBizType').value,cur=$('pxBizCurrency').value.trim().toUpperCase()||'NGN';
   if(!name){$('pxBizCreateMsg').textContent='Enter a business name.';return}
   t.disabled=true;$('pxBizCreateMsg').textContent='Creating business…';
   var r=await window.sb.rpc('create_business',{p_name:name,p_business_type:kind,p_currency:cur});
   if(r.error){$('pxBizCreateMsg').textContent='Could not create the business: '+r.error.message;t.disabled=false;return}
   setWs(r.data);location.reload();
  }
  if(t.id==='pxKnow')knowledge();
  if(t.id==='pxApprovals')approvals();
 });
 async function showNewBusinessForm(){
  var p=$('pxBizPanel');if(!p)return;
  var typeRows=await window.sb.from('business_types').select('code,name').order('sort_order',{ascending:true});
  if(typeRows.error||!Array.isArray(typeRows.data)||!typeRows.data.length){p.innerHTML='<div class="muted dnote">Business types could not be loaded. Please retry.</div>';return}
  TYPES=typeRows.data.map(function(x){return [x.code,x.name]});
  p.innerHTML='<div id="pxBizCreateForm" class="an-card" style="margin-top:8px"><b>Create a business</b><label class="dnote" style="display:block;margin-top:8px">Business name<input id="pxBizName" type="text" maxlength="100" placeholder="Enter business name" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:4px"></label><label class="dnote" style="display:block;margin-top:8px">Business type<select id="pxBizType" style="display:block;width:100%;padding:10px;margin-top:4px">'+TYPES.map(function(x){return '<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>'}).join('')+'</select></label><label class="dnote" style="display:block;margin-top:8px">Currency<input id="pxBizCurrency" type="text" maxlength="5" value="NGN" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:4px"></label><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button id="pxBizCreateSubmit" type="button" class="btn">Create business</button><button id="pxBizCancel" type="button" class="btn alt">Cancel</button></div><div id="pxBizCreateMsg" class="muted dnote" role="status" style="margin-top:8px"></div></div>';
 }
var editingKnowledgeId=null;
 async function knowledge(){
  var p=$('pxBizPanel');editingKnowledgeId=null;
  if(!projectId()){p.innerHTML='<div class="muted dnote">Select a business project before editing its knowledge base.</div>';return}
  var kinds=['product','service','price','policy','faq','hours','delivery','refund','other'];
  p.innerHTML='<div class="an-card" style="margin-top:8px"><b>Knowledge base</b><div class="muted dnote">Keep business facts and customer-service reference information here. Agent-side retrieval must be connected separately.</div>'+
   '<select id="kbKind" style="width:100%;padding:6px;margin:6px 0">'+kinds.map(function(k){return '<option>'+k+'</option>'}).join('')+'</select>'+
   '<input id="kbTitle" placeholder="Title, for example Rice 5kg" style="width:100%;padding:6px;margin-bottom:6px">'+
   '<textarea id="kbBody" placeholder="Details, price or policy" style="width:100%;padding:6px;min-height:70px"></textarea>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="kbSave" class="btn" style="margin-top:6px">Save entry</button><button type="button" id="kbStopEdit" class="btn alt" style="margin-top:6px" hidden>Cancel edit</button></div><div id="kbList"></div><div id="kbMsg" class="muted dnote"></div></div>';
  $('kbSave').onclick=saveKnowledge;$('kbStopEdit').onclick=resetKnowledgeForm;loadKb();
 }
 function resetKnowledgeForm(){
  editingKnowledgeId=null;$('kbKind').value='product';$('kbTitle').value='';$('kbBody').value='';
  $('kbSave').textContent='Save entry';$('kbStopEdit').hidden=true;
 }
 async function saveKnowledge(){
  var title=$('kbTitle').value.trim(),body=$('kbBody').value.trim();
  if(!title||!body){$('kbMsg').textContent='Enter a title and details.';return}
  var payload={kind:$('kbKind').value,title:title,body:body,project_id:projectId()};
  var r=editingKnowledgeId
   ?await window.sb.from('business_knowledge').update(payload).eq('id',editingKnowledgeId).eq('workspace_id',wsId()).eq('project_id',projectId())
   :await window.sb.from('business_knowledge').insert(Object.assign({workspace_id:wsId()},payload));
  $('kbMsg').textContent=r.error?('Not saved: '+r.error.message):(editingKnowledgeId?'Changes saved.':'Entry saved.');
  if(!r.error){resetKnowledgeForm();loadKb()}
 }
 async function loadKb(){
  var r=await window.sb.from('business_knowledge').select('id,kind,title,body').eq('workspace_id',wsId()).eq('project_id',projectId()).order('updated_at',{ascending:false});
  var l=$('kbList');if(!l)return;
  if(r.error){l.innerHTML='<div class="muted dnote">Could not load saved knowledge: '+esc(r.error.message)+'</div>';return}
  var rows=r.data||[];
  l.innerHTML=rows.map(function(x){return '<div class="irow" style="font-size:13px;margin-top:6px"><b>'+esc(x.title)+'</b> <span class="muted">'+esc(x.kind)+'</span><br>'+esc(x.body)+'<div style="display:flex;gap:6px;margin-top:5px"><button type="button" class="btn alt" data-kb-edit="'+esc(x.id)+'">Edit</button><button type="button" class="btn alt" data-kb-delete="'+esc(x.id)+'">Delete</button></div></div>'}).join('')||'<div class="muted dnote">Nothing written yet.</div>';
 }
 async function approvals(){
  var p=$('pxBizPanel');
  if(!projectId()){p.innerHTML='<div class="muted dnote">Select a business project to review its pending actions.</div>';return}
  var r=await window.sb.from('agent_actions').select('id,level,action,payload,status,created_at').eq('workspace_id',wsId()).eq('project_id',projectId()).eq('status','pending').order('created_at',{ascending:true});
  if(r.error){p.innerHTML='<div class="an-card muted">Could not load approvals: '+esc(r.error.message)+'</div>';return}
  var rows=r.data||[];
  p.innerHTML='<div class="an-card" style="margin-top:8px"><b>Waiting for your approval</b>'+(rows.length?rows.map(function(x){
    var detail=typeof x.payload==='string'?x.payload:JSON.stringify(x.payload||{},null,2);
    return '<div class="irow" style="font-size:13px;margin-top:6px"><b>Level '+esc(x.level)+'</b> · '+esc(x.action)+'<br><small class="muted">'+esc(new Date(x.created_at).toLocaleString())+'</small><details style="margin-top:7px"><summary style="cursor:pointer">Review action details</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto;font-size:12px;padding:8px;background:rgba(127,127,127,.08);border-radius:6px">'+esc(detail)+'</pre></details><div style="display:flex;gap:6px;margin-top:8px"><button type="button" class="btn" data-decide="'+esc(x.id)+'" data-ok="1">Approve</button><button type="button" class="btn alt" data-decide="'+esc(x.id)+'" data-ok="0">Reject</button></div></div>'
   }).join(''):'<div class="muted dnote">Nothing waiting.</div>')+'</div>';
 }
 document.addEventListener('click',async function(e){
  var edit=e.target.closest&&e.target.closest('[data-kb-edit]');
  if(edit){
   var er=await window.sb.from('business_knowledge').select('id,kind,title,body').eq('id',edit.getAttribute('data-kb-edit')).eq('workspace_id',wsId()).eq('project_id',projectId()).maybeSingle();
   if(er.error||!er.data){$('kbMsg').textContent='Could not open entry: '+(er.error?er.error.message:'Entry not found.');return}
   editingKnowledgeId=er.data.id;$('kbKind').value=er.data.kind;$('kbTitle').value=er.data.title;$('kbBody').value=er.data.body;$('kbSave').textContent='Save changes';$('kbStopEdit').hidden=false;return;
  }
  var del=e.target.closest&&e.target.closest('[data-kb-delete]');
  if(del){
   if(!confirm('Delete this knowledge entry?'))return;
   del.disabled=true;
   var dr=await window.sb.from('business_knowledge').delete().eq('id',del.getAttribute('data-kb-delete')).eq('workspace_id',wsId()).eq('project_id',projectId());
   $('kbMsg').textContent=dr.error?'Could not delete: '+dr.error.message:'Entry deleted.';
   if(!dr.error){if(String(editingKnowledgeId)===String(del.getAttribute('data-kb-delete')))resetKnowledgeForm();loadKb()}else del.disabled=false;
   return;
  }
  var b=e.target.closest&&e.target.closest('[data-decide]');if(!b)return;
  var actionButtons=document.querySelectorAll('[data-decide="'+b.getAttribute('data-decide')+'"]');
  actionButtons.forEach(function(x){x.disabled=true});
  try{
   var r=await window.sb.rpc('decide_agent_action',{p_id:Number(b.getAttribute('data-decide')),p_approve:b.getAttribute('data-ok')==='1'});
   if(r.error)throw r.error;
   await approvals();
  }catch(err){
   actionButtons.forEach(function(x){x.disabled=false});
   var panel=$('pxBizPanel');var msg=document.createElement('div');msg.className='muted dnote';msg.textContent='Decision was not saved: '+(err.message||err);panel.appendChild(msg);
  }
 });
 pxReady(function(){
  var w=setInterval(function(){ if(hostCard()&&!document.getElementById('pxBusinesses')){clearInterval(w);switcher()} },800);
  setTimeout(function(){clearInterval(w)},30000);
 });
})();


/* ENTRY MIX PIE: the old pie in Data visualization types is replaced with the startup balance pie. */
(function(){
 function esc(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
 function wsId(){try{return localStorage.getItem('pelex_ws')||''}catch(e){return ''}}
 function findTile(){
  var all=document.querySelectorAll('#lsWrap *');
  for(var i=0;i<all.length;i++){ if(all[i].childElementCount===0 && (all[i].textContent||'').trim()==='Entry mix'){
    var t=all[i]; while(t.parentElement && t.parentElement.innerText && t.parentElement.innerText.length<160 && t.parentElement.id!=='lsWrap') t=t.parentElement;
    return t; } }
  return null;
 }
 async function paint(){
  var tile=document.getElementById('pxPieTile')||findTile();if(!tile||!window.sb)return;
  var pid='';try{pid=localStorage.getItem('px_project_'+wsId())||''}catch(e){}
  if(!pid||pid==='all')return;
  var r=await window.sb.rpc('project_summary',{p_project:pid,p_month:null});if(r.error)return;
  var x=r.data||{},profit=Number(x.profit)||0,foundation=Number(x.foundation)||0,c=x.currency||'NGN';
  var part=foundation>0?Math.min(100,Math.round(Math.abs(profit)/foundation*100)):0,col=profit>=0?'#15803d':'#b91c1c';
  var ring='conic-gradient(#0b1b4a 0% '+(100-part)+'%, '+col+' '+(100-part)+'% 100%)';
  tile.id='pxPieTile';
  tile.innerHTML='<div style="display:flex;gap:14px;align-items:center;padding:8px;flex-wrap:wrap"><div style="width:110px;height:110px;border-radius:50%;background:'+ring+';flex:none;position:relative"><div style="position:absolute;inset:26px;border-radius:50%;background:var(--panel,#fff)"></div></div><div style="font-size:13px"><b>Startup balance</b><div>Foundation '+esc(Number(x.foundation||0).toLocaleString())+' '+esc(c)+'</div><div style="color:'+col+'">'+(profit>=0?'Profit':'Loss')+' so far '+esc(Math.abs(profit).toLocaleString())+'</div><div><b>Balance '+esc(Number(x.balance||0).toLocaleString())+' '+esc(c)+'</b></div></div></div>';
 } setInterval(paint,2500);
})();

