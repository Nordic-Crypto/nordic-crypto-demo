/* NordicCrypto — wallet-banner.js v1
   A premium "Connect your wallet → +50 NC" promo on the dashboard.
   Shows only for a real client who has NOT linked a wallet yet and has not dismissed it.
   Clicking opens the wallet screen; it hides itself the moment a wallet is connected. */
(function () {
  'use strict';
  if (window.__ncWBanner) return; window.__ncWBanner = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    tag: ['Rewards', 'Belønning', 'Palkinto', 'Recompensa', 'Belønning', 'Belöning', 'Récompense', 'Prämie'],
    title: ['Connect your wallet', 'Tilknyt din wallet', 'Yhdistä lompakkosi', 'Vincula tu monedero', 'Koble til lommeboken din', 'Anslut din plånbok', 'Reliez votre portefeuille', 'Verbinde deine Wallet'],
    sub: ['Link MetaMask, Trust or Exodus in two taps — your keys stay yours. We never ask for your recovery phrase.', 'Tilknyt MetaMask, Trust eller Exodus med to tryk — dine nøgler forbliver dine. Vi beder aldrig om din genoprettelsessætning.', 'Linkitä MetaMask, Trust tai Exodus kahdella napautuksella — avaimesi pysyvät sinulla. Emme koskaan kysy palautuslausettasi.', 'Vincula MetaMask, Trust o Exodus en dos toques: tus claves siguen siendo tuyas. Nunca pedimos tu frase de recuperación.', 'Koble til MetaMask, Trust eller Exodus med to trykk — nøklene dine forblir dine. Vi ber aldri om gjenopprettingsfrasen din.', 'Länka MetaMask, Trust eller Exodus med två tryck — dina nycklar förblir dina. Vi frågar aldrig efter din återställningsfras.', 'Reliez MetaMask, Trust ou Exodus en deux clics — vos clés restent les vôtres. Nous ne demandons jamais votre phrase de récupération.', 'Verbinde MetaMask, Trust oder Exodus mit zwei Taps — deine Schlüssel bleiben bei dir. Wir fragen nie nach deiner Wiederherstellungsphrase.'],
    cta: ['Connect wallet', 'Tilknyt wallet', 'Yhdistä lompakko', 'Vincular monedero', 'Koble til lommebok', 'Anslut plånbok', 'Relier le portefeuille', 'Wallet verbinden'],
    reward: ['+50 NC', '+50 NC', '+50 NC', '+50 NC', '+50 NC', '+50 NC', '+50 NC', '+50 NC'],
    earn: ['Earn 50 NC', 'Tjen 50 NC', 'Ansaitse 50 NC', 'Gana 50 NC', 'Tjen 50 NC', 'Tjäna 50 NC', 'Gagnez 50 NC', 'Verdiene 50 NC'],
    dismiss: ['Dismiss', 'Afvis', 'Hylkää', 'Descartar', 'Avvis', 'Avfärda', 'Ignorer', 'Schließen'],
    later: ['Later', 'Senere', 'Myöhemmin', 'Más tarde', 'Senere', 'Senare', 'Plus tard', 'Später'],
    help: ['No wallet yet? Get help', 'Ingen wallet endnu? Få hjælp', 'Ei vielä lompakkoa? Pyydä apua', '¿Aún sin monedero? Pide ayuda', 'Ingen lommebok ennå? Få hjelp', 'Ingen plånbok ännu? Få hjälp', 'Pas encore de portefeuille ? Obtenez de l’aide', 'Noch keine Wallet? Hilfe holen']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k) { var a = K[k]; return a ? (a[LG.indexOf(lang())] || a[0]) : k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function isClient() { try { return !!tok() && localStorage.getItem('user_role') !== 'admin' && !window.adminViewingEmail; } catch (e) { return false; } }
  function dismissed() { try { return localStorage.getItem('nc_wbnr_x') === '1'; } catch (e) { return false; } }
  var SNOOZE_MS = 2 * 24 * 60 * 60 * 1000; /* "Later" hides the banner for 2 days */
  function snoozed() { try { var t = +localStorage.getItem('nc_wbnr_snz') || 0; return Date.now() < t; } catch (e) { return false; } }
  function snooze() { try { localStorage.setItem('nc_wbnr_snz', String(Date.now() + SNOOZE_MS)); } catch (e) {} }
  function openHelp() {
    try {
      var p = $('chatPanel');
      var open = p && (p.style.display === 'flex' || document.documentElement.classList.contains('nc-chat-open'));
      if (open) return;
      if (typeof window.openChat === 'function') window.openChat();
      else if (typeof window.toggleChat === 'function') window.toggleChat();
      else { var fab = $('chatToggle') || document.querySelector('[data-a="chat"],.chat-fab'); if (fab) fab.click(); }
    } catch (e) {}
  }
  function wurl() { return window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev'; }

  var hasWallet = null; /* null = unknown yet */

  function css() {
    if ($('ncwbCss')) return; var s = document.createElement('style'); s.id = 'ncwbCss';
    s.textContent = [
      '#ncwb{position:relative;margin:0 0 20px;border-radius:22px;padding:20px 22px;display:flex;align-items:center;gap:18px;overflow:hidden;color:#eef5f2;',
      'background:linear-gradient(120deg,#10211d 0%,#0d1719 55%,#0c1416 100%);border:1px solid rgba(98,232,194,.28);box-shadow:0 20px 50px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(98,232,194,.05)}',
      '#ncwb:before{content:"";position:absolute;right:-40px;top:-60px;width:260px;height:200px;border-radius:50%;background:radial-gradient(circle,#62e8c2,transparent 70%);opacity:.22;filter:blur(30px);pointer-events:none}',
      '#ncwb:after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.14) 48%,transparent 60%);transform:translateX(-130%);animation:ncwbSh 5.5s ease-in-out 1.2s infinite;pointer-events:none}',
      '@keyframes ncwbSh{0%,55%{transform:translateX(-130%)}80%,100%{transform:translateX(130%)}}',
      '#ncwb .ncwb-ic{position:relative;flex:none;width:58px;height:58px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(140deg,#a6fbe2,#3fc9a3);color:#042a20;box-shadow:0 10px 24px rgba(98,232,194,.3),inset 0 1px 0 rgba(255,255,255,.5)}',
      '#ncwb .ncwb-ic svg{width:30px;height:30px}',
      '#ncwb .ncwb-ic i{position:absolute;width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff;opacity:0;animation:ncwbSp 3s ease-in-out infinite}',
      '#ncwb .ncwb-ic i:nth-child(2){top:-3px;right:6px;animation-delay:.2s}#ncwb .ncwb-ic i:nth-child(3){bottom:2px;right:-3px;animation-delay:1.1s}#ncwb .ncwb-ic i:nth-child(4){top:8px;left:-3px;animation-delay:1.9s}',
      '@keyframes ncwbSp{0%,100%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1)}}',
      '#ncwb .ncwb-m{flex:1;min-width:0}',
      '#ncwb .ncwb-tag{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#62e8c2;margin-bottom:5px}',
      '#ncwb .ncwb-tag b{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;background:rgba(98,232,194,.14);color:#8ff0d6;font-weight:800;letter-spacing:.02em}',
      '#ncwb h3{margin:0;font-size:19px;font-weight:760;letter-spacing:-.02em;line-height:1.15}',
      '#ncwb p{margin:5px 0 0;font-size:12.5px;line-height:1.5;color:#9fb3ad;max-width:62ch}',
      '#ncwb .ncwb-foot{display:flex;align-items:center;gap:8px;margin-top:11px;flex-wrap:wrap}',
      '#ncwb .ncwb-later{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#c6d2ce;font:inherit;font-weight:600;font-size:12.5px;padding:7px 15px;border-radius:10px;cursor:pointer;transition:background .14s}#ncwb .ncwb-later:hover{background:rgba(255,255,255,.1)}',
      '#ncwb .ncwb-help{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#8ff0d6;font:inherit;font-weight:600;font-size:12.5px;padding:7px 6px;border-radius:10px;cursor:pointer}#ncwb .ncwb-help:hover{text-decoration:underline}#ncwb .ncwb-help svg{width:14px;height:14px}',
      'html[data-theme="light"] #ncwb .ncwb-later{background:#fff;border-color:rgba(15,23,42,.12);color:#3f5a52}html[data-theme="light"] #ncwb .ncwb-help{color:#2bb58e}',
      '#ncwb .ncwb-r{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:10px}',
      '#ncwb .ncwb-coin{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-weight:800;font-size:15px;color:#ffe9a8}',
      '#ncwb .ncwb-coin svg{width:19px;height:19px}',
      '#ncwb .ncwb-cta{display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;font:inherit;font-weight:740;font-size:14.5px;padding:12px 22px;border-radius:14px;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;box-shadow:0 10px 24px rgba(98,232,194,.28);transition:transform .14s,box-shadow .14s;white-space:nowrap}',
      '#ncwb .ncwb-cta:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(98,232,194,.38)}#ncwb .ncwb-cta svg{width:16px;height:16px}',
      '#ncwb .ncwb-x{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:9px;border:0;background:rgba(255,255,255,.06);color:#9fb3ad;cursor:pointer;display:grid;place-items:center;font-size:16px;line-height:1;z-index:3}#ncwb .ncwb-x:hover{background:rgba(255,255,255,.12);color:#fff}',
      '@media(max-width:720px){#ncwb{flex-direction:column;align-items:flex-start;gap:14px;padding:18px}#ncwb .ncwb-r{flex-direction:row;align-items:center;width:100%;justify-content:space-between}#ncwb .ncwb-cta{flex:1;justify-content:center}#ncwb p{font-size:12px}}',
      /* light theme */
      'html[data-theme="light"] #ncwb{background:linear-gradient(120deg,#eafff8,#f2fbf6 60%,#ffffff);border-color:rgba(43,181,142,.35);color:#0c2a22;box-shadow:0 18px 44px rgba(43,181,142,.14)}',
      'html[data-theme="light"] #ncwb h3{color:#0c2a22}html[data-theme="light"] #ncwb p{color:#3f5a52}html[data-theme="light"] #ncwb .ncwb-coin{background:#fff;border-color:rgba(15,23,42,.1);color:#b4820f}',
      'html[data-theme="light"] #ncwb .ncwb-x{background:rgba(15,23,42,.05);color:#3f5a52}html[data-theme="light"] #ncwb:after{background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.5) 48%,transparent 60%)}'
    ].join('');
    document.head.appendChild(s);
  }

  var WALLET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13" r="1.3" fill="currentColor" stroke="none"/></svg>';
  var COIN = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ffd36b"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#b9820f" stroke-width="1.3"/><path d="M12 7.5v9M9.5 10h4a1.6 1.6 0 0 1 0 3.2h-4m0 0h4.3" stroke="#8a5e08" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m0 0-6-6m6 6-6 6"/></svg>';
  var HELPIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5z"/><path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.8 2.5-2.8 2.5M12 16.2v.2"/></svg>';

  function build() {
    var b = document.createElement('div'); b.id = 'ncwb'; b.className = 'nc-no-i18n'; b.setAttribute('data-nci18n', 'off'); b.setAttribute('role', 'region');
    b.innerHTML =
      '<button type="button" class="ncwb-x" data-wb="x" aria-label="' + esc(T('dismiss')) + '">×</button>' +
      '<div class="ncwb-ic">' + WALLET + '<i></i><i></i><i></i></div>' +
      '<div class="ncwb-m"><div class="ncwb-tag">' + esc(T('tag')) + ' <b>' + COIN + esc(T('earn')) + '</b></div>' +
      '<h3>' + esc(T('title')) + '</h3><p>' + esc(T('sub')) + '</p>' +
      '<div class="ncwb-foot"><button type="button" class="ncwb-later" data-wb="later">' + esc(T('later')) + '</button>' +
      '<button type="button" class="ncwb-help" data-wb="help">' + HELPIC + esc(T('help')) + '</button></div></div>' +
      '<div class="ncwb-r"><span class="ncwb-coin">' + COIN + esc(T('reward')) + '</span>' +
      '<button type="button" class="ncwb-cta" data-wb="go">' + esc(T('cta')) + ARROW + '</button></div>';
    b.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-wb]'); if (!t) return;
      var k = t.getAttribute('data-wb');
      if (k === 'x') { try { localStorage.setItem('nc_wbnr_x', '1'); } catch (x) {} remove(); return; }
      if (k === 'later') { snooze(); remove(); return; }
      if (k === 'help') { openHelp(); return; }
      if (k === 'go') { try { if (typeof window.openWallets === 'function') window.openWallets(); } catch (x) {} }
    });
    return b;
  }

  function remove() { var b = $('ncwb'); if (b && b.parentNode) b.parentNode.removeChild(b); }

  function shouldShow() { return isClient() && !dismissed() && !snoozed() && hasWallet === false; }

  function place() {
    if (!shouldShow()) { remove(); return; }
    var dash = $('dash');
    var dashOn = dash && dash.classList.contains('on') && getComputedStyle(dash).display !== 'none';
    if (!dashOn) { remove(); return; }
    /* bankdash-pro renders the dashboard as a fixed grid (#bd); place the banner ABOVE the grid,
       inside #dash right before #bd, so it is full-width and never fights the grid areas. */
    var host = dash;
    var bd = $('bd');
    var anchor = (bd && bd.parentNode === host) ? bd : null;
    var b = $('ncwb');
    if (!b) { css(); b = build(); }
    if (b.parentNode !== host || b.nextElementSibling !== anchor) { host.insertBefore(b, anchor || host.firstChild); }
  }

  function checkWallet() {
    if (typeof window.__ncWalletCount === 'number') { hasWallet = window.__ncWalletCount > 0; place(); return; }
    if (!isClient()) return;
    fetch(wurl() + '?action=wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), op: 'list' }) })
      .then(function (r) { return r.json(); }).then(function (d) { hasWallet = !!(d && d.ok && (d.wallets || []).length > 0); place(); })
      .catch(function () {});
  }

  window.addEventListener('nc:wallets', function (e) { try { hasWallet = (e.detail && e.detail.count || 0) > 0; } catch (x) { hasWallet = true; } place(); });
  window.addEventListener('nc-lang', function () { if ($('ncwb')) { remove(); place(); } });
  document.addEventListener('click', function (e) { var m = e.target.closest && e.target.closest('.mi[data-p="dash"]'); if (m) setTimeout(place, 60); }, true);

  function boot() { if (!isClient()) { remove(); return; } checkWallet(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 400);
  setInterval(function () { if (isClient()) { if (hasWallet === null) checkWallet(); else place(); } else remove(); }, 2500);
})();
