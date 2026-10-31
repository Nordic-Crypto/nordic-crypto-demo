/* NordicCrypto — Device Pro v1.0 (see device-pro.css). No dependencies, never touches app logic. */
(function () {
  'use strict';
  if (window.__ncDevicePro) return; window.__ncDevicePro = true;
  var de = document.documentElement, ua = navigator.userAgent || '', plat = navigator.platform || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua), touch = navigator.maxTouchPoints > 0;
  function cls(c, on) { de.classList.toggle(c, !!on); }
  function T(f) { try { f(); } catch (e) {} }

  /* ---- environment classes ---- */
  cls('dp-ios', ios); cls('dp-android', android); cls('dp-touch', touch);
  T(function () { cls('dp-standalone', (window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone); });

  var raf = 0;
  function measure() {
    var vv = window.visualViewport, W = de.clientWidth || innerWidth, H = vv ? vv.height : innerHeight;
    de.style.setProperty('--dp-vh', (H * 0.01) + 'px');
    cls('dp-xxs', W <= 300); cls('dp-xs', W <= 360); cls('dp-sm', W > 360 && W <= 400); cls('dp-md', W > 400 && W <= 600); cls('dp-lg', W > 600 && W <= 1100); cls('dp-xl', W > 1100);
    cls('dp-land', innerWidth > innerHeight); cls('dp-short', innerHeight <= 480);
    // on-screen keyboard: visual viewport much shorter than the layout viewport while a field is focused
    var kb = vv ? Math.max(0, innerHeight - vv.height - (vv.offsetTop || 0)) : 0, ae = document.activeElement;
    var typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae && ae.isContentEditable);
    de.style.setProperty('--dp-kb', kb + 'px');
    // Android Chrome may resize the layout viewport instead: detect by height drop
    var drop = (window.__dpH || innerHeight) - innerHeight; if (!typing) window.__dpH = Math.max(window.__dpH || 0, innerHeight);
    cls('dp-kb', typing && touch && (kb > 120 || drop > 160));
    lift();
  }
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); }

  /* ---- bottom bars: find fixed elements glued to the bottom edge and give them safe-area padding ---- */
  var seen = new WeakSet();
  function lift() {
    var root = document.getElementById('mainApp') || document.body, list = [];
    Array.prototype.forEach.call(root.children, function (e) { list.push(e); Array.prototype.forEach.call(e.children, function (c) { list.push(c); }); });
    list.forEach(function (e) {
      if (e.nodeType !== 1 || e.id === 'chatToggle' || e.id === 'chatPanel') return;
      var cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.display === 'none') return;
      var r = e.getBoundingClientRect();
      var glued = r.height > 0 && r.height < 150 && r.width >= innerWidth * 0.85 && Math.abs(r.bottom - innerHeight) < 3;
      if (glued && !seen.has(e)) { seen.add(e); e.style.setProperty('--dp-pb', cs.paddingBottom); e.classList.add('dp-bbar'); }
      else if (!glued && e.classList.contains('dp-bbar') && !de.classList.contains('dp-kb')) { e.classList.remove('dp-bbar'); seen.delete(e); }
    });
  }

  /* ---- keep the focused field visible above the keyboard (iOS does not always) ---- */
  document.addEventListener('focusin', function (e) {
    var t = e.target; if (!touch || !t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    setTimeout(function () { T(function () { var vv = window.visualViewport, r = t.getBoundingClientRect(), h = vv ? vv.height : innerHeight; if (r.bottom > h - 12 || r.top < 60) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); schedule(); }, 320);
  });
  document.addEventListener('focusout', function () { setTimeout(schedule, 120); });

  /* ---- theme-color: Android / iOS browser bar matches the app ---- */
  T(function () {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    var bg = getComputedStyle(document.body).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)') m.content = bg; else if (!m.content) m.content = '#0b1220';
    if (!document.querySelector('meta[name="mobile-web-app-capable"]')) { var a = document.createElement('meta'); a.name = 'mobile-web-app-capable'; a.content = 'yes'; document.head.appendChild(a); }
  });

  /* ---- old browsers (Samsung Internet < 20, old WebView, iOS < 16.2) have no color-mix(): rewrite it into plain rgba ---- */
  T(function () {
    if (window.CSS && CSS.supports && CSS.supports('color', 'color-mix(in srgb, red 50%, blue)')) return;
    function hex(c) { c = c.trim(); var m = /^#([0-9a-f]{3,8})$/i.exec(c); if (m) { var h = m[1]; if (h.length < 6) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; } m = /^rgba?\(([^)]+)\)/.exec(c); if (m) { var p = m[1].split(/[ ,\/]+/).map(parseFloat); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; } if (/^transparent$/i.test(c)) return [0, 0, 0, 0]; if (/^white$/i.test(c)) return [255, 255, 255, 1]; if (/^black$/i.test(c)) return [0, 0, 0, 1]; return null; }
    var acc = getComputedStyle(de).getPropertyValue('--nc-acc') || '#c8ff4d';
    function res(c) { c = c.trim(); var v = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(c); if (v) { c = (getComputedStyle(de).getPropertyValue(v[1]) || '').trim() || (/acc/.test(v[1]) ? acc : v[2] || '#fff'); } return hex(c) || hex(acc); }
    function conv(css) {
      return css.replace(/color-mix\(\s*in srgb\s*,\s*((?:var\([^)]*\)|#[0-9a-f]+|rgba?\([^)]*\)|[a-z]+))\s+(\d+)%\s*,\s*((?:var\([^)]*\)|#[0-9a-f]+|rgba?\([^)]*\)|[a-z]+))\s*\)/gi, function (all, a, pct, b) {
        var A = res(a), B = res(b), p = pct / 100; if (!A || !B) return all;
        var aA = A[3], aB = B[3], w = p * aA + (1 - p) * aB || 1;
        var r = Math.round((A[0] * p * aA + B[0] * (1 - p) * aB) / w), g = Math.round((A[1] * p * aA + B[1] * (1 - p) * aB) / w), bl = Math.round((A[2] * p * aA + B[2] * (1 - p) * aB) / w), al = (p * aA + (1 - p) * aB);
        return 'rgba(' + r + ',' + g + ',' + bl + ',' + al.toFixed(3) + ')';
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      if (!/-pro\.css|trade-x\.css/.test(l.href)) return;
      fetch(l.href).then(function (r) { return r.text(); }).then(function (t) { if (t.indexOf('color-mix') < 0) return; var s = document.createElement('style'); s.textContent = conv(t); l.parentNode.insertBefore(s, l.nextSibling); l.disabled = true; }).catch(function () {});
    });
  });

  window.addEventListener('resize', schedule, { passive: true }); window.addEventListener('orientationchange', function () { setTimeout(schedule, 250); });
  T(function () { window.visualViewport.addEventListener('resize', schedule); window.visualViewport.addEventListener('scroll', schedule); });
  document.addEventListener('DOMContentLoaded', schedule); window.addEventListener('load', function () { schedule(); setTimeout(schedule, 800); setTimeout(schedule, 2500); });
  T(function () { new MutationObserver(function () { schedule(); }).observe(document.getElementById('mainApp') || document.body, { childList: true, attributes: true, attributeFilter: ['style', 'class'], subtree: false }); });
  schedule();
})();
