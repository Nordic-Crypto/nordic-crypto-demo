/* NordicCrypto: minimal service worker. Makes the site installable as an app; it never caches anything, so clients always get the latest version. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* network only */ });
