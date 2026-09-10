const C='burbupet-erp-v9';

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(C).then(cache=>cache.addAll([
    './',
    'styles.css',
    'reference.css',
    'forms.css',
    'app.js',
    'burbupet-logo.png',
    'manifest.webmanifest'
  ])));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==C).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method==='GET'){
    event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
  }
});
