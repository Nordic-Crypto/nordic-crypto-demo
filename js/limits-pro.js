/* limits-pro.js v1.0 — card action buttons (Freeze / Limits / Settings), client "Limits" screen, owner limits editor. Needs worker >= 6.8.0 */
(function () {
  'use strict';
  if (window.__ncLimits) return; window.__ncLimits = 1;
  var WORKER = 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function api(a, b) { b = b || {}; b.token = tok(); return fetch(WORKER + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(usd) { try { return typeof window.fmtCurrency === 'function' ? window.fmtCurrency(usd) : '$' + Number(usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch (e) { return '$' + usd; } }
  function wait(ms) { var m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; }

  var css = document.createElement('style');
  css.textContent =
    '.ncx-acts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}' +
    '.ncx-act{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:14px;border-radius:16px;cursor:pointer;text-align:left;font-family:inherit;color:#e7edf6;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);transition:transform .18s,border-color .18s,background .18s}' +
    '.ncx-act:hover{transform:translateY(-2px);border-color:rgba(200,255,61,.45);background:linear-gradient(180deg,rgba(200,255,61,.08),rgba(255,255,255,.02))}.ncx-act:active{transform:scale(.98)}' +
    '.ncx-ic{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#c8ff3d}' +
    '.ncx-ic svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '.ncx-lb{font:700 13.5px system-ui;letter-spacing:.01em}.ncx-sub{display:block;margin-top:2px;font:500 11.5px system-ui;color:#8b95a5}' +
    '.ncx-act.frozen{border-color:rgba(56,189,248,.5);background:linear-gradient(180deg,rgba(56,189,248,.12),rgba(255,255,255,.02))}.ncx-act.frozen .ncx-ic{color:#38bdf8;background:rgba(56,189,248,.12)}.ncx-act.frozen .ncx-sub{color:#38bdf8}' +
    '@media(max-width:480px){.ncx-act{padding:12px;gap:10px}.ncx-sub{font-size:10.5px}}' +
    '.ncl-ov{position:fixed;inset:0;z-index:100000;background:rgba(3,6,12,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px;animation:nclIn .2s}' +
    '@keyframes nclIn{from{opacity:0}}.ncl-box{width:100%;max-width:460px;max-height:92vh;overflow:auto;background:#12161d;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:24px;font-family:system-ui}' +
    '.ncl-h{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}.ncl-h h2{margin:0;font-size:20px}.ncl-x{background:rgba(255,255,255,.07);border:0;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}' +
    '.ncl-sub{color:#8b95a5;font-size:13px;margin:0 0 16px}' +
    '.ncl-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:16px;padding:14px 16px;margin-bottom:12px}' +
    '.ncl-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}.ncl-top .ncx-ic{width:36px;height:36px}.ncl-top b{font-size:15px;flex:1}' +
    '.ncl-chip{font:700 11px system-ui;padding:4px 10px;border-radius:99px;background:rgba(16,185,129,.15);color:#34d399}.ncl-chip.bad{background:rgba(255,84,112,.15);color:#ff6b86}' +
    '.ncl-row{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:6px 0;color:#9aa4b2}.ncl-row b{color:#fff;font-weight:600;text-align:right}' +
    '.ncl-dots{display:flex;gap:6px;margin:2px 0 6px}.ncl-dots i{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.1)}.ncl-dots i.on{background:linear-gradient(90deg,#8b5cf6,#38bdf8)}.ncl-dots i.full{background:#ff5470}' +
    '.ncl-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;margin:2px 0 6px}.ncl-bar span{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#38bdf8);border-radius:3px}' +
    '.ncl-note{font-size:12px;color:#8b95a5;line-height:1.5;margin:6px 2px 14px}' +
    '.ncl-btn{display:block;width:100%;padding:13px;border:0;border-radius:12px;font:700 14px system-ui;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#38bdf8);color:#05070a}' +
    '.ncl-in{width:100%;box-sizing:border-box;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:600 13px system-ui}' +
    '.ncl-adm{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);border-radius:16px;padding:16px;margin-bottom:18px}.ncl-adm h3{margin:0 0 4px;font-size:15px}' +
    '.ncl-grid{display:grid;grid-template-columns:90px 1fr 1fr 1fr;gap:8px;align-items:center;margin-top:10px;font-size:12px;color:#8b95a5}@media(max-width:560px){.ncl-grid{grid-template-columns:70px 1fr 1fr 1fr;font-size:10.5px}}';
  document.head.appendChild(css);

  /* ---------- card buttons ---------- */
  var ICON = {
    freeze: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.34 7l17.32 10M3.34 17L20.66 7"/><path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2"/></svg>',
    limits: '<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
  };
  function isFrozen() {
    var s = window.st; if (s && s.card && s.card.status) return String(s.card.status).toLowerCase() === 'frozen';
    var b = $('btnFreeze'); return !!(b && /unfreeze/i.test(b.textContent || ''));
  }
  function buildActs() {
    var host = document.querySelector('.nc3-card-actions, .ncx-acts'); if (!host) return;
    if (!host.__ncx) {
      host.__ncx = 1; host.className = 'ncx-acts';
      host.innerHTML =
        '<button type="button" class="ncx-act" id="btnFreezeCard" data-k="freeze"><span class="ncx-ic">' + ICON.freeze + '</span><span><span class="ncx-lb" id="ncxFzL">Freeze</span><span class="ncx-sub" id="ncxFzS">Card active</span></span></button>' +
        '<button type="button" class="ncx-act" id="btnLimitsCard" data-k="limits"><span class="ncx-ic">' + ICON.limits + '</span><span><span class="ncx-lb">Limits</span><span class="ncx-sub">Withdrawal limits</span></span></button>' +
        '<button type="button" class="ncx-act" id="btnSettingsCard" data-k="settings"><span class="ncx-ic">' + ICON.settings + '</span><span><span class="ncx-lb">Settings</span><span class="ncx-sub">Account & security</span></span></button>';
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-k]'); if (!b) return;
        e.stopPropagation(); e.preventDefault();
        var k = b.getAttribute('data-k');
        if (k === 'freeze') { var r = $('btnFreeze'); if (r) r.click(); }
        else if (k === 'limits') openLimits();
        else if (k === 'settings') { var sb = $('settingsBtn'); if (sb) sb.click(); }
      }, true);
    }
    var f = isFrozen(), b = $('btnFreezeCard'); if (b) b.classList.toggle('frozen', f);
    var l = $('ncxFzL'), s = $('ncxFzS'); if (l) l.textContent = f ? 'Unfreeze' : 'Freeze'; if (s) s.textContent = f ? 'Card frozen' : 'Card active';
  }

  /* ---------- client limits screen ---------- */
  var ov;
  function close() { if (ov) { ov.remove(); ov = null; } }
  var NAMES = { bank: ['Bank transfer', '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>'], crypto: ['Crypto', '<svg viewBox="0 0 24 24"><path d="M9 7h5a2.5 2.5 0 010 5H9m0 0h6a2.5 2.5 0 010 5H9M9 7v10M11 4v3M14 4v3M11 17v3M14 17v3"/></svg>'], card: ['Card payout', '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>'] };
  function openLimits() {
    close();
    ov = document.createElement('div'); ov.className = 'ncl-ov';
    ov.innerHTML = '<div class="ncl-box"><div class="ncl-h"><h2>Limits</h2><button class="ncl-x" id="nclX">×</button></div><p class="ncl-sub">Withdrawal limits on your account</p><div id="nclBody" style="color:#8b95a5;padding:20px 0;text-align:center">Loading…</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    $('nclX').onclick = close;
    api('getLimits').then(function (d) {
      if (!d || !d.ok) { $('nclBody').textContent = (d && d.error) || 'Could not load limits'; return; }
      var html = '';
      ['bank', 'crypto', 'card'].forEach(function (k) {
        var u = d.limits[k], full = u.used >= u.count || u.usedAmount >= u.maxDay, dots = '';
        for (var i = 0; i < Math.min(u.count, 12); i++) dots += '<i class="' + (i < u.used ? (full ? 'full' : 'on') : '') + '"></i>';
        var pct = u.maxDay > 0 ? Math.min(100, u.usedAmount / u.maxDay * 100) : 100;
        html += '<div class="ncl-card"><div class="ncl-top"><span class="ncx-ic">' + NAMES[k][1] + '</span><b>' + NAMES[k][0] + '</b>' +
          '<span class="ncl-chip' + (full ? ' bad' : '') + '">' + (u.count <= 0 ? 'Unavailable' : full ? 'Limit reached' : 'Available') + '</span></div>' +
          '<div class="ncl-row"><span>Withdrawals per ' + d.windowHours + 'h</span><b>' + u.used + ' / ' + u.count + '</b></div><div class="ncl-dots">' + dots + '</div>' +
          '<div class="ncl-row"><span>Max per transaction</span><b>' + esc(money(u.maxTx)) + '</b></div>' +
          '<div class="ncl-row"><span>Daily total</span><b>' + esc(money(u.usedAmount)) + ' / ' + esc(money(u.maxDay)) + '</b></div><div class="ncl-bar"><span style="width:' + pct.toFixed(0) + '%"></span></div>' +
          (u.resetAt ? '<div class="ncl-row"><span>Available again in</span><b>' + wait(u.resetAt - (d.now || Date.now())) + '</b></div>' : '') + '</div>';
      });
      html += '<p class="ncl-note">Limits renew on a rolling ' + d.windowHours + '-hour basis: each withdrawal frees up its slot ' + d.windowHours + ' hours after it was made. Need higher limits? Contact support.</p><button class="ncl-btn" id="nclSup">Contact support</button>';
      $('nclBody').style.cssText = ''; $('nclBody').innerHTML = html;
      $('nclSup').onclick = function () { close(); var c = $('chatToggle'); if (c) c.click(); };
    }).catch(function () { var b = $('nclBody'); if (b) b.textContent = 'Connection error'; });
  }
  window.openLimits = openLimits;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* ---------- owner editor (Admin → Withdrawals) ---------- */
  function adminPanel() {
    var sec = document.querySelector('.admin-section[data-section="withdrawals"]'); if (!sec || $('nclAdm')) return;
    var role = ''; try { role = localStorage.getItem('user_role'); } catch (e) {} if (role !== 'admin') return;
    var box = document.createElement('div'); box.className = 'ncl-adm'; box.id = 'nclAdm';
    function row(k, name) { return '<div>' + name + '</div><input class="ncl-in" id="nclc_' + k + '" type="number" min="0" step="1"><input class="ncl-in" id="nclt_' + k + '" type="number" min="0" step="1"><input class="ncl-in" id="ncld_' + k + '" type="number" min="0" step="1">'; }
    box.innerHTML = '<h3>Withdrawal limits</h3><div style="color:#8b95a5;font-size:12px">Apply to all clients. Amounts in USD. Window renews on a rolling basis.</div>' +
      '<div class="ncl-grid"><div></div><div>Max withdrawals</div><div>Max per transaction</div><div>Max per day</div>' + row('bank', 'Bank') + row('crypto', 'Crypto') + row('card', 'Card') + '</div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:12px"><label style="font-size:12px;color:#8b95a5">Window (hours)</label><input class="ncl-in" id="nclw" type="number" min="1" max="168" style="width:90px">' +
      '<button class="ncl-btn" id="nclSave" style="width:auto;padding:10px 20px;margin-left:auto">Save limits</button></div><div id="nclMsg" style="font-size:12px;margin-top:8px;min-height:16px"></div>';
    sec.insertBefore(box, sec.firstChild);
    function fill(c) { ['bank', 'crypto', 'card'].forEach(function (k) { $('nclc_' + k).value = c[k].count; $('nclt_' + k).value = c[k].maxTx; $('ncld_' + k).value = c[k].maxDay; }); $('nclw').value = c.windowHours; }
    function msg(t, bad) { var m = $('nclMsg'); m.textContent = t; m.style.color = bad ? '#ff6b86' : '#34d399'; }
    api('getLimitsConfig').then(function (d) { if (d && d.ok) fill(d.config); else msg((d && d.error) || 'Could not load', true); });
    $('nclSave').onclick = function () {
      var cfg = { windowHours: Number($('nclw').value) || 24 };
      ['bank', 'crypto', 'card'].forEach(function (k) { cfg[k] = { count: Number($('nclc_' + k).value), maxTx: Number($('nclt_' + k).value), maxDay: Number($('ncld_' + k).value) }; });
      api('setLimitsConfig', { config: cfg }).then(function (d) { if (d && d.ok) { fill(d.config); msg('Saved. New limits apply immediately.'); } else msg((d && d.error) || 'Failed', true); }).catch(function () { msg('Connection error', true); });
    };
  }

  setInterval(function () { buildActs(); adminPanel(); }, 800);
  buildActs();
})();
