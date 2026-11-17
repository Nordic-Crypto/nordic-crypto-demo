/* CARD SKINS — "Holiday collection" card designs (Frost, Noir & Gold, Ice Glass, Santa, Evergreen, Midnight Sleigh).
   Pure CSS/SVG, no images, no network. Load after app.legacy.js and cards-pro.js. */
(function () {
  'use strict';
  if (window.__cardSkins) return; window.__cardSkins = true;
  var SK = [
    ['frost', 'Frost Platinum', 'Engraved snowflakes on brushed platinum'],
    ['noel', 'Noir & Gold', 'Black glass with a ribbon of gold'],
    ['iceglass', 'Ice Glass', 'Neon crystals frozen in glass'],
    ['santa', 'Santa Red', 'Velvet red, white fur trim'],
    ['pine', 'Evergreen', 'A tree full of tiny lights'],
    ['sleigh', 'Midnight Sleigh', 'Santa crossing the winter moon']
  ];
  var KEYS = SK.map(function (s) { return s[0]; });
  var DC = KEYS.map(function (k) { return 'design-' + k; });

  /* ---------- SVG art ---------- */
  function flake(r, col, sw, extra) {
    var arm = '<path d="M0 0V' + (-r) + 'M0 ' + (-r * .42) + 'L' + (r * .2) + ' ' + (-r * .62) + 'M0 ' + (-r * .42) + 'L' + (-r * .2) + ' ' + (-r * .62) + 'M0 ' + (-r * .68) + 'L' + (r * .15) + ' ' + (-r * .86) + 'M0 ' + (-r * .68) + 'L' + (-r * .15) + ' ' + (-r * .86) + '"/>', g = '';
    for (var i = 0; i < 6; i++) g += '<g transform="rotate(' + (i * 60) + ')">' + arm + '</g>';
    return '<g fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '>' + g + '</g>';
  }
  function at(x, y, s, inner) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')">' + inner + '</g>'; }
  function svg(inner, defs) { return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">' + (defs ? '<defs>' + defs + '</defs>' : '') + inner + '</svg>') + '")'; }
  function dots(list, col, op) { return list.map(function (d) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="' + col + '" opacity="' + (op || 1) + '"/>'; }).join(''); }
  var SP = [[40, 40, 1.2], [120, 22, 1], [190, 70, 1.4], [250, 30, .9], [330, 200, 1.2], [60, 200, 1], [150, 230, 1.1], [370, 120, .9], [20, 130, 1.1], [230, 215, 1], [105, 95, .8], [300, 55, 1]];

  var ART = {};
  ART.frost = svg(
    at(292, 122, 1, flake(104, '#8693a4', 3, 'transform="translate(2 2)"') + flake(104, '#ffffff', 3, 'transform="translate(-1 -1)"') + flake(104, '#cfd7e2', 2.6) + '<circle r="20" fill="none" stroke="#aab4c2" stroke-width="2"/><circle r="20" fill="none" stroke="#fff" stroke-width="1" transform="translate(-1 -1)"/>') +
    at(176, 66, 1, flake(26, '#8f9bab', 2, 'transform="translate(1 1)"') + flake(26, '#fff', 2, 'transform="translate(-.5 -.5)"') + flake(26, '#d3dae4', 1.6)) +
    at(196, 212, 1, flake(22, '#8f9bab', 1.8, 'transform="translate(1 1)"') + flake(22, '#fff', 1.8, 'transform="translate(-.5 -.5)"') + flake(22, '#d3dae4', 1.4)) +
     dots(SP, '#fff', .8));
  ART.noel = svg(
    dots(SP, '#f4d27a', .85) + dots([[100, 60, .6], [280, 190, .7], [210, 30, .6], [345, 85, .8]], '#fff', .9) +
    '<path d="M150 288C205 232 250 214 284 170S372 60 436 22" fill="none" stroke="url(#g1)" stroke-width="26" stroke-linecap="round"/>' +
    '<path d="M110 275C190 200 230 235 292 164S384 48 432 14" fill="none" stroke="#fff4c8" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round" transform="translate(0 -6)"/>' +
    '<path d="M110 275C190 200 230 235 292 164S384 48 432 14" fill="none" stroke="#6b4a10" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" transform="translate(0 7)"/>' +
    '<path d="M168 300C220 244 262 226 298 184S384 74 448 38" fill="none" stroke="url(#g1)" stroke-width="5" stroke-linecap="round" opacity=".8"/>' +
    '<polygon points="280,112 322,66 374,92 356,136 306,150" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".45" stroke-width=".9"/><polygon points="300,168 352,150 340,204 292,214" fill="#fff" fill-opacity=".05" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/><polyline points="318,70 330,128 352,150 330,128 268,122" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>',
    '<linearGradient id="g1" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a5a0e"/><stop offset=".35" stop-color="#ffe9a0"/><stop offset=".6" stop-color="#c8922a"/><stop offset="1" stop-color="#fff1b8"/></linearGradient>');
  ART.iceglass = svg(
    '<g stroke="#9ec9ff" stroke-opacity=".22" stroke-width=".8" fill="none"><path d="M40 0L120 90L90 250"/><path d="M120 90L230 60L400 150"/><path d="M230 60L270 0"/><path d="M90 250L200 170L400 215"/><path d="M200 170L230 60"/></g>' +
    '<g filter="url(#gl)">' + at(296, 112, 1, flake(96, 'url(#gc)', 2.4)) + at(214, 196, 1, flake(30, '#7fb6ff', 1.7)) + at(190, 42, 1, flake(22, '#c7a6ff', 1.6)) + '</g>' + dots(SP, '#cfe4ff', .7),
    '<linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ff0ff"/><stop offset="1" stop-color="#b57bff"/></linearGradient><filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  var fur = ''; for (var fi = -1; fi < 19; fi++) fur += '<circle cx="' + (fi * 22 + 8) + '" cy="248" r="15" fill="url(#fu)"/>';
  ART.santa = svg(
    '<g opacity=".13">' + at(60, 60, 1, flake(18, '#fff', 1.3)) + at(210, 40, 1, flake(14, '#fff', 1.2)) + at(150, 130, 1, flake(20, '#fff', 1.3)) + at(330, 160, 1, flake(18, '#fff', 1.3)) + at(40, 170, 1, flake(14, '#fff', 1.2)) + at(260, 210, 1, flake(12, '#fff', 1.2)) + '</g>' +
    '<rect x="9" y="9" width="382" height="232" rx="16" fill="none" stroke="#f0cf7a" stroke-opacity=".55" stroke-width="1"/>' +
    fur +
    dots([[300, 40, 1.6], [70, 130, 1.3], [250, 135, 1.2], [180, 60, 1.4]], '#ffe9a8', .9),
    '<radialGradient id="fu" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f1f1f6"/><stop offset="1" stop-color="#c9ccd6"/></radialGradient>');
  var tree = function (x, y, s) {
    return at(x, y, s,
      '<rect x="-7" y="82" width="14" height="16" rx="2" fill="#6b3f1d"/>' +
      '<polygon points="0,-78 34,-34 -34,-34" fill="#13a06a"/><polygon points="0,-52 46,6 -46,6" fill="#0f8a5b"/><polygon points="0,-18 58,52 -58,52" fill="#0b7a50"/><polygon points="0,16 70,90 -70,90" fill="#096a45"/>' +
      '<polygon points="0,-78 34,-34 0,-34" fill="#fff" opacity=".08"/>' +
      '<path d="M-26 -30Q0 -14 26 -30M-38 4Q0 26 38 4M-50 40Q0 66 50 40M-60 76Q0 104 60 76" fill="none" stroke="#f3d36e" stroke-width="1.4" opacity=".85"/>' +
      '<polygon points="0,-96 5,-84 18,-84 8,-76 12,-64 0,-71 -12,-64 -8,-76 -18,-84 -5,-84" fill="#ffd45a"/>');
  };
  var bulbs = [[-16, -26, '#ff4d5a'], [14, -22, '#ffd45a'], [-30, 12, '#6ab0ff'], [24, 14, '#ff4d5a'], [-8, 8, '#ffd45a'], [-44, 52, '#ffd45a'], [-10, 46, '#ff6ab5'], [30, 50, '#6ab0ff'], [50, 74, '#ff4d5a'], [-30, 82, '#ffd45a'], [10, 78, '#7dffb0']];
  ART.pine = svg(
    '<path d="M0 6Q50 24 100 6Q150 24 200 6Q250 24 300 6Q350 24 400 6" fill="none" stroke="#c9a24a" stroke-width="1.4" opacity=".8"/>' +
    [[25, 15, '#ff4d5a'], [75, 15, '#ffd45a'], [125, 15, '#6ab0ff'], [175, 15, '#ff6ab5'], [225, 15, '#ffd45a'], [275, 15, '#ff4d5a'], [325, 15, '#7dffb0'], [375, 15, '#6ab0ff']].map(function (d) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="9" fill="' + d[2] + '" opacity=".25"/><circle cx="' + d[0] + '" cy="' + d[1] + '" r="4" fill="' + d[2] + '"/>'; }).join('') +
    tree(338, 118, .7) + at(338, 118, .7, bulbs.map(function (b) { return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="4.2" fill="' + b[2] + '"/><circle cx="' + b[0] + '" cy="' + b[1] + '" r="8" fill="' + b[2] + '" opacity=".25"/>'; }).join('')) +
    '<path d="M0 241Q70 231 150 239T300 237T400 235V250H0Z" fill="#eaf4f2" opacity=".95"/>' + dots(SP, '#fff', .55));
  ART.sleigh = svg(
    '<circle cx="292" cy="92" r="64" fill="url(#mg)"/><circle cx="292" cy="92" r="38" fill="#fff4cf"/><circle cx="280" cy="84" r="7" fill="#f0dca4" opacity=".7"/><circle cx="305" cy="104" r="5" fill="#f0dca4" opacity=".6"/><circle cx="300" cy="76" r="3.5" fill="#f0dca4" opacity=".6"/>' + dots(SP, '#fff', .9) + dots([[60, 70, 1.8], [140, 120, 1.6], [350, 30, 1.8]], '#ffe9a8') +
    '<g fill="#07102e" stroke="#07102e" stroke-linecap="round" stroke-linejoin="round" transform="translate(150 46) rotate(-6) scale(1.12)">' +
    /* sleigh */ '<path d="M92 26C92 40 104 46 122 46L150 46C158 46 162 40 162 32L162 20L154 20L154 32C154 35 151 38 148 38L126 38C112 38 104 34 104 26Z" stroke-width="1.4"/><path d="M86 52C112 58 150 58 168 50C174 47 174 42 170 40" fill="none" stroke-width="2.6"/><path d="M110 40V52M146 40V52" fill="none" stroke-width="2"/><circle cx="132" cy="24" r="6.5" stroke-width="1"/><path d="M124 22L132 8L140 22Z" stroke-width="1"/><circle cx="132" cy="7" r="2.4" fill="#fff" stroke="#fff" stroke-width="0"/><path d="M122 30H144L146 38H120Z" stroke-width="1"/>' +
    /* harness */ '<path d="M92 30Q70 26 56 30M56 30Q44 28 30 32" fill="none" stroke-width="1"/>' +
    /* reindeer x2 */ [[58, 0], [10, 5]].map(function (r) { return '<g transform="translate(' + r[0] + ' ' + r[1] + ')"><ellipse cx="0" cy="26" rx="15" ry="7.5" stroke-width="1"/><path d="M-10 22L-24 6L-30 10L-22 28Z" stroke-width="1"/><ellipse cx="-31" cy="6" rx="6.5" ry="4.4" transform="rotate(-20 -31 6)" stroke-width="1"/><path d="M-30 2L-34 -8L-40 -12M-34 -8L-32 -16M-27 1L-26 -9L-20 -14M-26 -9L-30 -16" fill="none" stroke-width="1.5"/><path d="M-8 32L-18 44M-3 33L-8 46M8 32L18 40M13 30L26 36" fill="none" stroke-width="2.2"/><path d="M15 24Q20 22 22 26" fill="none" stroke-width="1.6"/></g>'; }).join('') + '</g>' +
    '<path d="M0 240Q60 229 130 238T270 234T400 228V250H0Z" fill="#dfe9ff"/><path d="M0 246Q90 238 190 245T400 241V250H0Z" fill="#b9c8ee"/>' +
        '<radialGradient id="mg"><stop offset="0" stop-color="#fff4cf" stop-opacity=".55"/><stop offset="1" stop-color="#fff4cf" stop-opacity="0"/></radialGradient>');

  var BASE = {
    frost: 'repeating-linear-gradient(90deg,rgba(255,255,255,.16) 0 1px,transparent 1px 3px),linear-gradient(135deg,#f7f9fc 0%,#c3ccd9 42%,#eef2f7 66%,#aeb8c6 100%)',
    noel: 'linear-gradient(135deg,#050507 0%,#15110a 55%,#0a0a0d 100%)',
    iceglass: 'linear-gradient(135deg,#091030 0%,#1a1250 55%,#35196a 100%)',
    santa: 'radial-gradient(circle at 15% 0%,#e3262f 0%,#a60f19 52%,#470509 100%)',
    pine: 'linear-gradient(160deg,#04281e 0%,#0a5339 58%,#06322a 100%)',
    sleigh: 'linear-gradient(180deg,#040a22 0%,#0d1c52 58%,#22398a 100%)'
  };
  var DARKTXT = { frost: 1 };

  /* ---------- CSS ---------- */
  function css() {
    if (document.getElementById('hkCss')) return;
    var o = '', k, t = '', pv = '';
    SK.forEach(function (s) {
      k = s[0];
      o += '.pay.design-' + k + ',.design-preview.' + k + '{background:' + ART[k] + ' center/cover no-repeat,' + BASE[k] + '!important;background-color:#111}';
      if (DARKTXT[k]) o += '.pay.design-' + k + ' .pb,.pay.design-' + k + ' .pn,.pay.design-' + k + ' .pv,.pay.design-' + k + ' .pl,.pay.design-' + k + ' .pt,.pay.design-' + k + ' .card-network{color:#1c2430!important;text-shadow:0 1px 0 rgba(255,255,255,.7)}.pay.design-frost .chip-real{box-shadow:inset 0 0 0 1px rgba(0,0,0,.18),0 1px 0 rgba(255,255,255,.7)}';
      else o += '.pay.design-' + k + ' .pn,.pay.design-' + k + ' .pv,.pay.design-' + k + ' .pb{text-shadow:0 1px 6px rgba(0,0,0,.55)}.pay.design-' + k + ' .pt,.pay.design-' + k + ' .pl{color:rgba(255,255,255,.78)!important}';
    });
    o += '.pay.design-iceglass{box-shadow:inset 0 0 0 1px rgba(150,200,255,.5),0 0 34px rgba(120,100,255,.35),0 30px 60px -30px rgba(0,0,0,.9)!important}' +
      '.pay.design-noel{box-shadow:inset 0 0 0 1px rgba(240,207,122,.35),0 30px 60px -30px rgba(0,0,0,.9)!important}' +
      '.pay.design-santa{box-shadow:0 18px 44px -18px rgba(180,10,25,.7),0 30px 60px -30px rgba(0,0,0,.9)!important}' +
      '.pay.design-frost{border-color:rgba(255,255,255,.7)!important;box-shadow:0 24px 50px -24px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.6)!important}';
    /* glare + tilt */
    o += '.pay[data-hk]{--gx:72%;--gy:18%;--rx:0deg;--ry:0deg;touch-action:pan-y}' +
      '.pay[data-hk] .pay-shine{left:0!important;width:100%;opacity:1;transition:none;background:radial-gradient(circle at var(--gx) var(--gy),rgba(255,255,255,.26),rgba(255,255,255,0) 46%),linear-gradient(115deg,transparent 35%,rgba(255,255,255,.07) 50%,transparent 65%)}' +
      '.pay[data-hk].design-frost .pay-shine{background:radial-gradient(circle at var(--gx) var(--gy),rgba(255,255,255,.7),rgba(255,255,255,0) 46%)}' +
      '.pay[data-hk]:hover{transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) translateY(-3px)}' +
      '.pay[data-hk]{transition:transform .25s ease,box-shadow .25s}.pay[data-hk].hk-live{transition:transform .06s linear}';
    /* falling snow layer */
    o += '.hk-snow{position:absolute;left:0;right:0;top:-100%;height:200%;pointer-events:none;z-index:2;opacity:.8;background-repeat:repeat;background-image:radial-gradient(circle,#fff 0 1.6px,transparent 2.2px),radial-gradient(circle,#fff 0 1.1px,transparent 1.7px),radial-gradient(circle,#fff 0 .8px,transparent 1.3px);background-size:97px 83px,61px 71px,43px 53px;background-position:7px 11px,29px 40px,13px 3px;animation:hkFall 16s linear infinite;will-change:transform}' +
      '.pay.design-frost .hk-snow{filter:drop-shadow(0 0 1px rgba(90,110,140,.5));opacity:.9}' +
      '@keyframes hkFall{to{transform:translateY(50%)}}' +
      '@media (prefers-reduced-motion:reduce){.hk-snow{animation:none;top:0;height:100%}.pay[data-hk]:hover{transform:none}}' +
      'html.hk-nosnow .hk-snow{display:none}' +
      /* picker */
      '.design-opt.hk-new{position:relative}.design-opt.hk-new::before{content:"NEW";position:absolute;top:10px;left:10px;z-index:2;padding:2px 6px;border-radius:99px;background:linear-gradient(135deg,#ff5a64,#c8141e);color:#fff;font:800 9px/1.3 system-ui,sans-serif;letter-spacing:.08em}' +
      '.hk-sep{grid-column:1/-1;display:flex;align-items:center;gap:8px;margin:6px 2px 0;font:700 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.7}.hk-sep::after{content:"";flex:1;height:1px;background:currentColor;opacity:.25}' +
      '#designLive.design-preview.frost span,#designLive.design-preview.frost b{color:#1c2430}';
    var s = document.createElement('style'); s.id = 'hkCss'; s.textContent = o; document.head.appendChild(s);
  }

  /* ---------- picker injection ---------- */
  function holidayOn() { try { return !!(window.__holApi && window.__holApi.active && window.__holApi.active()); } catch (e) { return false; } }
  function curKey() { try { return window.st && st.card && st.card.design; } catch (e) { return null; } }
  function inject(pk) {
    if (!pk || pk.querySelector('[data-design="frost"]')) return;
    var show = holidayOn() || KEYS.indexOf(curKey()) > -1; if (!show) return;
    var sep = document.createElement('div'); sep.className = 'hk-sep'; sep.textContent = '❄ Holiday collection'; pk.appendChild(sep);
    SK.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'design-opt hk-new'; b.setAttribute('data-design', s[0]); b.title = s[2];
      b.innerHTML = '<div class="design-preview ' + s[0] + '"></div><span>' + s[1] + '</span>'; pk.appendChild(b);
    });
  }
  function patchNames() { /* cards-pro keeps NAMES private; relabel after it runs */
    [].forEach.call(document.querySelectorAll('.design-opt'), function (o) { var k = o.getAttribute('data-design'); SK.forEach(function (s) { if (s[0] === k) { var sp = o.querySelector('span'); if (sp && sp.textContent !== s[1]) sp.textContent = s[1]; } }); });
    var l = document.getElementById('designLive'), n = document.getElementById('designName');
    if (l && n) { var m = (l.className.match(/design-preview\s+(\w+)/) || [])[1]; SK.forEach(function (s) { if (s[0] === m && n.textContent !== s[1]) n.textContent = s[1]; }); }
  }

  /* ---------- apply to live cards ---------- */
  var DESC = {}; SK.forEach(function (s) { DESC[s[0]] = s[1]; });
  function decorate() {
    var d = curKey(), mine = KEYS.indexOf(d) > -1;
    [].forEach.call(document.querySelectorAll('.pay'), function (c) {
      if (c.closest('.onb-preview') || c.closest('.onb-step')) return;
      DC.forEach(function (x) { if (x !== 'design-' + d && c.classList.contains(x)) c.classList.remove(x); });
      var sn = c.querySelector(':scope > .hk-snow');
      if (mine) { c.classList.add('design-' + d); c.setAttribute('data-hk', d); if (!sn) { sn = document.createElement('div'); sn.className = 'hk-snow'; sn.setAttribute('aria-hidden', 'true'); c.insertBefore(sn, c.firstChild); } }
      else { c.removeAttribute('data-hk'); if (sn) sn.remove(); }
    });
  }
  function hook() {
    if (typeof window.applyCardDesign === 'function' && !window.applyCardDesign.__hk) {
      var o = window.applyCardDesign; window.applyCardDesign = function () { var r; try { r = o.apply(this, arguments); } catch (e) {} try { decorate(); } catch (e) {} return r; }; window.applyCardDesign.__hk = true;
    }
  }

  /* ---------- tilt / glare (pointer only, rAF-throttled) ---------- */
  var raf = 0, tgt = null, px = 0, py = 0;
  function frame() { raf = 0; if (!tgt) return; var r = tgt.getBoundingClientRect(), x = (px - r.left) / r.width, y = (py - r.top) / r.height; x = Math.max(0, Math.min(1, x)); y = Math.max(0, Math.min(1, y)); tgt.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); tgt.style.setProperty('--gy', (y * 100).toFixed(1) + '%'); tgt.style.setProperty('--ry', ((x - .5) * 12).toFixed(2) + 'deg'); tgt.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg'); }
  document.addEventListener('pointermove', function (e) { var c = e.target && e.target.closest && e.target.closest('.pay[data-hk]'); if (!c) { if (tgt) { tgt.classList.remove('hk-live'); tgt.style.removeProperty('--rx'); tgt.style.removeProperty('--ry'); tgt = null; } return; } if (tgt !== c) { if (tgt) tgt.classList.remove('hk-live'); tgt = c; c.classList.add('hk-live'); } px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  document.addEventListener('pointerleave', function () { if (tgt) { tgt.classList.remove('hk-live'); tgt.style.removeProperty('--rx'); tgt.style.removeProperty('--ry'); tgt = null; } }, true);
  document.addEventListener('visibilitychange', function () { document.documentElement.classList.toggle('hk-nosnow', document.hidden); });

  function tick() { hook(); inject(document.getElementById('designPickerModal')); [].forEach.call(document.querySelectorAll('#onboard .design-picker'), inject); patchNames(); decorate(); }
  css(); tick(); setInterval(tick, 1500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#btnChangeDesign,.design-opt')) setTimeout(function () { tick(); }, 60); }, true);
  window.__cardSkins = { keys: KEYS, names: DESC, decorate: decorate };
})();
