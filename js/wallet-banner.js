/* NordicCrypto — wallet-banner.js v3
   Smart "next best action" promo on the dashboard. It shows ONE card for the single most important
   thing the client hasn't done yet (verify identity → connect wallet → turn on 2FA), with the NC
   reward for it. It switches to the next task when one is done, and hides when all are done,
   dismissed (×) or snoozed ("Later", 2 days). Task state comes from the NC rewards missions, so it
   never shows something already completed. */
(function () {
  'use strict';
  if (window.__ncWBanner) return; window.__ncWBanner = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    tag: ['Rewards', 'Belønning', 'Palkinto', 'Recompensa', 'Belønning', 'Belöning', 'Récompense', 'Prämie'],
    dismiss: ['Dismiss', 'Afvis', 'Hylkää', 'Descartar', 'Avvis', 'Avfärda', 'Ignorer', 'Schließen'],
    later: ['Later', 'Senere', 'Myöhemmin', 'Más tarde', 'Senere', 'Senare', 'Plus tard', 'Später'],
    help: ['New here? Get help', 'Ny her? Få hjælp', 'Uusi täällä? Pyydä apua', '¿Eres nuevo? Pide ayuda', 'Ny her? Få hjelp', 'Ny här? Få hjälp', 'Nouveau ? Obtenez de l’aide', 'Neu hier? Hilfe holen'],
    // wallet
    wallet_t: ['Connect your wallet', 'Tilknyt din wallet', 'Yhdistä lompakkosi', 'Vincula tu monedero', 'Koble til lommeboken din', 'Anslut din plånbok', 'Reliez votre portefeuille', 'Verbinde deine Wallet'],
    wallet_s: ['Link MetaMask, Trust or Exodus in two taps — your keys stay yours. We never ask for your recovery phrase.', 'Tilknyt MetaMask, Trust eller Exodus med to tryk — dine nøgler forbliver dine. Vi beder aldrig om din genoprettelsessætning.', 'Linkitä MetaMask, Trust tai Exodus kahdella napautuksella — avaimesi pysyvät sinulla. Emme koskaan kysy palautuslausettasi.', 'Vincula MetaMask, Trust o Exodus en dos toques: tus claves siguen siendo tuyas. Nunca pedimos tu frase de recuperación.', 'Koble til MetaMask, Trust eller Exodus med to trykk — nøklene dine forblir dine. Vi ber aldri om gjenopprettingsfrasen din.', 'Länka MetaMask, Trust eller Exodus med två tryck — dina nycklar förblir dina. Vi frågar aldrig efter din återställningsfras.', 'Reliez MetaMask, Trust ou Exodus en deux clics — vos clés restent les vôtres. Nous ne demandons jamais votre phrase de récupération.', 'Verbinde MetaMask, Trust oder Exodus mit zwei Taps — deine Schlüssel bleiben bei dir. Wir fragen nie nach deiner Wiederherstellungsphrase.'],
    wallet_c: ['Connect wallet', 'Tilknyt wallet', 'Yhdistä lompakko', 'Vincular monedero', 'Koble til lommebok', 'Anslut plånbok', 'Relier le portefeuille', 'Wallet verbinden'],
    // kyc
    kyc_t: ['Verify your identity', 'Bekræft din identitet', 'Vahvista henkilöllisyytesi', 'Verifica tu identidad', 'Bekreft identiteten din', 'Verifiera din identitet', 'Vérifiez votre identité', 'Verifiziere deine Identität'],
    kyc_s: ['Unlock withdrawals and higher limits — a quick ID check, done in minutes.', 'Lås op for udbetalinger og højere grænser — et hurtigt id-tjek på få minutter.', 'Avaa nostot ja korkeammat rajat — nopea henkilöllisyyden tarkistus minuuteissa.', 'Desbloquea retiros y límites más altos: una verificación rápida de identidad en minutos.', 'Lås opp uttak og høyere grenser — en rask ID-sjekk på noen minutter.', 'Lås upp uttag och högre gränser — en snabb ID-kontroll på några minuter.', 'Débloquez les retraits et des limites plus élevées — une vérification d’identité en quelques minutes.', 'Schalte Auszahlungen und höhere Limits frei — eine schnelle ID-Prüfung in Minuten.'],
    kyc_c: ['Verify now', 'Bekræft nu', 'Vahvista nyt', 'Verificar ahora', 'Bekreft nå', 'Verifiera nu', 'Vérifier', 'Jetzt verifizieren'],
    // twofa
    twofa_t: ['Turn on two-factor sign-in', 'Slå totrinslogin til', 'Ota kaksivaiheinen kirjautuminen käyttöön', 'Activa el inicio de sesión en dos pasos', 'Slå på tofaktorpålogging', 'Slå på tvåfaktorsinloggning', 'Activez la connexion à deux facteurs', 'Zwei-Faktor-Anmeldung aktivieren'],
    twofa_s: ['Add a second lock to your account — a minute with any authenticator app.', 'Tilføj en ekstra lås til din konto — et minut med en authenticator-app.', 'Lisää tilillesi toinen lukko — minuutti millä tahansa authenticator-sovelluksella.', 'Añade un segundo candado a tu cuenta: un minuto con cualquier app de autenticación.', 'Legg til en ekstra lås på kontoen — ett minutt med en autentiseringsapp.', 'Lägg till ett andra lås på kontot — en minut med valfri autentiseringsapp.', 'Ajoutez un second verrou à votre compte — une minute avec une app d’authentification.', 'Füge deinem Konto ein zweites Schloss hinzu — eine Minute mit einer Authenticator-App.'],
    twofa_c: ['Enable 2FA', 'Aktivér 2FA', 'Ota 2FA käyttöön', 'Activar 2FA', 'Aktiver 2FA', 'Aktivera 2FA', 'Activer la 2FA', '2FA aktivieren']
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

  /* ---------- icons ---------- */
  var ICONS = {
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13" r="1.3" fill="currentColor" stroke="none"/></svg>',
    kyc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.3 16c.5-1.4 1.8-2.2 3.2-2.2s2.7.8 3.2 2.2M14.5 9.5h3.5M14.5 12.5h3.5M14.5 15.5h2"/></svg>',
    twofa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none"/></svg>'
  };
  var COIN = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" fill="#ffd36b"/><circle cx="12" cy="12" r="9.5" fill="none" stroke="#e0a93a" stroke-width="1"/><path d="M8.6 15.5v-7l6.8 7v-7" stroke="#7a5408" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m0 0-6-6m6 6-6 6"/></svg>';
  var HELPIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5z"/><path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.8 2.5-2.8 2.5M12 16.2v.2"/></svg>';

  /* ---------- tasks (priority order; owner can override via window.NC_BANNER_ORDER) ---------- */
  function openTwofa() {
    var b = $('settingsBtn'); if (b) b.click();
    setTimeout(function () { var sec = document.querySelector('#settingsMask .sv-tab[data-t="sec"]'); if (sec) sec.click(); setTimeout(function () { var on = $('csOn'); if (on) on.click(); }, 320); }, 380);
  }
  var TASKS = [
    { id: 'kyc', reward: 200, icon: 'kyc', t: 'kyc_t', s: 'kyc_s', c: 'kyc_c', run: function () { try { if (typeof window.startVerification === 'function') window.startVerification(); else { var b = $('settingsBtn'); if (b) b.click(); } } catch (e) {} } },
    { id: 'wallet', reward: 50, icon: 'wallet', t: 'wallet_t', s: 'wallet_s', c: 'wallet_c', run: function () { try { if (typeof window.openWallets === 'function') window.openWallets(); } catch (e) {} } },
    { id: 'twofa', reward: 50, icon: 'twofa', t: 'twofa_t', s: 'twofa_s', c: 'twofa_c', run: openTwofa }
  ];
  function order() { var o = window.NC_BANNER_ORDER; if (!Array.isArray(o) || !o.length) return TASKS; var out = []; o.forEach(function (id) { var t = TASKS.filter(function (x) { return x.id === id; })[0]; if (t) out.push(t); }); return out.length ? out : TASKS; }

  function missions() { try { return (window.NCRewards && window.NCRewards.missions && window.NCRewards.missions()) || null; } catch (e) { return null; } }
  /* which task to promote: first incomplete in priority order. undefined = state unknown (don't show yet) */
  function pickTask() {
    var ms = missions();
    var haveWalletSignal = typeof window.__ncWalletCount === 'number';
    if (!ms && !haveWalletSignal) return undefined;
    var list = order();
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.id === 'wallet' && haveWalletSignal) { if (window.__ncWalletCount === 0) return t; continue; }
      if (!ms) { if (t.id === 'wallet') continue; return undefined; } /* need missions for kyc/twofa */
      var m = ms.filter(function (x) { return x.id === t.id; })[0];
      if (m && !m.done && !m.ready) return t;
    }
    return null; /* nothing to promote */
  }

  var css = (function () {
    var done = false;
    return function () {
      if (done || $('ncwbCss')) { done = true; return; } done = true;
      var s = document.createElement('style'); s.id = 'ncwbCss';
      s.textContent = [
        '#ncwb{position:relative;margin:0 0 16px;border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:14px;overflow:hidden;color:#eef5f2;',
        'background:linear-gradient(120deg,#11201d 0%,#0e1618 60%,#0c1416 100%);border:1px solid rgba(98,232,194,.22);box-shadow:0 10px 30px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)}',
        '#ncwb:before{content:"";position:absolute;right:-30px;top:-50px;width:200px;height:150px;border-radius:50%;background:radial-gradient(circle,#62e8c2,transparent 70%);opacity:.16;filter:blur(28px);pointer-events:none}',
        '#ncwb .ncwb-ic{position:relative;flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(140deg,#a6fbe2,#3fc9a3);color:#042a20;box-shadow:0 6px 16px rgba(98,232,194,.26),inset 0 1px 0 rgba(255,255,255,.5)}',
        '#ncwb .ncwb-ic svg{width:22px;height:22px}',
        '#ncwb .ncwb-m{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
        '#ncwb .ncwb-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}',
        '#ncwb h3{margin:0;font-size:15.5px;font-weight:720;letter-spacing:-.01em;line-height:1.2}',
        '#ncwb .ncwb-ey{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#62e8c2}',
        '#ncwb p{margin:0;font-size:12px;line-height:1.4;color:#93a79f;max-width:70ch}',
        '#ncwb .ncwb-foot{display:flex;align-items:center;gap:4px;margin-top:4px;flex-wrap:wrap}',
        '#ncwb .ncwb-later{border:1px solid rgba(255,255,255,.12);background:transparent;color:#aeb9b4;font:inherit;font-weight:600;font-size:11.5px;padding:5px 12px;border-radius:8px;cursor:pointer;transition:background .14s}#ncwb .ncwb-later:hover{background:rgba(255,255,255,.08)}',
        '#ncwb .ncwb-help{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:#7fe6cc;font:inherit;font-weight:600;font-size:11.5px;padding:5px 8px;border-radius:8px;cursor:pointer}#ncwb .ncwb-help:hover{text-decoration:underline}#ncwb .ncwb-help svg{width:13px;height:13px}',
        'html[data-theme="light"] #ncwb .ncwb-later{color:#4a655c;border-color:rgba(15,23,42,.14)}html[data-theme="light"] #ncwb .ncwb-help{color:#2bb58e}',
        '#ncwb .ncwb-r{flex:none;display:flex;align-items:center;gap:12px}',
        '#ncwb .ncwb-coin{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;background:rgba(255,211,107,.1);border:1px solid rgba(255,211,107,.24);font-weight:700;font-size:13px;color:#ffe1a0;white-space:nowrap}',
        '#ncwb .ncwb-coin svg{width:16px;height:16px}',
        '#ncwb .ncwb-cta{display:inline-flex;align-items:center;gap:7px;border:0;cursor:pointer;font:inherit;font-weight:700;font-size:13.5px;padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;box-shadow:0 8px 18px rgba(98,232,194,.24);transition:transform .14s,box-shadow .14s;white-space:nowrap}',
        '#ncwb .ncwb-cta:hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(98,232,194,.34)}#ncwb .ncwb-cta svg{width:15px;height:15px}',
        '#ncwb .ncwb-x{position:absolute;top:9px;right:9px;width:24px;height:24px;border-radius:8px;border:0;background:rgba(255,255,255,.05);color:#8fa09a;cursor:pointer;display:grid;place-items:center;font-size:15px;line-height:1;z-index:3}#ncwb .ncwb-x:hover{background:rgba(255,255,255,.12);color:#fff}',
        '@media(max-width:720px){#ncwb{flex-wrap:wrap;gap:12px;padding:13px 14px}#ncwb .ncwb-m{flex-basis:calc(100% - 54px)}#ncwb .ncwb-r{width:100%;justify-content:space-between}#ncwb .ncwb-cta{flex:1;justify-content:center}}',
        'html[data-theme="light"] #ncwb{background:linear-gradient(120deg,#eafff8,#f3fbf7 60%,#ffffff);border-color:rgba(43,181,142,.3);color:#0c2a22;box-shadow:0 10px 30px rgba(43,181,142,.12)}',
        'html[data-theme="light"] #ncwb h3{color:#0c2a22}html[data-theme="light"] #ncwb p{color:#4a655c}html[data-theme="light"] #ncwb .ncwb-coin{background:#fff7e6;border-color:rgba(180,130,15,.28);color:#9a6c0c}',
        'html[data-theme="light"] #ncwb .ncwb-x{background:rgba(15,23,42,.05);color:#4a655c}'
      ].join('');
      document.head.appendChild(s);
    };
  })();

  var curTask = null;
  function renderInto(b, task) {
    b.setAttribute('data-task', task.id);
    b.innerHTML =
      '<button type="button" class="ncwb-x" data-wb="x" aria-label="' + esc(T('dismiss')) + '">×</button>' +
      '<div class="ncwb-ic">' + ICONS[task.icon] + '</div>' +
      '<div class="ncwb-m"><div class="ncwb-row"><h3>' + esc(T(task.t)) + '</h3><span class="ncwb-ey">' + esc(T('tag')) + '</span></div>' +
      '<p>' + esc(T(task.s)) + '</p>' +
      '<div class="ncwb-foot"><button type="button" class="ncwb-later" data-wb="later">' + esc(T('later')) + '</button>' +
      '<button type="button" class="ncwb-help" data-wb="help">' + HELPIC + esc(T('help')) + '</button></div></div>' +
      '<div class="ncwb-r"><span class="ncwb-coin">' + COIN + '+' + task.reward + ' NC</span>' +
      '<button type="button" class="ncwb-cta" data-wb="go">' + esc(T(task.c)) + ARROW + '</button></div>';
  }
  function onClick(e) {
    var t = e.target.closest && e.target.closest('[data-wb]'); if (!t) return;
    var k = t.getAttribute('data-wb');
    if (k === 'x') { try { localStorage.setItem('nc_wbnr_x', '1'); } catch (x) {} remove(); return; }
    if (k === 'later') { snooze(); remove(); return; }
    if (k === 'help') { openHelp(); return; }
    if (k === 'go') { if (curTask && curTask.run) curTask.run(); }
  }

  function remove() { var b = $('ncwb'); if (b && b.parentNode) b.parentNode.removeChild(b); }

  function place() {
    if (!isClient() || dismissed() || snoozed()) { remove(); return; }
    if (window.__ncGSsuppress) { remove(); return; } /* the Getting-started checklist is showing all tasks — don't stack a second card */
    var dash = $('dash');
    var dashOn = dash && dash.classList.contains('on') && getComputedStyle(dash).display !== 'none';
    if (!dashOn) { remove(); return; }
    var task = pickTask();
    if (task === undefined) { if (missions() == null && window.NCRewards && window.NCRewards.refresh) { try { window.NCRewards.refresh(); } catch (e) {} } return; }
    if (!task) { curTask = null; remove(); return; }
    curTask = task;
    var host = dash, bd = $('bd'), anchor = (bd && bd.parentNode === host) ? bd : null;
    var b = $('ncwb');
    if (!b) { css(); b = document.createElement('div'); b.id = 'ncwb'; b.className = 'nc-no-i18n'; b.setAttribute('data-nci18n', 'off'); b.setAttribute('role', 'region'); b.addEventListener('click', onClick); renderInto(b, task); }
    else if (b.getAttribute('data-task') !== task.id) renderInto(b, task);
    if (b.parentNode !== host || b.nextElementSibling !== anchor) host.insertBefore(b, anchor || host.firstChild);
  }

  /* fast wallet signal: hide/switch the moment a wallet is connected */
  window.addEventListener('nc:wallets', function (e) { try { window.__ncWalletCount = (e.detail && e.detail.count) || 0; } catch (x) {} place(); });
  window.addEventListener('nc:rewards', function () { place(); });
  window.addEventListener('nc-lang', function () { var b = $('ncwb'); if (b && curTask) { renderInto(b, curTask); } });
  document.addEventListener('click', function (e) { var m = e.target.closest && e.target.closest('.mi[data-p="dash"]'); if (m) setTimeout(place, 60); }, true);

  /* one-time wallet count fetch so the wallet task resolves even before NC loads */
  function primeWallet() {
    if (typeof window.__ncWalletCount === 'number' || !isClient()) return;
    fetch(wurl() + '?action=wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), op: 'list' }) })
      .then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) window.__ncWalletCount = (d.wallets || []).length; place(); }).catch(function () {});
  }

  function boot() { if (!isClient()) { remove(); return; } primeWallet(); place(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 400);
  setInterval(function () { if (isClient()) place(); else remove(); }, 2500);
})();
