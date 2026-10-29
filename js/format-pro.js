/* NordicCrypto: amounts in the client's own number format (592 977,91 kr, not "kr 592,977.91 SEK").
   Loaded after app.legacy.js; replaces the legacy formatters. The admin panel keeps the English format. */
(function () {
  'use strict';
  var LOC = { en: 'en-US', da: 'da-DK', fi: 'fi-FI', es: 'es-ES', no: 'nb-NO', sv: 'sv-SE', fr: 'fr-FR', de: 'de-DE' };
  function isAdmin() { try { return localStorage.getItem('user_role') === 'admin' && !window.adminViewingEmail; } catch (e) { return false; } }
  function loc() { if (isAdmin()) return 'en-US'; var l = 'en'; try { l = localStorage.getItem('nc_lang') || (navigator.language || 'en').slice(0, 2); } catch (e) {} return LOC[l] || 'en-US'; }
  var cache = {};
  function nf(cur, digits) {
    var k = loc() + '|' + cur + '|' + digits;
    if (!cache[k]) { try { cache[k] = new Intl.NumberFormat(loc(), { style: 'currency', currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits, currencyDisplay: 'narrowSymbol' }); } catch (e) { cache[k] = null; } }
    return cache[k];
  }
  function rate(cur) {
    var s = window.st || {};
    return cur === 'EUR' ? Number(s.eurR) : cur === 'SEK' ? Number(s.sekR) : cur === 'NOK' ? Number(s.nokR || 10.5) : cur === 'DKK' ? Number(s.dkkR || 6.9) : cur === 'GBP' ? Number(s.gbpR || 0.79) : 1;
  }
  function money(v, cur) { var f = nf(cur, 2); v = Number(v) || 0; return f ? f.format(v) : (v.toFixed(2) + ' ' + cur); }
  var oldCur = window.fmtCurrency, oldFmt = window.fmt, oldEur = window.eurF;
  window.fmtCurrency = function (usd) {
    var cur = (window.st && window.st.currency) || 'USD', r = rate(cur);
    if (!isFinite(r) || r <= 0) r = 1;
    return money(Number(usd) * (cur === 'USD' ? 1 : r), cur);
  };
  window.fmt = function (n) { return money(n, 'USD'); };
  window.eurF = function (n) { return '≈ ' + money(n, 'EUR'); };
  window.NCMoney = money;
})();
