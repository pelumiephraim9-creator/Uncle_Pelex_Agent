/* PELEX BUSINESS PROJECT MANAGER
 * One workspace owner may operate multiple independent business projects.
 * Each project's business type, currency, reporting cycle and profile are stored on that project.
 * Loaded after index.html; never writes workspace-wide business settings.
 */
(function(){
 'use strict';
 var mounted=false,types=[],projects=[],selected='';
 function $(id){return document.getElementById(id)}
 function ws(){try{return localStorage.getItem('pelex_ws')||''}catch(e){return ''}}
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function msg(s,bad){var n=$('pxProjectMsg');if(n){n.textContent=s||'';n.style.color=bad?'#b3261e':''}}
 function money(v,c){return esc(c||'NGN')+' '+Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2})}
 function type(code){return types.find(function(x){return x.code===code})||types[0]}
 function ensure(){
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
   '<p class="muted dnote" id="pxProjectMsg" role="status" aria-live="polite"></p></div>';
  var before=host.querySelector('#lsWrap')||host.firstChild;host.insertBefore(card,before);
  $('pxProjectType').onchange=renderFields;
  $('pxProjectReset').onclick=reset;
  $('pxProjectSave').onclick=save;
  mounted=true;return true;
 }
 function reset(){
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
  renderList();
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
 function select(id){
  selected=id;try{localStorage.setItem('px_project_'+ws(),id)}catch(e){}
  renderList();var p=$('pxTrProject');if(p){p.value=id;p.dispatchEvent(new Event('change',{bubbles:true}))}
  msg('Selected project. Data entry and financial summaries will now use this project only.');
 }
 function edit(id){
  var p=projects.find(function(x){return x.id===id});if(!p)return;
  select(id);
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
  var b=$('pxProjectSave');b.disabled=true;msg('Saving independent project setup…');
  try{
   var r=await window.sb.rpc('save_setup_project_v2',{
    p_workspace:ws(),p_name:name,p_business_type:code,p_currency:cur,
    p_capital_month:capMonth,p_capital_year:capYear,p_spent:spent,
    p_spend_period:spendPeriod,p_loan:loan,p_reporting_cycle:cycle,p_profile:profile
   });
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
 if(typeof oldGo==='function')window.go=function(v,t){oldGo(v,t);if(v==='business')setTimeout(start,250)};
 window.addEventListener('load',function(){setTimeout(start,1500)});
 setInterval(function(){if(!mounted&&$('lsWrap')&&!$('bWork')?.hidden)start()},2000);
 window.pxBusinessProjects={reload:start,select:select};
})();