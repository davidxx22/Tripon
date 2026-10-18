const CACHE='tripon-shell-v14';
const FILES=['./','./index.html','./styles.css','./app.js','./assistant.js','./core.js','./trips.js','./sync-core.js','./sync.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable-512.png','./assets/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('tripon-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'OFFLINE_READY'});})()));
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_READY')event.waitUntil(caches.has(CACHE).then(ready=>{if(ready)event.source?.postMessage({type:'OFFLINE_READY'});}));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/api/'))return;
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // Serve a complete version of the shell from one cache. A new worker waits
    // until old tabs close, avoiding mixed versions during offline edits.
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return (await cache.match('./index.html'))||Response.error();throw error;}
  })());
});
