const $ = id => document.getElementById(id);
const BLOCK = /(^|[.-])(bank|banking|bankapp|internetbanking|mobilebanking)([.-]|$)|\b(bank|banking|internet banking|mobile banking|account balance|bank statement|transfer receipt)\b/i;
let lastResult = "";
async function activeTab(){ const [tab] = await chrome.tabs.query({active:true,currentWindow:true}); return tab; }
function originOf(url){ try { const u=new URL(url); if(!/^https?:$/.test(u.protocol)) return ""; return u.origin; } catch { return ""; } }
async function check(){
 const tab=await activeTab(), origin=originOf(tab?.url||"");
 if(!origin){ $("status").textContent="This page cannot be monitored."; $("enable").disabled=true; $("capture").disabled=true; return; }
 if(BLOCK.test(origin+" "+(tab.title||""))){ $("status").textContent="Blocked: this appears to be a banking or financial account page."; $("enable").disabled=true; $("capture").disabled=true; return; }
 const allowed=await chrome.permissions.contains({origins:[origin+"/*"]});
 $("status").textContent=allowed?"Approved business source: "+origin:"Not approved. Click “Approve this site” to grant access.";
 $("enable").disabled=allowed; $("capture").disabled=!allowed;
}
$("enable").addEventListener("click",async()=>{
 const tab=await activeTab(),origin=originOf(tab?.url||"");
 if(!origin||BLOCK.test(origin+" "+(tab.title||""))){$("status").textContent="This source is blocked.";return;}
 const ok=await chrome.permissions.request({origins:[origin+"/*"]});
 if(ok){const {approvedOrigins=[]}=await chrome.storage.local.get({approvedOrigins:[]});if(!approvedOrigins.includes(origin))approvedOrigins.push(origin);await chrome.storage.local.set({approvedOrigins});$("status").textContent="Approved. Reopen this panel and capture when the dashboard shows transactions."; $("capture").disabled=false;$("enable").disabled=true;}
 else $("status").textContent="Permission was not granted.";
});
$("stop").addEventListener("click",async()=>{
 const tab=await activeTab(),origin=originOf(tab?.url||"");if(!origin)return;
 await chrome.permissions.remove({origins:[origin+"/*"]});
 const {approvedOrigins=[]}=await chrome.storage.local.get({approvedOrigins:[]});
 await chrome.storage.local.set({approvedOrigins:approvedOrigins.filter(x=>x!==origin)});
 $("status").textContent="Access revoked for "+origin;$("capture").disabled=true;$("enable").disabled=false;
});
$("capture").addEventListener("click",async()=>{
 const tab=await activeTab(),origin=originOf(tab?.url||"");
 if(!origin||BLOCK.test(origin+" "+(tab.title||""))){$("status").textContent="Capture blocked for this source.";return;}
 const allowed=await chrome.permissions.contains({origins:[origin+"/*"]});
 if(!allowed){$("status").textContent="Approve this site first.";return;}
 try{
  const results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
   const forbidden=/password|passcode|pin|otp|one.time.password|security code/i;
   const skip=new Set(["SCRIPT","STYLE","NOSCRIPT","INPUT","TEXTAREA","SELECT"]);
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   const parts=[];let node;
   while((node=walker.nextNode())&&parts.length<1500){const p=node.parentElement;if(!p||skip.has(p.tagName)||p.closest("input,textarea,select,[contenteditable=true]"))continue;const s=(node.nodeValue||"").replace(/\s+/g," ").trim();if(s.length>2&&!forbidden.test(s))parts.push(s);}
   const text=parts.join("\n");
   const lines=text.split("\n").filter(x=>/transaction|receipt|invoice|order|sale|paid|payment|amount|total|quantity|cashier|POS|reference|status|₦|NGN|USD|EUR|GBP/i.test(x));
   return {text:lines.slice(0,250).join("\n").slice(0,18000),pageTitle:document.title,source:location.origin};
  }});
  lastResult=results?.[0]?.result?.text||"No transaction-like text was found on this page.";
  $("result").textContent=lastResult;
  $("status").textContent="Captured visible business text for review. Nothing has been saved.";
 }catch(e){$("status").textContent="Capture failed: "+e.message;}
});
$("copy").addEventListener("click",async()=>{if(!lastResult)return;await navigator.clipboard.writeText(lastResult);$("status").textContent="Captured text copied. Paste it into Pelex for review.";});
check();
