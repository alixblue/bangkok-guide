/* Offline support for the Bangkok guide.
   The page itself: network first, so updates show at once; cached copy when offline.
   Leaflet and fonts: cache first. Map tiles you have viewed: kept (up to ~800) for offline use. */
const V='bkk-app-v1',TILES='bkk-tiles-v1',MAX_TILES=800;
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const put=(name,req,res)=>caches.open(name).then(c=>c.put(req,res));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{if(res.ok)put(V,r,res.clone());return res})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./'))));
    return;
  }
  if(/(^|\.)cdnjs\.cloudflare\.com$|fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque')put(V,r,res.clone());return res})));
    return;
  }
  if(/tile\.openstreetmap\.org$/.test(u.hostname)){
    e.respondWith(caches.open(TILES).then(c=>c.match(r).then(m=>{
      const net=fetch(r).then(res=>{if(res.ok){c.put(r,res.clone());trim(c)}return res}).catch(()=>m||Response.error());
      return m||net;
    })));
  }
});
let trimming=false;
function trim(c){if(trimming)return;trimming=true;
  c.keys().then(k=>Promise.all(k.slice(0,Math.max(0,k.length-MAX_TILES)).map(x=>c.delete(x)))).finally(()=>{trimming=false})}
