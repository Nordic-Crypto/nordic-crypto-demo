/* NordicCrypto — tx-pro.js
   Единая история операций клиента: тип операции + статус (Under review / Completed / Rejected).
   Показывает депозиты и выводы «на проверке» (они хранятся отдельно от st.txs), убирает дубли. */
(function () {
  'use strict';
  if (window.__txPro) return; window.__txPro = 1;

  var TYPES = {
    deposit:    { label: 'Deposit',        icon: '💰', cls: 'deposit' },
    crypto:     { label: 'Crypto deposit', icon: '₿',  cls: 'deposit' },
    bank:       { label: 'Bank deposit',   icon: '🏦', cls: 'deposit' },
    card:       { label: 'Card deposit',   icon: '💳', cls: 'deposit' },
    bonus:      { label: 'Bonus',          icon: '🎁', cls: 'deposit' },
    withdrawal: { label: 'Withdrawal',     icon: '💸', cls: 'withdrawal' },
    transfer:   { label: 'Transfer',       icon: '🔁', cls: 'withdrawal' },
    trade:      { label: 'Trade',          icon: '📈', cls: 'card' },
    correction: { label: 'Correction',     icon: '🔧', cls: 'card' },
    credit:     { label: 'Credit',         icon: '➕', cls: 'deposit' },
    payment:    { label: 'Payment',        icon: '💳', cls: 'withdrawal' }
  };

  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { try { if (typeof window.fmtCurrency === 'function') return window.fmtCurrency(n); } catch (e) {} return '$' + Number(n).toFixed(2); }
  function ago(ts) { try { if (typeof window.timeAgo === 'function' && ts) return window.timeAgo(ts); } catch (e) {} return ts ? new Date(ts).toLocaleString('en-GB') : ''; }

  function typeKey(t) {
    var k = String(t.type || '').toLowerCase();
    if (TYPES[k]) return k;
    var d = String(t.desc || '').toLowerCase(), a = Number(t.amt) || 0;
    if (t.isWithdrawal || /withdraw/.test(d)) return 'withdrawal';
    if (/transfer/.test(d)) return a < 0 ? 'transfer' : 'deposit';
    if (/crypto deposit|btc|eth/.test(d) && /deposit/.test(d)) return 'crypto';
    if (/bank/.test(d) && /deposit/.test(d)) return 'bank';
    if (/card/.test(d) && /deposit/.test(d)) return 'card';
    if (/deposit/.test(d)) return 'deposit';
    if (/bonus|reward|cashback|referral/.test(d)) return 'bonus';
    if (/correction|adjust/.test(d)) return 'correction';
    if (/trade|bought|sold|buy|sell|swap|convert|exchange/.test(d)) return 'trade';
    return a >= 0 ? 'credit' : 'payment';
  }

  /* все операции: st.txs + депозиты и выводы «на проверке»/отклонённые, без дублей */
  function all() {
    var s = S(), txs = Array.isArray(s.txs) ? s.txs : [], out = [], hashes = {}, wdSeen = {};
    var wds = Array.isArray(s.withdrawals) ? s.withdrawals : [], wdById = {};
    wds.forEach(function (w) { wdById[w.id] = w; });
    var seenKey = {};
    txs.forEach(function (t) {
      if (t.hash) hashes[t.hash] = 1;
      var c = t, w = t.wdId ? wdById[t.wdId] : null;
      if (w) {
        wdSeen[w.id] = 1;
        c = Object.assign({}, t, { isWithdrawal: true, status: w.status === 'pending' ? 'Under Review' : w.status === 'approved' ? 'Completed' : w.status === 'rejected' ? 'Rejected' : t.status });
        if (w.status === 'rejected') return;         // отклонённый вывод показывается ниже одной строкой
      }
      if (c.wdId) { if (wdSeen['tx_' + c.wdId]) return; wdSeen['tx_' + c.wdId] = 1; }
      out.push(c);
    });
    (Array.isArray(s.depositRequests) ? s.depositRequests : []).forEach(function (r) {
      if (!r || r.status === 'approved') return;       // зачисленная заявка = обычная запись «Completed» в истории
      var m = String(r.method || 'Bank Transfer'), ty = /bitcoin|ethereum|crypto/i.test(m) ? 'crypto' : /card/i.test(m) ? 'card' : /bank|sepa|iban/i.test(m) ? 'bank' : 'deposit';
      out.push({ ts: r.createdAt, desc: 'Deposit via ' + m, amt: Number(r.amount) || 0, status: r.status === 'rejected' ? 'Rejected' : 'Under Review', type: ty, reason: r.reason || '', depositRequest: true });
    });
    (Array.isArray(s.pendingDeposits) ? s.pendingDeposits : []).forEach(function (pd) {
      if (!pd || (pd.txHash && hashes[pd.txHash])) return;
      var amt = Number(pd.usdValue) || 0, desc = 'Crypto deposit — ' + Number(pd.cryptoAmt || 0).toFixed(8) + ' ' + (pd.symbol || '');
      if (pd.status === 'pending') out.push({ ts: pd.createdAt, desc: desc, amt: amt, status: 'Under Review', hash: pd.txHash, crypto: pd.cryptoAmt, symbol: pd.symbol, type: 'crypto', pendingDeposit: true });
      else if (pd.status === 'rejected') out.push({ ts: pd.rejectedAt || pd.createdAt, desc: desc, amt: amt, status: 'Rejected', hash: pd.txHash, crypto: pd.cryptoAmt, symbol: pd.symbol, type: 'crypto', reason: pd.reason, pendingDeposit: true });
      else if (pd.status === 'approved') out.push({ ts: pd.creditedAt || pd.approvedAt || pd.createdAt, desc: desc, amt: amt, status: 'Completed', hash: pd.txHash, crypto: pd.cryptoAmt, symbol: pd.symbol, type: 'crypto', pendingDeposit: true });
    });
    wds.forEach(function (w) {
      if (!wdSeen[w.id] && w.status === 'approved') {   // старые записи без wdId: «Withdrawal approved — IBAN» с той же суммой
        var twin = out.filter(function (t) { return !t.wdId && !t._twin && /^withdrawal/i.test(t.desc || '') && Math.abs(Number(t.amt) + Number(w.amount)) < 0.005; })[0];
        if (twin) { twin._twin = 1; wdSeen[w.id] = 1; return; }
      }
      if (wdSeen[w.id] && w.status !== 'rejected') return;
      if (wdSeen[w.id] && w.status === 'rejected') { /* tx уже отфильтрован выше */ }
      out.push({ ts: w.reviewedAt && w.status !== 'pending' ? w.reviewedAt : w.createdAt, desc: 'Withdrawal via ' + String(w.method || 'iban').toUpperCase(), amt: -(Number(w.amount) || 0),
        status: w.status === 'pending' ? 'Under Review' : w.status === 'approved' ? 'Completed' : w.status === 'rejected' ? 'Rejected' : w.status, reason: w.reason || '', isWithdrawal: true, wdId: w.id, type: 'withdrawal' });
    });
    out.forEach(function (t) { if (!t.ts) { var d = Date.parse(t.date); t.ts = d || 0; } });
    out.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return out;
  }

  function info(t) { var k = typeKey(t), m = TYPES[k]; return { key: k, label: m.label, icon: m.icon, cls: m.cls }; }
  function badgeCls(s) { return s === 'Completed' ? 'ok' : s === 'Under Review' ? 'pend' : s === 'Processing' ? 'proc' : (s === 'Rejected' || s === 'Failed') ? 'fail' : ''; }
  function badgeTxt(s) { return s === 'Completed' ? '✓ Completed' : s === 'Processing' ? '⏳ Processing' : s === 'Under Review' ? '⏳ Under review' : s === 'Rejected' ? '✗ Rejected' : s === 'Failed' ? '✗ Failed' : esc(s || ''); }
  function chip(label) { return '<span class="nc-type-chip">' + esc(label) + '</span>'; }

  var lastRecent = [], lastTable = [];

  function recentHtml(list, wantClick) {
    var h = '';
    list.forEach(function (t, i) {
      var ti = info(t), a = Number(t.amt) || 0;
      var amtCls = a > 0 ? 'plus' : a < 0 ? 'minus' : 'neutral', amtTxt = a > 0 ? '+' + money(a) : a < 0 ? '-' + money(Math.abs(a)) : '—';
      var showChip = String(t.desc || '').toLowerCase().indexOf(ti.label.toLowerCase()) !== 0;
      h += '<div class="recent-tx-item" data-tx-i="' + i + '"' + (wantClick ? ' style="cursor:pointer" title="Click for details"' : '') + '>' +
        '<div class="recent-tx-icon ' + ti.cls + '">' + ti.icon + '</div>' +
        '<div class="recent-tx-info"><div class="recent-tx-desc">' + esc(t.desc || ti.label) + '</div>' +
        '<div class="recent-tx-time">' + esc(ago(t.ts) || t.date || '') + '</div>' +
        '<div class="nc-tx-tags">' + (showChip ? chip(ti.label) : '') + '<span class="recent-tx-badge ' + badgeCls(t.status) + '">' + badgeTxt(t.status) + '</span></div></div>' +
        '<div class="recent-tx-amount ' + amtCls + '">' + amtTxt + '</div></div>';
    });
    return h;
  }

  window.renderRecentTx = function () {
    var el = document.getElementById('recentTxList'); if (!el) return;
    lastRecent = all().slice(0, 5);
    if (!lastRecent.length) { el.innerHTML = '<div class="recent-tx-empty">No transactions yet</div>'; return; }
    el.innerHTML = recentHtml(lastRecent, true);
    Array.prototype.forEach.call(el.querySelectorAll('.recent-tx-item[data-tx-i]'), function (n) {
      n.onclick = function () { var t = lastRecent[+n.getAttribute('data-tx-i')]; if (t) window.openTxDetails ? window.openTxDetails(t) : 0; };
    });
  };

  window.renderExchangeTx = function () {
    var el = document.getElementById('exRecentTx'); if (!el) return;
    lastRecent = all().slice(0, 5);
    if (!lastRecent.length) { el.innerHTML = '<div class="ex-empty">No transactions yet</div>'; return; }
    el.innerHTML = recentHtml(lastRecent, true);
    Array.prototype.forEach.call(el.querySelectorAll('.recent-tx-item[data-tx-i]'), function (n) {
      n.onclick = function () { var t = lastRecent[+n.getAttribute('data-tx-i')]; if (t) window.openTxDetails ? window.openTxDetails(t) : 0; };
    });
  };

  function fixHead() {
    var tr = document.querySelector('#tx thead tr'); if (!tr || tr.getAttribute('data-nctx')) return;
    tr.setAttribute('data-nctx', '1');
    tr.innerHTML = '<th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th>';
  }

  window.renderTx = function () {
    var b = document.getElementById('txB'); if (!b) return;
    fixHead();
    lastTable = all();
    if (!lastTable.length) { b.innerHTML = '<tr><td colspan="5"><div class="empty"><div>No transactions yet</div></div></td></tr>'; return; }
    var h = '';
    lastTable.forEach(function (t, i) {
      var ti = info(t), a = Number(t.amt) || 0, c = a >= 0 ? 'var(--ok)' : 'var(--bad)';
      var d = t.ts ? new Date(t.ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (t.date || '');
      h += '<tr style="cursor:pointer" data-tx-idx="' + i + '" onclick="openTxDetailsFromTable(' + i + ')"><td>' + esc(d) + '</td><td><span class="nc-type-chip">' + ti.icon + ' ' + esc(ti.label) + '</span></td><td>' + esc(t.desc || '') +
        '</td><td style="color:' + c + ';font-weight:600">' + (a >= 0 ? '+' : '-') + money(Math.abs(a)) + '</td><td><span class="badge ' + badgeCls(t.status) + '">' + (t.status === 'Under Review' ? 'Under review' : esc(t.status || '')) + '</span></td></tr>';
    });
    b.innerHTML = h;
  };
  window.openTxDetailsFromTable = function (i) { var t = lastTable[i]; if (t && window.openTxDetails) window.openTxDetails(t); };

  /* окно деталей: тип операции в заголовке и отдельной строкой, пояснение для «на проверке» */
  var _open = window.openTxDetails;
  if (typeof _open === 'function') window.openTxDetails = function (t) {
    _open.apply(this, arguments);
    try {
      var ti = info(t), k = document.getElementById('txdKicker'), body = document.getElementById('txdBody');
      if (k) k.textContent = ti.icon + ' ' + ti.label;
      if (body) {
        var row = document.createElement('div');
        row.innerHTML = '<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px"><span style="color:#94a3b8;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em">Type</span><b style="font-size:.85rem">' + esc(ti.label) + '</b></div>';
        body.insertBefore(row.firstChild, body.firstChild);
        var note = t.status === 'Under Review' ? (t.isWithdrawal ? 'Your withdrawal is being reviewed. This usually takes a short time; the funds stay on your account until it is approved.' : 'Your deposit is under review. It will be credited as soon as it is approved.') : (t.status === 'Rejected' && t.reason ? 'Reason: ' + t.reason : '');
        if (note) { var n = document.createElement('div'); n.style.cssText = 'padding:12px 14px;background:rgba(255,176,32,.08);border:1px solid rgba(255,176,32,.3);border-radius:10px;color:#ffc861;font-size:.85rem;margin-top:4px'; n.textContent = note; body.appendChild(n); }
      }
    } catch (e) {}
  };


  /* админ начисляет баланс через окно «Balance»: сохраняем тип операции и понятное описание */
  var LBL = { bonus: 'Bonus', bank: 'Bank deposit', crypto: 'Crypto deposit', card: 'Card deposit', correction: 'Correction' };
  var _fetch = window.fetch;
  window.fetch = function (u, o) {
    try {
      if (typeof u === 'string' && u.indexOf('action=updateUserBalance') > -1 && o && typeof o.body === 'string') {
        var b = JSON.parse(o.body);
        if (!b.type) {
          var sel = document.getElementById('adminBalanceType'), ty = sel ? sel.value : '';
          if (LBL[ty]) {
            var note = String(b.note || '').trim(), lab = LBL[ty];
            b.type = ty;
            b.note = (note && note.toLowerCase() !== lab.toLowerCase()) ? lab + ' — ' + note : lab;
            o = Object.assign({}, o, { body: JSON.stringify(b) });
          }
        }
      }
    } catch (e) {}
    var p = _fetch.call(this, u, o);
    try {
      if (typeof u === 'string' && u.indexOf('action=getUserState') > -1) p.then(function (r) {
        r.clone().json().then(function (d) {
          if (!d || d.ok === false || !window.st) return;
          var own = !(o && typeof o.body === 'string' && /"email"\s*:/.test(o.body)) || window.adminViewingEmail;
          if (own) { if (Array.isArray(d.depositRequests)) st.depositRequests = d.depositRequests; setTimeout(again, 80); }
        }).catch(function () {});
      }).catch(function () {});
    } catch (e) {}
    return p;
  };


  /* Add Funds (карта / банк): заявка сохраняется на сервере и сразу видна в истории как «Under review» */
  document.addEventListener('click', function (e) {
    var ok = e.target && e.target.closest && e.target.closest('#mOk');
    if (!ok) return;
    try {
      if (typeof mode === 'undefined' || mode !== 'add' || window.adminViewingEmail) return;
      if (localStorage.getItem('user_role') === 'admin') return;
      var m = document.getElementById('mMethod'), a = document.getElementById('mAmount');
      var method = m ? m.value : '', amt = a ? Number(a.value) : 0;
      if (typeof isCrypto === 'function' && isCrypto(method)) return;       // крипто идёт по своему сценарию
      if (!amt || amt <= 0) return;
      e.stopImmediatePropagation(); e.preventDefault();
      var tk = typeof getSessionToken === 'function' ? getSessionToken() : localStorage.getItem('session_token');
      ok.disabled = true;
      if (typeof closeModal === 'function') closeModal();
      _fetch.call(window, window.WORKER_URL + '?action=requestDeposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk, amount: amt, method: method }) })
        .then(function (r) { return r.json(); }).then(function (r) {
          ok.disabled = false;
          if (!r || !r.ok) { if (window.toast) toast((r && r.error) || 'Could not submit the deposit', true); return; }
          if (!Array.isArray(st.depositRequests)) st.depositRequests = [];
          st.depositRequests.unshift(r.request);
          if (window.toast) toast('Deposit submitted — under review');
          if (window.addNotification) try { addNotification('Deposit submitted via ' + method + ': ' + money(amt) + ' — under review', '⏳'); } catch (x) {}
          again();
        }).catch(function () { ok.disabled = false; if (window.toast) toast('Connection error', true); });
    } catch (x) { try { ok.disabled = false; } catch (y) {} }
  }, true);

  /* общий вид для выписки */
  window.NCTX = { all: all, info: info, typeKey: typeKey };

  var css = document.createElement('style');
  css.textContent = '.nc-tx-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px}.nc-tx-tags .recent-tx-badge{margin-top:0}' +
    '.nc-type-chip{display:inline-block;font-size:.68rem;font-weight:600;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.07);color:var(--muted,#9aa4b2);white-space:nowrap}' +
    'html[data-theme="light"] .nc-type-chip{background:rgba(0,0,0,.06);color:#475569}' +
    '.badge.fail{background:rgba(255,84,112,.14);color:var(--bad,#ff5470)}';
  document.head.appendChild(css);

  function again() { try { window.renderRecentTx(); window.renderTx(); if (document.getElementById('exRecentTx')) window.renderExchangeTx(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', again); else again();
  setTimeout(again, 1500); setTimeout(again, 4000);
})();
