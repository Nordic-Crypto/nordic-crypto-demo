/* NordicCrypto: "Install the app" banner (Android one-tap install, iPhone step-by-step) + service worker registration */
(function () {
  'use strict';
  var T = {
    en: { t: 'Install the NordicCrypto app', s: 'One tap from your home screen, full screen, no browser bars.', b: 'Install', h: 'How', c: 'Not now', a1: 'Tap the Share button', a2: 'Choose “Add to Home Screen”', a3: 'Tap “Add”', d1: 'Open the browser menu ⋮', d2: 'Tap “Install app” or “Add to Home screen”', d3: 'Confirm', ok: 'Got it', st: 'Install app' },
    da: { t: 'Installer NordicCrypto-appen', s: 'Ét tryk fra startskærmen, fuld skærm, ingen browserlinjer.', b: 'Installer', h: 'Sådan', c: 'Ikke nu', a1: 'Tryk på knappen Del', a2: 'Vælg “Føj til hjemmeskærm”', a3: 'Tryk på “Tilføj”', d1: 'Åbn browsermenuen ⋮', d2: 'Tryk på “Installer app” eller “Føj til startskærm”', d3: 'Bekræft', ok: 'Forstået', st: 'Installer app' },
    fi: { t: 'Asenna NordicCrypto-sovellus', s: 'Yksi napautus kotinäytöltä, koko näyttö, ei selaimen palkkeja.', b: 'Asenna', h: 'Ohje', c: 'Ei nyt', a1: 'Napauta Jaa-painiketta', a2: 'Valitse “Lisää Koti-valikkoon”', a3: 'Napauta “Lisää”', d1: 'Avaa selaimen valikko ⋮', d2: 'Napauta “Asenna sovellus” tai “Lisää aloitusnäytölle”', d3: 'Vahvista', ok: 'Selvä', st: 'Asenna sovellus' },
    es: { t: 'Instala la app NordicCrypto', s: 'Un toque desde tu pantalla de inicio, a pantalla completa, sin barras del navegador.', b: 'Instalar', h: 'Cómo', c: 'Ahora no', a1: 'Toca el botón Compartir', a2: 'Elige “Añadir a pantalla de inicio”', a3: 'Toca “Añadir”', d1: 'Abre el menú del navegador ⋮', d2: 'Toca “Instalar app” o “Añadir a pantalla de inicio”', d3: 'Confirma', ok: 'Entendido', st: 'Instalar app' },
    no: { t: 'Installer NordicCrypto-appen', s: 'Ett trykk fra startskjermen, fullskjerm, ingen nettleserlinjer.', b: 'Installer', h: 'Slik', c: 'Ikke nå', a1: 'Trykk på Del-knappen', a2: 'Velg «Legg til på Hjem-skjerm»', a3: 'Trykk på «Legg til»', d1: 'Åpne nettlesermenyen ⋮', d2: 'Trykk på «Installer app» eller «Legg til på startskjermen»', d3: 'Bekreft', ok: 'Greit', st: 'Installer app' },
    sv: { t: 'Installera NordicCrypto-appen', s: 'Ett tryck från startskärmen, helskärm, inga webbläsarfält.', b: 'Installera', h: 'Så gör du', c: 'Inte nu', a1: 'Tryck på Dela-knappen', a2: 'Välj “Lägg till på hemskärmen”', a3: 'Tryck på “Lägg till”', d1: 'Öppna webbläsarmenyn ⋮', d2: 'Tryck på “Installera app” eller “Lägg till på startskärmen”', d3: 'Bekräfta', ok: 'Uppfattat', st: 'Installera app' },
    fr: { t: 'Installez l’application NordicCrypto', s: 'Un appui depuis l’écran d’accueil, en plein écran, sans barres de navigateur.', b: 'Installer', h: 'Comment', c: 'Plus tard', a1: 'Touchez le bouton Partager', a2: 'Choisissez « Sur l’écran d’accueil »', a3: 'Touchez « Ajouter »', d1: 'Ouvrez le menu du navigateur ⋮', d2: 'Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil »', d3: 'Confirmez', ok: 'Compris', st: 'Installer l’application' },
    de: { t: 'NordicCrypto-App installieren', s: 'Ein Tipp vom Startbildschirm, Vollbild, keine Browserleisten.', b: 'Installieren', h: 'Anleitung', c: 'Nicht jetzt', a1: 'Tippen Sie auf „Teilen“', a2: 'Wählen Sie „Zum Home-Bildschirm“', a3: 'Tippen Sie auf „Hinzufügen“', d1: 'Öffnen Sie das Browsermenü ⋮', d2: 'Tippen Sie auf „App installieren“ oder „Zum Startbildschirm hinzufügen“', d3: 'Bestätigen', ok: 'Verstanden', st: 'App installieren' }
  };
  function L() { var l = 'en'; try { l = localStorage.getItem('nc_lang') || (navigator.language || 'en').slice(0, 2); } catch (e) {} return T[l] || T.en; }
  var ua = navigator.userAgent || '', IOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var MOBILE = IOS || /android|mobile/i.test(ua);
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  var deferred = null, KEY = 'nc_install_dismissed';
  function dismissed() { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 7 * 864e5; } catch (e) { return false; } }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; show(); });
  window.addEventListener('appinstalled', function () { deferred = null; hide(); try { localStorage.setItem(KEY, String(Date.now() + 3650 * 864e5)); } catch (e) {} });

  var css = '#ncInst{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99990;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:16px;background:#12161f;color:#eef4ff;border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 40px rgba(0,0,0,.5);font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto}' +
    '#ncInst img{width:44px;height:44px;border-radius:11px;flex:none}#ncInst .tx{flex:1;min-width:0}#ncInst b{display:block;font-size:14px}#ncInst small{display:block;opacity:.65;font-size:12px;margin-top:2px}' +
    '#ncInst button{border:0;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;background:#c6ff3d;color:#07080c;white-space:nowrap}#ncInst .x{background:transparent;color:#9aa4b5;padding:6px 8px;font-size:18px;font-weight:400}' +
    '#ncInstHow{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}#ncInstHow .bx{width:100%;max-width:520px;background:#12161f;color:#eef4ff;border-radius:20px 20px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '#ncInstHow h3{margin:0 0 12px;font-size:17px}#ncInstHow ol{margin:0 0 16px;padding-left:22px}#ncInstHow li{margin:6px 0}#ncInstHow button{width:100%;border:0;border-radius:12px;padding:13px;font-weight:700;background:#c6ff3d;color:#07080c;font-size:15px}';
  function addCss() { if (document.getElementById('ncInstCss')) return; var s = document.createElement('style'); s.id = 'ncInstCss'; s.textContent = css; document.head.appendChild(s); }

  function hide() { var e = document.getElementById('ncInst'); if (e) e.remove(); }
  function how() {
    var t = L(), steps = IOS ? [t.a1, t.a2, t.a3] : [t.d1, t.d2, t.d3];
    var w = document.createElement('div'); w.id = 'ncInstHow'; w.setAttribute('data-nci18n', 'off');
    w.innerHTML = '<div class="bx"><h3>' + t.t + '</h3><ol>' + steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol><button>' + t.ok + '</button></div>';
    w.onclick = function (e) { if (e.target === w || e.target.tagName === 'BUTTON') w.remove(); };
    document.body.appendChild(w);
  }
  function install() {
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; hide(); }).catch(function () {}); }
    else how();
  }
  function show(force) {
    if (standalone() || !MOBILE || document.getElementById('ncInst')) return;
    if (!force && dismissed()) return;
    if (!document.body) return;
    addCss(); var t = L(), d = document.createElement('div'); d.id = 'ncInst'; d.className = 'nc-no-i18n'; d.setAttribute('data-nci18n', 'off');
    d.innerHTML = '<img src="logo-192.png" alt=""><div class="tx"><b>' + t.t + '</b><small>' + t.s + '</small></div><button class="go">' + (deferred ? t.b : t.h) + '</button><button class="x" aria-label="' + t.c + '">×</button>';
    d.querySelector('.go').onclick = install;
    d.querySelector('.x').onclick = function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} hide(); };
    document.body.appendChild(d);
  }
  window.NCInstall = { show: function () { show(true); }, install: install };

  /* row inside Settings so the client can always find it later */
  function settingsRow() {
    var box = document.querySelector('#settingsMask .modal, #settingsMask > div'); if (!box || document.getElementById('ncInstRow') || standalone()) return;
    var t = L(), b = document.createElement('button'); b.id = 'ncInstRow'; b.type = 'button'; b.className = 'nc-no-i18n'; b.setAttribute('data-nci18n', 'off'); b.textContent = '📲 ' + t.st;
    b.style.cssText = 'width:100%;margin:10px 0;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font-weight:600;cursor:pointer';
    b.onclick = function () { install(); };
    box.appendChild(b);
  }
  function boot() {
    if (MOBILE && !standalone()) setTimeout(function () { show(); }, IOS ? 3000 : 6000);
    if (document.getElementById('settingsMask')) new MutationObserver(settingsRow).observe(document.getElementById('settingsMask'), { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
