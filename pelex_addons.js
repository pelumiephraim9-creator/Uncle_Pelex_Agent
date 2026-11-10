/* PELEX INVOICE AND RECEIPT TEMPLATES
   Twelve common kinds of invoice, receipt and slip. The system reads the text, works out which kind it is,
   and reads its number, date, lines and totals with that kind's rules. The owner always confirms before saving. */
var PX_DOC_TEMPLATES = [
 {id:'tax_invoice', name:'Tax (VAT) invoice', direction:'out', category:'Sales and income',
  words:[/tax\s+invoice/i,/vat\s*(no|number|reg)/i,/vat\s*\d/i], total:/(grand\s*total|total\s*(incl|inc|due|payable)|amount\s*due|total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$|USD)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
  sub:/(sub\s*total|total\s*excl\w*|net\s*amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i, tax:/(vat|tax)\s*(\d{1,2}%)?\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'commercial_invoice', name:'Commercial (export) invoice', direction:'in', category:'Goods bought',
  words:[/commercial\s+invoice/i,/hs\s*code/i,/country\s+of\s+origin/i,/incoterm/i], total:/(total\s*(value|amount)|invoice\s*value|total)\s*[:\-]?\s*(?:USD|\$|EUR|GBP|NGN|N)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'proforma', name:'Proforma invoice (estimate, not yet paid)', direction:'out', category:'Sales and income', draft:true,
  words:[/pro\s*-?\s*forma/i,/not\s+a\s+tax\s+invoice/i,/valid\s+until/i], total:/(total|grand\s*total|estimate)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'simplified_invoice', name:'Simplified or cash invoice', direction:'out', category:'Sales and income',
  words:[/simplified\s+invoice/i,/\bcash\s+(sale|invoice)\b/i,/\binvoice\b/i], total:/(total|amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'till_receipt', name:'Till or POS receipt', direction:'out', category:'Other',
  words:[/\breceipt\b/i,/thank\s*you/i,/\bcashier\b/i,/\btill\b|\bpos\b/i,/\bchange\b/i], total:/(total|amount\s*paid|grand\s*total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'supplier_invoice', name:'Supplier or purchase invoice (goods bought)', direction:'out', category:'Goods bought',
  words:[/supplier/i,/bill\s+from/i,/purchase\s+(order|invoice)|\bpo\s*(no|number)/i,/delivered\s+to|delivery/i], total:/(total|amount\s*due|grand\s*total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'utility_bill', name:'Utility or service bill', direction:'out', category:'Rent and utilities',
  words:[/electricity|power\s+supply|disco\b/i,/water\s+(bill|supply)/i,/internet|data\s+plan|airtime/i,/account\s*(no|number)|meter\s*(no|number)/i,/bill\s+for|billing\s+period/i], total:/(amount\s*(due|payable)|total|bill\s*amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'fuel_receipt', name:'Fuel or transport receipt', direction:'out', category:'Transport and fuel',
  words:[/\blit(re|er)s?\b|\bltr\b|\bl\b\s*@/i,/petrol|diesel|\bpms\b|\bago\b|fuel|pump/i,/\bpump\s*(no|price)\b/i], total:/(total|amount)\s*[:\-]?\s*(?:NGN|N|\u20a6)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'credit_note', name:'Credit note or refund', direction:'in', category:'Other',
  words:[/credit\s+note/i,/\brefund\b/i,/\breturn(ed)?\s+goods\b/i], total:/(total|credit\s*amount|refund\s*amount)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'bank_transfer', name:'Bank transfer receipt', direction:'in', category:'Sales and income',
  words:[/transfer/i,/beneficiary|sender|narration/i,/transaction\s*(ref|reference|id)/i,/\bdebit\b|\bcredit\b/i], total:/(amount|transfer\s*amount|total)\s*[:\-]?\s*(?:NGN|N|\u20a6|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'delivery_note', name:'Delivery note or waybill', direction:'none', category:'Goods bought', draft:true,
  words:[/delivery\s+note/i,/waybill/i,/dispatch/i,/received\s+by/i], total:/(total|quantity\s*total)\s*[:\-]?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i},
 {id:'general_document', name:'General document (check the total)', direction:'out', category:'Other',
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
/* PELEX PROJECTS: each business setup is a project. Project management lists the projects; tapping one shows its summary.
   Daily activity stays in Data entry. Load this file after index.html's own scripts:  <script src="pelex_projects.js"></script> */
(function(){
 function $(i){return document.getElementById(i)}
 function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
 function wsId(){try{return localStorage.getItem('pelex_ws')||''}catch(e){return ''}}
 function money(n,cur){return (cur||'NGN')+' '+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0})}
 function projectsCard(){
  var cards=document.querySelectorAll('#lsWrap .dcard');
  for(var i=0;i<cards.length;i++){var t=(cards[i].querySelector('h2')||{}).textContent||'';if(t==='Project management')return cards[i]}
  return null;
 }
 async function summary(id,box,month){
  box.innerHTML='<div class="muted dnote">Loading project\u2026</div>';
  var r=await window.sb.rpc('project_summary',{p_project:id,p_month:month||null});
  if(r.error){box.innerHTML='<div class="muted dnote">Could not load this project: '+esc(r.error.message)+'</div>';return}
  var s=r.data||{},c=s.currency;
  var monthRes=await window.sb.rpc('project_months',{p_project:id});
  var list=(monthRes.data||[]);
  var pick='<select id="pxMonthPick" style="width:100%;padding:6px;margin:6px 0">'+
    (list.length?list.map(function(x){return '<option value="'+esc(x.month)+'"'+(x.month===s.month?' selected':'')+'>'+esc(x.month)+'</option>'}).join(''):'<option value="'+esc(s.month)+'" selected>'+esc(s.month)+'</option>')+'</select>';
  var pc=Number(s.profit)>=0?'#15803d':'#b91c1c', mc=Number(s.month_profit)>=0?'#15803d':'#b91c1c';
  box.innerHTML='<div class="an-card" style="margin-top:10px">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>'+esc(s.name)+' \u00b7 yearly</b><span class="muted dnote">'+esc(s.status==='gaining'?'Gaining':'Depreciating')+'</span></div>'+
   '<div class="dnote" style="margin-top:6px">Foundation (startup): <b>'+esc(money(s.foundation,c))+'</b></div>'+
   '<div class="dnote">Total money out so far: '+esc(money(s.total_out,c))+'</div>'+
   '<div class="dnote">Total money back in so far: '+esc(money(s.total_in,c))+'</div>'+
   '<div style="margin-top:6px"><b>Profit so far: <span style="color:'+pc+'">'+esc(money(s.profit,c))+'</span></b></div>'+
   '<div style="margin-top:6px;font-size:17px"><b>Balance: '+esc(money(s.balance,c))+'</b></div>'+
   '<div class="dnote" style="margin-top:6px">Customer savings held (not profit): '+esc(money(s.customer_savings_held,c))+'</div></div>'+
   '<div class="an-card" style="margin-top:10px"><b>Month</b>'+pick+
   '<div class="dnote" style="margin-top:6px">Startup for '+esc(s.month)+': <b>'+esc(money(s.opening_startup,c))+'</b></div>'+
   '<div class="dnote">Money out this month: '+esc(money(s.month_out,c))+'</div>'+
   '<div class="dnote">Money back in this month: '+esc(money(s.month_in,c))+'</div>'+
   '<div style="margin-top:6px"><b>This month: <span style="color:'+mc+'">'+esc(money(s.month_profit,c))+'</span></b></div>'+
   '<div style="margin-top:6px"><b>Balance after '+esc(s.month)+': '+esc(money(s.month_closing,c))+'</b></div>'+
   '<div id="pxBreakdown"></div></div><div id="pxMonths"></div>';
  var pk=document.getElementById('pxMonthPick');
  if(pk)pk.onchange=function(){summary(id,box,pk.value)};
  breakdown(id,s.month,c);
  months(id,c);
 }
 async function breakdown(id,m,cur){
  var box=document.getElementById('pxBreakdown'); if(!box)return;
  var r=await window.sb.rpc('project_month_breakdown',{p_project:id,p_month:m});
  var rows=r.data||[];
  if(!rows.length){box.innerHTML='<div class="muted dnote" style="margin-top:8px">Nothing recorded for this month yet.</div>';return}
  box.innerHTML='<div class="dnote" style="margin-top:8px"><b>Every item this month</b></div>'+rows.map(function(x){
    var col=x.dir_name==='in'?'#15803d':'#b91c1c', sign=x.dir_name==='in'?'+':'\u2212';
    return '<div class="irow" style="font-size:13px;display:flex;justify-content:space-between;gap:8px"><span>'+esc(x.cat_name)+' <small class="muted">('+esc(x.entries)+')</small></span><span style="color:'+col+'">'+sign+' '+esc(money(x.total_amount,cur))+'</span></div>';
  }).join('');
 }
 function selectedProjectId(){try{return localStorage.getItem('px_project_'+wsId())||''}catch(e){return ''}}
 function rememberProject(id){try{localStorage.setItem('px_project_'+wsId(),String(id||''))}catch(e){}}
 async function dashboardCard(){
  var wrap=document.getElementById('lsWrap');if(!wrap||!window.sb||!wsId())return;
  var cards=wrap.querySelectorAll('.dcard'),host=null;
  for(var i=0;i<cards.length;i++){var title=(cards[i].querySelector('h2')||{}).textContent||'';if(title==='Analysis'){host=cards[i];break}}
  if(!host)return;
  var box=document.getElementById('pxStartupBal');
  if(!box){box=document.createElement('div');box.id='pxStartupBal';box.style.margin='8px 0';host.insertBefore(box,host.firstChild.nextSibling||null)}
  if(box.getAttribute('data-loading')==='1')return;
  box.setAttribute('data-loading','1');
  try{
   var pr=await window.sb.from('business_projects').select('id,name').eq('workspace_id',wsId()).order('created_at',{ascending:true});
   if(pr.error)throw pr.error;
   var list=pr.data||[];
   if(!list.length){box.innerHTML='<div class="an-card">No business projects are available yet.</div>';return}
   var pid=selectedProjectId();if(!list.some(function(p){return String(p.id)===String(pid)})){pid=String(list[0].id);rememberProject(pid)}
   var r=await window.sb.rpc('project_summary',{p_project:pid,p_month:null});if(r.error)throw r.error;
   var x=r.data||{},profit=Number(x.profit)||0,foundation=Number(x.foundation)||0;
   var part=foundation>0?Math.min(100,Math.round(Math.abs(profit)/foundation*100)):0,col=profit>=0?'#15803d':'#b91c1c';
   var ring='conic-gradient(#0b1b4a 0% '+(100-part)+'%, '+col+' '+(100-part)+'% 100%)';
   box.innerHTML='<div class="an-card"><label class="dnote" for="pxStartupProject"><b>Startup balance · select project</b></label><select id="pxStartupProject" style="width:100%;padding:8px;margin:6px 0">'+list.map(function(p){return '<option value="'+esc(p.id)+'"'+(String(p.id)===pid?' selected':'')+'>'+esc(p.name)+'</option>'}).join('')+'</select><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div aria-label="Profit relative to startup capital" style="width:84px;height:84px;border-radius:50%;background:'+ring+';flex:none"></div><div><div class="dnote">Foundation '+esc(money(x.foundation,x.currency))+'</div><div class="dnote">Money out '+esc(money(x.total_out,x.currency))+' · money back in '+esc(money(x.total_in,x.currency))+'</div><div class="dnote" style="color:'+col+'">Profit '+esc(money(profit,x.currency))+' · '+(profit>=0?'Gaining':'Depreciating')+'</div><div><b>Balance '+esc(money(x.balance,x.currency))+'</b></div></div></div></div>';
   var picker=document.getElementById('pxStartupProject');if(picker)picker.onchange=function(){rememberProject(picker.value);box.removeAttribute('data-loading');dashboardCard()};
  }catch(err){box.innerHTML='<div class="an-card muted">Could not load startup balance: '+esc(err.message||err)+'</div>'}
  finally{box.removeAttribute('data-loading')}
 }
 setInterval(dashboardCard,5000); setInterval(dashboardCard,2000);
 async function months(id,cur){
  var box=document.getElementById('pxMonths');if(!box)return;
  var r=await window.sb.rpc('project_months',{p_project:id});
  var rows=(r.data||[]);
  if(!rows.length){box.innerHTML='<div class="muted dnote" style="margin-top:10px">No daily activity linked to this project yet.</div>';return}
  var max=Math.max.apply(null,rows.map(function(x){return Math.max(Number(x.money_in)||0,Number(x.money_out)||0)}).concat([1]));
  box.innerHTML='<div class="an-card" style="margin-top:10px"><b>Month by month</b>'+rows.map(function(x){
   var iw=Math.round((Number(x.money_in)||0)/max*100), ow=Math.round((Number(x.money_out)||0)/max*100);
   var up=Number(x.running)>=0;
   return '<div style="margin-top:10px"><div class="dnote"><b>'+esc(x.month)+'</b> · balance '+esc(money(x.running,cur))+' <span style="color:'+(up?'#15803d':'#b91c1c')+'">'+(up?'gaining':'depreciating')+'</span></div>'+
    '<div style="height:8px;border-radius:6px;background:#e6eaf2;margin-top:4px"><div style="height:8px;width:'+iw+'%;border-radius:6px;background:#15803d"></div></div>'+
    '<div style="height:8px;border-radius:6px;background:#e6eaf2;margin-top:4px"><div style="height:8px;width:'+ow+'%;border-radius:6px;background:#b91c1c"></div></div>'+
    '<div class="muted dnote">In '+esc(money(x.money_in,cur))+' · Out '+esc(money(x.money_out,cur))+'</div></div>';
  }).join('')+'</div>';
 }
 async function render(){
  var card=projectsCard();if(!card||!window.sb||!wsId())return;
  var host=document.getElementById('pxProjects');
  if(!host){host=document.createElement('div');host.id='pxProjects';host.style.marginTop='8px';card.insertBefore(host,card.querySelector('.muted')||null);}
  var r=await window.sb.from('business_projects').select('id,name,business_type,currency,startup_year').eq('workspace_id',wsId()).order('created_at',{ascending:true});
  var list=r.data||[];
  if(!list.length){host.innerHTML='<div class="muted dnote">No business projects yet. Save your business setup to create one.</div>';return}
  var selected=selectedProjectId();if(!list.some(function(p){return String(p.id)===String(selected)})){selected=String(list[0].id);rememberProject(selected)}
  host.innerHTML='<div class="dnote"><b>Your projects</b> <span class="muted">choose a project to view its finances</span></div>'+'<select id="pxProjectSelect" style="width:100%;padding:8px;margin:6px 0">'+list.map(function(p){return '<option value="'+esc(p.id)+'"'+(String(p.id)===selected?' selected':'')+'>'+esc(p.name)+' · '+esc(p.business_type)+'</option>'}).join('')+'</select>'+'<div id="pxProjectView"></div>';
  summary(selected,document.getElementById('pxProjectView'),null);
  var picker=document.getElementById('pxProjectSelect');if(picker)picker.onchange=function(){rememberProject(picker.value);summary(picker.value,document.getElementById('pxProjectView'),null)}; }
 // Project selection is handled by the dedicated project selector above.
 // re-check when the page changes view, and once shortly after load
 setInterval(function(){if(!document.getElementById('pxProjects'))render()},1500);
 pxReady(function(){setTimeout(render,800)});
})();

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
 function build(doc){
  doc.body.innerHTML='';
  doc.body.style.cssText='margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;color:#0b1b4a;padding:12px;box-sizing:border-box';
  var box=doc.createElement('div');box.id='slipBox';box.innerHTML=
   '<div style="font-weight:700;margin-bottom:8px">Capture a slip</div>'+
   '<div id="slipDrop" style="border:2px dashed #94a3b8;border-radius:12px;padding:14px;text-align:center;font-size:13px;background:#fff;cursor:pointer">Drop a PDF or picture here, or tap to choose</div>'+
   '<input id="slipFile" type="file" accept="application/pdf,image/*" hidden>'+
   '<div id="slipForm" style="margin-top:10px"></div><div id="slipMsg" style="font-size:12px;margin-top:8px;color:#5d6980"></div>';
  doc.body.appendChild(box);
  var drop=doc.getElementById('slipDrop'),input=doc.getElementById('slipFile');
  drop.onclick=function(){input.click()};
  drop.ondragover=function(e){e.preventDefault()};
  drop.ondrop=function(e){e.preventDefault();if(e.dataTransfer.files[0])handle(doc,e.dataTransfer.files[0])};
  input.onchange=function(){if(input.files[0])handle(doc,input.files[0])};
 }
 async function handle(doc,file){
  var msg=doc.getElementById('slipMsg');msg.textContent='Reading '+file.name+'\u2026';
  var text='',note='';
  try{
    if(/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name)){var r=await readPdf(file);text=r.text;note=r.note}
    else{note='Pictures are read by you: check the amount before saving.'}
  }catch(e){note='Could not read the file here. Type the amount.'}
  var d=window.pxReadDocument?window.pxReadDocument(text):{total:0,lines:[],template:'general_document',templateName:'General document',direction:'out',category:'Other',number:null,date:null};
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
   '<label style="font-size:12px">Type<select id="slType" style="width:100%;padding:6px;margin:2px 0 8px"><option value="receipt"'+(d.direction==='in'?' selected':'')+'>Money in</option><option value="expense"'+(d.direction!=='in'?' selected':'')+'>Money out</option></select></label>'+
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
  var done=0,currency='NGN';try{var biz=await window.sb.rpc('list_my_businesses',{});var active=(biz.data||[]).find(function(x){return String(x.id)===String(wsId())});if(active&&active.currency)currency=active.currency}catch(e){}
  for(var i=0;i<rows.length;i++){
    var r=await window.sb.rpc('add_slip',{p_workspace:wsId(),p_type:type,p_amount:rows[i].amount,p_date:date,p_party:rows[i].party,p_currency:currency,p_category:rows[i].category});
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
  modal.innerHTML='<div style="width:min(520px,100%);height:min(760px,92dvh);background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.25)"><div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #dfe4ee;color:#0b1b4a"><b>Capture a slip</b><button type="button" id="pxSlipClose" style="border:0;background:#eef2fb;border-radius:8px;padding:8px 12px">Close</button></div><iframe title="Slip capture form" style="border:0;flex:1;width:100%;min-height:0"></iframe></div>';
  document.body.appendChild(modal);var frame=modal.querySelector('iframe');frame.addEventListener('load',function(){build(frame.contentDocument)});frame.src='about:blank';
  modal.querySelector('#pxSlipClose').onclick=function(){modal.remove()};modal.addEventListener('click',function(e){if(e.target===modal)modal.remove()});
 }
 window.pxOpenSlipCapture=async function(){
  if(pip){try{pip.focus();return}catch(e){pip=null}}
  if('documentPictureInPicture' in window){try{pip=await documentPictureInPicture.requestWindow({width:360,height:620});build(pip.document);pip.addEventListener('pagehide',function(){pip=null});return}catch(e){/* use the in-page fallback */}}
  openInlineCapture();
 };
 window.pxBuildSlipUI=build;;
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
 var TYPES=[['supermarket','Supermarket and large retail'],['retail_store','Retail store'],['restaurant','Restaurant'],['finance','Loans and microfinance'],['transport','Transport'],['wholesale','Wholesale'],['pharmacy','Pharmacy'],['ecommerce','Online shop'],['services_agency','Services and agency'],['general','Other']];
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
   '<button type="button" id="pxActivity" class="btn alt" style="margin-right:6px">Activity log</button>'+
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
  if(t.id==='pxActivity')activity();
  if(t.id==='pxKnow')knowledge();
  if(t.id==='pxApprovals')approvals();
 });
 function showNewBusinessForm(){
  var p=$('pxBizPanel');if(!p)return;
  p.innerHTML='<div id="pxBizCreateForm" class="an-card" style="margin-top:8px"><b>Create a business</b><label class="dnote" style="display:block;margin-top:8px">Business name<input id="pxBizName" type="text" maxlength="100" placeholder="Enter business name" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:4px"></label><label class="dnote" style="display:block;margin-top:8px">Business type<select id="pxBizType" style="display:block;width:100%;padding:10px;margin-top:4px">'+TYPES.map(function(x){return '<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>'}).join('')+'</select></label><label class="dnote" style="display:block;margin-top:8px">Currency<input id="pxBizCurrency" type="text" maxlength="5" value="NGN" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:4px"></label><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button id="pxBizCreateSubmit" type="button" class="btn">Create business</button><button id="pxBizCancel" type="button" class="btn alt">Cancel</button></div><div id="pxBizCreateMsg" class="muted dnote" role="status" style="margin-top:8px"></div></div>';
 }
 async function activity(){
  var p=$('pxBizPanel'); p.innerHTML='<div class="muted dnote">Loading activity\u2026</div>';
  var r=await window.sb.rpc('list_audit',{p_workspace:wsId(),p_limit:100});
  if(r.error){p.innerHTML='<div class="muted dnote">Only the owner can see the activity log.</div>';return}
  var rows=r.data||[];
  p.innerHTML='<div class="an-card" style="margin-top:8px"><b>Activity log</b>'+(rows.length?rows.map(function(x){
    var what=(x.detail&&(x.detail.party||x.detail.file_name||x.detail.name))||'';
    return '<div class="irow" style="font-size:13px"><b>'+esc(x.action)+'</b> '+esc(x.table_name)+' \u00b7 '+esc(what)+(x.detail&&x.detail.amount?' \u00b7 '+esc(x.detail.amount):'')+'<br><small class="muted">'+esc(new Date(x.created_at).toLocaleString())+' \u00b7 by '+esc((x.actor||'').slice(0,8))+'</small></div>';
  }).join(''):'<div class="muted dnote">No activity yet.</div>')+'</div>';
 }
 async function knowledge(){
  var p=$('pxBizPanel');
  var kinds=['product','service','price','policy','faq','hours','delivery','refund','other'];
  p.innerHTML='<div class="an-card" style="margin-top:8px"><b>Knowledge base</b><div class="muted dnote">The customer assistant answers only from what you write here.</div>'+
   '<select id="kbKind" style="width:100%;padding:6px;margin:6px 0">'+kinds.map(function(k){return '<option>'+k+'</option>'}).join('')+'</select>'+
   '<input id="kbTitle" placeholder="Title, for example Rice 5kg" style="width:100%;padding:6px;margin-bottom:6px">'+
   '<textarea id="kbBody" placeholder="Details, price or policy" style="width:100%;padding:6px;min-height:70px"></textarea>'+
   '<button type="button" id="kbSave" class="btn" style="margin-top:6px">Save entry</button><div id="kbList"></div><div id="kbMsg" class="muted dnote"></div></div>';
  $('kbSave').onclick=async function(){
   var title=$('kbTitle').value.trim(),body=$('kbBody').value.trim();
   if(!title||!body){$('kbMsg').textContent='Enter a title and details.';return}
   var r=await window.sb.from('business_knowledge').insert({workspace_id:wsId(),kind:$('kbKind').value,title:title,body:body});
   $('kbMsg').textContent=r.error?('Not saved: '+r.error.message):'Saved.';
   if(!r.error){$('kbTitle').value='';$('kbBody').value='';loadKb()}
  };
  loadKb();
 }
 async function loadKb(){
  var r=await window.sb.from('business_knowledge').select('id,kind,title,body').eq('workspace_id',wsId()).order('updated_at',{ascending:false});
  var l=$('kbList'); if(!l)return;
  var rows=r.data||[];
  l.innerHTML=rows.map(function(x){return '<div class="irow" style="font-size:13px;margin-top:6px"><b>'+esc(x.title)+'</b> <span class="muted">'+esc(x.kind)+'</span><br>'+esc(x.body)+'</div>'}).join('')||'<div class="muted dnote">Nothing written yet.</div>';
 }
 async function approvals(){
  var p=$('pxBizPanel');
  var r=await window.sb.from('agent_actions').select('id,level,action,payload,status,created_at').eq('workspace_id',wsId()).eq('status','pending').order('created_at',{ascending:true});
  var rows=r.data||[];
  p.innerHTML='<div class="an-card" style="margin-top:8px"><b>Waiting for your approval</b>'+(rows.length?rows.map(function(x){
    return '<div class="irow" style="font-size:13px;margin-top:6px"><b>Level '+x.level+'</b> \u00b7 '+esc(x.action)+'<br><small class="muted">'+esc(new Date(x.created_at).toLocaleString())+'</small><div style="display:flex;gap:6px;margin-top:4px"><button type="button" class="btn" data-decide="'+x.id+'" data-ok="1">Approve</button><button type="button" class="btn alt" data-decide="'+x.id+'" data-ok="0">Reject</button></div></div>'
   }).join(''):'<div class="muted dnote">Nothing waiting.</div>')+'</div>';
 }
 document.addEventListener('click',async function(e){
  var b=e.target.closest&&e.target.closest('[data-decide]'); if(!b)return;
  var r=await window.sb.rpc('decide_agent_action',{p_id:Number(b.getAttribute('data-decide')),p_approve:b.getAttribute('data-ok')==='1'});
  if(r.error){alert('Not decided: '+r.error.message);return}
  approvals();
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
  var tile=findTile(); if(!tile||tile.id==='pxPieTile'||!window.sb)return;
  var pr=await window.sb.from('business_projects').select('id').eq('workspace_id',wsId()).order('created_at',{ascending:true});
  var pid=(pr.data&&pr.data[0])?pr.data[0].id:null; if(!pid)return;
  var r=await window.sb.rpc('project_summary',{p_project:pid,p_month:null}); if(r.error)return;
  var s=r.data||{}, base=Math.max(Number(s.foundation)||0,1), prof=Number(s.profit)||0, c=s.currency||'NGN';
  var part=Math.min(100,Math.round(Math.abs(prof)/base*100));
  var col=prof>=0?'#15803d':'#b91c1c';
  var ring='conic-gradient(#0b1b4a 0% '+(100-part)+'%, '+col+' '+(100-part)+'% 100%)';
  tile.id='pxPieTile';
  tile.innerHTML='<div style="display:flex;gap:14px;align-items:center;padding:8px"><div style="width:110px;height:110px;border-radius:50%;background:'+ring+';flex:none;position:relative"><div style="position:absolute;inset:26px;border-radius:50%;background:#fff"></div></div>'+
   '<div style="font-size:13px"><b>Startup balance</b><div>Foundation '+esc(Number(s.foundation).toLocaleString())+' '+esc(c)+'</div><div style="color:'+col+'">'+(prof>=0?'Profit':'Loss')+' so far '+esc(Math.abs(prof).toLocaleString())+'</div><div><b>Balance '+esc(Number(s.balance).toLocaleString())+' '+esc(c)+'</b></div></div></div>';
 }
 setInterval(paint,2500);
})();
