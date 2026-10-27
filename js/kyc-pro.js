/* ============================================================
   NC KYC PRO v1.0 — document / selfie upload screen
   Fixes:  • Driver's license / National ID now show BOTH sides
           • the uploaded photo is shown (full image, tap to zoom)
           • replace / remove, drag & drop, file info, quality hint
           • window.NCVerify.getDocs() is provided (front + back are
             uploaded; photos are auto-resized before upload)
   Load AFTER app.legacy.js (before </body>). Needs css/kyc-pro.css.
   ============================================================ */
(function () {
  'use strict';
  if (window.__kpLoaded) return; window.__kpLoaded = true;

  function $(id) { return document.getElementById(id); }
  var MAX_BYTES = 15 * 1024 * 1024, MAX_SIDE = 2000, MIN_W = 700;
  var SLOTS = [
    { key: 'front', zone: 'docUpload', input: 'docFile', thumb: 'docThumb', row: 'docUploaded', name: 'docFileName', size: 'docFileSize', label: 'Front' },
    { key: 'back', zone: 'docUploadBack', input: 'docFileBack', thumb: 'docThumbBack', row: 'docUploadedBack', name: 'docFileNameBack', size: 'docFileSizeBack', label: 'Back' },
    { key: 'selfie', zone: 'selfieUpload', input: 'selfieFile', thumb: 'selfieThumb', row: 'selfieUploaded', name: 'selfieFileName', size: 'selfieFileSize', label: 'Selfie', round: true }
  ];
  var store = { front: null, back: null, selfie: null };   // processed Files
  var meta = {};

  function fmt(b) { return b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; }
  function toast(m, w) { if (typeof window.toast === 'function') window.toast(m, w); }
  function slotsEl() { return $('docSlots'); }
  function curType() { var b = document.querySelector('#verifyScreen .vtype-btn.on'); return b ? b.getAttribute('data-type') : 'Passport'; }
  function sides() { return curType() === 'Passport' ? 1 : 2; }

  function docs() {
    var s = sides();
    return { type: curType(), sides: s, front: store.front, back: s === 2 ? store.back : null, selfie: store.selfie, ok: !!store.front && (s === 1 || !!store.back) };
  }

  /* ---------- image processing ---------- */
  function load(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { res({ img: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('decode')); };
      im.src = url;
    });
  }
  function shrink(file, im) {
    return new Promise(function (res) {
      var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, MAX_SIDE / Math.max(w, h));
      if (k === 1 && file.size < 2.5 * 1048576 && /jpe?g/i.test(file.type)) return res(file);
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(function (b) {
        if (!b || (b.size >= file.size && k === 1)) return res(file);
        var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        try { res(new File([b], name, { type: 'image/jpeg', lastModified: Date.now() })); } catch (e) { res(file); }
      }, 'image/jpeg', 0.88);
    });
  }

  /* ---------- per-slot UI ---------- */
  function ensureUi(s) {
    var z = $(s.zone); if (!z || z.getAttribute('data-kp')) return;
    z.setAttribute('data-kp', '1');
    var scan = document.createElement('div'); scan.className = 'kp-scan'; z.appendChild(scan);
    var bar = document.createElement('div'); bar.className = 'kp-bar';
    bar.innerHTML = '<span class="kp-tag">' + s.label + '</span><button type="button" class="kp-btn" data-kp="zoom" title="View full size" aria-label="View full size"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg></button><button type="button" class="kp-btn" data-kp="del" title="Remove" aria-label="Remove photo"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    z.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kp]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.getAttribute('data-kp') === 'del') clear(s); else zoom(s);
    });
    var row = $(s.row);
    if (row && !row.querySelector('.kp-q')) { var q = document.createElement('span'); q.className = 'kp-q'; row.appendChild(q); }
    // drag & drop
    ['dragenter', 'dragover'].forEach(function (t) { z.addEventListener(t, function (e) { e.preventDefault(); z.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (t) { z.addEventListener(t, function (e) { e.preventDefault(); z.classList.remove('drag'); }); });
    z.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) accept(s, f); });
  }

  function accept(s, file) {
    var inp = $(s.input);
    if (!/^image\//.test(file.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) { toast('Please choose a photo (JPG, PNG or HEIC)', true); resetInput(inp); return; }
    if (file.size > MAX_BYTES) { toast('Photo is too large (' + fmt(file.size) + '). Max 15 MB.', true); resetInput(inp); return; }
    var z = $(s.zone); z.classList.add('kp-busy');
    load(file).then(function (r) {
      var w = r.img.naturalWidth, h = r.img.naturalHeight;
      return shrink(file, r.img).then(function (out) {
        store[s.key] = out; meta[s.key] = { w: w, h: h, orig: file.size, size: out.size };
        show(s, r.url, out, w, h);
      });
    }).catch(function () {
      // e.g. HEIC the browser can't decode: keep the original, show a neutral preview
      store[s.key] = file; meta[s.key] = { w: 0, h: 0, orig: file.size, size: file.size };
      show(s, null, file, 0, 0);
    }).then(function () { z.classList.remove('kp-busy'); refresh(); });
  }
  function resetInput(inp) { try { inp.value = ''; } catch (e) { } }

  function show(s, url, file, w, h) {
    var z = $(s.zone), t = $(s.thumb), row = $(s.row);
    if (t) { if (url) { t.src = url; t.hidden = false; t.style.display = 'block'; } else { t.hidden = true; } }
    z.classList.add('has'); z.classList.toggle('kp-nopreview', !url); z.style.display = '';
    if (row) {
      row.style.display = 'flex';
      var n = $(s.name), sz = $(s.size); if (n) n.textContent = file.name; if (sz) sz.textContent = fmt(file.size) + (w ? ' · ' + w + '×' + h : '');
      var q = row.querySelector('.kp-q'); if (q) { var low = w && w < MIN_W; q.textContent = !w ? 'Preview unavailable' : low ? 'Low resolution — retake if text is hard to read' : 'Looks good'; q.className = 'kp-q ' + (!w ? 'mute' : low ? 'warn' : 'ok'); }
    }
  }
  function clear(s) {
    store[s.key] = null; delete meta[s.key];
    var z = $(s.zone), t = $(s.thumb), row = $(s.row), inp = $(s.input);
    resetInput(inp); if (t) { t.hidden = true; t.removeAttribute('src'); }
    z.classList.remove('has'); z.classList.remove('kp-nopreview'); z.style.display = ''; if (row) row.style.display = 'none';
    refresh();
  }

  /* ---------- lightbox ---------- */
  function zoom(s) {
    var t = $(s.thumb); if (!t || !t.src) return;
    var o = document.createElement('div'); o.className = 'kp-lb';
    o.innerHTML = '<img alt=""><button type="button" aria-label="Close">×</button>'; o.querySelector('img').src = t.src;
    o.onclick = function () { o.remove(); }; document.body.appendChild(o);
    var esc = function (e) { if (e.key === 'Escape') { o.remove(); document.removeEventListener('keydown', esc); } }; document.addEventListener('keydown', esc);
  }

  /* ---------- steps / type ---------- */
  function refresh() {
    var d = docs(), n1 = $('verifyNext1'), n2 = $('verifyNext2');
    if (n1) { n1.disabled = !d.ok; n1.style.opacity = d.ok ? '' : '.5'; n1.style.pointerEvents = d.ok ? '' : 'none'; }
    if (n2) n2.disabled = !store.selfie;
    var hint = $('kpNeed'); if (hint) hint.textContent = d.ok ? '' : (!store.front ? (d.sides === 1 ? 'Upload the photo page to continue' : 'Upload the front side to continue') : 'Now upload the back side');
  }
  function applyType() {
    var two = sides() === 2, el = slotsEl(); if (!el) return;
    el.setAttribute('data-sides', two ? '2' : '1');
    var cap = $('capFront'); if (cap) cap.textContent = two ? 'Front side' : 'Photo page';
    var tag = document.querySelector('#docUpload .kp-tag'); if (tag) tag.textContent = two ? 'Front' : 'Photo page';
    refresh();
  }

  function init() {
    if (!$('docSlots')) return;
    SLOTS.forEach(ensureUi);
    // note under the slots
    if (!$('kpNeed')) { var n = document.createElement('div'); n.id = 'kpNeed'; n.className = 'kp-need'; var nx = $('verifyNext1'); if (nx) nx.parentNode.insertBefore(n, nx); }
    applyType();
  }

  // Take over the file inputs before the older handlers run (they hid the zone and never showed the photo)
  document.addEventListener('change', function (e) {
    var id = e.target && e.target.id, s = SLOTS.filter(function (x) { return x.input === id; })[0];
    if (!s) return;
    e.stopImmediatePropagation();
    var f = e.target.files && e.target.files[0];
    if (f) accept(s, f); else clear(s);
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#verifyScreen .vtype-btn'); if (b) setTimeout(applyType, 0);
  }, true);

  window.NCVerify = { getDocs: docs, reset: function () { SLOTS.forEach(clear); applyType(); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setInterval(function () { init(); }, 1500);   // the screen may be re-rendered; init is idempotent
})();
