// Service worker: network-first for pages so new deploys show immediately; cache is only an offline fallback. Never cache API calls.
const CACHE='uncle-pelex-v2';
const SHELL=['/','/index.html','/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.startsWith('/.netlify/functions/')) return; // always go to network for API calls
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}
    return res
  }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('/index.html'))));
});
