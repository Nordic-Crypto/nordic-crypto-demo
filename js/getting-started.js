/* NordicCrypto — getting-started.js v1
   A compact onboarding checklist on the dashboard: Verify identity → Connect wallet → Turn on 2FA,
   with a progress bar ("X of 3"). Each unfinished step has a one-tap action; finished steps show a ✓.
   When all three are done it disappears for good; the client can also dismiss it with ×.
   While the checklist is visible it suppresses the single "next best action" banner (window.__ncGSsuppress)
   so the dashboard never shows two reward cards at once. State comes from the NC rewards missions and the
   connected-wallet count — never from anything the browser could fake. */
(function () {
  'use strict';
  if (window.__ncGS) return; window.__ncGS = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['Getting started', 'Kom godt i gang', 'Näin pääset alkuun', 'Primeros pasos', 'Kom i gang', 'Kom igång', 'Pour commencer', 'Erste Schritte'],
    sub: ['Finish setup to unlock your account', 'Afslut opsætningen for at låse din konto op', 'Viimeistele käyttöönotto avataksesi tilisi', 'Completa la configuración para desbloquear tu cuenta', 'Fullfør oppsettet for å låse opp kontoen', 'Slutför konfigurationen för att låsa upp kontot', 'Terminez la configuration pour débloquer votre compte', 'Schließe die Einrichtung ab, um dein Konto freizuschalten'],
    prog: ['{n} of {t} done', '{n} af {t} fuldført', '{n}/{t} valmiina', '{n} de {t} completado', '{n} av {t} fullført', '{n} av {t} klara', '{n} sur {t} terminé', '{n} von {t} erledigt'],
    allDone: ['All set — your account is fully configured 🎉', 'Alt er klar — din konto er fuldt konfigureret 🎉', 'Valmista — tilisi on täysin määritetty 🎉', 'Todo listo: tu cuenta está completamente configurada 🎉', 'Alt klart — kontoen din er fullt konfigurert 🎉', 'Allt klart — ditt konto är helt konfigurerat 🎉', 'Tout est prêt — votre compte est entièrement configuré 🎉', 'Alles erledigt — dein Konto ist vollständig eingerichtet 🎉'],
    dismiss: ['Dismiss', 'Afvis', 'Hylkää', 'Descartar', 'Avvis', 'Avfärda', 'Ignorer', 'Schließen'],
    done: ['Done', 'Færdig', 'Valmis', 'Hecho', 'Ferdig', 'Klar', 'Terminé', 'Erledigt'],
    // steps
    kyc_t: ['Verify your identity', 'Bekræft din identitet', 'Vahvista henkilöllisyytesi', 'Verifica tu identidad', 'Bekreft identiteten din', 'Verifiera din identitet', 'Vérifiez votre identité', 'Verifiziere deine Identität'],
    kyc_s: ['Unlock withdrawals and higher limits', 'Lås op for udbetalinger og højere grænser', 'Avaa nostot ja korkeammat rajat', 'Desbloquea retiros y límites más altos', 'Lås opp uttak og høyere grenser', 'Lås upp uttag och högre gränser', 'Débloquez les retraits et des limites plus élevées', 'Schalte Auszahlungen und höhere Limits frei'],
    kyc_c: ['Verify', 'Bekræft', 'Vahvista', 'Verificar', 'Bekreft', 'Verifiera', 'Vérifier', 'Verifizieren'],
    wallet_t: ['Connect your wallet', 'Tilknyt din wallet', 'Yhdistä lompakkosi', 'Vincula tu monedero', 'Koble til lommeboken din', 'Anslut din plånbok', 'Reliez votre portefeuille', 'Verbinde deine Wallet'],
    wallet_s: ['Link MetaMask, Trust or Exodus — keys stay yours', 'Tilknyt MetaMask, Trust eller Exodus — nøglerne er dine', 'Linkitä MetaMask, Trust tai Exodus — avaimet pysyvät sinulla', 'Vincula MetaMask, Trust o Exodus — tus claves son tuyas', 'Koble til MetaMask, Trust eller Exodus — nøklene er dine', 'Länka MetaMask, Trust eller Exodus — nycklarna är dina', 'Reliez MetaMask, Trust ou Exodus — vos clés restent les vôtres', 'Verbinde MetaMask, Trust oder Exodus — die Schlüssel bleiben deine'],
    wallet_c: ['Connect', 'Tilknyt', 'Yhdistä', 'Vincular', 'Koble til', 'Anslut', 'Relier', 'Verbinden'],
    twofa_t: ['Turn on two-factor sign-in', 'Slå totrinslogin til', 'Ota kaksivaiheinen kirjautuminen käyttöön', 'Activa el inicio de sesión en dos pasos', 'Slå på tofaktorpålogging', 'Slå på tvåfaktorsinloggning', 'Activez la connexion à deux facteurs', 'Zwei-Faktor-Anmeldung aktivieren'],
    twofa_s: ['Add a second lock to your account', 'Tilføj en ekstra lås til din konto', 'Lisää tilillesi toinen lukko', 'Añade un segundo candado a tu cuenta', 'Legg til en ekstra lås på kontoen', 'Lägg till ett andra lås på kontot', 'Ajoutez un second verrou à votre compte', 'Füge deinem Konto ein zweites Schloss hinzu'],
    twofa_c: ['Enable', 'Aktivér', 'Ota käyttöön', 'Activar', 'Aktiver', 'Aktivera', 'Activer', 'Aktivieren']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k], s = a ? (a[LG.indexOf(lang())] || a[0]) : k; if (v) for (var p in v) s = s.replace('{' + p + '}', v[p]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function isClient() { try { return !!tok() && localStorage.getItem('user_role') !== 'admin' && !window.adminViewingEmail; } catch (e) { return false; } }
  function dismissed() { try { return localStorage.getItem('nc_gs_x') === '1' || localStorage.getItem('nc_gs_done') === '1'; } catch (e) { return false; } }
  function wurl() { return window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev'; }

  var ICONS = {
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13" r="1.3" fill="currentColor" stroke="none"/></svg>',
    kyc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.3 16c.5-1.4 1.8-2.2 3.2-2.2s2.7.8 3.2 2.2M14.5 9.5h3.5M14.5 12.5h3.5M14.5 15.5h2"/></svg>',
    twofa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
  };

  function openTwofa() {
    var b = $('settingsBtn'); if (b) b.click();
    setTimeout(function () { var sec = document.querySelector('#settingsMask .sv-tab[data-t="sec"]'); if (sec) sec.click(); setTimeout(function () { var on = $('csOn'); if (on) on.click(); }, 320); }, 380);
  }
  var STEPS = [
    { id: 'kyc', icon: 'kyc', t: 'kyc_t', s: 'kyc_s', c: 'kyc_c', run: function () { try { if (typeof window.startVerification === 'function') window.startVerification(); else { var b = $('settingsBtn'); if (b) b.click(); } } catch (e) {} } },
    { id: 'wallet', icon: 'wallet', t: 'wallet_t', s: 'wallet_s', c: 'wallet_c', run: function () { try { if (typeof window.openWallets === 'function') window.openWallets(); } catch (e) {} } },
    { id: 'twofa', icon: 'twofa', t: 'twofa_t', s: 'twofa_s', c: 'twofa_c', run: openTwofa }
  ];

  function missions() { try { return (window.NCRewards && window.NCRewards.missions && window.NCRewards.missions()) || null; } catch (e) { return null; } }
  /* returns { known:bool, done:{kyc,wallet,twofa} } — known=false while state is still unresolved */
  function state() {
    var ms = missions();
    var haveWallet = typeof window.__ncWalletCount === 'number';
    if (!ms && !haveWallet) return { known: false };
    function m(id) { if (!ms) return null; return ms.filter(function (x) { return x.id === id; })[0] || null; }
    var kyc = m('kyc'), tf = m('twofa');
    // need missions for kyc/twofa; need wallet signal for wallet
    if (!ms || !haveWallet) return { known: false };
    return {
      known: true,
      done: {
        kyc: !!(kyc && (kyc.done || kyc.ready)),
        wallet: window.__ncWalletCount > 0,
        twofa: !!(tf && (tf.done || tf.ready))
      }
    };
  }

  var css = (function () {
    var done = false;
    return function () {
      if (done || $('ncgsCss')) { done = true; return; } done = true;
      var s = document.createElement('style'); s.id = 'ncgsCss';
      s.textContent = [
        '#ncgs{position:relative;margin:0 0 16px;border-radius:16px;padding:16px 18px;color:#eef5f2;overflow:hidden;',
        'background:linear-gradient(120deg,#11201d 0%,#0e1618 60%,#0c1416 100%);border:1px solid rgba(98,232,194,.2);box-shadow:0 10px 30px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)}',
        '#ncgs:before{content:"";position:absolute;right:-30px;top:-50px;width:200px;height:150px;border-radius:50%;background:radial-gradient(circle,#62e8c2,transparent 70%);opacity:.14;filter:blur(28px);pointer-events:none}',
        '#ncgs .gs-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}',
        '#ncgs .gs-h{flex:1;min-width:0}',
        '#ncgs h3{margin:0;font-size:16px;font-weight:740;letter-spacing:-.01em}',
        '#ncgs .gs-sub{margin:2px 0 0;font-size:12px;color:#93a79f}',
        '#ncgs .gs-pct{flex:none;font-size:12px;font-weight:800;color:#8ff0d6;white-space:nowrap;padding-top:2px;margin-right:26px}',
        '#ncgs .gs-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:14px}',
        '#ncgs .gs-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#a6fbe2,#45cfa8);transition:width .5s cubic-bezier(.2,.7,.2,1)}',
        '#ncgs .gs-row{display:flex;align-items:center;gap:13px;padding:10px 0;border-top:1px solid rgba(255,255,255,.06)}#ncgs .gs-row:first-of-type{border-top:0}',
        '#ncgs .gs-ic{flex:none;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:#9fb3ac;border:1px solid rgba(255,255,255,.07)}#ncgs .gs-ic svg{width:20px;height:20px}',
        '#ncgs .gs-row.ok .gs-ic{background:linear-gradient(140deg,#a6fbe2,#3fc9a3);color:#042a20;border-color:transparent}',
        '#ncgs .gs-m{flex:1;min-width:0}#ncgs .gs-m b{display:block;font-size:14px;font-weight:650;line-height:1.25}#ncgs .gs-row.ok .gs-m b{color:#8fb8ac;text-decoration:line-through;text-decoration-color:rgba(143,184,172,.5)}',
        '#ncgs .gs-m small{display:block;font-size:11.5px;color:#859790;margin-top:1px}',
        '#ncgs .gs-cta{flex:none;border:0;cursor:pointer;font:inherit;font-weight:700;font-size:12.5px;padding:8px 15px;border-radius:10px;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;box-shadow:0 6px 14px rgba(98,232,194,.22);transition:transform .14s}#ncgs .gs-cta:hover{transform:translateY(-1px)}',
        '#ncgs .gs-okt{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#62e8c2}#ncgs .gs-okt svg{width:14px;height:14px}',
        '#ncgs .gs-x{position:absolute;top:11px;right:11px;width:24px;height:24px;border-radius:8px;border:0;background:rgba(255,255,255,.05);color:#8fa09a;cursor:pointer;display:grid;place-items:center;font-size:15px;line-height:1;z-index:3}#ncgs .gs-x:hover{background:rgba(255,255,255,.12);color:#fff}',
        '@media(max-width:560px){#ncgs .gs-m small{display:none}#ncgs .gs-cta{padding:8px 13px}}',
        'html[data-theme="light"] #ncgs{background:linear-gradient(120deg,#eafff8,#f3fbf7 60%,#fff);border-color:rgba(43,181,142,.28);color:#0c2a22;box-shadow:0 10px 30px rgba(43,181,142,.12)}',
        'html[data-theme="light"] #ncgs h3{color:#0c2a22}html[data-theme="light"] #ncgs .gs-sub{color:#4a655c}html[data-theme="light"] #ncgs .gs-ic{background:rgba(15,23,42,.04);color:#4a655c;border-color:rgba(15,23,42,.08)}',
        'html[data-theme="light"] #ncgs .gs-bar{background:rgba(15,23,42,.08)}html[data-theme="light"] #ncgs .gs-m small{color:#64776f}html[data-theme="light"] #ncgs .gs-x{background:rgba(15,23,42,.05);color:#4a655c}'
      ].join('');
      document.head.appendChild(s);
    };
  })();

  function renderInto(b, st) {
    var d = st.done, n = (d.kyc ? 1 : 0) + (d.wallet ? 1 : 0) + (d.twofa ? 1 : 0), total = STEPS.length;
    var pct = Math.round(n / total * 100);
    var rows = STEPS.map(function (step) {
      var ok = !!d[step.id];
      return '<div class="gs-row' + (ok ? ' ok' : '') + '">' +
        '<div class="gs-ic">' + (ok ? ICONS.check : ICONS[step.icon]) + '</div>' +
        '<div class="gs-m"><b>' + esc(T(step.t)) + '</b><small>' + esc(T(step.s)) + '</small></div>' +
        (ok ? '<span class="gs-okt">' + ICONS.check + esc(T('done')) + '</span>'
            : '<button type="button" class="gs-cta" data-gs="go" data-id="' + esc(step.id) + '">' + esc(T(step.c)) + '</button>') +
        '</div>';
    }).join('');
    b.innerHTML =
      '<button type="button" class="gs-x" data-gs="x" aria-label="' + esc(T('dismiss')) + '">×</button>' +
      '<div class="gs-top"><div class="gs-h"><h3>' + esc(T('title')) + '</h3><p class="gs-sub">' + esc(T('sub')) + '</p></div>' +
      '<span class="gs-pct">' + esc(T('prog', { n: n, t: total })) + '</span></div>' +
      '<div class="gs-bar"><i style="width:' + pct + '%"></i></div>' + rows;
  }

  function onClick(e) {
    var t = e.target.closest && e.target.closest('[data-gs]'); if (!t) return;
    var k = t.getAttribute('data-gs');
    if (k === 'x') { try { localStorage.setItem('nc_gs_x', '1'); } catch (x) {} window.__ncGSsuppress = false; remove(); return; }
    if (k === 'go') { var id = t.getAttribute('data-id'), step = STEPS.filter(function (s) { return s.id === id; })[0]; if (step && step.run) step.run(); }
  }
  function remove() { var b = $('ncgs'); if (b && b.parentNode) b.parentNode.removeChild(b); }

  function place() {
    if (!isClient() || dismissed()) { window.__ncGSsuppress = false; remove(); return; }
    var dash = $('dash');
    var dashOn = dash && dash.classList.contains('on') && getComputedStyle(dash).display !== 'none';
    if (!dashOn) { window.__ncGSsuppress = false; remove(); return; }
    var st = state();
    if (!st.known) { if (missions() == null && window.NCRewards && window.NCRewards.refresh) { try { window.NCRewards.refresh(); } catch (e) {} } return; }
    var allDone = st.done.kyc && st.done.wallet && st.done.twofa;
    if (allDone) { try { localStorage.setItem('nc_gs_done', '1'); } catch (e) {} window.__ncGSsuppress = false; remove(); return; }
    // checklist visible → suppress the single-action banner so there is only one card
    window.__ncGSsuppress = true;
    var host = dash, bd = $('bd'), anchor = (bd && bd.parentNode === host) ? bd : null;
    var b = $('ncgs');
    if (!b) { css(); b = document.createElement('div'); b.id = 'ncgs'; b.className = 'nc-no-i18n'; b.setAttribute('data-nci18n', 'off'); b.setAttribute('role', 'region'); b.addEventListener('click', onClick); }
    renderInto(b, st);
    var other = $('ncwb'); if (other && other.parentNode) other.parentNode.removeChild(other); /* hide banner right away */
    if (b.parentNode !== host || b.nextElementSibling !== anchor) host.insertBefore(b, anchor || host.firstChild);
  }

  window.addEventListener('nc:wallets', function (e) { try { window.__ncWalletCount = (e.detail && e.detail.count) || 0; } catch (x) {} place(); });
  window.addEventListener('nc:rewards', function () { place(); });
  window.addEventListener('nc-lang', function () { var b = $('ncgs'); if (b) { var st = state(); if (st.known) renderInto(b, st); } });
  document.addEventListener('click', function (e) { var m = e.target.closest && e.target.closest('.mi[data-p="dash"]'); if (m) setTimeout(place, 60); }, true);

  function primeWallet() {
    if (typeof window.__ncWalletCount === 'number' || !isClient()) return;
    fetch(wurl() + '?action=wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), op: 'list' }) })
      .then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) window.__ncWalletCount = (d.wallets || []).length; place(); }).catch(function () {});
  }

  function boot() { if (!isClient()) { remove(); return; } primeWallet(); place(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 400);
  setInterval(function () { if (isClient()) place(); else { window.__ncGSsuppress = false; remove(); } }, 2500);
})();
