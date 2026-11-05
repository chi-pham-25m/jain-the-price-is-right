/* Offline copy of the game. Sheet posts are never cached or replayed from here. */
var CACHE = 'jain-price-v1';
var SHELL = [
  './index.html',
  './manifest.webmanifest',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon.svg',
  './assets/pipeline/logo.svg',
  './assets/pipeline/search.svg',
  './assets/pipeline/bell.svg',
  './assets/pipeline/settings.svg',
  './assets/pipeline/chevron.svg',
  './assets/pipeline/stat-open.svg',
  './assets/pipeline/stat-await.svg',
  './assets/pipeline/stat-value.svg',
  './assets/pipeline/stat-due.svg',
  './assets/pipeline/section.svg',
  './assets/pipeline/plus.svg',
  './assets/pipeline/search-sm.svg',
  './assets/xray/stat-sqft.svg',
  './assets/xray/stat-term.svg',
  './assets/xray/stat-pay.svg',
  './assets/xray/stat-termn.svg',
  './assets/xray/stat-chat.svg',
  './assets/xray/back.svg',
  './assets/xray/upload.svg',
  './assets/xray/download.svg',
  './assets/checkin/issa-show.png',
  './assets/checkin/price-is-right.png',
  './assets/checkin/jain-mark.svg',
  './assets/checkin/pattern.png',
  './assets/mail/hero.png',
  './assets/mail/bulb.svg',
  './assets/mail/avatar.svg',
  './assets/mail/mark.svg',
  './assets/mail/gap.svg',
  './assets/mail/halo.svg',
  './assets/mail/dot-guess.svg',
  './assets/mail/dot-win.svg'
];

var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Archivo:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700;800&display=swap';

function pageURL(){
  return new URL('./index.html', self.registration.scope).href;
}

function cacheFonts(cache){
  return fetch(FONT_CSS, { mode: 'cors' }).then(function(res){
    if (!res || !res.ok) return;
    return res.text().then(function(css){
      return cache.put(FONT_CSS, new Response(css, { headers: { 'Content-Type': 'text/css' } })).then(function(){
        var urls = css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [];
        return Promise.all(urls.map(function(url){
          return fetch(url, { mode: 'cors' }).then(function(fontRes){
            if (fontRes && fontRes.ok) return cache.put(url, fontRes);
          }).catch(function(){});
        }));
      });
    });
  }).catch(function(){});
}

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(SHELL).then(function(){ return cacheFonts(cache); });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(key){ return key !== CACHE; }).map(function(key){ return caches.delete(key); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function networkFirstPage(request){
  return fetch(request).then(function(res){
    var copy = res.clone();
    caches.open(CACHE).then(function(cache){ cache.put(pageURL(), copy); });
    return res;
  }).catch(function(){
    return caches.match(pageURL()).then(function(hit){ return hit || Response.error(); });
  });
}

function cacheFirst(request){
  return caches.match(request, { ignoreSearch: true }).then(function(hit){
    var network = fetch(request).then(function(res){
      if (res && res.ok){
        var copy = res.clone();
        caches.open(CACHE).then(function(cache){ cache.put(request, copy); });
      }
      return res;
    }).catch(function(){ return hit; });
    return hit || network;
  });
}

self.addEventListener('fetch', function(event){
  var request = event.request;
  if (request.method !== 'GET') return;
  var url;
  try { url = new URL(request.url); } catch (err) { return; }
  if (url.hostname === 'script.google.com') return;
  if (request.mode === 'navigate'){
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    event.respondWith(cacheFirst(request));
  }
});
