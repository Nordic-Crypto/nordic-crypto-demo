/* Dashboard v4 helpers: switches html.v4 on for clients and adds two small panels built from the client's REAL data
   (available balance + account-security checklist). Nothing here claims anything the account does not have. */
(function () {
  'use strict';
  if (window.__dashV4) return; window.__dashV4 = 1;
  var de = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function staff() { return !!(document.getElementById('agd') || document.getElementById('adminPanel') && document.getElementById('adminPanel').getClientRects().length); }
  function kyc() { try { var v = st.verification && st.verification.status; return v === 'approved' || v === 'verified'; } catch (e) { return false; } }
  var totp = null, asked = 0;
  function askTotp_unused() {
    if (asked || totp !== null) return; var tk = ''; try { tk = localStorage.getItem('session_token'); } catch (e) { } if (!tk) return; asked = 1;
    try { fetch((window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev') + '?action=totpStatus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk }) }).then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) { totp = !!d.enabled; var s = document.getElementById('v4Sec'); if (s) s.removeAttribute('data-h'); tick(); } }).catch(function () { }); } catch (e) { }
  }
  var SHI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 2.8v5.8c0 4.6-3.2 7.9-7.5 9.4-4.3-1.5-7.5-4.8-7.5-9.4V5.8z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/></svg>';
  function avail() {
    var card = $('.bd-cardc'); if (!card) return;
    var host = card.querySelector('.pay'), old = card.querySelector('.v4-av'); if (!host) return;
    var cash = Number(window.st && st.usd); if (!isFinite(cash)) return;
    var txt = ''; try { txt = window.fmtCurrency ? window.fmtCurrency(cash) : '$' + cash.toFixed(2); } catch (e) { txt = '$' + cash.toFixed(2); }
    if (!txt) return;
    var frozen = false; try { frozen = String(st.card && st.card.status).toLowerCase() === 'frozen'; } catch (e) { }
    var html = '<div><small>Available cash</small><b class="bd-sens">' + esc(txt) + '</b></div><span class="v4-badge' + (frozen ? ' warn' : '') + '">' + (frozen ? 'Card frozen' : SHI + 'Card active') + '</span>';
    if (!old) { old = document.createElement('div'); old.className = 'v4-av'; var slot = host.closest('.bd-slot') || host; slot.parentNode.insertBefore(old, slot.nextSibling); }
    if (old.getAttribute('data-h') !== html) { old.innerHTML = html; old.setAttribute('data-h', html); }
  }
  var SHIELD = '<svg class="v4-shield" viewBox="0 0 160 190" aria-hidden="true"><defs><linearGradient id="v4a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9fff1" stop-opacity=".95"/><stop offset=".45" stop-color="#46e8b0" stop-opacity=".55"/><stop offset="1" stop-color="#0b3d30" stop-opacity=".9"/></linearGradient><linearGradient id="v4b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="v4g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs><path d="M80 10 150 36v62c0 44-30 72-70 84C40 170 10 142 10 98V36z" fill="#46e8b0" opacity=".25" filter="url(#v4g)"/><path d="M80 12 146 37v60c0 41-28 68-66 80C42 165 14 138 14 97V37z" fill="url(#v4a)" stroke="#e8fff7" stroke-opacity=".7" stroke-width="2"/><path d="M80 24 136 45v52c0 34-23 56-56 67C47 153 24 131 24 97V45z" fill="#06241c" fill-opacity=".72" stroke="#46e8b0" stroke-opacity=".6" stroke-width="1.4"/><path d="M80 12 146 37v30C120 60 100 44 80 12z" fill="url(#v4b)" opacity=".5"/><path d="M52 94l20 20 38-44" fill="none" stroke="#9dffd8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function health() {
    var h = $('#bdHealth'), card = $('#bdCard'); if (!h || !card) return;
    if (card.nextElementSibling !== h) card.parentNode.insertBefore(h, card.nextSibling);
    if (!h.querySelector('.v4-shield')) h.insertAdjacentHTML('beforeend', SHIELD);
  }
  var WK = (window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev'), svc = null, svcT = 0;
  function checkSvc() {
    var now = Date.now(); if (now - svcT < 60000) return; svcT = now;
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) { } }, 5000);
    fetch(WK + '?action=holidayConfig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (d) { clearTimeout(to); svc = !!(d && d.ok); pill(); }).catch(function () { svc = false; pill(); });
  }
  function pill() {
    var top = $('.bd-hero-top'); if (!top) return; var p = $('#v4Pill'), bad = svc === false;
    var html = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/></svg>' + (bad ? 'Connection problem' : svc === null ? 'Checking…' : 'All systems operational');
    if (!p) { p = document.createElement('span'); p.id = 'v4Pill'; top.insertBefore(p, top.children[1] || null); }
    if (p.getAttribute('data-h') !== html) { p.innerHTML = html; p.setAttribute('data-h', html); }
    p.className = 'v4-badge v4-stat' + (bad ? ' warn' : '');
  }
  var GEM = '<svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="v4c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1fffa"/><stop offset=".5" stop-color="#46e8b0"/><stop offset="1" stop-color="#0d5a45"/></linearGradient></defs><polygon points="60,6 100,32 84,86 36,86 20,32" fill="url(#v4c)" opacity=".92"/><polygon points="60,6 100,32 60,44" fill="#fff" opacity=".55"/><polygon points="20,32 60,44 36,86" fill="#06241c" opacity=".35"/><polygon points="60,44 100,32 84,86" fill="#06241c" opacity=".2"/><polyline points="20,32 60,44 100,32" fill="none" stroke="#fff" stroke-opacity=".6"/><polyline points="60,44 36,86 84,86 60,44" fill="none" stroke="#fff" stroke-opacity=".3"/></svg>';
  function promo() {
    var side = $('#sideBar'); if (!side) return; var user = side.querySelector('.umi'), pr = $('#v4Promo');
    var hol = false; try { hol = !!(window.__holApi && window.__holApi.active && window.__holApi.active()); } catch (e) { }
    var kind = 'skins';
    var html = GEM + (kind === 'skins' ? '<i class="v4-eb">NEW CARD DESIGNS</i><b>New card designs</b><span>' + (hol ? 'Snow, lights and Santa for your card.' : 'Fresh premium looks for your card.') + '</span><a>See designs →</a>' : '<i class="v4-eb">NORDIC REWARDS</i><b>Invite friends, earn NC</b><span>Share your link and collect bonus points.</span><a>Learn more →</a>');
    if (!pr) { pr = document.createElement('div'); pr.id = 'v4Promo'; pr.className = 'v4-promo'; pr.setAttribute('role', 'button'); pr.tabIndex = 0;
      var go = function () { var k = pr.getAttribute('data-k'); if (k === 'skins' && window.__cardSkins && window.__cardSkins.show) window.__cardSkins.show(true); else if (typeof window.openClientBonus === 'function') window.openClientBonus(); };
      pr.addEventListener('click', go); pr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      var anchor = user || side.lastElementChild; side.insertBefore(pr, anchor); }
    pr.setAttribute('data-k', kind); if (pr.getAttribute('data-h') !== html) { pr.innerHTML = html; pr.setAttribute('data-h', html); }
  }
  function heading() {
    var bd = $('#bd'); if (!bd || !bd.parentNode) return; var h = $('#v4Head');
    var hi = ($('#bdHi') || {}).textContent || 'Welcome'; hi = hi.replace(/\s+/g, ' ').trim();
    var d = ''; try { d = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase().replace(',', ''); } catch (e) { }
    var html = '<div><span class="v4-eb">PERSONAL OVERVIEW</span><h1>' + esc(hi) + '<i>.</i></h1></div><span class="v4-dt">' + esc(d) + '</span>';
    if (!h) { h = document.createElement('div'); h.id = 'v4Head'; h.className = 'v4-head'; bd.parentNode.insertBefore(h, bd); }
    if (h.getAttribute('data-h') !== html) { h.innerHTML = html; h.setAttribute('data-h', html); }
  }
  function tip() {
    var c = $('#bdChart'), b = $('#bdBal'); if (!c || !b) return; var t = $('#v4Tip');
    if (!t) { t = document.createElement('div'); t.id = 'v4Tip'; t.className = 'v4-tip'; c.appendChild(t); }
    var v = b.textContent.trim(); if (t.textContent !== v) t.textContent = v;
  }
  function en() { try { var l = localStorage.getItem('nc_lang'); return !l || l === 'en'; } catch (e) { return true; } }
  var IC = {
    bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 20V10M9 20V4M14 20v-7M19 20V8"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    gem: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 21.5 12 12 21.5 2.5 12z" opacity=".9"/></svg>',
    dia: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4.5 39.5 10v12.2c0 10-6.6 17.4-15.5 20.8C15.1 39.6 8.5 32.2 8.5 22.2V10z"/><path d="m16.5 24 5.4 5.4 9.8-10.6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 2.8v5.8c0 4.6-3.2 7.9-7.5 9.4-4.3-1.5-7.5-4.8-7.5-9.4V5.8z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/></svg>',
    info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="7"/><path d="M8 7v4.2M8 4.6v.2" stroke-linecap="round"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };
  function titles() {
    var k = $('.bd-hero > .bd-k');
    if (k && !k.querySelector('.v4-i')) k.insertAdjacentHTML('beforeend', ' <span class="v4-i" aria-hidden="true">' + IC.info + '</span>');
  }
  function curMore() {
    var cb = $('#bdCur'); if (!cb) return; var n = cb.querySelectorAll('button:not(.v4-more)').length;
    var m = cb.querySelector('.v4-more');
    if (n <= 4) { if (m) m.remove(); return; }
    if (!m) {
      m = document.createElement('button'); m.type = 'button'; m.className = 'v4-more'; m.setAttribute('aria-label', 'More currencies'); m.innerHTML = IC.chev;
      m.addEventListener('click', function (e) { e.stopPropagation(); var o = cb.classList.toggle('v4-all'); m.setAttribute('aria-expanded', o ? 'true' : 'false'); });
      cb.appendChild(m);
    } else if (m !== cb.lastElementChild) cb.appendChild(m);
  }
  function security() {
    var h = $('#bdHealth'); if (!h) return;
    var li = h.querySelectorAll('.bd-hli li'), ok = h.querySelectorAll('.bd-hli li.ok').length, all = li.length || 1, full = ok === all;
    var html = '<span class="v4-shi">' + IC.dia + '</span><div><h2>' + (full ? 'Protected' : 'Almost protected') + '</h2><small>' + (svc === false ? 'Connection problem' : full ? 'All systems operational' : ok + ' of ' + all + ' steps completed') + '</small></div>';
    var s = h.querySelector('.v4-sh');
    if (!s) { s = document.createElement('div'); s.className = 'v4-sh'; h.insertBefore(s, h.firstChild); }
    if (s.getAttribute('data-h') !== html) { s.innerHTML = html; s.setAttribute('data-h', html); }
    s.classList.toggle('warn', !full);
  }
  function cardLook() {
    [].forEach.call(document.querySelectorAll('.pay .ptop .pb'), function (pb) { if (!pb.querySelector('.v4-wm')) pb.insertAdjacentHTML('beforeend', '<span class="v4-wm"><b>Nordic</b>Crypto</span>'); });
    var fz = document.querySelector('#bdCardRest .bd-cacts button[data-t="btnFreezeCard"] .bd-ci');
    if (fz && !fz.querySelector('.v4-snow')) fz.innerHTML = '<svg class="v4-snow" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2M4.3 10.4l3.1-.6-1-3M19.7 13.6l-3.1.6 1 3M6.4 17.2l1-3-3.1-.6M17.6 6.8l-1 3 3.1.6"/></svg>';
    [].forEach.call(document.querySelectorAll('.pay .card-network'), function (n) { var v = /VISA/.test(n.innerHTML) && !/circle/.test(n.innerHTML); if (n.classList.contains('v4-isvisa') !== v) n.classList.toggle('v4-isvisa', v); });
  }

  /* translations for the new v4 strings (added once the main dictionary of the language is in) */
  var TR = {
    da: { 'Available cash': 'Tilgængelige kontanter', 'New card designs': 'Nye kortdesigns', 'New card designs ❄': 'Nye kortdesigns ❄', 'Fresh premium looks for your card.': 'Friske premium-looks til dit kort.', 'Five more holiday looks to try.': 'Fem flere julelooks at prøve.', 'Total Wealth': 'Samlet formue', 'Money Flow': 'Pengestrøm', 'Recent activity': 'Seneste aktivitet', 'Your assets': 'Dine aktiver', 'Protected': 'Beskyttet', 'Almost protected': 'Næsten beskyttet', 'All systems operational': 'Alle systemer kører', 'Connection problem': 'Forbindelsesproblem', 'Checking…': 'Kontrollerer…', 'Card active': 'Kort aktivt', 'Card frozen': 'Kort spærret', 'Available balance': 'Disponibel saldo', 'PERSONAL OVERVIEW': 'PERSONLIGT OVERBLIK', 'Holiday card skins': 'Juledesign til kort', 'Snow, lights and Santa for your card.': 'Sne, lys og julemand til dit kort.', 'See designs →': 'Se designs →', 'Invite friends, earn NC': 'Inviter venner, tjen NC', 'Share your link and collect bonus points.': 'Del dit link og saml bonuspoint.', 'Learn more →': 'Læs mere →', '{a} of {b} steps completed': '{a} af {b} trin fuldført' },
    fi: { 'Available cash': 'Käytettävissä oleva käteinen', 'New card designs': 'Uudet korttien ulkoasut', 'New card designs ❄': 'Uudet korttien ulkoasut ❄', 'Fresh premium looks for your card.': 'Uusia premium-ulkoasuja korttiisi.', 'Five more holiday looks to try.': 'Viisi muuta jouluista ulkoasua kokeiltavaksi.', 'Total Wealth': 'Kokonaisvarallisuus', 'Money Flow': 'Rahavirta', 'Recent activity': 'Viimeaikainen toiminta', 'Your assets': 'Omaisuutesi', 'Protected': 'Suojattu', 'Almost protected': 'Melkein suojattu', 'All systems operational': 'Kaikki järjestelmät toimivat', 'Connection problem': 'Yhteysongelma', 'Checking…': 'Tarkistetaan…', 'Card active': 'Kortti aktiivinen', 'Card frozen': 'Kortti jäädytetty', 'Available balance': 'Käytettävissä oleva saldo', 'PERSONAL OVERVIEW': 'HENKILÖKOHTAINEN YLEISKATSAUS', 'Holiday card skins': 'Joulukorttien ulkoasut', 'Snow, lights and Santa for your card.': 'Lunta, valoja ja joulupukki korttiisi.', 'See designs →': 'Katso ulkoasut →', 'Invite friends, earn NC': 'Kutsu ystäviä, ansaitse NC', 'Share your link and collect bonus points.': 'Jaa linkkisi ja kerää bonuspisteitä.', 'Learn more →': 'Lue lisää →', '{a} of {b} steps completed': '{a}/{b} vaihetta tehty' },
    es: { 'Available cash': 'Efectivo disponible', 'New card designs': 'Nuevos diseños de tarjeta', 'New card designs ❄': 'Nuevos diseños de tarjeta ❄', 'Fresh premium looks for your card.': 'Nuevos looks premium para tu tarjeta.', 'Five more holiday looks to try.': 'Cinco looks navideños más por probar.', 'Total Wealth': 'Patrimonio total', 'Money Flow': 'Flujo de dinero', 'Recent activity': 'Actividad reciente', 'Your assets': 'Tus activos', 'Protected': 'Protegida', 'Almost protected': 'Casi protegida', 'All systems operational': 'Todos los sistemas operativos', 'Connection problem': 'Problema de conexión', 'Checking…': 'Comprobando…', 'Card active': 'Tarjeta activa', 'Card frozen': 'Tarjeta congelada', 'Available balance': 'Saldo disponible', 'PERSONAL OVERVIEW': 'RESUMEN PERSONAL', 'Holiday card skins': 'Diseños navideños', 'Snow, lights and Santa for your card.': 'Nieve, luces y Papá Noel para tu tarjeta.', 'See designs →': 'Ver diseños →', 'Invite friends, earn NC': 'Invita amigos, gana NC', 'Share your link and collect bonus points.': 'Comparte tu enlace y gana puntos.', 'Learn more →': 'Más información →', '{a} of {b} steps completed': '{a} de {b} pasos completados' },
    no: { 'Available cash': 'Tilgjengelig kontant', 'New card designs': 'Nye kortdesign', 'New card designs ❄': 'Nye kortdesign ❄', 'Fresh premium looks for your card.': 'Nye premium-utseender for kortet ditt.', 'Five more holiday looks to try.': 'Fem flere julelooks å prøve.', 'Total Wealth': 'Samlet formue', 'Money Flow': 'Pengestrøm', 'Recent activity': 'Siste aktivitet', 'Your assets': 'Dine eiendeler', 'Protected': 'Beskyttet', 'Almost protected': 'Nesten beskyttet', 'All systems operational': 'Alle systemer fungerer', 'Connection problem': 'Tilkoblingsproblem', 'Checking…': 'Sjekker…', 'Card active': 'Kort aktivt', 'Card frozen': 'Kort sperret', 'Available balance': 'Disponibel saldo', 'PERSONAL OVERVIEW': 'PERSONLIG OVERSIKT', 'Holiday card skins': 'Julekortdesign', 'Snow, lights and Santa for your card.': 'Snø, lys og julenisse til kortet ditt.', 'See designs →': 'Se design →', 'Invite friends, earn NC': 'Inviter venner, tjen NC', 'Share your link and collect bonus points.': 'Del lenken din og samle bonuspoeng.', 'Learn more →': 'Les mer →', '{a} of {b} steps completed': '{a} av {b} trinn fullført' },
    sv: { 'Available cash': 'Tillgängliga kontanter', 'New card designs': 'Nya kortdesigner', 'New card designs ❄': 'Nya kortdesigner ❄', 'Fresh premium looks for your card.': 'Nya premiumlooker för ditt kort.', 'Five more holiday looks to try.': 'Fem fler jullooker att prova.', 'Total Wealth': 'Total förmögenhet', 'Money Flow': 'Pengaflöde', 'Recent activity': 'Senaste aktivitet', 'Your assets': 'Dina tillgångar', 'Protected': 'Skyddat', 'Almost protected': 'Nästan skyddat', 'All systems operational': 'Alla system fungerar', 'Connection problem': 'Anslutningsproblem', 'Checking…': 'Kontrollerar…', 'Card active': 'Kort aktivt', 'Card frozen': 'Kort fryst', 'Available balance': 'Tillgängligt saldo', 'PERSONAL OVERVIEW': 'PERSONLIG ÖVERSIKT', 'Holiday card skins': 'Juldesign för kort', 'Snow, lights and Santa for your card.': 'Snö, ljus och tomten till ditt kort.', 'See designs →': 'Se design →', 'Invite friends, earn NC': 'Bjud in vänner, tjäna NC', 'Share your link and collect bonus points.': 'Dela din länk och samla bonuspoäng.', 'Learn more →': 'Läs mer →', '{a} of {b} steps completed': '{a} av {b} steg klara' },
    fr: { 'Available cash': 'Liquidités disponibles', 'New card designs': 'Nouveaux designs de carte', 'New card designs ❄': 'Nouveaux designs de carte ❄', 'Fresh premium looks for your card.': 'De nouveaux looks premium pour votre carte.', 'Five more holiday looks to try.': 'Cinq autres looks de fêtes à essayer.', 'Total Wealth': 'Patrimoine total', 'Money Flow': 'Flux d’argent', 'Recent activity': 'Activité récente', 'Your assets': 'Vos actifs', 'Protected': 'Protégé', 'Almost protected': 'Presque protégé', 'All systems operational': 'Tous les systèmes opérationnels', 'Connection problem': 'Problème de connexion', 'Checking…': 'Vérification…', 'Card active': 'Carte active', 'Card frozen': 'Carte gelée', 'Available balance': 'Solde disponible', 'PERSONAL OVERVIEW': 'APERÇU PERSONNEL', 'Holiday card skins': 'Designs de fêtes', 'Snow, lights and Santa for your card.': 'Neige, lumières et Père Noël pour votre carte.', 'See designs →': 'Voir les designs →', 'Invite friends, earn NC': 'Invitez des amis, gagnez des NC', 'Share your link and collect bonus points.': 'Partagez votre lien et cumulez des points.', 'Learn more →': 'En savoir plus →', '{a} of {b} steps completed': '{a} sur {b} étapes terminées' },
    de: { 'Available cash': 'Verfügbares Guthaben', 'New card designs': 'Neue Kartendesigns', 'New card designs ❄': 'Neue Kartendesigns ❄', 'Fresh premium looks for your card.': 'Neue Premium-Looks für Ihre Karte.', 'Five more holiday looks to try.': 'Fünf weitere Festtagslooks zum Ausprobieren.', 'Total Wealth': 'Gesamtvermögen', 'Money Flow': 'Geldfluss', 'Recent activity': 'Letzte Aktivität', 'Your assets': 'Ihre Assets', 'Protected': 'Geschützt', 'Almost protected': 'Fast geschützt', 'All systems operational': 'Alle Systeme in Betrieb', 'Connection problem': 'Verbindungsproblem', 'Checking…': 'Wird geprüft…', 'Card active': 'Karte aktiv', 'Card frozen': 'Karte gesperrt', 'Available balance': 'Verfügbares Guthaben', 'PERSONAL OVERVIEW': 'PERSÖNLICHE ÜBERSICHT', 'Holiday card skins': 'Festtags-Kartendesigns', 'Snow, lights and Santa for your card.': 'Schnee, Lichter und Weihnachtsmann für Ihre Karte.', 'See designs →': 'Designs ansehen →', 'Invite friends, earn NC': 'Freunde einladen, NC verdienen', 'Share your link and collect bonus points.': 'Teilen Sie Ihren Link und sammeln Sie Bonuspunkte.', 'Learn more →': 'Mehr erfahren →', '{a} of {b} steps completed': '{a} von {b} Schritten erledigt' }
  };
  function regTr() { var N = window.NCI18N; if (!N || !N.add) return false; Object.keys(TR).forEach(function (l) { try { N.add(l, TR[l]); } catch (e) { } }); return true; }
  if (!regTr()) { var rt = 0, ri = setInterval(function () { if (regTr() || ++rt > 40) clearInterval(ri); }, 250); }
  window.addEventListener('nc-dict', function () { soon(); });
  window.addEventListener('nc-lang', function () { soon(); });
  /* My Cards action buttons: line icons instead of emoji, text still translated */
  var CBI = {
    pal: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.2" r="1.2"/><circle cx="15" cy="7.6" r="1.2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeo: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2M4.3 10.4l3.1-.6-1-3M19.7 13.6l-3.1.6 1 3M6.4 17.2l1-3-3.1-.6M17.6 6.8l-1 3 3.1.6"/>',
    sun: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
  };
  function cardBtns() {
    var N = window.NCI18N, L = N && N.lang || 'en';
    function tt(en) { var t = N && N.t ? N.t(en) : en; return String(t).replace(/^[^\p{L}\p{N}]+/u, '').trim(); }
    var frozen = false; try { frozen = String(st.card && st.card.status).toLowerCase() === 'frozen'; } catch (e) { }
    [['btnChangeDesign', 'pal', '🎨 Change Design'], ['btnShowCvv', null, null], ['btnFreeze', frozen ? 'sun' : 'snow', frozen ? '🔥 Unfreeze Card' : '❄ Freeze Card'], ['btnDeleteCard', 'del', '🗑 Delete Card']].forEach(function (r) {
      var b = document.getElementById(r[0]); if (!b) return;
      var ic = r[1], en = r[2];
      if (r[0] === 'btnShowCvv') { var hid = b.getAttribute('data-v4') === 'h'; if (/👁|🙈/.test(b.textContent)) hid = /🙈/.test(b.textContent); ic = hid ? 'eyeo' : 'eye'; en = hid ? '🙈 Hide CVV' : '👁 Show CVV'; b.setAttribute('data-v4', hid ? 'h' : 's'); }
      var h = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CBI[ic] + '</svg><span class="nc-no-i18n">' + esc(tt(en)) + '</span>';
      if (b.getAttribute('data-h') !== h + L || b.innerHTML !== h) { b.innerHTML = h; b.setAttribute('data-h', h + L); b.classList.add('v4-cb'); }
    });
  }
  function tick() {
    if (staff() || !$('.bd')) return;
    de.classList.add('v4');
    [avail, health, pill, heading, tip, titles, curMore, security, cardLook, cardBtns, checkSvc, promo].forEach(function (f) { try { f(); } catch (e) { if (window.__v4dbg) console.warn('[v4]', f.name, e); } });
  }
  var t = 0, runs = 0, rT = 0; function soon() { if (t) return; t = 1; var go = function () { t = 0; if (++runs > 40) return; tick(); }; if (window.Promise) Promise.resolve().then(go); else setTimeout(go, 0); if (!rT) rT = setTimeout(function () { rT = 0; runs = 0; }, 0); }
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
  setTimeout(tick, 600); setInterval(tick, 3000);
})();
