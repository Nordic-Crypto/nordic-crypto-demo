/* NordicCrypto Rewards card: tier + cashback, welcome bonus, referral code */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function role() { try { return localStorage.getItem('user_role') || ''; } catch (e) { return ''; } }
  function wurl() { return (typeof WORKER_LOGIN_URL !== 'undefined' && WORKER_LOGIN_URL) || (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://nordic-deposit-checker.otis-790.workers.dev'; }
  function usd(v) { v = Number(v || 0); return '$' + v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function pct(r) { return (Math.round(r * 1000) / 10) + '%'; }

  /* translations (the card text is translated by the platform's i18n engine) */
  var D = {
    da: { 'Rewards': 'Belønninger', '{n} cashback': '{n} cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Indbetal {n} mere for at nå {t} ({r} cashback)', 'You are on the top tier': 'Du er på det højeste niveau', 'Get {n} on your first deposit of {m} or more': 'Få {n} på din første indbetaling på {m} eller mere', 'Welcome bonus received': 'Velkomstbonus modtaget', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Inviter en ven: I får begge {n}, når din ven indbetaler {m} eller mere første gang', 'Your referral code': 'Din henvisningskode', 'Copy link': 'Kopiér link', 'Share': 'Del', 'Link copied': 'Link kopieret', 'Friends joined: {n} · Rewards earned: {m}': 'Venner tilmeldt: {n} · Optjent: {m}', 'Cashback this month: {n} of {m}': 'Cashback denne måned: {n} af {m}', 'Cashback on card payments': 'Cashback på kortbetalinger' },
    fi: { 'Rewards': 'Edut', '{n} cashback': '{n} cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Talleta vielä {n} saavuttaaksesi tason {t} ({r} cashback)', 'You are on the top tier': 'Olet korkeimmalla tasolla', 'Get {n} on your first deposit of {m} or more': 'Saat {n} ensimmäisestä vähintään {m} talletuksestasi', 'Welcome bonus received': 'Tervetuliaisbonus saatu', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Kutsu ystävä: saatte molemmat {n}, kun hän tekee ensimmäisen vähintään {m} talletuksen', 'Your referral code': 'Suosituskoodisi', 'Copy link': 'Kopioi linkki', 'Share': 'Jaa', 'Link copied': 'Linkki kopioitu', 'Friends joined: {n} · Rewards earned: {m}': 'Liittyneet ystävät: {n} · Ansaittu: {m}', 'Cashback this month: {n} of {m}': 'Cashback tässä kuussa: {n} / {m}', 'Cashback on card payments': 'Cashback korttimaksuista' },
    es: { 'Rewards': 'Recompensas', '{n} cashback': '{n} de cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Deposita {n} más para alcanzar {t} ({r} de cashback)', 'You are on the top tier': 'Estás en el nivel más alto', 'Get {n} on your first deposit of {m} or more': 'Recibe {n} con tu primer depósito de {m} o más', 'Welcome bonus received': 'Bono de bienvenida recibido', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Invita a un amigo: ambos recibís {n} tras su primer depósito de {m} o más', 'Your referral code': 'Tu código de invitación', 'Copy link': 'Copiar enlace', 'Share': 'Compartir', 'Link copied': 'Enlace copiado', 'Friends joined: {n} · Rewards earned: {m}': 'Amigos registrados: {n} · Ganado: {m}', 'Cashback this month: {n} of {m}': 'Cashback este mes: {n} de {m}', 'Cashback on card payments': 'Cashback en pagos con tarjeta' },
    no: { 'Rewards': 'Belønninger', '{n} cashback': '{n} cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Sett inn {n} til for å nå {t} ({r} cashback)', 'You are on the top tier': 'Du er på det høyeste nivået', 'Get {n} on your first deposit of {m} or more': 'Få {n} på ditt første innskudd på {m} eller mer', 'Welcome bonus received': 'Velkomstbonus mottatt', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Inviter en venn: dere får begge {n} etter vennens første innskudd på {m} eller mer', 'Your referral code': 'Din vervekode', 'Copy link': 'Kopier lenke', 'Share': 'Del', 'Link copied': 'Lenke kopiert', 'Friends joined: {n} · Rewards earned: {m}': 'Venner med: {n} · Opptjent: {m}', 'Cashback this month: {n} of {m}': 'Cashback denne måneden: {n} av {m}', 'Cashback on card payments': 'Cashback på kortbetalinger' },
    sv: { 'Rewards': 'Belöningar', '{n} cashback': '{n} cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Sätt in {n} till för att nå {t} ({r} cashback)', 'You are on the top tier': 'Du är på högsta nivån', 'Get {n} on your first deposit of {m} or more': 'Få {n} på din första insättning på {m} eller mer', 'Welcome bonus received': 'Välkomstbonus mottagen', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Bjud in en vän: ni får båda {n} efter vännens första insättning på {m} eller mer', 'Your referral code': 'Din inbjudningskod', 'Copy link': 'Kopiera länk', 'Share': 'Dela', 'Link copied': 'Länk kopierad', 'Friends joined: {n} · Rewards earned: {m}': 'Vänner som gått med: {n} · Intjänat: {m}', 'Cashback this month: {n} of {m}': 'Cashback denna månad: {n} av {m}', 'Cashback on card payments': 'Cashback på kortbetalningar' },
    fr: { 'Rewards': 'Récompenses', '{n} cashback': '{n} de cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Déposez encore {n} pour atteindre {t} ({r} de cashback)', 'You are on the top tier': 'Vous êtes au niveau maximal', 'Get {n} on your first deposit of {m} or more': 'Recevez {n} dès votre premier dépôt de {m} ou plus', 'Welcome bonus received': 'Bonus de bienvenue reçu', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Parrainez un ami : vous recevez chacun {n} après son premier dépôt de {m} ou plus', 'Your referral code': 'Votre code de parrainage', 'Copy link': 'Copier le lien', 'Share': 'Partager', 'Link copied': 'Lien copié', 'Friends joined: {n} · Rewards earned: {m}': 'Amis inscrits : {n} · Gagné : {m}', 'Cashback this month: {n} of {m}': 'Cashback ce mois-ci : {n} sur {m}', 'Cashback on card payments': 'Cashback sur les paiements par carte' },
    de: { 'Rewards': 'Prämien', '{n} cashback': '{n} Cashback', 'Deposit {n} more to reach {t} ({r} cashback)': 'Zahlen Sie noch {n} ein, um {t} zu erreichen ({r} Cashback)', 'You are on the top tier': 'Sie sind auf der höchsten Stufe', 'Get {n} on your first deposit of {m} or more': 'Erhalten Sie {n} auf Ihre erste Einzahlung ab {m}', 'Welcome bonus received': 'Willkommensbonus erhalten', 'Invite a friend: you both get {n} after their first deposit of {m} or more': 'Freund einladen: Sie beide erhalten {n} nach seiner ersten Einzahlung ab {m}', 'Your referral code': 'Ihr Einladungscode', 'Copy link': 'Link kopieren', 'Share': 'Teilen', 'Link copied': 'Link kopiert', 'Friends joined: {n} · Rewards earned: {m}': 'Beigetretene Freunde: {n} · Verdient: {m}', 'Cashback this month: {n} of {m}': 'Cashback diesen Monat: {n} von {m}', 'Cashback on card payments': 'Cashback auf Kartenzahlungen' }
  };
  function register() { if (window.NCI18N && NCI18N.add) { Object.keys(D).forEach(function (l) { NCI18N.add(l, D[l]); }); return true; } return false; }

  var css = '.nc-rw{margin:14px 0;padding:18px;border-radius:20px;background:linear-gradient(135deg,rgba(198,255,61,.10),rgba(139,92,246,.12));border:1px solid rgba(255,255,255,.12);color:var(--tx,#eef4ff)}' +
    '.nc-rw h3{margin:0 0 12px;font-size:16px;display:flex;align-items:center;gap:8px}.nc-rw .t{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.nc-rw .b{padding:5px 12px;border-radius:999px;font-weight:800;font-size:13px;background:#c6ff3d;color:#07080c}' +
    '.nc-rw .bar{height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 0}.nc-rw .bar i{display:block;height:100%;background:linear-gradient(90deg,#c6ff3d,#8b5cf6)}' +
    '.nc-rw p{margin:6px 0;font-size:13px;opacity:.85;line-height:1.45}.nc-rw .r{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)}' +
    '.nc-rw .code{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}.nc-rw .code b{font:800 18px/1 monospace;letter-spacing:3px;padding:9px 12px;border-radius:10px;background:rgba(0,0,0,.28)}' +
    '.nc-rw button{border:0;border-radius:10px;padding:9px 13px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.14);color:inherit}.nc-rw button.p{background:#c6ff3d;color:#07080c}.nc-rw small{display:block;opacity:.7;margin-top:8px;font-size:12px}';
  function addCss() { if ($('ncRwCss')) return; var s = document.createElement('style'); s.id = 'ncRwCss'; s.textContent = css; document.head.appendChild(s); }

  var D0 = null, busy = false;
  function paint(el, d) {
    var c = d.cfg, t = d.tier, nx = d.next, prog = '';
    if (nx) { var span = nx.min - t.min, got = Math.max(0, d.realDeposits - t.min); prog = '<div class="bar"><i style="width:' + Math.min(100, Math.round(got / span * 100)) + '%"></i></div><p>Deposit ' + usd(nx.min - d.realDeposits) + ' more to reach ' + esc(nx.name) + ' (' + pct(nx.rate) + ' cashback)</p>'; }
    else prog = '<p>You are on the top tier</p>';
    var link = location.origin + '/index.html?ref=' + d.code;
    el.innerHTML =
      '<h3>🎁 <span>Rewards</span></h3>' +
      '<div class="t"><span class="b">' + esc(t.name) + '</span><span>' + pct(t.rate) + ' cashback</span></div>' + prog +
      '<p>Cashback this month: ' + usd(d.cashbackMonth) + ' of ' + usd(t.cap) + '</p>' +
      '<div class="r"><p>' + (d.welcomeDone ? '✓ Welcome bonus received' : 'Get ' + usd(c.welcome.amount) + ' on your first deposit of ' + usd(c.welcome.minDeposit) + ' or more') + '</p></div>' +
      '<div class="r"><p>Invite a friend: you both get ' + usd(c.referral.referrer) + ' after their first deposit of ' + usd(c.referral.minDeposit) + ' or more</p>' +
      '<small>Your referral code</small><div class="code nc-no-i18n" data-nci18n="off"><b>' + esc(d.code) + '</b></div>' +
      '<div class="code"><button type="button" class="p" data-rw="copy"><span>Copy link</span></button>' + (navigator.share ? '<button type="button" data-rw="share"><span>Share</span></button>' : '') + '</div>' +
      '<small>Friends joined: ' + (d.referral.invited || []).length + ' · Rewards earned: ' + usd(d.referral.earned) + '</small></div>';
    el.__link = link;
  }
  function ensure() {
    if (role() !== 'user' && role() !== '') return;
    if (window.adminViewingEmail) return;
    var ex = $('exchangeDash'), bk = $('dash');
    var useEx = !!ex && ex.style.display !== 'none' && ex.offsetParent !== null;
    var host = useEx ? ex : bk; if (!host) return;
    var el = $('ncRewards');
    var anchor = null;
    if (useEx) { var a0 = $('cpAlloc') || host.querySelector('.ex-bal-stats'); if (a0) { var n = a0; while (n.parentNode && n.parentNode !== host) n = n.parentNode; anchor = n; } }
    else anchor = $('cpQa') || host.querySelector('.nc3-hero');
    if (el && anchor && el.previousElementSibling !== anchor && el.parentNode !== anchor.parentNode) { el.remove(); el = null; }
    if (!el) {
      if (!anchor) return;
      addCss(); el = document.createElement('section'); el.id = 'ncRewards'; el.className = 'nc-rw';
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
      el.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-rw]') : null; if (!b) return;
        if (b.getAttribute('data-rw') === 'share') { try { navigator.share({ title: 'NordicCrypto', url: el.__link }); } catch (x) {} return; }
        var done = function () { if (typeof toast === 'function') toast(window.NCI18N && NCI18N.t ? (NCI18N.t('Link copied') || 'Link copied') : 'Link copied'); };
        try { navigator.clipboard.writeText(el.__link).then(done, done); } catch (x) { done(); }
      });
      register();
    }
    if (D0 && !el.firstChild) paint(el, D0);
    if (busy || (el.__t && Date.now() - el.__t < 60000)) return;
    busy = true; el.__t = Date.now();
    fetch(wurl() + '?action=getRewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok() }) })
      .then(function (r) { return r.json(); }).then(function (d) { busy = false; if (d && d.ok) { D0 = d; paint(el, d); } }).catch(function () { busy = false; });
  }
  setInterval(function () { try { if (!document.hidden && tok()) ensure(); } catch (e) {} }, 2000);
})();
