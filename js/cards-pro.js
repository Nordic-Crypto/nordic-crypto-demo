/* CARDS PRO — card design dialog fixes: Save/Cancel really close it, live preview, premium names.
   Load after app.legacy.js (anywhere before </body>). */
(function () {
  'use strict';
  if (window.__cardsPro) return; window.__cardsPro = true;
  var NAMES = { cosmic: 'Midnight', purple: 'Amethyst', silver: 'Platinum', black: 'Onyx', gold: 'Gold', ocean: 'Lagoon', mountain: 'Fjord', aurora: 'Aurora', city: 'Dusk' };
  function $(id) { return document.getElementById(id); }
  function hide() { var m = $('designMask'); if (m) { m.classList.remove('on'); m.style.display = 'none'; } }
  function relabel() {
    [].forEach.call(document.querySelectorAll('.design-opt'), function (o) {
      var s = o.querySelector('span'), k = o.getAttribute('data-design');
      if (s && NAMES[k] && s.textContent !== NAMES[k]) s.textContent = NAMES[k];
    });
  }
  function preview(k) {
    var l = $('designLive'); if (l) l.className = 'design-preview ' + k;
    var n = $('designName'); if (n) n.textContent = NAMES[k] || k;
  }
  function currentKey() { var a = document.querySelector('#designPickerModal .design-opt.on'); return a ? a.getAttribute('data-design') : null; }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var opt = t.closest('#designPickerModal .design-opt');
    if (opt) {                                    // choose a design: mark it and update the live preview
      [].forEach.call(document.querySelectorAll('#designPickerModal .design-opt'), function (x) { x.classList.remove('on'); });
      opt.classList.add('on'); preview(opt.getAttribute('data-design')); return;
    }
    if (t.closest('#designCancel')) { e.preventDefault(); e.stopImmediatePropagation(); hide(); return; }
    if (t.id === 'designMask') { e.stopImmediatePropagation(); hide(); return; }
    if (t.closest('#designSave')) {
      e.preventDefault(); e.stopImmediatePropagation();
      var d = currentKey();
      if (!d) { if (typeof toast === 'function') toast('Please choose a design', true); return; }
      hide();
      var run = function () {
        if (!st.card) st.card = {};
        st.card.design = d;
        if (typeof saveToServer === 'function') saveToServer();
        if (typeof applyCardDesign === 'function') applyCardDesign();
        if (typeof renderCard === 'function') renderCard();
        if (typeof toast === 'function') toast('Card design updated: ' + (NAMES[d] || d));
      };
      if (typeof openPasswordConfirm === 'function') openPasswordConfirm('Confirm changing card design to "' + (NAMES[d] || d) + '"', run); else run();
      return;
    }
    if (t.closest('#btnChangeDesign')) {
      var cb = $('btnChangeDesign'); if (cb && !cb.onclick && typeof initDesignPicker === 'function') { try { initDesignPicker(); } catch (er) {} }          // the legacy handler opens the dialog; sync names and preview right after
      setTimeout(function () { relabel(); var k = currentKey(); if (k) preview(k); }, 30);
    }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var m = $('designMask'); if (m && m.style.display !== 'none' && m.classList.contains('on')) hide(); } });

  /* keep the real card in step with the saved design after every render */
  function hook() {
    if (typeof window.renderCard === 'function' && !window.renderCard.__cp) {
      var orig = window.renderCard;
      window.renderCard = function () { var r = orig.apply(this, arguments); try { if (typeof applyCardDesign === 'function') applyCardDesign(); } catch (e) {} return r; };
      window.renderCard.__cp = true;
    }
  }
  hook(); relabel(); setInterval(function () { hook(); relabel(); }, 2000);
})();
