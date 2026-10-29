/* NordicCrypto: push notifications (support replies, balance changes, withdrawals). Asks politely, once a week at most. */
(function () {
  'use strict';
  var API = 'https://nordic-deposit-checker.otis-790.workers.dev/';
  var T = {
    en: ['Turn on notifications?', 'Get a message when support replies or your balance changes.', 'Turn on', 'Not now'],
    da: ['Slå notifikationer til?', 'Få besked, når support svarer, eller din saldo ændres.', 'Slå til', 'Ikke nu'],
    fi: ['Otetaanko ilmoitukset käyttöön?', 'Saat viestin, kun tuki vastaa tai saldosi muuttuu.', 'Ota käyttöön', 'Ei nyt'],
    es: ['¿Activar las notificaciones?', 'Recibe un aviso cuando soporte responda o cambie tu saldo.', 'Activar', 'Ahora no'],
    no: ['Slå på varsler?', 'Få beskjed når support svarer eller saldoen din endres.', 'Slå på', 'Ikke nå'],
    sv: ['Slå på notiser?', 'Få ett meddelande när supporten svarar eller ditt saldo ändras.', 'Slå på', 'Inte nu'],
    fr: ['Activer les notifications ?', 'Recevez un message quand le support répond ou que votre solde change.', 'Activer', 'Plus tard'],
    de: ['Benachrichtigungen aktivieren?', 'Erhalten Sie eine Nachricht, wenn der Support antwortet oder sich Ihr Kontostand ändert.', 'Aktivieren', 'Nicht jetzt']
  };
  var LANGS = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  function lang() { var l = 'en'; try { l = localStorage.getItem('nc_lang') || (navigator.language || 'en').slice(0, 2); } catch (e) {} return LANGS.indexOf(l) > -1 ? l : 'en'; }
  function tok() { try { return localStorage.getItem('session_token'); } catch (e) { return null; } }
  var KEY = 'nc_push_dismissed';
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  function supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && /^https?:$/.test(location.protocol) && (!IOS || standalone()); }
  function post(action, body) {
    return fetch(API + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function u8(b64) { b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }

  function subscribe() {
    return navigator.serviceWorker.ready.then(function (reg) {
      return post('pushKey', {}).then(function (k) {
        if (!k || !k.key) throw new Error('key');
        return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) }); });
      });
    }).then(function (sub) { return post('pushSubscribe', { token: tok(), endpoint: sub.endpoint, lang: lang() }); });
  }
  window.NCPush = { enable: function () { return Notification.requestPermission().then(function (p) { if (p === 'granted') return subscribe(); }); } };

  function hide() { var e = document.getElementById('ncPush'); if (e) e.remove(); }
  function show() {
    if (document.getElementById('ncPush') || document.getElementById('ncInst')) return;
    var t = T[lang()];
    var d = document.createElement('div'); d.id = 'ncPush'; d.setAttribute('data-nci18n', 'off');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));max-width:460px;margin:0 auto;z-index:99989;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:16px;background:#12161f;color:#eef4ff;border:1px solid rgba(255,255,255,.12);box-shadow:0 10px 40px rgba(0,0,0,.5);font:14px system-ui,sans-serif';
    d.innerHTML = '<div style="font-size:26px">🔔</div><div style="flex:1;min-width:0"><b style="display:block">' + t[0] + '</b><small style="opacity:.7;font-size:12px">' + t[1] + '</small></div>' +
      '<button data-y style="border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;background:#c6ff3d;color:#07080c">' + t[2] + '</button>' +
      '<button data-n style="border:0;background:transparent;color:#9aa6b8;cursor:pointer;font-size:13px">' + t[3] + '</button>';
    d.querySelector('[data-y]').onclick = function () { hide(); window.NCPush.enable().catch(function () {}); };
    d.querySelector('[data-n]').onclick = function () { hide(); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} };
    document.body.appendChild(d);
  }
  function tick() {
    if (!supported() || !tok()) return;
    if (Notification.permission === 'granted') { if (!window.__ncPushSynced) { window.__ncPushSynced = true; subscribe().catch(function () {}); } return; }
    if (Notification.permission !== 'default') return;
    var last = 0; try { last = Number(localStorage.getItem(KEY) || 0); } catch (e) {}
    if (Date.now() - last < 7 * 864e5) return;
    show();
  }
  setTimeout(function () { tick(); setInterval(tick, 20000); }, 12000);
})();
