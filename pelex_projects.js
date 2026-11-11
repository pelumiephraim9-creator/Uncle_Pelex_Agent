/* PELEX BUSINESS PROJECT MANAGER
 * One workspace owner may operate multiple independent business projects.
 * Each project's business type, currency, reporting cycle and profile are stored on that project.
 * Loaded after index.html; never writes workspace-wide business settings.
 */
(function(){
 'use strict';
 var mounted=false,types=[],projects=[],selected='',editingId=null;
 function $(id){return document.getElementById(id)}
 function ws(){try{return localStorage.getItem('pelex_ws')||''}catch(e){return ''}}
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function msg(s,bad){var n=$('pxProjectMsg');if(n){n.textContent=s||'';n.style.color=bad?'#b3261e':''}}
 function money(v,c){return esc(c||'NGN')+' '+Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2})}
 function type(code){return types.find(function(x){return x.code===code})||types[0]}
 function ensure(){
  var legacy=$('setupCard');if(legacy){legacy.hidden=true;legacy.style.display='none'}
  var host=$('lsWrap');if(!host||$('pxProjectManager'))return !!$('pxProjectManager');
  var card=document.createElement('section');card.className='dcard';card.id='pxProjectManager';
  card.innerHTML='<div class="dhead"><h2>Projects · business setup</h2><span class="ttag">Each project is independent</span></div>'+
   '<p class="dnote">Create one project for each business you operate. Its business type, currency, configuration, transactions and reports stay separate from every other project.</p>'+
   '<div id="pxProjectList" class="ilist"></div>'+
   '<div class="an-card" style="margin-top:12px"><b id="pxProjectFormTitle">Create a business project</b>'+
   '<div class="two"><label class="dnote">Business / project name<input id="pxProjectName" class="inp" maxlength="100" placeholder="e.g. Pelex Supermarket"></label>'+
   '<label class="dnote">Business type<select id="pxProjectType" class="inp"></select></label></div>'+
   '<div class="two"><label class="dnote">Reporting currency<input id="pxProjectCurrency" class="inp" maxlength="3" value="NGN" placeholder="NGN"></label>'+
   '<label class="dnote">Reporting cycle<select id="pxProjectCycle" class="inp"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option></select></label></div>'+
   '<div id="pxProjectFields"></div>'+
   '<div class="prow" style="margin-top:12px"><button class="btn" id="pxProjectSave" type="button">Save project setup</button><button class="btn alt" id="pxProjectReset" type="button">Clear form</button></div>'+
   '<p class="muted dnote" id="pxProjectMsg" role="status" aria-live="polite"></p></div>'+
   '<div class="an-card" id="pxProjectOperations" style="margin-top:12px;display:none"><b>Business operations · selected project only</b><p class="dnote">Record operational activity using only the modules enabled for this business type. These records remain separate from every other project.</p><label class="dnote">Enabled module<select class="inp" id="pxOpsModule"></select></label><label class="dnote">Record type<select class="inp" id="pxOpsRecordType"></select></label><div class="two"><label class="dnote">Record date<input class="inp" type="date" id="pxOpsDate"></label><label class="dnote">Amount (optional)<input class="inp" type="number" min="0" step="any" id="pxOpsAmount"></label></div><div class="two"><label class="dnote">Quantity (optional)<input class="inp" type="number" min="0" step="any" id="pxOpsQuantity"></label><label class="dnote">Unit cost (optional)<input class="inp" type="number" min="0" step="any" id="pxOpsUnitCost"></label></div><div class="two"><label class="dnote">Customer / supplier / item<input class="inp" id="pxOpsParty" maxlength="160"></label><label class="dnote">Reference / item code<input class="inp" id="pxOpsReference" maxlength="120"></label></div><div class="two"><label class="dnote">Status<input class="inp" id="pxOpsStatus" maxlength="40" value="recorded"></label><label class="dnote">Details<input class="inp" id="pxOpsDetails" maxlength="500" placeholder="Optional operational details"></label></div><div class="prow" style="margin-top:10px"><button class="btn" id="pxOpsSave" type="button">Save operational record</button><button class="btn alt" id="pxOpsRefresh" type="button">Refresh records</button></div><p class="muted dnote" id="pxOpsMsg" role="status" aria-live="polite"></p><div id="pxOpsRows"></div></div>';
  var before=host.querySelector('#lsWrap')||host.firstChild;host.insertBefore(card,before);
  $('pxProjectType').onchange=renderFields;
  $('pxProjectReset').onclick=reset;
  $('pxProjectSave').onclick=save;
  mounted=true;return true;
 }
 function reset(){
  editingId=null;
  $('pxProjectFormTitle').textContent='Create a business project';
  $('pxProjectName').value='';$('pxProjectType').value=types[0]?types[0].code:'general';
  $('pxProjectCurrency').value='NGN';$('pxProjectCycle').value=(type($('pxProjectType').value)||{}).default_cycle||'monthly';
  renderFields();msg('');
 }
 function renderFields(){
  var t=type($('pxProjectType').value);if(!t)return;
  $('pxProjectCycle').value=t.default_cycle||'monthly';
  var html='<p class="dnote" style="margin-top:10px">'+esc(t.description||'')+'</p>';
  (t.fields||[]).forEach(function(f){
   var id='pxpf_'+f.key, v=(f.key==='cycle'?$('pxProjectCycle').value:'');
   html+='<label class="dnote" style="display:block;margin-top:8px">'+esc(f.label)+(f.optional?' (optional)':'');
   if(f.type==='select'){
    html+='<select class="inp" data-px-profile="'+esc(f.key)+'" id="'+id+'">'+(f.options||[]).map(function(o){return '<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>'}).join('')+'</select>';
   }else{
    html+='<input class="inp" type="number" min="0" step="any" data-px-profile="'+esc(f.key)+'" id="'+id+'" placeholder="'+(f.optional?'Leave blank if none':'Enter amount')+'">';
   }
   html+='</label>';
  });
  $('pxProjectFields').innerHTML=html;
  var cycle=$('pxpf_cycle');if(cycle)cycle.value=$('pxProjectCycle').value;
 }
 async function loadTypes(){
  var r=await window.sb.from('business_types').select('code,name,group_name,description,default_cycle,modules,fields').order('sort_order');
  if(r.error)throw r.error;types=r.data||[];
  var groups={};types.forEach(function(t){(groups[t.group_name||'Other']=groups[t.group_name||'Other']||[]).push(t)});
  $('pxProjectType').innerHTML=Object.keys(groups).map(function(g){return '<optgroup label="'+esc(g)+'">'+groups[g].map(function(t){return '<option value="'+esc(t.code)+'">'+esc(t.name)+'</option>'}).join('')+'</optgroup>'}).join('');
  reset();
 }
 async function loadProjects(){
  var r=await window.sb.from('business_projects').select('id,name,business_type,currency,startup_month,startup_year,spent,spend_period,loan,reporting_cycle,profile,created_at').eq('workspace_id',ws()).order('created_at',{ascending:true});
  if(r.error)throw r.error;projects=r.data||[];
  var saved='';try{saved=localStorage.getItem('px_project_'+ws())||''}catch(e){}
  selected=projects.some(function(p){return p.id===saved})?saved:(projects[0]&&projects[0].id)||'';
  if(selected){try{localStorage.setItem('px_project_'+ws(),selected)}catch(e){}}
  syncModules();renderList();renderOperations();
  var picker=$('pxTrProject');
  if(picker&&projects.length){
   picker.value=selected;
   picker.dispatchEvent(new Event('change',{bubbles:true}));
  }
 }
 function renderList(){
  var box=$('pxProjectList');if(!box)return;
  if(!projects.length){box.innerHTML='<div class="muted dnote">No business projects yet. Create your first project below.</div>';return}
  box.innerHTML=projects.map(function(p){
   var active=p.id===selected;
   return '<div class="irow" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:10px;margin:7px 0">'+
    '<div><b>'+esc(p.name)+'</b><div class="muted dnote">'+esc((type(p.business_type)||{}).name||p.business_type)+' · '+esc(p.currency)+' · '+esc(p.reporting_cycle||'monthly')+'</div>'+
    '<div class="muted dnote">Startup capital: '+money(p.startup_year||0,p.currency)+'</div></div>'+
    '<div class="prow"><button class="btn '+(active?'':'alt')+'" type="button" data-px-select="'+esc(p.id)+'">'+(active?'Selected':'Open project')+'</button><button class="btn alt" type="button" data-px-edit="'+esc(p.id)+'">Edit setup</button></div></div>';
  }).join('');
  box.querySelectorAll('[data-px-select]').forEach(function(b){b.onclick=function(){select(b.getAttribute('data-px-select'))}});
  box.querySelectorAll('[data-px-edit]').forEach(function(b){b.onclick=function(){edit(b.getAttribute('data-px-edit'))}});
 }
 function syncModules(){var p=projects.find(function(x){return x.id===selected}),t=p?type(p.business_type):null,card=$('agreeCard');if(card){var enabled=!!(t&&t.modules&&t.modules.indexOf('agreements')>=0);card.hidden=!enabled;card.style.display=enabled?'':'none'}}
 function select(id){
  selected=id;try{localStorage.setItem('px_project_'+ws(),id)}catch(e){}
  syncModules();renderList();renderOperations();var p=$('pxTrProject');if(p){p.value=id;p.dispatchEvent(new Event('change',{bubbles:true}))}
  msg('Selected project. Data entry and financial summaries will now use this project only.');
 }
 function moduleLabel(m){return ({pos_sales:'POS sales',sales:'Sales',inventory:'Inventory',agreements:'Loan agreements',schedule:'Repayment schedules',collections:'Collections',deposits:'Deposits',contributions:'Contributions',payouts:'Payouts',receivables:'Receivables',payables:'Payables',bookings:'Bookings',maintenance:'Maintenance',tenancies:'Tenancies',trips:'Trips',expenses:'Expenses',payroll:'Payroll',fees:'Fees',orders:'Orders',payment_webhooks:'Payment events',production_batches:'Production batches',costing:'Costing',seasons:'Seasons',deliveries:'Deliveries',cash:'Cash operations',shifts:'Shifts',expiry:'Expiry tracking',projects:'Work projects',ledger:'Ledger',reports:'Reports'})[m]||m.replace(/_/g,' ').replace(/\\b\\w/g,function(x){return x.toUpperCase()})}
 function recordTypes(module){
  return ({
   sales:['sale','refund','discount'],pos_sales:['pos_sale','pos_refund','cash_variance'],
   collections:['collection_received','collection_due','collection_overdue'],deposits:['deposit_received','deposit_refunded','deposit_released'],
   cash:['cash_opening','cash_closing','cash_variance'],payment_webhooks:['payment_received','payment_refunded','payment_failed'],
   inventory:['stock_in','stock_out','stock_adjustment','stock_waste'],orders:['order','order_refund','order_fulfilment'],
   bookings:['booking','booking_payment','cancellation'],payroll:['payroll','payroll_tax','staff_advance'],
   fees:['fee_charged','fee_collected','fee_waiver'],trips:['trip','fuel','vehicle_maintenance'],
   expenses:['operating_cost','supplier_payment'],payables:['purchase','supplier_payment'],
   receivables:['invoice_issued','customer_payment'],production_batches:['production_batch','raw_material','finished_goods'],
   costing:['production_cost','unit_cost_update'],seasons:['season','harvest'],tenancies:['rent_due','rent_received','property_maintenance'],
   maintenance:['maintenance_job','maintenance_cost'],contributions:['contribution','member_payout'],
   payouts:['payout','distribution'],deliveries:['delivery','delivery_cost'],projects:['project_milestone','project_cost'],
   shifts:['shift_open','shift_close','cash_variance'],expiry:['expired_stock','near_expiry_stock']
  })[module]||[module+'_record','other'];
 }
 function renderOperations(){
  var box=$('pxProjectOperations');if(!box)return;
  var p=projects.find(function(x){return x.id===selected}),t=p?type(p.business_type):null,mods=t&&t.modules||[];
  var dataMods=mods.filter(function(m){return ['ledger','reports','agreements','schedule'].indexOf(m)<0});
  if(!p||!dataMods.length){box.style.display='none';return}
  box.style.display='';$('pxOpsModule').innerHTML=dataMods.map(function(m){return '<option value="'+esc(m)+'">'+esc(moduleLabel(m))+'</option>'}).join('');
  function setTypes(){var a=recordTypes($('pxOpsModule').value);$('pxOpsRecordType').innerHTML=a.map(function(x){return '<option value="'+esc(x)+'">'+esc(x.replace(/_/g,' '))+'</option>'}).join('')}
  setTypes();$('pxOpsModule').onchange=function(){setTypes();loadOpsRecords()};
  $('pxOpsDate').value=new Date().toISOString().slice(0,10);
  $('pxOpsRefresh').onclick=loadOpsRecords;$('pxOpsSave').onclick=saveOpsRecord;loadOpsRecords();
 }
 async function loadOpsRecords(){
  if(!selected||!$('pxOpsModule'))return;
  var selectedMonth=($('pxMonthPick')&&$('pxMonthPick').value)||new Date().toISOString().slice(0,7),monthParts=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(selectedMonth),from=monthParts?selectedMonth+'-01':null,to=null;
  if(monthParts){var y=Number(monthParts[1]),m=Number(monthParts[2]);to=m===12?String(y+1).padStart(4,'0')+'-01-01':monthParts[1]+'-'+String(m+1).padStart(2,'0')+'-01';var d=new Date(to+'T00:00:00');d.setDate(d.getDate()-1);to=d.toISOString().slice(0,10)}
  var r=await window.sb.rpc('business_list_project_records',{p_workspace:ws(),p_project:selected,p_module:$('pxOpsModule').value,p_from:from,p_to:to});
  if(r.error){$('pxOpsMsg').textContent='Could not load records: '+r.error.message;return}
  var rows=r.data||[];
  var sm=await window.sb.rpc('business_project_module_summary',{p_workspace:ws(),p_project:selected,p_from:from,p_to:to});
  if(sm.error){$('pxOpsMsg').textContent='Records loaded, but module totals could not be calculated: '+sm.error.message;return}
  var module=$('pxOpsModule').value,totals=(sm.data||[]).filter(function(x){return x.module_key===module});
  var cur=(projects.find(function(p){return p.id===selected})||{}).currency;
  var summaryHtml=totals.length?'<div class="an-card" style="margin-top:10px"><b>'+esc(moduleLabel(module))+' summary · all recorded periods</b>'+totals.map(function(x){return '<div class="irow" style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(x.record_type.replace(/_/g,' '))+' · '+esc(x.record_count)+' records</span><span>'+esc(x.amount_total==null?'':money(x.amount_total,cur))+(Number(x.quantity_total)?' · Qty '+esc(x.quantity_total):'')+'</span></div>'}).join('')+'</div>':'';
  var inventoryHtml='';
  if(module==='inventory'){
   var inv=await window.sb.rpc('business_project_inventory_summary',{p_workspace:ws(),p_project:selected});
   if(inv.error){$('pxOpsMsg').textContent='Inventory records loaded, but stock valuation failed: '+inv.error.message;return}
   inventoryHtml='<div class="an-card" style="margin-top:10px"><b>Stock on hand · estimated value</b>'+(inv.data||[]).map(function(x){return '<div class="irow" style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(x.item)+' · Qty '+esc(x.quantity_on_hand)+'</span><span>'+esc(money(x.estimated_stock_value,cur))+'</span></div>'}).join('')+'</div>';
  }
  $('pxOpsRows').innerHTML=summaryHtml+inventoryHtml+(rows.length?'<div class="dnote" style="margin-top:10px"><b>Recent '+esc(moduleLabel(module))+' records</b></div>'+rows.slice(0,40).map(function(x){return '<div class="irow" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span><b>'+esc(x.record_date)+'</b> · '+esc(x.party||x.reference||x.record_type)+' <small class="muted">'+esc(x.status)+'</small></span><span>'+esc(x.amount==null?'':money(x.amount,x.currency))+(x.quantity==null?'':' · Qty '+esc(x.quantity))+'</span></div>'}).join(''):'<div class="muted dnote" style="margin-top:10px">No records for this module in this project yet.</div>');
 }
 async function saveOpsRecord(){
  var module=$('pxOpsModule').value,date=$('pxOpsDate').value,amount=$('pxOpsAmount').value,qty=$('pxOpsQuantity').value,cost=$('pxOpsUnitCost').value;
  if(!selected){$('pxOpsMsg').textContent='Select a project first.';return}
  if(!date){$('pxOpsMsg').textContent='Choose a record date.';return}
  if((amount!==''&&Number(amount)<0)||(qty!==''&&Number(qty)<0)||(cost!==''&&Number(cost)<0)){$('pxOpsMsg').textContent='Amounts, quantities and unit costs cannot be negative.';return}
  var p=projects.find(function(x){return x.id===selected});
  var b=$('pxOpsSave');b.disabled=true;$('pxOpsMsg').textContent='Saving operational record…';
  var r=await window.sb.rpc('business_add_project_record',{p_workspace:ws(),p_project:selected,p_module:module,p_record_type:$('pxOpsRecordType').value,p_date:date,p_amount:amount===''?null:Number(amount),p_currency:p.currency,p_quantity:qty===''?null:Number(qty),p_unit_cost:cost===''?null:Number(cost),p_party:$('pxOpsParty').value,p_reference:$('pxOpsReference').value,p_status:$('pxOpsStatus').value,p_data:{details:$('pxOpsDetails').value||''}});
  b.disabled=false;
  if(r.error){$('pxOpsMsg').textContent='Record not saved: '+r.error.message;return}
  $('pxOpsMsg').textContent='Operational record saved to '+p.name+'.';$('pxOpsAmount').value='';$('pxOpsQuantity').value='';$('pxOpsUnitCost').value='';$('pxOpsParty').value='';$('pxOpsReference').value='';$('pxOpsDetails').value='';
  await loadOpsRecords();
 }
 function edit(id){
  var p=projects.find(function(x){return x.id===id});if(!p)return;
  select(id);editingId=id;
  $('pxProjectFormTitle').textContent='Update '+p.name;
  $('pxProjectName').value=p.name;$('pxProjectType').value=p.business_type;
  $('pxProjectCurrency').value=p.currency;$('pxProjectCycle').value=p.reporting_cycle||'monthly';
  renderFields();
  var profile=p.profile||{};
  Object.keys(profile).forEach(function(k){var f=$('pxpf_'+k);if(f)f.value=profile[k]==null?'':profile[k]});
  var cy=$('pxpf_cycle');if(cy)cy.value=p.reporting_cycle||'monthly';
  msg('Editing the selected project. Existing transactions are not changed.');
 }
 async function save(){
  var name=$('pxProjectName').value.trim(),code=$('pxProjectType').value,cur=$('pxProjectCurrency').value.trim().toUpperCase(),cycle=$('pxProjectCycle').value;
  if(!name){msg('Enter a name for this business project.',true);return}
  if(!/^[A-Z]{3}$/.test(cur)){msg('Enter a valid three-letter currency code.',true);return}
  var profile={};$('pxProjectFields').querySelectorAll('[data-px-profile]').forEach(function(el){
   var key=el.getAttribute('data-px-profile'),val=el.value;
   profile[key]=el.type==='number'?(val===''?null:Number(val)):val;
  });
  var capMonth=Number(profile.startup_capital_month||0),capYear=Number(profile.startup_capital_year||0);
  var spent=Number(profile.spend_amount||0),spendPeriod=profile.spend_period||'month',loan=Number(profile.loan_amount||0);
  var b=$('pxProjectSave');b.disabled=true;msg(editingId?'Updating selected business project…':'Saving independent project setup…');
  try{
   var payload={p_workspace:ws(),p_name:name,p_business_type:code,p_currency:cur,
    p_capital_month:capMonth,p_capital_year:capYear,p_spent:spent,
    p_spend_period:spendPeriod,p_loan:loan,p_reporting_cycle:cycle,p_profile:profile};
   var r=editingId?await window.sb.rpc('update_business_project_v2',Object.assign({p_project:editingId},payload)):await window.sb.rpc('save_setup_project_v2',payload);
   if(r.error)throw r.error;
   selected=r.data;try{localStorage.setItem('px_project_'+ws(),selected)}catch(e){}
   msg('Project setup saved. Its data, currency, reporting and calculations are independent.');
   await loadProjects();
   if(window.__lsLoad)window.__lsLoad();
   if(window.__pxRegisterReady)window.__pxRegisterReady();
   reset();
  }catch(e){msg('Project was not saved: '+(e.message||e),true)}
  finally{b.disabled=false}
 }
 async function start(){
  if(!window.sb||!window.curUser||!ws())return;
  if(!ensure())return;
  try{if(!types.length)await loadTypes();await loadProjects()}catch(e){msg('Could not load project setup: '+(e.message||e),true)}
 }
 var oldGo=window.go;
 if(typeof oldGo==='function')window.go=function(v,t){oldGo(v,t);if(v==='business'||v==='business-projects')setTimeout(start,250)};
 window.addEventListener('load',function(){setTimeout(start,1500)});
 setInterval(function(){if(!mounted&&$('lsWrap')&&!$('bWork')?.hidden)start()},2000);
 window.pxBusinessProjects={reload:start,select:select,refreshOperations:loadOpsRecords};
})();