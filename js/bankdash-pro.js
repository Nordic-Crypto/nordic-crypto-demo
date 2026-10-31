/* ============================================================
   NORDIC CRYPTO — BANKING DASHBOARD PRO v1.0
   Revolut-class home screen for banking accounts. Renders into #bd (first child of #dash).
   Legacy .nc3-dashboard stays in the DOM (hidden) so every legacy ID / handler keeps working;
   all buttons here proxy to the legacy buttons. Data: window.st, fmtCurrency, openTxDetails.
   ============================================================ */
(function () {
  'use strict';
  if (window.__bdPro) return; window.__bdPro = true;

  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function U(v) { try { return window.fmtCurrency ? window.fmtCurrency(v) : '$' + Number(v).toFixed(2); } catch (e) { return '$' + Number(v).toFixed(2); } }
  function Us(v) { return U(v).replace(/\.00(?=\D*$)/, ''); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function LOC() { try { var l = window.NCI18N && window.NCI18N.lang; return !l || l === 'en' ? 'en-GB' : l === 'no' ? 'nb' : l; } catch (e) { return 'en-GB'; } }
  function T(s) { try { return window.NCI18N ? window.NCI18N.t(s) : s; } catch (e) { return s; } }
  function ic(p, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I = {
    add: '<path d="M12 5v14M5 12h14"/>', send: '<path d="M5 12h14m0 0l-6-6m6 6l-6 6"/>', swap: '<path d="M7 7h13m0 0l-4-4m4 4l-4 4"/><path d="M17 17H4m0 0l4-4m-4 4l4 4"/>',
    bank: '<path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M3 10l9-6 9 6"/>', scan: '<path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"/><path d="M4 12h16"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M7.5 8a2.5 2.5 0 110-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 110 5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6A17 17 0 002 12s3.6 7 10 7a9.7 9.7 0 004.2-1"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>', snow: '<path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17"/>', sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', down: '<path d="M12 4v13m0 0l-5-5m5 5l5-5"/>', up: '<path d="M12 20V7m0 0l-5 5m5-5l5 5"/>', card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', chev: '<path d="M9 6l6 6-6 6"/>', left: '<path d="M15 6l-6 6 6 6"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1 1-1.5 3-1.5s3 .7 3 1.7-1.2 1.4-3 1.8-3 .8-3 1.8 1 1.7 3 1.7 3-.5 3-1.5M12 6v2m0 8v2"/>',
    pay: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>', fee: '<path d="M5 19L19 5"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/>', plus: '<path d="M12 5v14M5 12h14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };

  var B = { rng: '30', month: 0, filter: 'all', q: '', more: false, built: false, hide: lsGet('bd_hide') === '1', goalForm: false, sig: '', ro: null };

  /* ---------- theme accent (follows brand colour of the live site) ---------- */
  function accent() {
    try {
      var cands = ['.mi.on', '.side .mi.active', '#sideBar .mi.on'], col = null;
      for (var i = 0; i < cands.length && !col; i++) { var e = document.querySelector(cands[i]); if (e) { var c = getComputedStyle(e).color, m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (m) { var r = +m[1], g = +m[2], b = +m[3], mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx > 110 && (mx - mn) / mx > 0.35) col = [r, g, b]; } } }
      if (!col) { var v = getComputedStyle(document.documentElement).getPropertyValue('--pri').trim(); var h = /^#([0-9a-f]{6})$/i.exec(v); if (h) col = [parseInt(h[1].substr(0, 2), 16), parseInt(h[1].substr(2, 2), 16), parseInt(h[1].substr(4, 2), 16)]; }
      if (!col) col = [200, 255, 77];
      var lum = (0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]) / 255, root = document.documentElement.style;
      root.setProperty('--nc-acc', 'rgb(' + col.join(',') + ')'); root.setProperty('--nc-ink', lum > 0.5 ? '#0b1405' : '#ffffff');
    } catch (e) {}
  }

  /* ---------- data ---------- */
  function internal(t) { var d = String(t.desc || '').toLowerCase(); return t.internal === true || d.indexOf('refund') >= 0 || d.indexOf('adjustment') >= 0 || d.indexOf('bonus') >= 0; }
  function allTx() {
    var s = S(), txs = (s.txs || []).slice();
    (s.withdrawals || []).forEach(function (w) {
      txs.push({ ts: w.createdAt, desc: 'Withdrawal via ' + String(w.method || 'iban').toUpperCase(), amt: -w.amount, status: w.status === 'pending' ? 'Under Review' : w.status === 'approved' ? 'Completed' : w.status === 'rejected' ? 'Rejected' : w.status, reason: w.reason || '', isWithdrawal: true, wdId: w.id });
    });
    txs.forEach(function (t) { if (!t.ts) { var d = Date.parse(t.date || ''); t.ts = isFinite(d) ? d : 0; } });
    txs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return txs;
  }
  function cat(t) {
    var d = String(t.desc || '').toLowerCase();
    if (t.isWithdrawal || d.indexOf('withdraw') >= 0) return 'wd';
    if (d.indexOf('deposit') >= 0 || d.indexOf('top up') >= 0 || d.indexOf('topup') >= 0 || d.indexOf('received') >= 0) return 'dep';
    if (d.indexOf('bonus') >= 0 || d.indexOf('reward') >= 0 || d.indexOf('refund') >= 0 || d.indexOf('cashback') >= 0) return 'bonus';
    if (d.indexOf('fee') >= 0 || d.indexOf('commission') >= 0) return 'fee';
    if (/\b(buy|bought|sell|sold|swap|convert|exchange|order|market|limit)\b/.test(d)) return 'trade';
    if (t.amt > 0) return 'dep';
    return 'card';
  }
  var CAT = {
    dep: { n: 'Deposits', c: '#10b981', i: I.down }, wd: { n: 'Withdrawals', c: '#f59e0b', i: I.up }, trade: { n: 'Exchange & trading', c: '#8b5cf6', i: I.swap },
    card: { n: 'Card & payments', c: '#c8ff4d', i: I.pay }, fee: { n: 'Fees', c: '#ec4899', i: I.fee }, bonus: { n: 'Bonuses', c: '#fbbf24', i: I.gift }
  };
  function okTx(t) { return t.status !== 'Rejected' && t.status !== 'Failed' && t.status !== 'Cancelled'; }

  function series(days) {
    var s = S(), cur = Number(s.usd) || 0, txs = allTx().filter(okTx), now = Date.now(), t0 = now - days * 864e5, N = days <= 7 ? 56 : 64, pts = [], k = 0, run = cur;
    // walk back from now: balance(t) = cur - sum(amt of tx with ts > t)
    for (var i = N; i >= 0; i--) {
      var t = t0 + (now - t0) * (i / N);
      while (k < txs.length && (txs[k].ts || 0) > t) { run -= (txs[k].amt || 0); k++; }
      pts.push({ t: t, v: run });
    }
    pts.reverse(); pts[pts.length - 1] = { t: now, v: cur };
    return pts;
  }
  function monthRange(off) { var d = new Date(); var a = new Date(d.getFullYear(), d.getMonth() + off, 1), b = new Date(d.getFullYear(), d.getMonth() + off + 1, 1); return [a.getTime(), b.getTime(), a]; }
  function monthStats(off) {
    var r = monthRange(off), inc = 0, out = 0, byCat = {}, biggest = null, n = 0;
    allTx().filter(okTx).forEach(function (t) {
      if (t.ts < r[0] || t.ts >= r[1]) return; n++;
      var a = t.amt || 0;
      if (a > 0 && !internal(t)) inc += a;
      else if (a < 0) { out += -a; var c = cat(t); byCat[c] = (byCat[c] || 0) + (-a); if (!biggest || -a > -biggest.amt) biggest = t; }
    });
    return { inc: inc, out: out, byCat: byCat, biggest: biggest, n: n, start: r[2] };
  }
  function email() { return (lsGet('user_email') || 'me').toLowerCase(); }
  function goals() { try { var g = JSON.parse(lsGet('bd_goals_' + email()) || '[]'); return Array.isArray(g) ? g : []; } catch (e) { return []; } }
  function saveGoals(g) { lsSet('bd_goals_' + email(), JSON.stringify(g)); }
  function greet() { var h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : h >= 18 && h < 23 ? 'Good evening' : 'Good night'; }
  function firstName() { var n = lsGet('user_name') || ''; if (!n || n === 'User') return ''; n = n.split(' ')[0]; return n.charAt(0).toUpperCase() + n.slice(1); }
  function px(id) { var e = $(id); if (e && !e.disabled) { try { e.click(); } catch (x) {} return true; } return false; }
  function nav(p) { var m = document.querySelector('.mi[data-p="' + p + '"]'); if (m) m.click(); }
  function toast(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) {} }
  function copy(txt, msg) {
    var done = function () { toast(msg || 'Copied'); };
    try { navigator.clipboard.writeText(txt).then(done, function () { fallback(); }); } catch (e) { fallback(); }
    function fallback() { try { var a = document.createElement('textarea'); a.value = txt; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); done(); } catch (e2) {} }
  }
  function ago(ts) { try { return typeof window.timeAgo === 'function' ? window.timeAgo(ts) : new Date(ts).toLocaleDateString(LOC()); } catch (e) { return ''; } }
  function dayKey(ts) {
    var d = new Date(ts), n = new Date(), y = new Date(Date.now() - 864e5);
    if (d.toDateString() === n.toDateString()) return 'Today'; if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(LOC(), { day: 'numeric', month: 'long', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' });
  }

  /* ---------- skeleton ---------- */
  function build() {
    var dash = $('dash'); if (!dash || !dash.querySelector('.nc3-dashboard')) return false;
    if ($('bd')) { B.built = true; return true; }
    var root = document.createElement('div'); root.id = 'bd'; root.className = 'bd';
    root.innerHTML =
      '<div class="bd-main">' +
        '<section class="bd-card bd-hero">' +
          '<div class="bd-hero-top"><div class="bd-hi"><span class="bd-live"><i></i></span><span id="bdHi"></span></div>' +
            '<button type="button" class="bd-ib" id="bdEye" data-a="eye" aria-label="Hide balances" title="Hide / show balances"></button></div>' +
          '<div class="bd-k">Total balance</div>' +
          '<div class="bd-bal bd-sens" id="bdBal">—</div>' +
          '<div class="bd-sub"><span class="bd-pill" id="bdDelta"></span><span class="bd-sens bd-mut" id="bdSecond"></span></div>' +
          '<div class="bd-cur" id="bdCur" role="tablist" aria-label="Display currency"></div>' +
          '<div class="bd-chart-h"><div class="bd-seg" id="bdRng" role="tablist"><button type="button" data-a="rng" data-v="7">7D</button><button type="button" data-a="rng" data-v="30">30D</button><button type="button" data-a="rng" data-v="90">3M</button><button type="button" data-a="rng" data-v="365">1Y</button></div></div>' +
          '<div class="bd-chart" id="bdChart"></div>' +
        '</section>' +
        '<section class="bd-acts" id="bdActs">' +
          act('add', I.add, 'Add money', 'btnAdd', 'pri') + act('send', I.send, 'Withdraw', 'btnWithdrawV2') + act('swap', I.swap, 'Exchange', 'btnExchangeV2') +
          act('bank', I.bank, 'Details', 'btnReceiveMoney') + act('scan', I.scan, 'Scan deposits', 'btnScanDeposits') + act('gift', I.gift, 'Bonus', 'bonus') +
        '</section>' +
        '<section class="bd-card" id="bdIns"></section>' +
        '<section class="bd-card" id="bdTx"></section>' +
      '</div>' +
      '<aside class="bd-side">' +
        '<section class="bd-card bd-cardc" id="bdCard"></section>' +
        '<section class="bd-card" id="bdAcc"></section>' +
        '<section class="bd-card" id="bdGoals"></section>' +
        '<section class="bd-card" id="bdCrypto"></section>' +
        '<section class="bd-card" id="bdHealth"></section>' +
      '</aside>';
    dash.insertBefore(root, dash.firstChild); dash.classList.add('bd-on');
    root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('submit', function (e) { e.preventDefault(); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'bdGName' || e.key === 'Enter' && e.target && e.target.id === 'bdGAmt') { e.preventDefault(); var b = $('bdGSave'); if (b) b.click(); } });
    B.built = true; return true;
  }
  function act(k, p, label, target, cls) {
    return '<button type="button" class="bd-act ' + (cls || '') + '" data-a="proxy" data-t="' + target + '"><span class="bd-act-i">' + ic(p, 22) + '</span><span class="bd-act-l">' + label + '</span></button>';
  }

  /* ---------- sections ---------- */
  function rHero() {
    var s = S(), bal = Number(s.usd) || 0;
    $('bdHi').innerHTML = esc(T(greet())) + (firstName() ? ', <b>' + esc(firstName()) + '</b>' : '');
    $('bdEye').innerHTML = ic(B.hide ? I.eyeoff : I.eye, 20); $('bdEye').setAttribute('aria-pressed', B.hide ? 'true' : 'false');
    $('bd').classList.toggle('hide', B.hide);
    $('bdBal').textContent = U(bal);
    var sec = (s.currency || 'USD') === 'USD' ? '≈ €' + (bal * (s.eurR || 0.92)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '≈ $' + bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $('bdSecond').textContent = sec;
    var pts = series(+B.rng), d = pts[pts.length - 1].v - pts[0].v, pc = pts[0].v > 0 ? d / pts[0].v * 100 : null;
    var dl = $('bdDelta'); dl.className = 'bd-pill ' + (d > 0 ? 'up' : d < 0 ? 'dn' : 'flat');
    var lbl = { 7: '7 days', 30: '30 days', 90: '3 months', 365: '1 year' }[B.rng];
    dl.innerHTML = '<span class="bd-sens">' + (d > 0 ? '▲ +' : d < 0 ? '▼ −' : '• ') + esc(U(Math.abs(d))) + (pc != null && isFinite(pc) && d !== 0 ? ' (' + (d > 0 ? '+' : '−') + Math.abs(pc).toFixed(1) + '%)' : '') + '</span> <em>' + esc(T('last') + ' ' + T(lbl)) + '</em>';
    var cur = S().currency || 'USD', opts = [].slice.call(document.querySelectorAll('.curr-opt[data-cur]')).map(function (e) { return e.getAttribute('data-cur'); });
    if (!opts.length) opts = ['USD', 'EUR', 'SEK', 'GBP'];
    var h = ''; opts.forEach(function (c) { h += '<button type="button" role="tab" aria-selected="' + (c === cur) + '" class="' + (c === cur ? 'on' : '') + '" data-a="cur" data-v="' + esc(c) + '">' + esc(c) + '</button>'; });
    var cb = $('bdCur'); if (cb.__h !== h) { cb.innerHTML = h; cb.__h = h; }
    [].forEach.call($('bdRng').children, function (b) { b.classList.toggle('on', b.dataset.v === B.rng); b.setAttribute('aria-selected', b.dataset.v === B.rng ? 'true' : 'false'); });
    drawChart(pts);
  }
  function drawChart(pts) {
    var box = $('bdChart'); if (!box) return;
    var W = box.clientWidth || 600, H = box.clientHeight || 190; if (!W) return;
    var pl = 4, pr = 4, pt = 14, pb = 22, mn = Infinity, mx = -Infinity; pts.forEach(function (p) { mn = Math.min(mn, p.v); mx = Math.max(mx, p.v); });
    var flat = mx - mn < Math.max(1e-6, Math.abs(mx) * 0.0005);
    if (flat) { var m = mx || 1; mn = m * 0.9; mx = m * 1.1; } else { var pad = (mx - mn) * 0.16, pos = mn >= 0; mn -= pad; mx += pad; if (pos && mn < 0) mn = 0; }
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    function X(t) { return pl + (t - t0) / (t1 - t0) * (W - pl - pr); } function Y(v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); }
    // smooth path (monotone-ish via midpoints)
    var d = 'M' + X(pts[0].t).toFixed(1) + ',' + Y(pts[0].v).toFixed(1);
    for (var i = 1; i < pts.length; i++) { var x0 = X(pts[i - 1].t), y0 = Y(pts[i - 1].v), x1 = X(pts[i].t), y1 = Y(pts[i].v), cx = (x0 + x1) / 2; d += 'C' + cx.toFixed(1) + ',' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ',' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1); }
    var up = pts[pts.length - 1].v >= pts[0].v, col = up ? '#22d3a0' : '#ff5470', last = pts[pts.length - 1];
    var area = d + 'L' + X(t1).toFixed(1) + ',' + (H - pb) + 'L' + X(t0).toFixed(1) + ',' + (H - pb) + 'Z';
    var xl = ''; for (var j = 0; j < 4; j++) { var tt = t0 + (t1 - t0) * (j / 3); xl += '<text x="' + X(tt).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="' + (j === 0 ? 'start' : j === 3 ? 'end' : 'middle') + '" class="xl">' + esc(new Date(tt).toLocaleDateString(LOC(), { day: '2-digit', month: 'short' })) + '</text>'; }
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Balance history">' +
      '<defs><linearGradient id="bdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".34"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#bdG)"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' + xl +
      '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="4.5" fill="' + col + '"/><circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="9" fill="' + col + '" opacity=".2" class="pulse"/>' +
      '<g class="hv" style="display:none"><line class="vl" y1="' + pt + '" y2="' + (H - pb) + '"/><circle r="5" fill="#fff" stroke="' + col + '" stroke-width="3"/></g></svg><div class="bd-tip" style="display:none"></div>';
    var svg = box.firstChild, hv = svg.querySelector('.hv'), vl = hv.querySelector('.vl'), dot = hv.querySelector('circle'), tip = box.querySelector('.bd-tip');
    function mv(ev) {
      var rc = svg.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rc.left, f = Math.max(0, Math.min(1, (cx * (W / rc.width) - pl) / (W - pl - pr))), tt = t0 + f * (t1 - t0), lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pts[mid].t <= tt) lo = mid; else hi = mid; }
      var p = (tt - pts[lo].t) < (pts[hi].t - tt) ? pts[lo] : pts[hi], x = X(p.t), y = Y(p.v);
      hv.style.display = ''; vl.setAttribute('x1', x); vl.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      tip.style.display = ''; tip.innerHTML = '<b class="bd-sens">' + esc(U(p.v)) + '</b><small>' + esc(new Date(p.t).toLocaleDateString(LOC(), { day: '2-digit', month: 'short', year: 'numeric' })) + '</small>';
      var tw = tip.offsetWidth, left = x * (rc.width / W) - tw / 2; tip.style.left = Math.max(2, Math.min(rc.width - tw - 2, left)) + 'px';
    }
    function lv() { hv.style.display = 'none'; tip.style.display = 'none'; }
    svg.addEventListener('mousemove', mv); svg.addEventListener('mouseleave', lv); svg.addEventListener('touchstart', mv, { passive: true }); svg.addEventListener('touchmove', mv, { passive: true }); svg.addEventListener('touchend', lv);
  }

  function donut(parts, total) {
    var R = 54, C = 2 * Math.PI * R, off = 0, g = '';
    parts.forEach(function (p) { var len = total > 0 ? p.v / total * C : 0; g += '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + p.c + '" stroke-width="16" stroke-dasharray="' + Math.max(0, len - 2).toFixed(2) + ' ' + (C - Math.max(0, len - 2)).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"/>'; off += len; });
    return '<svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Spending by category"><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="16"/>' + g + '</svg>';
  }
  function rIns() {
    var m = monthStats(B.month), name = m.start.toLocaleDateString(LOC(), { month: 'long', year: 'numeric' }), net = m.inc - m.out;
    var days = B.month === 0 ? Math.max(1, new Date().getDate()) : new Date(m.start.getFullYear(), m.start.getMonth() + 1, 0).getDate();
    var parts = Object.keys(m.byCat).map(function (k) { return { k: k, v: m.byCat[k], c: CAT[k].c }; }).sort(function (a, b) { return b.v - a.v; });
    var lg = parts.map(function (p) { return '<li><i style="background:' + p.c + '"></i><span class="bd-ln">' + esc(T(CAT[p.k].n)) + '</span><span class="bd-sens bd-lv">' + esc(U(p.v)) + '</span><em>' + (m.out ? Math.round(p.v / m.out * 100) : 0) + '%</em></li>'; }).join('');
    // 6-month bars
    var data = [], max = 1; for (var i = 5; i >= 0; i--) { var s = monthStats(B.month - i); data.push(s); max = Math.max(max, s.inc, s.out); }
    var bw = 100 / 6, bars = '';
    data.forEach(function (s, i) { var x = i * bw + bw / 2, hi = s.inc / max * 78, ho = s.out / max * 78; bars += '<rect x="' + (x - 7.5) + '" y="' + (90 - hi) + '" width="6.5" height="' + Math.max(hi, s.inc ? 1.5 : 0) + '" rx="2" fill="#22d3a0"/><rect x="' + (x + 1) + '" y="' + (90 - ho) + '" width="6.5" height="' + Math.max(ho, s.out ? 1.5 : 0) + '" rx="2" fill="#8b5cf6"/>'; });
    var blab = data.map(function (s) { return '<span>' + esc(s.start.toLocaleDateString(LOC(), { month: 'short' })) + '</span>'; }).join('');
    $('bdIns').innerHTML =
      '<div class="bd-ch"><div><div class="bd-k">Insights</div><h3>Money flow</h3></div><div class="bd-mnav"><button type="button" data-a="mprev" aria-label="Previous month">' + ic(I.left, 16) + '</button><b>' + esc(name) + '</b><button type="button" data-a="mnext" aria-label="Next month"' + (B.month >= 0 ? ' disabled' : '') + '>' + ic(I.chev, 16) + '</button></div></div>' +
      '<div class="bd-kpis"><div><span>Income</span><b class="bd-sens up">+' + esc(U(m.inc)) + '</b></div><div><span>Spending</span><b class="bd-sens">' + esc(U(m.out)) + '</b></div><div><span>Net</span><b class="bd-sens ' + (net >= 0 ? 'up' : 'dn') + '">' + (net >= 0 ? '+' : '−') + esc(U(Math.abs(net))) + '</b></div><div><span>Avg / day</span><b class="bd-sens">' + esc(U(m.out / days)) + '</b></div></div>' +
      '<div class="bd-ins-g"><div class="bd-donut">' + (m.out > 0 ? donut(parts, m.out) : '<div class="bd-empty-d">' + ic(I.chart, 26) + '<span>No spending yet</span></div>') + (m.out > 0 ? '<div class="bd-dc"><small>Spent</small><b class="bd-sens">' + esc(Us(m.out)) + '</b></div>' : '') + '</div>' +
      '<ul class="bd-lg">' + (lg || '<li class="bd-none bd-mut">Your spending categories will appear here.</li>') + '</ul></div>' +
      '<div class="bd-bars"><div class="bd-bh"><span>Last 6 months</span><span class="bd-bl"><i style="background:#22d3a0"></i>In<i style="background:#8b5cf6"></i>Out</span></div><svg viewBox="0 0 100 92" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg><div class="bd-bx">' + blab + '</div></div>' +
      (m.biggest ? '<div class="bd-big"><span class="bd-bi" style="color:' + CAT[cat(m.biggest)].c + '">' + ic(CAT[cat(m.biggest)].i, 18) + '</span><div><small>Biggest expense</small><b>' + esc(m.biggest.desc || '—') + '</b></div><b class="bd-sens">' + esc(U(-m.biggest.amt)) + '</b></div>' : '');
  }

  function stBadge(t) {
    var s = t.status; if (!s || s === 'Completed') return '';
    var c = s === 'Rejected' || s === 'Failed' ? 'fail' : 'pend'; return '<em class="bd-st ' + c + '">' + esc(T(s === 'Under Review' ? 'Under review' : s)) + '</em>';
  }
  var LIST = [];
  function rTx() {
    var all = allTx(), q = B.q.trim().toLowerCase();
    var f = all.filter(function (t) {
      if (B.filter === 'in' && !(t.amt > 0)) return false; if (B.filter === 'out' && !(t.amt < 0)) return false;
      if (B.filter === 'pend' && !(t.status && t.status !== 'Completed' && t.status !== 'Rejected')) return false;
      if (q && (String(t.desc || '') + ' ' + (t.status || '')).toLowerCase().indexOf(q) < 0) return false; return true;
    });
    var lim = B.more ? 40 : 8, show = f.slice(0, lim); LIST = show;
    var h = '', last = '';
    show.forEach(function (t, i) {
      var k = t.ts ? dayKey(t.ts) : 'Earlier'; if (k !== last) { h += '<div class="bd-day">' + esc(T(k)) + '</div>'; last = k; }
      var c = cat(t), a = t.amt || 0, tm = t.ts ? new Date(t.ts).toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit' }) : '';
      h += '<button type="button" class="bd-tx" data-a="tx" data-i="' + i + '"><span class="bd-ti" style="--c:' + CAT[c].c + '">' + ic(CAT[c].i, 18) + '</span><span class="bd-tt"><b>' + esc(t.desc || '—') + '</b><small>' + esc(T(CAT[c].n)) + (tm ? ' · ' + tm : '') + '</small></span><span class="bd-ta">' + (a ? '<b class="bd-sens ' + (a > 0 ? 'up' : '') + '">' + (a > 0 ? '+' : '−') + esc(U(Math.abs(a))) + '</b>' : '<b>—</b>') + stBadge(t) + '</span></button>';
    });
    if (!h) h = '<div class="bd-empty">' + ic(I.clock, 28) + '<b>' + (all.length ? 'Nothing found' : 'No transactions yet') + '</b><span>' + (all.length ? 'Try another filter or search.' : 'Add money to get started — your activity will show up here.') + '</span>' + (all.length ? '' : '<button type="button" class="bd-btn pri" data-a="proxy" data-t="btnAdd">' + ic(I.add, 16) + ' Add money</button>') + '</div>';
    var chips = [['all', 'All'], ['in', 'Money in'], ['out', 'Money out'], ['pend', 'Pending']].map(function (x) { return '<button type="button" class="' + (B.filter === x[0] ? 'on' : '') + '" data-a="flt" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    var keep = document.activeElement && document.activeElement.id === 'bdQ' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    $('bdTx').innerHTML = '<div class="bd-ch"><div><div class="bd-k">Activity</div><h3>Transactions</h3></div><button type="button" class="bd-link" data-a="nav" data-v="tx">View all ' + ic(I.chev, 14) + '</button></div>' +
      '<div class="bd-tools"><label class="bd-search">' + ic(I.search, 16) + '<input id="bdQ" type="search" placeholder="Search transactions" autocomplete="off" value="' + esc(B.q) + '"></label><div class="bd-chips">' + chips + '</div></div>' +
      '<div class="bd-list">' + h + '</div>' + (f.length > lim ? '<button type="button" class="bd-more" data-a="more">Show more (' + (f.length - lim) + ')</button>' : (B.more && f.length > 8 ? '<button type="button" class="bd-more" data-a="less">Show less</button>' : ''));
    if (keep) { var qi = $('bdQ'); if (qi) { qi.focus(); try { qi.setSelectionRange(keep[0], keep[1]); } catch (e) {} } }
  }

  function rCard() {
    var s = S(), c = s.card, frozen = c && c.status === 'Frozen', box = $('bdCard'), real = $('cardDash');
    if (!box.__init) { box.innerHTML = '<div class="bd-ch"><div><div class="bd-k">Card</div><h3>Your card</h3></div><button type="button" class="bd-link" data-a="nav" data-v="cards">Manage ' + ic(I.chev, 14) + '</button></div><div class="bd-slot" id="bdSlot"></div><div id="bdCardRest"></div>'; box.__init = true; }
    var slot = $('bdSlot');
    if (real && real.parentNode !== slot) slot.appendChild(real);        // the real card element: identical design to My Cards, always in sync
    slot.hidden = !c;
    var rest = $('bdCardRest');
    if (!c) { rest.innerHTML = '<div class="bd-empty sm">' + ic(I.card, 26) + '<b>No card yet</b><span>Order a metal card and pay anywhere.</span><button type="button" class="bd-btn pri" data-a="nav" data-v="order">Order card</button></div>'; return; }
    var h = '<div class="bd-cacts"><button type="button" data-a="proxy" data-t="btnFreezeCard"><span class="bd-ci c1">' + ic(I.snow, 18) + '</span>' + (frozen ? 'Unfreeze' : 'Freeze') + '</button><button type="button" data-a="proxy" data-t="btnLimitsCard"><span class="bd-ci c2">' + ic(I.sliders, 18) + '</span>Limits</button><button type="button" data-a="proxy" data-t="btnCopyCardV2"><span class="bd-ci c3">' + ic(I.copy, 18) + '</span>Copy number</button><button type="button" data-a="proxy" data-t="btnSettingsCard"><span class="bd-ci c4">' + ic(I.gear, 18) + '</span>Settings</button></div>';
    if (rest.__h !== h) { rest.innerHTML = h; rest.__h = h; }
  }

  function rAcc() {
    var s = S(), iban = s.user && s.user.iban, ready = !!iban, box = $('bdAcc');
    function cell(id, def) { var e = $(id); return (e && e.textContent && e.textContent.trim() !== '—') ? e.textContent.trim() : def; }
    var rows = ready ? [['IBAN', String(iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(), String(iban).replace(/\s+/g, '')], ['SWIFT / BIC', cell('mySwift', '—')], ['Bank', cell('myBank', '—')], ['Country', cell('myCountry', '—')]] : [];
    box.innerHTML = '<div class="bd-ch"><div><div class="bd-k">Bank details</div><h3>Receive by IBAN</h3></div><span class="bd-ib sm">' + ic(I.bank, 18) + '</span></div>' +
      (ready ? '<div class="bd-rows">' + rows.map(function (r) { return '<div class="bd-row"><span>' + esc(T(r[0])) + '</span><b class="bd-sens">' + esc(r[1]) + '</b>' + (r[0] === 'IBAN' || r[0] === 'SWIFT / BIC' ? '<button type="button" class="bd-cp" data-a="cp" data-v="' + esc(r[2] || r[1]) + '" aria-label="Copy ' + esc(r[0]) + '">' + ic(I.copy, 15) + '</button>' : '') + '</div>'; }).join('') + '</div><button type="button" class="bd-btn ghost full" data-a="cpall">' + ic(I.copy, 16) + ' Copy all details</button>'
        : '<div class="bd-wait"><i class="bd-spin"></i><div><b>Your IBAN is being generated…</b><span>Our team is issuing it. This usually takes a few minutes.</span></div></div>');
  }

  function rGoals() {
    var g = goals(), bal = Math.max(0, Number(S().usd) || 0), box = $('bdGoals');
    var list = g.map(function (x, i) { var pc = x.target > 0 ? Math.min(100, bal / x.target * 100) : 0, done = pc >= 100; return '<div class="bd-goal"><div class="bd-gh"><span class="bd-gi">' + ic(I.target, 16) + '</span><b>' + esc(x.name) + '</b><button type="button" class="bd-x" data-a="gdel" data-i="' + i + '" aria-label="Delete goal">' + ic(I.trash, 14) + '</button></div><div class="bd-gp"><i style="width:' + pc.toFixed(1) + '%"></i></div><div class="bd-gf"><span class="bd-sens">' + esc(U(Math.min(bal, x.target))) + ' / ' + esc(U(x.target)) + '</span><em class="' + (done ? 'up' : '') + '">' + (done ? '✓ ' + T('Reached') : Math.floor(pc) + '%') + '</em></div></div>'; }).join('');
    var form = B.goalForm ? '<div class="bd-gform"><input id="bdGName" type="text" maxlength="28" placeholder="Goal name (e.g. Vacation)" autocomplete="off"><input id="bdGAmt" type="number" min="1" step="any" inputmode="decimal" placeholder="Target amount"><div class="bd-gb"><button type="button" class="bd-btn ghost" data-a="gcancel">Cancel</button><button type="button" class="bd-btn pri" id="bdGSave" data-a="gsave">Save goal</button></div></div>' : '';
    box.innerHTML = '<div class="bd-ch"><div><div class="bd-k">Savings</div><h3>Goals</h3></div><button type="button" class="bd-link" data-a="gnew">' + ic(I.plus, 14) + ' New goal</button></div>' + (list || (!B.goalForm ? '<div class="bd-empty sm">' + ic(I.target, 26) + '<b>Set a savings goal</b><span>Track your balance against something you are saving for.</span></div>' : '')) + form;
  }
  function rCrypto() {
    var s = S(), rows = [['BTC', 'Bitcoin', s.btc || 0, s.btcP || 0, 'btcChange', '#f7931a'], ['ETH', 'Ethereum', s.eth || 0, s.ethP || 0, 'ethChange', '#7c8cff']], tot = 0;
    rows.forEach(function (r) { tot += r[2] * r[3]; });
    $('bdCrypto').innerHTML = '<div class="bd-ch"><div><div class="bd-k">Portfolio</div><h3>Crypto</h3></div><button type="button" class="bd-link" data-a="nav" data-v="assets">View ' + ic(I.chev, 14) + '</button></div><div class="bd-ct bd-sens">' + esc(U(tot)) + '</div>' +
      rows.map(function (r) { var ch = $(r[4]), t = ch ? ch.textContent.trim() : '', dn = /^[-−]/.test(t); return '<div class="bd-coin"><span class="bd-cg" style="background:' + r[5] + '22;color:' + r[5] + '">' + r[0].charAt(0) + '</span><span class="bd-cn"><b>' + r[1] + '</b><small class="bd-sens">' + (+r[2]).toFixed(6).replace(/\.?0+$/, '') + ' ' + r[0] + '</small></span><span class="bd-cv"><b class="bd-sens">' + esc(U(r[2] * r[3])) + '</b><small class="' + (t && t !== '—' ? (dn ? 'dn' : 'up') : '') + '">' + esc(t && t !== '—' ? t : (r[3] ? U(r[3]) : '—')) + '</small></span></div>'; }).join('') +
      '<button type="button" class="bd-btn ghost full" data-a="proxy" data-t="btnExchangeV2">' + ic(I.swap, 16) + ' Buy / sell crypto</button>';
  }
  function rHealth() {
    var s = S(), v = s.verification && s.verification.status, deps = allTx().some(function (t) { return t.amt > 0 && cat(t) === 'dep' && okTx(t); });
    var items = [['Identity verified', v === 'approved' || (s.user && s.user.verified)], ['Card active', !!(s.card && s.card.status !== 'Frozen')], ['IBAN issued', !!(s.user && s.user.iban)], ['First deposit made', deps]];
    var done = items.filter(function (x) { return x[1]; }).length, pc = Math.round(done / items.length * 100), R = 26, C = 2 * Math.PI * R;
    $('bdHealth').innerHTML = '<div class="bd-ch"><div><div class="bd-k">Security</div><h3>Account health</h3></div></div><div class="bd-hl"><div class="bd-ring"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="' + R + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/><circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + (pc === 100 ? '#22d3a0' : '#22d3ee') + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + (C * pc / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 32 32)"/></svg><b>' + pc + '%</b></div><div class="bd-hs"><b>' + (pc === 100 ? T('Everything is set up') : T('Finish setting up your account')) + '</b><span>' + done + '/' + items.length + ' ' + T('steps completed') + '</span></div></div>' +
      '<ul class="bd-hli">' + items.map(function (x) { return '<li class="' + (x[1] ? 'ok' : '') + '"><i>' + ic(x[1] ? I.check : I.clock, 12) + '</i>' + esc(T(x[0])) + '</li>'; }).join('') + '</ul>' +
      '<div class="bd-sec">' + ic(I.shield, 16) + '<span>Funds are protected by segregated accounts and 2-step verification.</span></div>';
  }

  /* ---------- render ---------- */
  function sig() {
    var s = S(); return [s.usd, s.currency, s.eurR, s.btc, s.eth, s.btcP, s.ethP, (s.txs || []).length, (s.txs || []).map(function (t) { return t.status; }).join(''), (s.withdrawals || []).map(function (w) { return w.status; }).join(''), s.card && s.card.status, s.card && s.card.num, s.user && s.user.iban, s.verification && s.verification.status, B.rng, B.month, B.filter, B.q, B.more, B.hide, B.goalForm, JSON.stringify(goals()), (window.NCI18N && window.NCI18N.lang) || '', ($('myIban') || {}).textContent, (new Date()).getMinutes()].join('|');
  }
  function visible() { var d = $('dash'); return !!(d && d.offsetParent !== null && $('bd')); }
  function render(force) {
    if (!B.built && !build()) return; if (!visible() && !force) return;
    var sg = sig(); if (!force && sg === B.sig) return; B.sig = sg;
    var ae = document.activeElement, keepGoal = ae && (ae.id === 'bdGName' || ae.id === 'bdGAmt') ? { id: ae.id, v: ae.value } : null, g1 = $('bdGName') ? $('bdGName').value : '', g2 = $('bdGAmt') ? $('bdGAmt').value : '';
    try { rHero(); } catch (e) { err(e); } try { rIns(); } catch (e) { err(e); } try { rTx(); } catch (e) { err(e); } try { rCard(); } catch (e) { err(e); }
    try { rAcc(); } catch (e) { err(e); } try { rGoals(); } catch (e) { err(e); } try { rCrypto(); } catch (e) { err(e); } try { rHealth(); } catch (e) { err(e); }
    if (keepGoal) { if ($('bdGName')) $('bdGName').value = g1; if ($('bdGAmt')) $('bdGAmt').value = g2; var f = $(keepGoal.id); if (f) f.focus(); }
  }
  function err(e) { try { console.error('[bank-dash]', e); } catch (x) {} }

  /* ---------- events ---------- */
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b || !$('bd').contains(b)) return; var a = b.dataset.a;
    switch (a) {
      case 'proxy': { var t = b.dataset.t; if (t === 'bonus') { if (typeof window.openClientBonus === 'function') window.openClientBonus(); else toast('Bonus is not available'); } else if (!px(t)) toast('Not available right now'); setTimeout(function () { render(true); }, 400); break; }
      case 'eye': B.hide = !B.hide; lsSet('bd_hide', B.hide ? '1' : '0'); render(true); break;
      case 'rng': B.rng = b.dataset.v; render(true); break;
      case 'cur': if (typeof window.setCurrency === 'function') window.setCurrency(b.dataset.v); setTimeout(function () { render(true); }, 120); break;
      case 'mprev': B.month--; render(true); break; case 'mnext': if (B.month < 0) { B.month++; render(true); } break;
      case 'flt': B.filter = b.dataset.v; B.more = false; render(true); break;
      case 'more': B.more = true; render(true); break; case 'less': B.more = false; render(true); break;
      case 'nav': nav(b.dataset.v); break;
      case 'tx': { var t2 = LIST[+b.dataset.i]; if (t2 && typeof window.openTxDetails === 'function') window.openTxDetails(t2); break; }
      case 'cp': copy(b.dataset.v, 'Copied'); break;
      case 'cpall': { var s = S(), iban = s.user && s.user.iban; if (!iban) break; copy('IBAN: ' + iban + '\nSWIFT/BIC: ' + (($('mySwift') || {}).textContent || '') + '\nBank: ' + (($('myBank') || {}).textContent || '') + '\nHolder: ' + (lsGet('user_name') || ''), 'Bank details copied'); break; }
      case 'gnew': B.goalForm = true; render(true); setTimeout(function () { var i = $('bdGName'); if (i) i.focus(); }, 30); break;
      case 'gcancel': B.goalForm = false; render(true); break;
      case 'gsave': { var n = ($('bdGName').value || '').trim(), amt = parseFloat($('bdGAmt').value); var cur = S().currency || 'USD'; if (!n) { toast('Enter a goal name'); break; } if (!(amt > 0)) { toast('Enter a target amount'); break; }
        var rate = cur === 'EUR' ? S().eurR : cur === 'SEK' ? S().sekR : cur === 'NOK' ? (S().nokR || 10.5) : cur === 'DKK' ? (S().dkkR || 6.9) : cur === 'GBP' ? (S().gbpR || .79) : cur === 'CAD' ? (S().cadR || 1.38) : 1; // stored in USD
        var g = goals(); if (g.length >= 6) { toast('Up to 6 goals'); break; } g.push({ name: n.slice(0, 28), target: amt / (rate || 1) }); saveGoals(g); B.goalForm = false; render(true); toast('Goal added'); break; }
      case 'gdel': { var g2 = goals(); g2.splice(+b.dataset.i, 1); saveGoals(g2); render(true); break; }
    }
  }
  var qT;
  function onInput(e) { if (e.target && e.target.id === 'bdQ') { B.q = e.target.value; clearTimeout(qT); qT = setTimeout(function () { render(true); }, 160); } }

  /* ---------- hooks ---------- */
  function hook() {
    var o = window.renderRecentTx;
    if (typeof o === 'function' && !o.__bd) {
      var w = function () { var r; try { r = o.apply(this, arguments); } catch (e) { err(e); } try { render(); } catch (e2) { err(e2); } return r; };
      w.__bd = true; window.renderRecentTx = w;
    }
  }
  function init() {
    hook();
    if (!build()) { setTimeout(init, 400); return; }
    accent(); render(true); setInterval(function () { hook(); accent(); render(); }, 2000);
    window.addEventListener('nc-lang', function () { setTimeout(function () { render(true); }, 80); });
    try { if (window.ResizeObserver) { var lw = 0; B.ro = new ResizeObserver(function () { var c = $('bdChart'); if (!c || !c.clientWidth || Math.abs(c.clientWidth - lw) < 2) return; lw = c.clientWidth; if (visible()) rHero(); }); B.ro.observe($('bdChart')); } } catch (e) {}
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (visible()) rHero(); }, 150); });
    document.addEventListener('click', function (e) { var m = e.target.closest && e.target.closest('.mi[data-p="dash"]'); if (m) setTimeout(function () { render(true); }, 120); }, true);
  }
  window.BankDashPro = { render: function () { render(true); }, state: B };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
