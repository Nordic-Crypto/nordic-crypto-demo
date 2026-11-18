/* NordicCrypto: minimal service worker v2 (no system pop-up while the site is open). Makes the site installable as an app; it never caches anything, so clients always get the latest version. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* network only */ });

/* ---- push notifications (the push carries no text; the text is fetched from the server) ---- */
var NC_API = 'https://nordic-deposit-checker.otis-790.workers.dev/?action=pushPeek';
self.addEventListener('push', function (e) {
  e.waitUntil((async function () {
    var title = 'Nordic Crypto', body = 'You have a new notification', kind = '';
    try {
      var sub = await self.registration.pushManager.getSubscription();
      if (sub) {
        var r = await fetch(NC_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        var d = await r.json();
        if (d && d.ok) { title = d.title; body = d.body; kind = d.kind || ''; }
      }
    } catch (x) {}
    /* the site is open on screen: it already shows the notification and plays its own soft sound,
       so no system pop-up (and no system "ding" arriving late on top of it) */
    var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(function (w) { return w.visibilityState === 'visible' && w.focused; })) return;
    /* the site is open in another tab: it plays its own sound, so the pop-up stays quiet */
    var quiet = wins.some(function (w) { return /nordic|app\.html|\/app/i.test(w.url); });
    await self.registration.showNotification(title, { body: body, icon: '/logo-maskable-512.png', badge: '/logo-maskable-512.png', tag: 'nc-' + (kind || 'n'), renotify: false, silent: quiet, data: { kind: kind } });
  })());
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil((async function () {
    var all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < all.length; i++) { if (all[i].url.indexOf('/app.html') > -1) { try { await all[i].focus(); return; } catch (x) {} } }
    await self.clients.openWindow('/app.html');
  })());
});
