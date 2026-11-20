/* PELEX ARTCRAFT SPACE — interface-only preview.
   App names, descriptions and available icon assets are based on ArtCraft's official directory.
   ArtCraft Studio is separate from the 17 Crafting Apps. */
(function(){
 'use strict';
 var ROOT='https://raw.githubusercontent.com/craft-table/getartcraft-website/main/images';
 var APPS=[
  ['photocraft','PhotoCraft','Image editing, layers, masks, type and brushes'],
  ['vectorcraft','VectorCraft','Vector illustration and drawing'],
  ['filmcraft','FilmCraft','Professional video editing and timeline tools'],
  ['lightcraft','LightCraft','Photo library and RAW development'],
  ['pdfcraft','PdfCraft','Read, organize, combine and secure PDFs'],
  ['effectcraft','EffectCraft','Motion graphics and visual effects'],
  ['anicraft','AniCraft','2D vector animation'],
  ['designcraft','DesignCraft','Page layout and publishing'],
  ['figcraft','FigCraft','Interface design and prototyping'],
  ['texturecraft','TextureCraft','3D texture painting'],
  ['materialcraft','MaterialCraft','Node-based procedural materials'],
  ['soundcraft','SoundCraft','Audio recording, editing and mixing'],
  ['wordcraft','WordCraft','Word processing and documents'],
  ['deckcraft','DeckCraft','Presentations and slide shows'],
  ['cadcraft','CADCraft','Computer-aided design and drafting'],
  ['gridcraft','GridCraft','Spreadsheets and data analysis'],
  ['craft-anything','Craft Anything','Explore software and build your own projects']
 ];
 var VERIFIED_ICONS={photocraft:1,vectorcraft:1,filmcraft:1,lightcraft:1,pdfcraft:1,effectcraft:1,designcraft:1,soundcraft:1,wordcraft:1,deckcraft:1,cadcraft:1,gridcraft:1};
 var APP_ICON_URLS={
  anicraft:'https://raw.githubusercontent.com/storytold/anicraft/main/assets/app-icon/hicolor/128x128/apps/ai.storyteller.anicraft.png',
  figcraft:'https://raw.githubusercontent.com/storytold/figcraft/main/assets/app-icon/hicolor/128x128/apps/ai.storyteller.figcraft.png',
  texturecraft:'https://raw.githubusercontent.com/storytold/texturecraft/main/assets/app-icon/hicolor/128x128/apps/ai.storyteller.texturecraft.png',
  materialcraft:'https://raw.githubusercontent.com/storytold/materialcraft/main/assets/app-icon/hicolor/128x128/apps/ai.storyteller.materialcraft.png',
  'craft-anything':'https://raw.githubusercontent.com/storytold/craft-anything/main/assets/app-icon/hicolor/128x128/apps/ai.storyteller.craft-anything.png'
 };
 function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 function addStyles(){
  if(document.getElementById('pxArtSpaceCss'))return;
  var s=document.createElement('style');s.id='pxArtSpaceCss';
  s.textContent=
   '.px-art-space{max-width:1180px;margin:0 auto;padding-bottom:30px}'+
   '.px-art-head{display:flex;align-items:center;gap:18px;padding:8px 0 22px;border-bottom:1px solid var(--line,#e3e8f1);margin-bottom:20px}'+
   '.px-art-brand{display:block;width:240px;flex:none;line-height:0}'+
   '.px-art-brand img{display:block;width:100%;height:auto}'+
   '.px-art-logo-dark{display:none}'+
   ':root[data-theme="dark"] .px-art-logo-light{display:none}:root[data-theme="dark"] .px-art-logo-dark{display:block}'+
   '.px-art-eyebrow{font-size:11px;letter-spacing:.12em;font-weight:800;color:var(--muted,#68758c)}'+
   '.px-art-head h1{margin:4px 0;font-size:clamp(24px,4vw,32px);line-height:1.12;color:var(--ink,#17243b)}'+
   '.px-art-head p,.px-art-section p{margin:0;color:var(--muted,#68758c);font-size:14px}'+
   '.px-art-studio{display:flex;justify-content:space-between;align-items:center;gap:18px;border:1px solid var(--line,#e3e8f1);border-radius:16px;padding:18px 20px;background:var(--panel,#fff);margin:0 0 26px}'+
   '.px-art-studio-copy{max-width:760px}.px-art-studio h2{margin:5px 0;font-size:20px;color:var(--ink,#17243b)}'+
   '.px-art-studio p{margin:0 0 12px;color:var(--muted,#68758c);font-size:14px;line-height:1.5}'+
   '.px-art-studio a{font-weight:700;color:var(--accent,#2765bd);text-decoration:none}'+
   '.px-art-launch{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 18px;border-radius:10px;background:#0b2a5b;color:#fff!important;text-decoration:none;font-weight:700;margin-top:4px}'+
   '.px-art-launch:hover{background:#123b78}.px-art-launch{border:0;cursor:pointer;font:inherit;font-weight:700}'+
   '.px-art-modal[hidden]{display:none}.px-art-modal{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;box-sizing:border-box}'+
   '.px-art-modal-backdrop{position:absolute;inset:0;background:rgba(12,24,43,.56);backdrop-filter:blur(3px)}'+
   '.px-art-account-panel{position:relative;z-index:1;width:min(100%,460px);box-sizing:border-box;padding:28px;border:1px solid var(--line,#e3e8f1);border-radius:20px;background:var(--panel,#fff);color:var(--ink,#17243b);box-shadow:0 24px 70px rgba(10,25,50,.24)}'+
   '.px-art-modal-close{position:absolute;right:12px;top:10px;width:38px;height:38px;border:0;border-radius:10px;background:var(--soft,#f5f7fb);color:var(--ink,#17243b);font-size:26px;line-height:1;cursor:pointer}'+
   '.px-art-account-logo-wrap{display:block;width:230px;max-width:100%;margin:0 0 18px;line-height:0}'+
   '.px-art-account-logo{display:block;width:100%;height:auto;object-fit:contain}.px-art-account-logo.px-art-logo-dark{display:none}:root[data-theme="dark"] .px-art-account-logo.px-art-logo-light{display:none}:root[data-theme="dark"] .px-art-account-logo.px-art-logo-dark{display:block}.px-art-account-panel h2{margin:7px 0 9px;font-size:22px;color:var(--ink,#17243b)}'+
   '.px-art-account-panel p{font-size:14px;line-height:1.55;color:var(--muted,#68758c)}.px-art-account-continue{display:flex;width:100%;box-sizing:border-box;margin-top:18px}'+
   '.px-art-account-panel .px-art-account-security{font-size:12px;margin:13px 0 0}.px-art-modal-open{overflow:hidden}'+
   '@media(max-width:560px){.px-art-account-panel{padding:24px 20px;border-radius:17px}}'+
   '.px-art-section{margin:0 0 14px}.px-art-section h2{display:flex;align-items:center;gap:10px;margin:0 0 4px;font-size:19px;color:var(--ink,#17243b)}'+
   '.px-art-section h2 span{font-size:11px;font-weight:700;color:var(--muted,#68758c);border:1px solid var(--line,#e3e8f1);padding:4px 8px;border-radius:20px}'+
   '.px-art-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,225px),1fr));gap:13px}'+
   '.px-art-card{min-width:0;border:1px solid var(--line,#e3e8f1);border-radius:15px;padding:14px;background:var(--panel,#fff);display:flex;flex-direction:column;gap:8px}'+
   '.px-art-cardtop{display:flex;align-items:center;gap:11px}.px-art-icon{width:48px;height:48px;object-fit:contain;border-radius:11px;background:#fff;flex:none}'+
   '.px-art-monogram{width:48px;height:48px;display:grid;place-items:center;border-radius:11px;background:var(--bg,#f2f5fa);border:1px solid var(--line,#e3e8f1);font-weight:800;color:var(--ink,#17243b);flex:none}'+
   '.px-art-card h3{font-size:15px;line-height:1.25;margin:0;color:var(--ink,#17243b)}.px-art-card p{font-size:12px;line-height:1.45;margin:0;color:var(--muted,#68758c);min-height:35px}'+
   '.px-art-status{font-size:10px;font-weight:700;color:var(--muted,#68758c);padding-top:8px;border-top:1px solid var(--line,#e3e8f1)}'+
   '.px-art-download{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:9px;background:#0b2a5b;color:#fff!important;text-decoration:none;font-size:12px;font-weight:700;margin-top:2px}'+
   '.px-art-download:hover{background:#123b78}'+
   '.px-art-note{font-size:12px;color:var(--muted,#68758c);margin:16px 0 0}'+
   '@media(max-width:560px){.px-art-head{align-items:flex-start;gap:12px}.px-art-brand{width:175px}.px-art-studio{padding:14px}.px-art-card{padding:12px}}'+
   ':root[data-theme="dark"] .px-art-icon{background:#fff}';
  document.head.appendChild(s);
 }
 function render(){
  var grid=document.getElementById('pxArtGrid');if(!grid||grid.dataset.ready==='1')return;
  grid.dataset.ready='1';
  grid.addEventListener('error',function(e){
   var img=e.target;if(!img||!img.classList||!img.classList.contains('px-art-icon'))return;
   var card=img.closest('.px-art-card'),heading=card&&card.querySelector('h3'),name=heading?heading.textContent:'';
   var initials=name.split(/\s+/).map(function(x){return x[0]}).join('').slice(0,2).toUpperCase();
   img.outerHTML='<span class="px-art-monogram" aria-hidden="true">'+esc(initials)+'</span>';
  },true);
  grid.innerHTML=APPS.map(function(a){
   var slug=a[0],name=a[1],desc=a[2],src=APP_ICON_URLS[slug]||(VERIFIED_ICONS[slug]?ROOT+'/apps/'+slug+'/icon.webp':'');
   var icon=src?'<img class="px-art-icon" src="'+src+'" alt="" loading="lazy" decoding="async">':'<span class="px-art-monogram" aria-hidden="true">'+esc(name.split(/\s+/).map(function(x){return x[0]}).join('').slice(0,2).toUpperCase())+'</span>';
   return '<article class="px-art-card" data-artcraft-id="'+esc(slug)+'"><div class="px-art-cardtop">'+icon+'<h3>'+esc(name)+'</h3></div><p>'+esc(desc)+'</p><div class="px-art-status">Package not yet installed</div><div class="px-art-action"></div></article>';
  }).join('');
  loadPackageManifest();
 }

 function loadPackageManifest(){
  fetch('/artcraft/package-manifest.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('manifest unavailable');return r.json()}).then(function(data){
   var packages=Array.isArray(data.packages)?data.packages:[];
   packages.forEach(function(pkg){
    if(!pkg||pkg.validated!==true||!pkg.id||!APPS.some(function(app){return app[0]===pkg.id}))return;
    var card=Array.prototype.find.call(document.querySelectorAll('.px-art-card[data-artcraft-id]'),function(el){return el.getAttribute('data-artcraft-id')===pkg.id});
    if(!card)return;
    var status=card.querySelector('.px-art-status'),action=card.querySelector('.px-art-action');
    var url=pkg.platform==='desktop'?pkg.download_path:pkg.app_url;
    if(status)status.textContent=pkg.platform==='desktop'?'Desktop package verified · '+(Number(pkg.bytes||0)/1024/1024).toFixed(1)+' MB':'Browser app verified · '+(pkg.version||'official release');
    if(action&&url){var link=document.createElement('a');link.className='px-art-download';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=pkg.platform==='desktop'?'Download desktop app':'Launch '+(APPS.filter(function(app){return app[0]===pkg.id})[0]||[])[1];action.appendChild(link)}
   });
  }).catch(function(){/* Keep unavailable state unless a verified manifest is published. */});
 }

 function addStudioActions(){
  var copy=document.querySelector('.px-art-studio-copy');
  if(copy&&!document.getElementById('pxArtStudioAccess')){
   var trigger=document.createElement('button');
   trigger.type='button';
   trigger.id='pxArtStudioAccess';
   trigger.className='px-art-launch';
   trigger.setAttribute('aria-haspopup','dialog');
   trigger.setAttribute('aria-controls','pxArtAccountPanel');
   trigger.textContent='Open ArtCraft Studio';
   trigger.addEventListener('click',openAccountPanel);
   copy.appendChild(trigger);
  }
 }
 function openAccountPanel(){
  var panel=document.getElementById('pxArtAccountPanel');
  if(!panel){
   panel=document.createElement('div');
   panel.id='pxArtAccountPanel';
   panel.className='px-art-modal';
   panel.innerHTML='<div class="px-art-modal-backdrop" data-art-close="1"></div><section class="px-art-account-panel" role="dialog" aria-modal="true" aria-labelledby="pxArtAccountTitle" aria-describedby="pxArtAccountDescription"><button type="button" class="px-art-modal-close" aria-label="Close ArtCraft account panel" data-art-close="1">×</button><div class="px-art-account-logo-wrap"><img src="https://raw.githubusercontent.com/storytold/wordcraft/bbfacd8f624a751f11e8bc614ddf27dd675f7388/docs/brand/artcraft-logo.svg" alt="ArtCraft" class="px-art-account-logo px-art-logo-light"><img src="https://raw.githubusercontent.com/storytold/wordcraft/bbfacd8f624a751f11e8bc614ddf27dd675f7388/docs/brand/artcraft-logo-white.svg" alt="" aria-hidden="true" class="px-art-account-logo px-art-logo-dark"></div><div class="px-art-eyebrow">ARTCRAFT ACCOUNT ACCESS</div><h2 id="pxArtAccountTitle">Continue to ArtCraft Studio</h2><p id="pxArtAccountDescription">Use your ArtCraft account to access the creative studio. You can sign in or create an account on ArtCraft’s official website.</p><a class="px-art-launch px-art-account-continue" href="https://app.getartcraft.com/browser-studio" target="_blank" rel="noopener noreferrer">Continue to ArtCraft sign in</a><p class="px-art-account-security">Your ArtCraft password is entered only on ArtCraft’s official site. Pelex does not collect your password or claim that your account is connected.</p></section>';
   panel.addEventListener('click',function(e){if(e.target&&e.target.getAttribute('data-art-close')==='1')closeAccountPanel()});
   document.body.appendChild(panel);
  }
  panel.hidden=false;
  document.body.classList.add('px-art-modal-open');
  var close=panel.querySelector('.px-art-modal-close');
  if(close)close.focus();
  document.addEventListener('keydown',handleAccountEscape);
 }
 function closeAccountPanel(){
  var panel=document.getElementById('pxArtAccountPanel');
  if(!panel)return;
  panel.hidden=true;
  document.body.classList.remove('px-art-modal-open');
  document.removeEventListener('keydown',handleAccountEscape);
  var trigger=document.getElementById('pxArtStudioAccess');
  if(trigger)trigger.focus();
 }
 function handleAccountEscape(e){if(e.key==='Escape')closeAccountPanel()}
 function init(){addStyles();render();addStudioActions()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.PelexArtCraftSpace={apps:APPS,studioUrl:'https://app.getartcraft.com/browser-studio',openAccountPanel:openAccountPanel,closeAccountPanel:closeAccountPanel};
})();