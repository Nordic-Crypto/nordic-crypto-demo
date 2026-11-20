/* NordicCrypto — themes.js v1
   Ambient theme skins. Each skin retints the app background and the dashboard hero accent (--v4),
   purely via CSS variables + a body background gradient — the mint brand accent on buttons stays intact,
   so nothing in the existing UI breaks. A small palette button (bottom-left) opens a live picker.
   New clients get a region-flavoured default (Australia → Reef, Canada → Borealis) until they pick one;
   the choice is remembered per browser. Works in dark and light themes and in all 8 languages. */
(function () {
  'use strict';
  if (window.__ncThemes) return; window.__ncThemes = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['Theme', 'Tema', 'Teema', 'Tema', 'Tema', 'Tema', 'Thème', 'Thema'],
    sub: ['Pick a look for your dashboard', 'Vælg et udseende til dit dashboard', 'Valitse ilme koontinäytöllesi', 'Elige un estilo para tu panel', 'Velg et utseende for dashbordet', 'Välj ett utseende för din panel', 'Choisissez un style pour votre tableau de bord', 'Wähle einen Look für dein Dashboard'],
    auto: ['Auto (region)', 'Auto (region)', 'Automaattinen (alue)', 'Auto (región)', 'Auto (region)', 'Auto (region)', 'Auto (région)', 'Auto (Region)']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k) { var a = K[k]; return a ? (a[LG.indexOf(lang())] || a[0]) : k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Each skin: hero accent (--v4 rgb), a swatch gradient for the picker, and body backgrounds for dark/light. */
  var SKINS = [
    { id: 'aurora', name: 'Aurora', tag: '', v4: '70,232,176',
      sw: 'linear-gradient(135deg,#46e8b0,#2bb6ff)',
      dark: 'radial-gradient(900px 480px at 85% -12%,rgba(70,232,176,.12),transparent 60%),linear-gradient(160deg,#081a16,#07080c 62%)',
      light: 'radial-gradient(900px 480px at 85% -12%,rgba(43,181,142,.16),transparent 60%),linear-gradient(160deg,#eefbf5,#f5f5ef 62%)' },
    { id: 'reef', name: 'Reef', tag: '🇦🇺', v4: '38,224,206',
      sw: 'linear-gradient(135deg,#24e0ce,#ff8a5c)',
      dark: 'radial-gradient(820px 460px at 82% -10%,rgba(255,138,92,.13),transparent 58%),radial-gradient(760px 520px at 4% 2%,rgba(36,224,206,.13),transparent 60%),linear-gradient(160deg,#06141a,#07080c 64%)',
      light: 'radial-gradient(820px 460px at 82% -10%,rgba(255,138,92,.16),transparent 58%),radial-gradient(760px 520px at 4% 2%,rgba(36,200,186,.16),transparent 60%),linear-gradient(160deg,#eefcfb,#f5f6ef 64%)' },
    { id: 'outback', name: 'Outback', tag: '🇦🇺', v4: '255,150,86',
      sw: 'linear-gradient(135deg,#ff9f45,#c0335a)',
      dark: 'radial-gradient(940px 540px at 80% -14%,rgba(255,140,70,.17),transparent 58%),linear-gradient(160deg,#1a0d12,#0a0608 64%)',
      light: 'radial-gradient(940px 540px at 80% -14%,rgba(255,150,80,.2),transparent 58%),linear-gradient(160deg,#fff3ea,#f6f1ec 64%)' },
    { id: 'pacific', name: 'Pacific', tag: '', v4: '96,196,255',
      sw: 'linear-gradient(135deg,#5bc8ff,#2b6bff)',
      dark: 'radial-gradient(920px 500px at 82% -12%,rgba(91,200,255,.15),transparent 60%),linear-gradient(160deg,#07131f,#07080c 64%)',
      light: 'radial-gradient(920px 500px at 82% -12%,rgba(60,150,230,.16),transparent 60%),linear-gradient(160deg,#eef6fe,#f1f3f5 64%)' },
    { id: 'maple', name: 'Maple', tag: '🇨🇦', v4: '242,120,96',
      sw: 'linear-gradient(135deg,#ff8a5c,#d23b3b)',
      dark: 'radial-gradient(920px 500px at 82% -12%,rgba(230,90,80,.15),transparent 58%),linear-gradient(160deg,#1a0b0b,#0a0607 64%)',
      light: 'radial-gradient(920px 500px at 82% -12%,rgba(220,80,70,.16),transparent 58%),linear-gradient(160deg,#fef0ee,#f6f1ef 64%)' },
    { id: 'borealis', name: 'Borealis', tag: '🇨🇦', v4: '120,230,180',
      sw: 'linear-gradient(135deg,#6ef0b4,#8b7bff)',
      dark: 'radial-gradient(760px 520px at 14% -10%,rgba(110,240,180,.15),transparent 58%),radial-gradient(840px 480px at 88% 4%,rgba(139,123,255,.15),transparent 60%),linear-gradient(160deg,#0a1016,#07080c 64%)',
      light: 'radial-gradient(760px 520px at 14% -10%,rgba(80,210,150,.16),transparent 58%),radial-gradient(840px 480px at 88% 4%,rgba(139,123,255,.16),transparent 60%),linear-gradient(160deg,#eefbf4,#f3f2f7 64%)' },
    { id: 'midnight', name: 'Midnight', tag: '', v4: '150,170,205',
      sw: 'linear-gradient(135deg,#8ea0c0,#3a4760)',
      dark: 'linear-gradient(160deg,#0b0e14,#07080c 66%)',
      light: 'linear-gradient(160deg,#eef0f4,#f3f3f0 66%)' }
  ];
  function byId(id) { for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i]; return SKINS[0]; }

  function regionSkin() {
    try {
      var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
      var l = (navigator.language || '').toLowerCase();
      if (/Australia/i.test(tz) || l === 'en-au') return 'reef';
      if (/Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Montreal|Regina|St_Johns|Canada/i.test(tz) || l === 'en-ca' || l === 'fr-ca') return 'borealis';
    } catch (e) {}
    return 'aurora';
  }
  function saved() { try { return localStorage.getItem('nc_skin') || ''; } catch (e) { return ''; } }
  function isAuto() { try { return localStorage.getItem('nc_skin_auto') !== '0'; } catch (e) { return true; } }
  function current() { var s = saved(); return s && byId(s).id === s ? s : regionSkin(); }

  function injectCss() {
    if (document.getElementById('ncSkinCss')) return;
    var rows = [
      '#ncSkinFab{position:fixed;left:16px;bottom:16px;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));width:44px;height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.12);cursor:pointer;z-index:90000;display:grid;place-items:center;color:#eaf3ef;background:linear-gradient(140deg,#13201d,#0d1518);box-shadow:0 10px 26px rgba(0,0,0,.4);transition:transform .15s}',
      '#ncSkinFab:hover{transform:translateY(-2px)}#ncSkinFab svg{width:21px;height:21px}',
      'html[data-theme="light"] #ncSkinFab{background:#fff;border-color:rgba(15,23,42,.1);color:#0c2a22;box-shadow:0 10px 26px rgba(43,181,142,.16)}',
      '#ncSkinPop{position:fixed;left:16px;bottom:70px;left:max(16px,env(safe-area-inset-left));z-index:90001;width:270px;max-width:calc(100vw - 32px);border-radius:18px;padding:14px;color:#eef5f2;background:linear-gradient(150deg,#0f1a18,#0b1316);border:1px solid rgba(255,255,255,.09);box-shadow:0 24px 60px rgba(0,0,0,.5);transform-origin:bottom left;animation:ncSkinIn .16s ease}',
      '@keyframes ncSkinIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}',
      'html[data-theme="light"] #ncSkinPop{background:linear-gradient(150deg,#fff,#f4f7f5);border-color:rgba(15,23,42,.08);color:#0c2a22;box-shadow:0 24px 60px rgba(43,181,142,.16)}',
      '#ncSkinPop h4{margin:0;font-size:14.5px;font-weight:740}#ncSkinPop p{margin:2px 0 11px;font-size:11.5px;color:#90a49c}html[data-theme="light"] #ncSkinPop p{color:#5a736a}',
      '#ncSkinGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}',
      '#ncSkinPop .sk{position:relative;cursor:pointer;border:0;background:transparent;padding:0;display:flex;flex-direction:column;align-items:center;gap:4px}',
      '#ncSkinPop .sk i{display:block;width:100%;aspect-ratio:1;border-radius:12px;border:2px solid transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}',
      '#ncSkinPop .sk.on i{border-color:#8ff0d6;box-shadow:0 0 0 2px rgba(143,240,214,.3),inset 0 1px 0 rgba(255,255,255,.3)}',
      '#ncSkinPop .sk span{font-size:9.5px;font-weight:650;color:#aebcb6;line-height:1}html[data-theme="light"] #ncSkinPop .sk span{color:#5a736a}',
      '#ncSkinPop .sk b{position:absolute;top:-4px;right:-2px;font-size:10px}',
      '#ncSkinPop .sk-auto{margin-top:12px;width:100%;border:1px solid rgba(255,255,255,.12);background:transparent;color:#cdd8d3;font:inherit;font-weight:650;font-size:12px;padding:9px;border-radius:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px}',
      '#ncSkinPop .sk-auto.on{border-color:#8ff0d6;color:#8ff0d6}html[data-theme="light"] #ncSkinPop .sk-auto{border-color:rgba(15,23,42,.14);color:#2a4038}',
      '#ncSkinPop .sk-auto svg{width:14px;height:14px}'
    ];
    // one background rule per skin, for dark and light
    SKINS.forEach(function (s) {
      rows.push('html.nc-skin-' + s.id + '{--v4:' + s.v4 + '}');
      rows.push('html.nc-skin-' + s.id + ' body{background:' + s.dark + ' !important}');
      rows.push('html[data-theme="light"].nc-skin-' + s.id + ' body{background:' + s.light + ' !important}');
    });
    var st = document.createElement('style'); st.id = 'ncSkinCss'; st.textContent = rows.join('\n'); document.head.appendChild(st);
  }

  function apply(id) {
    var de = document.documentElement;
    SKINS.forEach(function (s) { de.classList.remove('nc-skin-' + s.id); });
    de.classList.add('nc-skin-' + byId(id).id);
  }

  var PALETTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7z"/><circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="17" cy="11" r="1.1" fill="currentColor" stroke="none"/></svg>';
  var AUTOIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="3.5"/></svg>';

  function buildPop() {
    var pop = document.getElementById('ncSkinPop');
    if (pop) { pop.parentNode.removeChild(pop); return null; }
    pop = document.createElement('div'); pop.id = 'ncSkinPop'; pop.className = 'nc-no-i18n'; pop.setAttribute('data-nci18n', 'off');
    var cur = current(), auto = isAuto();
    var grid = SKINS.map(function (s) {
      return '<button type="button" class="sk' + (s.id === cur ? ' on' : '') + '" data-skin="' + s.id + '">' +
        '<i style="background:' + s.sw + '"></i>' + (s.tag ? '<b>' + s.tag + '</b>' : '') + '<span>' + esc(s.name) + '</span></button>';
    }).join('');
    pop.innerHTML = '<h4>' + esc(T('title')) + '</h4><p>' + esc(T('sub')) + '</p>' +
      '<div id="ncSkinGrid">' + grid + '</div>' +
      '<button type="button" class="sk-auto' + (auto ? ' on' : '') + '" data-skin="__auto">' + AUTOIC + esc(T('auto')) + '</button>';
    document.body.appendChild(pop);
    return pop;
  }

  function onPick(id) {
    try {
      if (id === '__auto') { localStorage.setItem('nc_skin_auto', '1'); localStorage.removeItem('nc_skin'); apply(regionSkin()); }
      else { localStorage.setItem('nc_skin', id); localStorage.setItem('nc_skin_auto', '0'); apply(id); }
    } catch (e) { apply(id === '__auto' ? regionSkin() : id); }
    var pop = document.getElementById('ncSkinPop'); if (pop) pop.parentNode.removeChild(pop);
  }

  function mountFab() {
    if (document.getElementById('ncSkinFab')) return;
    var b = document.createElement('button'); b.id = 'ncSkinFab'; b.type = 'button'; b.setAttribute('aria-label', T('title')); b.innerHTML = PALETTE;
    b.addEventListener('click', function (e) { e.stopPropagation(); buildPop(); });
    document.body.appendChild(b);
    document.addEventListener('click', function (e) {
      var pop = document.getElementById('ncSkinPop'); if (!pop) return;
      var hit = e.target.closest && e.target.closest('[data-skin]');
      if (hit) { onPick(hit.getAttribute('data-skin')); return; }
      if (!pop.contains(e.target) && e.target.id !== 'ncSkinFab' && !(e.target.closest && e.target.closest('#ncSkinFab'))) pop.parentNode.removeChild(pop);
    });
    window.addEventListener('nc-lang', function () { var b2 = document.getElementById('ncSkinFab'); if (b2) b2.setAttribute('aria-label', T('title')); var p = document.getElementById('ncSkinPop'); if (p) { p.parentNode.removeChild(p); } });
  }

  function boot() { injectCss(); apply(current()); mountFab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NCThemes = { apply: function (id) { onPick(id); }, list: function () { return SKINS.map(function (s) { return { id: s.id, name: s.name }; }); }, current: current };
})();
