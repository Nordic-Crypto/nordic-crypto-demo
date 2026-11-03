/* notif-pro.js v1 — redesigned notification centre: categories, day groups, amount chips, filters, mark-all-read.
   Replaces renderNotifications(); data format and delete/read handlers are unchanged. */
(function () {
  var FILTER = 'all', SIG = '';
  var P = {
    in: '<path d="M17 7L7 17M7 9v8h8"/>', out: '<path d="M7 17L17 7M9 7h8v8"/>',
    bonus: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"/>',
    sec: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    bad: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    info: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',
    ok: '<circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24">' + (P[k] || P.info) + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kind(t) {
    t = String(t || '').toLowerCase();
    if (/reject|declin|fail|denied|error|cancel/.test(t)) return 'bad';
    if (/review|thank/.test(t)) return 'star';
    if (/bonus|reward|daily|claimed|cashback|gift|welcome/.test(t)) return 'bonus';
    if (/verif|kyc|password|sign-?in|login|security|2fa|device|e-?mail/.test(t)) return 'sec';
    if (/deposit|received|credited|top.?up|incoming/.test(t)) return 'in';
    if (/withdraw|sent|transfer|payout|card payment/.test(t)) return 'out';
    return 'info';
  }
  var AMT = /\s*[:–-]?\s*([+\-−]?\s?(?:\$\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|SEK|DKK|NOK|GBP|USDT|BTC|ETH|SOL|XRP|SUI)\b))\s*([!.]?)$/;
  function fmtAmt(a) {
    a = a.replace(/\s+/g, ' ').trim();
    return a.replace(/(\d[\d,]*)(\.\d+)?/, function (m, i, d) { var n = i.replace(/,/g, ''); return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d || ''); });
  }
  function parse(n) {
    var raw = String(n.text || '').replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();
    var title = raw, sub = '', i = raw.search(/\s[—–]\s|\s-\s/);
    if (i > 0) { title = raw.slice(0, i); sub = raw.slice(i).replace(/^\s[—–-]\s/, ''); }
    var amt = '', m = title.match(AMT);
    if (m && title.length > m[0].length) { amt = fmtAmt(m[1]); title = title.slice(0, title.length - m[0].length) + (m[2] || ''); }
    title = title.replace(/[:\s]+$/, '');
    return { title: title || raw, sub: sub, amt: amt, k: kind(raw) };
  }
  function dayKey(ts) { var d = new Date(ts), n = new Date(); d.setHours(0, 0, 0, 0); n.setHours(0, 0, 0, 0); var diff = Math.round((n - d) / 864e5); return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? 'This week' : 'Earlier'; }
  var TABS = [['all', 'All'], ['money', 'Money'], ['account', 'Account'], ['rewards', 'Rewards']];
  function grp(k) { return k === 'in' || k === 'out' ? 'money' : k === 'bonus' || k === 'star' ? 'rewards' : 'account'; }
  function chrome() {
    var h = document.querySelector('#notifPanel .notif-header'); if (!h || h.getAttribute('data-np')) return !!h;
    h.setAttribute('data-np', '1');
    var tw = h.firstElementChild, close = document.getElementById('notifClose');
    var wrap = document.createElement('div'); wrap.className = 'np-hd';
    wrap.innerHTML = '<div class="np-bell"><svg viewBox="0 0 24 24">' + P.info + '</svg></div>'; wrap.appendChild(tw);
    var acts = document.createElement('div'); acts.className = 'np-acts';
    acts.innerHTML = '<button type="button" class="np-all" id="npAll" title="Mark all as read"><svg viewBox="0 0 24 24"><path d="M2 12.5l4 4L14 8M10 16.5l1 1L21 8"/></svg><span>Mark all read</span></button>';
    acts.appendChild(close); h.innerHTML = ''; h.appendChild(wrap); h.appendChild(acts);
    document.getElementById('npAll').onclick = function () { if (typeof window.markAllRead === 'function') window.markAllRead(); };
    var tabs = document.createElement('div'); tabs.className = 'np-tabs'; tabs.id = 'npTabs';
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.np-tab'); if (!b) return; FILTER = b.getAttribute('data-f'); SIG = ''; window.renderNotifications(); });
    h.parentNode.insertBefore(tabs, h.nextSibling);
    return true;
  }
  function render() {
    var listEl = document.getElementById('notifList'); if (!listEl || !chrome()) return;
    var S = window.st || {}, ns = S.notifications || [], unread = 0, i;
    for (i = 0; i < ns.length; i++) if (!ns[i].read) unread++;
    var badge = document.getElementById('notifBadge'), sub = document.getElementById('notifSub');
    if (badge) { if (unread > 0) { badge.style.display = 'flex'; badge.textContent = unread > 9 ? '9+' : unread; } else badge.style.display = 'none'; }
    if (sub) sub.innerHTML = unread > 0 ? '<b>' + unread + ' new</b> · ' + ns.length + ' total' : 'You are all caught up';
    var all = document.getElementById('npAll'); if (all) all.disabled = unread === 0;
    var items = ns.map(function (n) { var p = parse(n); p.n = n; p.g = grp(p.k); return p; });
    var cnt = { all: items.length, money: 0, account: 0, rewards: 0 }; items.forEach(function (p) { cnt[p.g]++; });
    var sig = FILTER + '|' + ns.map(function (n) { return n.id + (n.read ? 'r' : 'u') + Math.floor((Date.now() - n.ts) / 6e4); }).join(',');
    if (sig === SIG) return; SIG = sig;
    var tb = document.getElementById('npTabs');
    if (tb) tb.innerHTML = TABS.map(function (t) { return '<button type="button" class="np-tab' + (FILTER === t[0] ? ' on' : '') + '" data-f="' + t[0] + '">' + t[1] + '<i>' + cnt[t[0]] + '</i></button>'; }).join('');
    var shown = items.filter(function (p) { return FILTER === 'all' || p.g === FILTER; });
    if (!shown.length) {
      listEl.innerHTML = '<div class="np-empty"><div class="np-eb"><svg viewBox="0 0 24 24">' + P.info + '</svg></div><b>' + (ns.length ? 'Nothing here' : 'No notifications yet') + '</b>' + (ns.length ? 'No notifications in this category.' : 'Deposits, withdrawals, rewards and security alerts will show up here.') + '</div>';
      return;
    }
    var html = '', last = '', idx = 0;
    shown.forEach(function (p) {
      var n = p.n, d = dayKey(n.ts); if (d !== last) { html += '<div class="np-day">' + d + '</div>'; last = d; }
      var id = esc(n.id), ag = typeof window.timeAgo === 'function' ? window.timeAgo(n.ts) : '';
      html += '<div class="np-it k-' + p.k + (n.read ? '' : ' unread') + '" data-id="' + id + '" style="--i:' + Math.min(idx++, 14) + '">' +
        '<div class="np-ic">' + ico(p.k === 'sec' && /approved/i.test(n.text) ? 'ok' : p.k) + '</div>' +
        '<div class="np-bd"><div class="np-tt">' + esc(p.title) + '</div>' + (p.sub ? '<div class="np-sb">' + esc(p.sub) + '</div>' : '') +
        '<div class="np-mt">' + (p.amt ? '<span class="np-am">' + esc(p.amt) + '</span>' : '') + '<span class="np-tm">' + esc(ag) + '</span></div></div>' +
        '<button type="button" class="np-x" aria-label="Delete" data-del="' + id + '"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>';
    });
    listEl.innerHTML = html;
  }
  function bind() {
    var l = document.getElementById('notifList'); if (!l || l.__np) return; l.__np = 1;
    l.addEventListener('click', function (e) {
      var x = e.target.closest('.np-x'), it = e.target.closest('.np-it'); if (!it) return;
      e.stopPropagation();
      if (x) { if (typeof window.deleteNotification === 'function') window.deleteNotification(x.getAttribute('data-del')); return; }
      var id = it.getAttribute('data-id'), n = ((window.st || {}).notifications || []).filter(function (q) { return String(q.id) === id; })[0];
      if (n && !n.read && typeof window.markRead === 'function') window.markRead(n.id);
    }, true);
  }
  window.renderNotifications = function () { try { bind(); render(); } catch (e) { console.warn('notif-pro', e); } };
  function init() { window.renderNotifications(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setInterval(function () { var p = document.getElementById('notifPanel'); if (p && p.classList.contains('on')) window.renderNotifications(); }, 30000);
})();
