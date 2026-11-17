/* admin-nav-pro.js v1 — the admin menu, put on shelves.
   Groups the sections (Work · Clients · Money · Support · Platform), lets you fold a group, find a section by typing,
   adds a one-line hint to every item and gives each one a clear icon. It only re-orders and decorates the existing
   items, so every old handler, badge, permission lock and staff rule keeps working. */
(function () {
  'use strict';
  if (window.__acNav) return; window.__acNav = 1;

  var GROUPS = [
    { id: 'work', t: 'Work', tabs: ['stats', 'taskQueue'] },
    { id: 'clients', t: 'Clients', tabs: ['clients', 'verifications', 'accessReq', 'emailChanges', 'deleted'] },
    { id: 'money', t: 'Money', tabs: ['withdrawals', 'deposits'] },
    { id: 'support', t: 'Support', tabs: ['chats', 'concierge', 'reviews', 'news'] },
    { id: 'platform', t: 'Platform', tabs: ['security', 'backups', 'metrics', 'system', 'team', 'myActivity'], fold: true }
  ];
  var HINT = {
    stats: 'Numbers at a glance: clients, balances, activity',
    taskQueue: 'Everything waiting for a decision, most urgent first',
    clients: 'Search clients, open a profile, adjust balances, add notes',
    verifications: 'Check identity documents (KYC) and approve or reject',
    accessReq: 'Clients asking to switch between Banking and Exchange',
    emailChanges: 'Approve or reject requests to change a client’s e-mail',
    deleted: 'Deactivated accounts. You can restore them here',
    withdrawals: 'Approve, reject and confirm payouts to clients',
    deposits: 'Deposits waiting to be checked and credited',
    chats: 'Talk to clients in real time',
    concierge: 'Special requests from premium clients',
    reviews: 'Client reviews waiting for your decision',
    news: 'Send announcements and news to clients',
    security: 'Admin sign-in rules, trusted IP addresses, alerts',
    backups: 'Save and restore a copy of the data',
    metrics: 'Site speed, errors and load',
    system: 'Limits, maintenance mode and other settings',
    team: 'Add colleagues, set what each may do, see their activity',
    myActivity: 'What you did recently'
  };
  var ICON = {
    stats: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    taskQueue: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    clients: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    verifications: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    accessReq: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2"/><path d="M16 7l3 3"/>',
    emailChanges: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
    deleted: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    withdrawals: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
    deposits: '<path d="M17 7L7 17"/><path d="M16 17H7V8"/>',
    chats: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    concierge: '<path d="M3 18h18"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M12 7v4"/><path d="M10 7h4"/>',
    reviews: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    news: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M18 8a5 5 0 0 1 0 8"/>',
    security: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    backups: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    metrics: '<path d="M5 21V10"/><path d="M12 21V3"/><path d="M19 21v-7"/>',
    system: '<path d="M4 6h9"/><path d="M17 6h3"/><circle cx="15" cy="6" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 18h11"/><path d="M19 18h1"/><circle cx="17" cy="18" r="2"/>',
    team: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    myActivity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
  };
  var KEY = 'nc_admin_nav', nav = null, input = null, heads = {}, st = {}, q = '', lastActive = '', busy = false, timer = 0;
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { st = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
  function desktop() { return window.innerWidth > 900; }
  function pins() { return Array.isArray(st.pins) ? st.pins : []; }
  function effGroups() {
    var pn = pins(), out = [];
    if (pn.length) out.push({ id: 'pinned', t: 'Pinned', tabs: pn.slice() });
    GROUPS.forEach(function (g) { out.push({ id: g.id, t: g.t, fold: g.fold, tabs: g.tabs.filter(function (t) { return pn.indexOf(t) < 0; }) }); });
    return out;
  }
  window.__acNavTogglePin = function (t) { var a = pins().slice(), i = a.indexOf(t); if (i > -1) a.splice(i, 1); else a.push(t); st.pins = a; save(); organize(); };
  function isFolded(g) { return typeof st[g.id] === 'boolean' ? st[g.id] : !!g.fold; }

  function css() {
    if (document.getElementById('anvCss')) return;
    var svg = function (d) { return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>') + '")'; };
    var r = '';
    Object.keys(ICON).forEach(function (k) {
      r += '#adminPanel .admin-sidebar .admin-nav-item[data-tab="' + k + '"]>span:first-child:not([data-ap]):not(:has(svg)){--i:' + svg(ICON[k]) + ';display:block!important;width:20px;height:20px;flex:none;font-size:0!important;background:currentColor!important;-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}';
    });
    var s = document.createElement('style'); s.id = 'anvCss';
    s.textContent = r +
      '#adminPanel .admin-sidebar .anv-q{flex:none;width:100%;box-sizing:border-box;margin:0 0 8px;padding:9px 12px 9px 34px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04) url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8b95a5" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>') + '") 11px center/16px no-repeat;color:inherit;font:inherit;font-size:13px;outline:0}' +
      '#adminPanel .admin-sidebar .anv-q:focus{border-color:#62e8c2}#adminPanel .admin-sidebar .anv-q::placeholder{color:#8b95a5}' +
      '#adminPanel .admin-sidebar .anv-h{flex:none;display:flex;align-items:center;gap:8px;width:100%;margin:12px 0 2px;padding:6px 12px;border:0;border-radius:8px;background:transparent;color:#8b95a5;font:inherit;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;cursor:pointer;text-align:left}' +
      '#adminPanel .admin-sidebar .anv-h:first-of-type{margin-top:4px}#adminPanel .admin-sidebar .anv-h:hover{color:#8ff3d6;background:rgba(255,255,255,.04)}#adminPanel .admin-sidebar .anv-h:focus-visible{outline:2px solid #62e8c2;outline-offset:1px}' +
      '#adminPanel .admin-sidebar .anv-h .b{margin-left:auto;min-width:18px;padding:1px 7px;border-radius:99px;background:rgba(98,232,194,.16);color:#8ff3d6;font-size:10.5px;letter-spacing:0;text-align:center;display:none}' +
      '#adminPanel .admin-sidebar .anv-h.fold .b.on{display:inline-block}' +
      '#adminPanel .admin-sidebar .anv-h .c{width:12px;height:12px;flex:none;transition:transform .18s;background:currentColor;-webkit-mask:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>') + '") center/contain no-repeat;mask:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>') + '") center/contain no-repeat}' +
      '#adminPanel .admin-sidebar .anv-h.fold .c{transform:rotate(-90deg)}' +
      '#adminPanel .admin-sidebar .anv-hide{display:none!important}' +
      '#adminPanel .admin-sidebar .anv-none{flex:none;padding:10px 12px;color:#8b95a5;font-size:13px;display:none}' +
      '#adminPanel .admin-sidebar .admin-nav-item[data-tab="chats"],#adminPanel .admin-sidebar .admin-nav-item[data-tab="deleted"]{margin-top:0}' +
      'html[data-theme="light"] #adminPanel .admin-sidebar .anv-q{border-color:rgba(15,23,42,.14);background-color:#f6f8f2}html[data-theme="light"] #adminPanel .admin-sidebar .anv-h{color:#6b7587}html[data-theme="light"] #adminPanel .admin-sidebar .anv-h:hover{color:#075c41;background:rgba(15,23,42,.05)}html[data-theme="light"] #adminPanel .admin-sidebar .anv-h .b{background:rgba(11,132,96,.14);color:#075c41}' +
      '#adminPanel .admin-sidebar .anv-pin{width:22px;height:22px;flex:none;margin-left:auto;border-radius:6px;opacity:0;cursor:pointer;background:currentColor;-webkit-mask:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>') + '") center/14px no-repeat;mask:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>') + '") center/14px no-repeat}' +
      '#adminPanel .admin-sidebar .admin-nav-item:hover .anv-pin,#adminPanel .admin-sidebar .anv-pin:focus-visible{opacity:.55}#adminPanel .admin-sidebar .anv-pin:hover{opacity:1!important;color:#62e8c2}#adminPanel .admin-sidebar .anv-pin.on{opacity:.9;color:#62e8c2}' +
      '#adminPanel .admin-sidebar .admin-nav-item .admin-nav-badge+.anv-pin{margin-left:6px}' +
      'html[data-theme="light"] #adminPanel .admin-sidebar .anv-pin.on,html[data-theme="light"] #adminPanel .admin-sidebar .anv-pin:hover{color:#0b8460}' +
      '@media(max-width:900px){#adminPanel .admin-sidebar .anv-pin{display:none}#adminPanel .admin-sidebar .anv-h,#adminPanel .admin-sidebar .anv-q,#adminPanel .admin-sidebar .anv-none{display:none!important}}' +
      '@media(prefers-reduced-motion:reduce){#adminPanel .admin-sidebar .anv-h .c{transition:none}}';
    document.head.appendChild(s);
  }

  function items() { return Array.prototype.slice.call(nav.querySelectorAll('.admin-nav-item[data-tab]')); }
  function byTab(t) { return nav.querySelector('.admin-nav-item[data-tab="' + t + '"]'); }
  function label(n) { return String(n.textContent || '').replace(/[•\d🔒]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function hiddenByStaff(n) { return n.style.display === 'none'; }

  function organize() {
    if (!nav || busy) return; busy = true;
    try {
      var used = {}, all = items();
      if (!input) {
        input = document.createElement('input'); input.type = 'search'; input.className = 'anv-q'; input.placeholder = 'Find a section…'; input.setAttribute('aria-label', 'Find a section');
        input.addEventListener('input', function () { q = input.value.trim().toLowerCase(); refresh(); });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { input.value = ''; q = ''; refresh(); input.blur(); }
          if (e.key === 'Enter') { var f = items().filter(function (n) { return !n.classList.contains('anv-hide') && !hiddenByStaff(n); })[0]; if (f) { f.click(); input.value = ''; q = ''; refresh(); input.blur(); } }
        });
        nav.insertBefore(input, nav.firstChild);
      }
      var none = nav.querySelector('.anv-none'); if (!none) { none = document.createElement('div'); none.className = 'anv-none'; none.textContent = 'Nothing matches. Try another word.'; }
      var anchor = input;
      function put(el) { if (anchor.nextSibling !== el) nav.insertBefore(el, anchor.nextSibling); anchor = el; }
      effGroups().forEach(function (g) {
        var members = g.tabs.map(byTab).filter(Boolean); if (!members.length) return;
        var h = heads[g.id];
        if (!h) {
          h = heads[g.id] = document.createElement('button'); h.type = 'button'; h.className = 'anv-h'; h.setAttribute('data-g', g.id);
          h.innerHTML = '<span class="t">' + g.t + '</span><span class="b"></span><span class="c"></span>';
          h.addEventListener('click', function () { st[g.id] = !isFolded(g); save(); refresh(); });
        }
        put(h);
        members.forEach(function (n) { used[n.getAttribute('data-tab')] = 1; n.setAttribute('data-g', g.id); put(n); });
      });
      var rest = all.filter(function (n) { return !used[n.getAttribute('data-tab')]; });     // sections added later by other scripts
      if (rest.length) {
        var h2 = heads.more; if (!h2) { h2 = heads.more = document.createElement('button'); h2.type = 'button'; h2.className = 'anv-h'; h2.setAttribute('data-g', 'more'); h2.innerHTML = '<span class="t">More</span><span class="b"></span><span class="c"></span>'; h2.addEventListener('click', function () { st.more = !st.more; save(); refresh(); }); }
        put(h2); rest.forEach(function (n) { n.setAttribute('data-g', 'more'); put(n); });
      }
      put(none);
      all.forEach(function (n) {
        var t = n.getAttribute('data-tab'); if (HINT[t] && !n.getAttribute('title')) n.setAttribute('title', HINT[t]);
        var pb = n.querySelector('.anv-pin');
        if (!pb) { pb = document.createElement('span'); pb.className = 'anv-pin'; pb.setAttribute('role', 'button'); pb.tabIndex = 0;
          pb.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); window.__acNavTogglePin(t); }, true);
          pb.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); window.__acNavTogglePin(t); } });
          n.appendChild(pb); }
        var on = pins().indexOf(t) > -1; pb.classList.toggle('on', on); pb.title = on ? 'Unpin from the top' : 'Pin to the top'; pb.setAttribute('aria-label', pb.title);
      });
    } finally { busy = false; }
    refresh();
  }

  function badgeNum(n) { var b = n.querySelector('.admin-nav-badge'); if (!b || b.style.display === 'none') return 0; var v = parseInt(b.textContent, 10); return isFinite(v) ? v : 0; }
  function refresh() {
    if (!nav) return;
    var dsk = desktop(), act = nav.querySelector('.admin-nav-item.active'), at = act ? act.getAttribute('data-tab') : '';
    if (at && at !== lastActive) { lastActive = at; var gid = act.getAttribute('data-g'), gg = effGroups().filter(function (g) { return g.id === gid; })[0]; if (gg && isFolded(gg) && dsk) { st[gid] = false; save(); } if (gid === 'more') st.more = false; }
    var shown = 0;
    effGroups().concat([{ id: 'more' }]).forEach(function (g) {
      var h = heads[g.id]; if (!h) return;
      var ms = items().filter(function (n) { return n.getAttribute('data-g') === g.id; }), vis = ms.filter(function (n) { return !hiddenByStaff(n); });
      var folded = g.id === 'more' ? !!st.more : isFolded(g), sum = 0, hit = 0;
      ms.forEach(function (n) {
        var off = hiddenByStaff(n), match = !q || label(n).indexOf(q) > -1 || (HINT[n.getAttribute('data-tab')] || '').toLowerCase().indexOf(q) > -1;
        var hideIt = !off && ((q && !match) || (!q && dsk && folded && !n.classList.contains('active')));
        n.classList.toggle('anv-hide', hideIt); if (!off && match) hit++; if (!off && !hideIt) shown++;
        sum += badgeNum(n);
      });
      h.classList.toggle('anv-hide', !vis.length || !!q); h.classList.toggle('fold', folded && !q);
      h.setAttribute('aria-expanded', folded ? 'false' : 'true');
      var b = h.querySelector('.b'); b.textContent = sum > 99 ? '99+' : String(sum); b.classList.toggle('on', sum > 0);
    });
    var none = nav.querySelector('.anv-none'); if (none) none.style.display = q && !shown ? 'block' : '';
  }

  function start() {
    nav = document.querySelector('#adminPanel .admin-sidebar'); if (!nav) return false;
    if (nav.__anv) return true; nav.__anv = 1; css(); organize();
    new MutationObserver(function () { if (busy) return; clearTimeout(timer); timer = setTimeout(organize, 150); }).observe(nav, { childList: true });
    nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.admin-nav-item')) setTimeout(refresh, 60); });
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(refresh, 120); });
    setInterval(function () { if (!document.hidden) refresh(); }, 2000);
    return true;
  }
  var tries = 0; (function wait() { if (start() || ++tries > 80) return; setTimeout(wait, 400); })();
})();
