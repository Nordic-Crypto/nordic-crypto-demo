/* NC WITHDRAWAL STATUS v2 — a four-step tracker for every withdrawal: Received → In review → Sent → Credited.
   Shown inside the transaction window and as a live banner on the dashboard while a withdrawal is on its way.
   "Credited" is confirmed by our team, so it is never claimed before it really happened. Load after tx-pro.js. */
(function () {
  'use strict';
  if (window.__wdStatus) return; window.__wdStatus = true;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(ts) { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function S() { return window.st || {}; }
  function money(v) { try { return typeof window.fmtCurrency === 'function' ? window.fmtCurrency(v) : '$' + Number(v).toFixed(2); } catch (e) { return '$' + Number(v).toFixed(2); } }
  var ETA = { iban: 'Usually within 1 business day', sepa: 'Usually within 1 business day', swift: 'Usually 1–3 business days', card: 'Usually 1–3 business days', crypto: 'Usually within an hour', etransfer: 'Usually within minutes', eft: 'Usually 1–2 business days', payid: 'Usually within minutes', bsb: 'Usually within 1 business day' };
  var WHERE = { card: 'your card', crypto: 'your wallet', etransfer: 'your Interac account', payid: 'your PayID', eft: 'your bank account', bsb: 'your bank account' };

  function css() {
    if (document.getElementById('wdsCss')) return; var s = document.createElement('style'); s.id = 'wdsCss';
    s.textContent =
      '@keyframes wdsP{0%{box-shadow:0 0 0 0 rgba(251,191,36,.5)}100%{box-shadow:0 0 0 12px rgba(251,191,36,0)}}@keyframes wdsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes wdsPop{0%{transform:scale(.4)}70%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes wdsFlow{from{background-position:0 0}to{background-position:28px 0}}' +
      '.wds{margin-top:14px;padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);animation:wdsIn .35s ease both}.wds h5{margin:0 0 14px;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}' +
      '.wds-tl{display:flex;align-items:flex-start}.wds-st{flex:1;min-width:0;text-align:center;position:relative;padding-top:38px;font-size:12.5px;color:#94a3b8;line-height:1.35}' +
      '.wds-st i{position:absolute;top:0;left:50%;margin-left:15px;margin-left:-15px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px;background:#222836;border:2px solid #222836;color:#94a3b8;z-index:1;transition:.3s}' +
      '.wds-st:before{content:"";position:absolute;top:14px;left:-50%;width:100%;height:3px;border-radius:3px;background:#222836}.wds-st:first-child:before{display:none}' +
      '.wds-st b{display:block;color:#e8eef7;font-size:13px;font-weight:700}.wds-st small{display:block;font-size:11.5px;margin-top:2px;padding:0 4px}' +
      '.wds-st.done i{background:#c8ff4d;border-color:#c8ff4d;color:#0a0f04;animation:wdsPop .45s ease both}.wds-st.done:before{background:#c8ff4d}.wds-st.done b{color:#e8eef7}' +
      '.wds-st.now i{background:#fbbf24;border-color:#fbbf24;color:#241800;animation:wdsP 1.6s infinite}.wds-st.now:before{background:repeating-linear-gradient(90deg,#c8ff4d 0 10px,#fbbf24 10px 20px);background-size:28px 3px;animation:wdsFlow 1s linear infinite}.wds-st.now b{color:#fbbf24}' +
      '.wds-st.bad i{background:#ff6b6b;border-color:#ff6b6b;color:#fff}.wds-st.bad:before{background:#ff6b6b}.wds-st.bad b{color:#ff8da1}.wds-st.off{opacity:.55}' +
      '.wds-note{margin-top:14px;padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.04);font-size:13px;line-height:1.5;color:#cbd5e1}.wds-note.bad{background:rgba(255,107,107,.1);color:#ffb4bf}.wds-note.ok{background:rgba(200,255,77,.09);color:#d6f58f}' +
      '@media (max-width:520px){.wds-tl{flex-direction:column;gap:0}.wds-st{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:0 0 18px 44px;min-height:46px}.wds-st:last-child{padding-bottom:0}.wds-st i{left:0;margin-left:0}.wds-st:before{top:-18px;left:14px;width:3px;height:calc(100% - 12px)}.wds-st:first-child:before{display:none}.wds-st:not(:first-child):before{top:-16px;height:calc(100% - 4px)}.wds-st small{padding:0}}' +
      /* dashboard banner */
      '#wdsBanner{display:none;margin:0 0 14px;animation:wdsIn .4s ease both}#wdsBanner.on{display:block}' +
      '.wdb{display:flex;align-items:center;gap:14px;flex-wrap:wrap;width:100%;text-align:left;padding:14px 16px;border-radius:18px;border:1px solid rgba(251,191,36,.35);background:linear-gradient(120deg,rgba(251,191,36,.1),rgba(251,191,36,.03));color:#f4f5f8;cursor:pointer;font-family:inherit;transition:.2s}.wdb:hover{transform:translateY(-1px);border-color:rgba(251,191,36,.6)}' +
      '.wdb.ok{border-color:rgba(200,255,77,.4);background:linear-gradient(120deg,rgba(200,255,77,.1),rgba(200,255,77,.02))}' +
      '.wdb-ic{flex:none;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:rgba(251,191,36,.18);color:#fbbf24}.wdb.ok .wdb-ic{background:rgba(200,255,77,.18);color:#c8ff4d}.wdb-ic svg{width:20px;height:20px}' +
      '.wdb-t{flex:1;min-width:150px}.wdb-t b{display:block;font-size:14.5px}.wdb-t small{color:#a8b3c5;font-size:12.5px}' +
      '.wdb-d{display:flex;gap:5px;align-items:center}.wdb-d i{width:26px;height:5px;border-radius:5px;background:rgba(255,255,255,.14)}.wdb-d i.d{background:#c8ff4d}.wdb-d i.n{background:#fbbf24;animation:wdsP 1.6s infinite}' +
      '.wdb-g{flex:none;font-weight:800;font-size:13px;color:#fbbf24;display:flex;align-items:center;gap:4px}.wdb.ok .wdb-g{color:#c8ff4d}' +
      /* light theme */
      'html[data-theme="light"] .wds{background:#fff;border-color:rgba(15,23,42,.1)}html[data-theme="light"] .wds h5,html[data-theme="light"] .wds-st{color:#566074}html[data-theme="light"] .wds-st b{color:#0c111b}html[data-theme="light"] .wds-st i,html[data-theme="light"] .wds-st:before{background:#dfe4d8;border-color:#dfe4d8;color:#566074}' +
      'html[data-theme="light"] .wds-st.done i,html[data-theme="light"] .wds-st.done:before{background:#4f8a00;border-color:#4f8a00;color:#fff}html[data-theme="light"] .wds-st.now i{background:#e8a317;border-color:#e8a317;color:#241800}html[data-theme="light"] .wds-st.now b{color:#8a5a00}html[data-theme="light"] .wds-st.bad i,html[data-theme="light"] .wds-st.bad:before{background:#c42a44;border-color:#c42a44;color:#fff}html[data-theme="light"] .wds-st.bad b{color:#c42a44}' +
      'html[data-theme="light"] .wds-note{background:#f5f7f1;color:#2a3447}html[data-theme="light"] .wds-note.bad{background:#fdecef;color:#a3213a}html[data-theme="light"] .wds-note.ok{background:#eef7d8;color:#2f5a00}' +
      'html[data-theme="light"] .wdb{background:linear-gradient(120deg,#fff6e0,#fff);color:#0c111b;border-color:rgba(194,116,0,.4);box-shadow:0 1px 2px rgba(15,23,42,.05),0 14px 30px -22px rgba(30,45,10,.3)}html[data-theme="light"] .wdb.ok{background:linear-gradient(120deg,#eef7d8,#fff);border-color:rgba(63,114,0,.4)}html[data-theme="light"] .wdb-t small{color:#566074}html[data-theme="light"] .wdb-g{color:#8a5a00}html[data-theme="light"] .wdb.ok .wdb-g{color:#2f5a00}html[data-theme="light"] .wdb-ic{color:#8a5a00}html[data-theme="light"] .wdb.ok .wdb-ic{color:#2f5a00}html[data-theme="light"] .wdb-d i{background:#dfe4d8}html[data-theme="light"] .wdb-d i.d{background:#4f8a00}' +
      '@media (prefers-reduced-motion:reduce){.wds,.wds *,#wdsBanner,.wdb *{animation:none!important}}';
    document.head.appendChild(s);
  }

  function method(w) { return String(w.method || 'iban').toLowerCase(); }
  /* steps: [state, mark, title, small] — state: done | now | bad | off | '' */
  function steps(w) {
    var pend = w.status === 'pending', ok = w.status === 'approved', no = w.status === 'rejected', cr = ok && w.creditedAt, hold = pend && w.holdUntil && w.holdUntil > Date.now(), m = method(w);
    var a = ['done', '✓', 'Received', when(w.createdAt)];
    var b = pend ? ['now', '2', hold ? 'Safety check' : 'In review', hold ? 'Until ' + when(w.holdUntil) : 'Our team is checking it'] : ['done', '✓', 'Reviewed', when(w.reviewedAt)];
    var c, d;
    if (no) { c = ['bad', '✕', 'Not approved', when(w.reviewedAt)]; d = ['off', '4', 'Credited', '—']; }
    else { c = ok ? ['done', '✓', 'Sent', when(w.reviewedAt)] : ['', '3', 'Sent', 'After approval']; d = cr ? ['done', '✓', 'Credited', when(w.creditedAt)] : ok ? ['now', '4', 'Credited', ETA[m] || 'On its way'] : ['', '4', 'Credited', ETA[m] || '']; }
    return [a, b, c, d];
  }
  function stepsHtml(w) { return '<div class="wds-tl">' + steps(w).map(function (s) { return '<div class="wds-st ' + s[0] + '"><i>' + s[1] + '</i><b>' + s[2] + '</b><small>' + esc(s[3]) + '</small></div>'; }).join('') + '</div>'; }
  function noteHtml(w) {
    var pend = w.status === 'pending', ok = w.status === 'approved', no = w.status === 'rejected', hold = pend && w.holdUntil && w.holdUntil > Date.now(), where = WHERE[method(w)] || 'your bank account';
    if (no) return '<div class="wds-note bad">' + (w.reason ? '<b>Reason:</b> ' + esc(w.reason) + '<br>' : '') + 'Nothing was taken from your balance. Contact support if you need help.</div>';
    if (hold) return '<div class="wds-note">First withdrawal to this destination. For your safety our team processes it after ' + esc(when(w.holdUntil)) + '.</div>';
    if (pend) return '<div class="wds-note">Your request is in the queue. You will get a notification as soon as it is reviewed.</div>';
    if (ok && w.creditedAt) return '<div class="wds-note ok">The money has arrived in ' + where + '. You can download the receipt below.</div>';
    return '<div class="wds-note">Sent to ' + where + '. ' + esc((ETA[method(w)] || 'It is on its way') + '. We will confirm here when it has arrived.') + '</div>';
  }
  function html(w) { return '<h5>Withdrawal status</h5>' + stepsHtml(w) + noteHtml(w); }

  function find(t) {
    var list = S().withdrawals || [], id = t && (t.wdId || t.id);
    if (id) { var w = list.filter(function (x) { return x.id === id; })[0]; if (w) return w; }
    if (t && t.isWithdrawal && t.ts) { var c = list.filter(function (x) { return Math.abs((x.createdAt || 0) - t.ts) < 2000; })[0]; if (c) return c; }
    return null;
  }
  window.NCWdFind = find;

  var _open = window.openTxDetails;
  if (typeof _open === 'function') window.openTxDetails = function (t) {
    _open.apply(this, arguments);
    try {
      if (!t || (!t.isWithdrawal && !t.wdId && !/withdraw/i.test(String(t.desc || '')))) return;
      var w = find(t); if (!w) return;
      var body = document.getElementById('txdBody'); if (!body) return;
      css(); var old = body.querySelector('.wds'); if (old) old.remove();
      var d = document.createElement('div'); d.className = 'wds'; d.innerHTML = html(w); body.appendChild(d);
    } catch (e) { }
  };

  /* ───── dashboard banner ───── */
  function active() {
    var list = (S().withdrawals || []).filter(function (w) { return w && (w.status === 'pending' || (w.status === 'approved' && (!w.creditedAt || Date.now() - w.creditedAt < 864e5))); });
    list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); return list[0] || null;
  }
  var lastKey = '';
  function banner() {
    try {
      if (localStorage.getItem('user_role') === 'admin' || window.adminViewingEmail) return;
      var host = document.querySelector('#mainApp .body'); if (!host) return;
      var dash = document.getElementById('dash'), ex = document.getElementById('exchangeDash'), show = (dash && dash.classList.contains('on')) || (ex && ex.classList.contains('on'));
      var el = document.getElementById('wdsBanner');
      var w = show ? active() : null;
      if (!w) { if (el) { el.classList.remove('on'); el.innerHTML = ''; lastKey = ''; } return; }
      css();
      if (!el) { el = document.createElement('div'); el.id = 'wdsBanner'; host.insertBefore(el, host.firstChild); }
      var s = steps(w), done = w.status === 'approved' && w.creditedAt, key = w.id + w.status + (w.creditedAt || '') + (w.holdUntil || '');
      el.classList.add('on'); if (key === lastKey) return; lastKey = key;
      var dots = s.map(function (x) { return '<i class="' + (x[0] === 'done' ? 'd' : x[0] === 'now' ? 'n' : '') + '"></i>'; }).join('');
      var title = done ? 'Withdrawal arrived' : w.status === 'pending' ? (w.holdUntil && w.holdUntil > Date.now() ? 'Withdrawal on a safety check' : 'Withdrawal in review') : 'Withdrawal sent';
      var sub = done ? money(w.amount) + ' · ' + when(w.creditedAt) : money(w.amount) + ' · ' + String(w.method || 'iban').toUpperCase() + (w.status === 'approved' ? ' · ' + (ETA[method(w)] || 'on its way') : '');
      el.innerHTML = '<button type="button" class="wdb' + (done ? ' ok' : '') + '" data-wid="' + esc(w.id) + '"><span class="wdb-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span><span class="wdb-t"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span><span class="wdb-d">' + dots + '</span><span class="wdb-g">' + (done ? 'Receipt' : 'Track') + ' ›</span></button>';
    } catch (e) { }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#wdsBanner .wdb'); if (!b) return;
    var w = (S().withdrawals || []).filter(function (x) { return x.id === b.getAttribute('data-wid'); })[0]; if (!w || typeof window.openTxDetails !== 'function') return;
    window.openTxDetails({ isWithdrawal: true, wdId: w.id, ts: w.createdAt, desc: 'Withdrawal via ' + String(w.method || 'iban').toUpperCase(), amt: -(Number(w.amount) || 0), status: w.status === 'pending' ? 'Pending' : w.status === 'rejected' ? 'Rejected' : 'Completed', date: new Date(w.createdAt).toISOString().slice(0, 10) });
  });
  setInterval(banner, 1500); setTimeout(banner, 800);
})();
