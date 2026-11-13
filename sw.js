// Pelex PWA service worker. Bump CACHE on each app-shell release.
// Navigation requests always go to Cloudflare first; cache is an offline fallback only.
const CACHE='uncle-pelex-v3';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try{await cache.addAll(['/','/manifest.webmanifest','/icon-192.png'])}catch(_){}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('uncle-pelex-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/functions/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/',copy));}
      return response;
    }).catch(()=>caches.match('/').then(cached=>cached||Response.error())));
    return;
  }
  event.respondWith(fetch(request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match('/')));
});
