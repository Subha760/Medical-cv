import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
const paths = walk("dist").filter((p) => !p.endsWith("/sw.js"));
const version = createHash("sha256")
  .update(paths.map((p) => readFileSync(p)).join(""))
  .digest("hex")
  .slice(0, 12);
writeFileSync(
  "dist/sw.js",
  `const CACHE='medcv-${version}';const FILES=${JSON.stringify(paths.map((p) => "./" + p.slice(5)))};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('medcv-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(e.request,{ignoreVary:true});if(saved)return saved;try{return await fetch(e.request);}catch(error){if(e.request.mode==='navigate')return cache.match('./index.html');throw error;}}));});`,
);
console.log(`Offline cache prepared: ${paths.length} app resources`);
