/* NC WITHDRAWAL STATUS v1 — a clear step tracker inside the transaction window of every withdrawal
   (request sent → review → decision), with times, the safety-hold notice and the rejection reason.
   Load after tx-pro.js. */
(function () {
  'use strict';
  if (window.__wdStatus) return; window.__wdStatus = true;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(ts) { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function css() {
    if (document.getElementById('wdsCss')) return; var s = document.createElement('style'); s.id = 'wdsCss';
    s.textContent = '.wds{margin-top:12px;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}.wds h5{margin:0 0 12px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}' +
      '.wds ol{list-style:none;margin:0;padding:0}.wds li{position:relative;display:flex;gap:12px;padding:0 0 14px 0}.wds li:last-child{padding-bottom:0}' +
      '.wds li:not(:last-child)::before{content:"";position:absolute;left:11px;top:24px;bottom:2px;width:2px;background:rgba(255,255,255,.12)}.wds li.done:not(:last-child)::before{background:#34d399}' +
      '.wds .wdd{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;border:2px solid rgba(255,255,255,.18);color:#94a3b8;background:transparent}' +
      '.wds li.done .wdd{background:#34d399;border-color:#34d399;color:#04130d}.wds li.now .wdd{border-color:#fbbf24;color:#fbbf24;box-shadow:0 0 0 4px rgba(251,191,36,.15);animation:wdsP 1.6s infinite}.wds li.bad .wdd{background:#ff5470;border-color:#ff5470;color:#fff}' +
      '@keyframes wdsP{50%{box-shadow:0 0 0 7px rgba(251,191,36,0)}}.wds b{display:block;font-size:.92rem}.wds small{display:block;color:#94a3b8;font-size:.8rem;margin-top:2px;line-height:1.4}.wds li.bad b{color:#ff8da1}.wds li:not(.done):not(.now):not(.bad) b{color:#94a3b8;font-weight:600}';
    document.head.appendChild(s);
  }
  function find(t) {
    var st = window.st || {}, list = st.withdrawals || [], id = t && (t.wdId || t.id);
    if (id) { var w = list.filter(function (x) { return x.id === id; })[0]; if (w) return w; }
    if (t && t.isWithdrawal && t.ts) { var c = list.filter(function (x) { return Math.abs((x.createdAt || 0) - t.ts) < 2000; })[0]; if (c) return c; }
    return null;
  }
  function html(w) {
    var pend = w.status === 'pending', ok = w.status === 'approved', no = w.status === 'rejected', hold = pend && w.holdUntil && w.holdUntil > Date.now();
    var dest = String(w.method || 'iban').toLowerCase(), where = dest === 'card' ? 'your card' : dest === 'crypto' ? 'your wallet' : 'your bank account';
    var steps = [];
    steps.push(['done', '✓', 'Request sent', when(w.createdAt)]);
    steps.push([pend ? 'now' : 'done', pend ? '2' : '✓', pend ? (hold ? 'Safety check' : 'Under review') : 'Reviewed', hold ? 'First withdrawal to this destination — our team will process it after ' + when(w.holdUntil) + '.' : pend ? 'Our team is checking your request. Your money stays on your account until it is approved.' : when(w.reviewedAt)]);
    if (no) steps.push(['bad', '✕', 'Not approved', (w.reason ? esc(w.reason) + ' · ' : '') + 'Nothing was taken from your balance. Contact support if you need help.']);
    else steps.push([ok ? 'done' : '', ok ? '✓' : '3', ok ? 'Approved and sent to ' + where : 'Approved and sent to ' + where, ok ? when(w.reviewedAt) : 'You will get a notification when it is done.']);
    return '<h5>Withdrawal status</h5><ol>' + steps.map(function (s) { return '<li class="' + s[0] + '"><span class="wdd">' + s[1] + '</span><span><b>' + s[2] + '</b><small>' + s[3] + '</small></span></li>'; }).join('') + '</ol>';
  }
  var _open = window.openTxDetails;
  if (typeof _open !== 'function') return;
  window.openTxDetails = function (t) {
    _open.apply(this, arguments);
    try {
      if (!t || (!t.isWithdrawal && !t.wdId && !/withdraw/i.test(String(t.desc || '')))) return;
      var w = find(t); if (!w) return;
      var body = document.getElementById('txdBody'); if (!body) return;
      css(); var old = body.querySelector('.wds'); if (old) old.remove();
      var d = document.createElement('div'); d.className = 'wds'; d.innerHTML = html(w); body.appendChild(d);
    } catch (e) { }
  };
})();
