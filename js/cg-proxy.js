/* NordicCrypto: CoinGecko answers browsers with 429/CORS errors, so its price + chart calls are relayed through our Worker
   (cached at the edge). If the relay is unreachable the original request is made as before. Load this FIRST, before any other script. */
(function () {
  'use strict';
  if (window.__cgp || !window.fetch) return; window.__cgp = 1;
  var P = 'https://api.coingecko.com/api/v3/', W = 'https://nordic-deposit-checker.otis-790.workers.dev/?action=cg', of = window.fetch;
  window.fetch = function (u, o) {
    var s = ''; try { s = typeof u === 'string' ? u : (u && u.url) || ''; } catch (e) { }
    if (s.indexOf(P) !== 0) return of.apply(this, arguments);
    var self = this, args = arguments;
    return of.call(self, W, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: s.slice(P.length) }), signal: o && o.signal })
      .then(function (r) { if (!r.ok) throw new Error('relay'); return r; })
      .catch(function (err) { if (err && err.name === 'AbortError') throw err; return of.apply(self, args); });
  };
})();
