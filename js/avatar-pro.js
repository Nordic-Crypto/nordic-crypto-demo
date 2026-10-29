/* avatar-pro.js v1.0 — profile photo (Revolut-style). Needs worker >= 6.3.0 */
(function () {
  'use strict';
  if (window.__ncAvatar) return; window.__ncAvatar = 1;
  var WORKER = 'https://nordic-deposit-checker.otis-790.workers.dev';
  var RU = /^ru/i.test(document.documentElement.lang || localStorage.getItem('lang') || navigator.language || '');
  var T = RU ? { title: 'Фото профиля', up: 'Загрузить фото', rm: 'Удалить фото', cancel: 'Закрыть', err: 'Не удалось загрузить фото', bad: 'Выберите изображение (JPG, PNG, WebP)', ok: 'Фото обновлено' }
             : { title: 'Profile photo', up: 'Upload photo', rm: 'Remove photo', cancel: 'Close', err: 'Could not upload photo', bad: 'Choose an image (JPG, PNG, WebP)', ok: 'Photo updated' };
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function mail() { try { return (localStorage.getItem('user_email') || '').toLowerCase(); } catch (e) { return ''; } }
  function ck() { return 'nc_avatar_' + mail(); }
  function api(action, body) {
    body = body || {}; body.token = tok();
    return fetch(WORKER + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  var current = null;
  function targets() { return [].slice.call(document.querySelectorAll('#userAvatar, .umi .av')); }
  function paint() {
    settingsRow();
    targets().forEach(function (el) {
      var st = el.style;
      if (current) { st.setProperty('background-image', 'url(' + current + ')', 'important'); st.setProperty('background-size', 'cover', 'important'); st.setProperty('background-position', 'center', 'important'); st.setProperty('background-color', 'transparent', 'important'); st.setProperty('color', 'transparent', 'important'); st.setProperty('font-size', '0', 'important'); }
      else { ['background-image', 'background-size', 'background-position', 'background-color', 'color', 'font-size'].forEach(function (k) { st.removeProperty(k); }); }
      el.style.cursor = 'pointer'; el.title = T.title;
      if (!el.__ncAv) { el.__ncAv = 1; el.addEventListener('click', openSheet); }
    });
  }
  function settingsRow() {
    var box = document.querySelector('#settingsMask .box'); if (!box) return;
    var w = document.getElementById('ncAvSetW');
    if (!w) {
      w = document.createElement('div'); w.id = 'ncAvSetW';
      w.style.cssText = 'display:flex;flex-direction:column;align-items:center;margin:0 0 22px;cursor:pointer';
      w.innerHTML = '<div id="ncAvSet" style="width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 32px system-ui;color:#05070a;position:relative;background:linear-gradient(135deg,#8b5cf6,#38bdf8)">' +
        '<span id="ncAvIni"></span><span style="position:absolute;right:-2px;bottom:-2px;width:32px;height:32px;border-radius:50%;background:#c8ff3d;border:3px solid #12161d;display:flex;align-items:center;justify-content:center">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#05070a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></span></div>' +
        '<div style="margin-top:10px;font:600 13px system-ui;color:#c8ff3d">' + (RU ? 'Изменить фото' : 'Change photo') + '</div>';
      w.addEventListener('click', openSheet);
      var h = box.querySelector('p.d'); if (h && h.parentNode === box) h.parentNode.insertBefore(w, h.nextSibling); else box.insertBefore(w, box.firstChild);
    }
    var av = document.getElementById('ncAvSet'), ini = document.getElementById('ncAvIni');
    var nm = (localStorage.getItem('user_name') || 'U').trim().split(' ').map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
    ini.textContent = current ? '' : nm;
    av.style.background = current ? 'url(' + current + ') center/cover' : 'linear-gradient(135deg,#8b5cf6,#38bdf8)';
  }
  function load() {
    if (!tok()) return;
    try { var c = localStorage.getItem(ck()); if (c) { current = c; paint(); } } catch (e) {}
    api('getAvatar').then(function (d) {
      if (!d || !d.ok) return;
      current = d.dataUrl || null;
      try { current ? localStorage.setItem(ck(), current) : localStorage.removeItem(ck()); } catch (e) {}
      paint();
    }).catch(function () {});
  }
  function resize(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
        var w = img.naturalWidth, h = img.naturalHeight, m = Math.min(w, h);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
        x.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, S, S);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('bad')); };
      img.src = url;
    });
  }
  function toast(m, bad) {
    var t = document.createElement('div');
    t.textContent = m; t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100000;padding:12px 18px;border-radius:12px;font:600 14px system-ui;color:#fff;background:' + (bad ? '#e5484d' : '#1f9d63') + ';box-shadow:0 8px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  var sheet;
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } }
  function openSheet(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    closeSheet();
    sheet = document.createElement('div');
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    var nm = (localStorage.getItem('user_name') || 'U'), ini = nm.trim().split(' ').map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
    var big = 'width:110px;height:110px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font:700 36px system-ui;color:#05070a;background:linear-gradient(135deg,#8b5cf6,#38bdf8) center/cover;';
    if (current) big = big.replace('background:linear-gradient(135deg,#8b5cf6,#38bdf8) center/cover;', 'background:url(' + current + ') center/cover;color:transparent;');
    var btn = 'display:block;width:100%;padding:14px;border:0;border-radius:12px;font:600 15px system-ui;cursor:pointer;margin-top:10px;';
    sheet.innerHTML = '<div style="width:100%;max-width:340px;background:#12161d;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:24px;text-align:center">' +
      '<div style="font:700 17px system-ui;margin-bottom:18px">' + T.title + '</div><div id="ncAvBig" style="' + big + '">' + ini + '</div>' +
      '<button id="ncAvUp" style="' + btn + 'background:linear-gradient(135deg,#8b5cf6,#38bdf8);color:#05070a">' + T.up + '</button>' +
      (current ? '<button id="ncAvRm" style="' + btn + 'background:rgba(229,72,77,.15);color:#ff6b70">' + T.rm + '</button>' : '') +
      '<button id="ncAvCl" style="' + btn + 'background:rgba(255,255,255,.07);color:#fff">' + T.cancel + '</button>' +
      '<input id="ncAvFile" type="file" accept="image/*" style="display:none"></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function (ev) { if (ev.target === sheet) closeSheet(); });
    sheet.querySelector('#ncAvCl').onclick = closeSheet;
    var f = sheet.querySelector('#ncAvFile');
    sheet.querySelector('#ncAvUp').onclick = function () { f.click(); };
    f.onchange = function () {
      var file = f.files && f.files[0]; if (!file) return;
      if (!/^image\//.test(file.type)) return toast(T.bad, true);
      resize(file).then(function (d) { return api('setAvatar', { dataUrl: d }).then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'x'); return d; }); })
        .then(function (d) { current = d; try { localStorage.setItem(ck(), d); } catch (e) {} paint(); closeSheet(); toast(T.ok); })
        .catch(function () { toast(T.err, true); });
    };
    var rm = sheet.querySelector('#ncAvRm');
    if (rm) rm.onclick = function () {
      api('removeAvatar').then(function (r) { if (!r || !r.ok) throw 0; current = null; try { localStorage.removeItem(ck()); } catch (e) {} paint(); closeSheet(); })
        .catch(function () { toast(T.err, true); });
    };
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
  function boot() { paint(); settingsRow(); load(); setInterval(function () { paint(); settingsRow(); }, 2000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
