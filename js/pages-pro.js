/* NordicCrypto pages-pro.js v1 — redesign of My Cards, Crypto Assets, Transactions and Order New Card.
   Works on top of the existing pages: every id the old code writes to is kept; this file only adds structure and style. */
(function () {
  'use strict';
  if (window.__ncPages) return; window.__ncPages = 1;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function debounce(f, ms) { var t; return function () { clearTimeout(t); t = setTimeout(f, ms); }; }
  function num(s) { var v = parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')); return isFinite(v) ? v : 0; }

  var CSS =
    /* shared */
    '.pg.on>.sh{animation:ppUp .4s cubic-bezier(.2,.8,.2,1) both}.pg.on>*:nth-child(2){animation:ppUp .45s .05s cubic-bezier(.2,.8,.2,1) both}.pg.on>*:nth-child(3){animation:ppUp .5s .1s cubic-bezier(.2,.8,.2,1) both}' +
    '@keyframes ppUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '#cards>.sh h2,#assets>.sh h2,#tx>.sh h2,#order .sh h2{font-size:1.55rem;letter-spacing:-.02em}' +
    /* cards */
    '@media(min-width:1000px){#cards.pg.on{display:grid!important;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:8px 36px;align-items:start}#cards>.sh{grid-column:1/-1}#cards>#cardFull{grid-column:1;grid-row:2}#cards>div[style*="margin-top:20px"]{grid-column:1;grid-row:3}#cards>.pp-det{grid-column:2;grid-row:2/4}#cards>.pp-phys{grid-column:1/-1}}' +
    '#cards>#cardFull{max-width:440px!important;transition:transform .25s ease,box-shadow .25s;transform-style:preserve-3d;will-change:transform}' +
    '#cards>.panel{max-width:none!important}' +
    '#cards>div[style*="margin-top:20px"]{display:grid!important;grid-template-columns:repeat(4,1fr);gap:10px!important;max-width:440px}' +
    '#cards>div[style*="margin-top:20px"] .btn{flex-direction:column;gap:6px;padding:14px 6px;min-height:78px;border-radius:18px;font-size:.78rem;text-align:center;line-height:1.2;justify-content:center;white-space:normal}' +
    '#cards>div[style*="margin-top:20px"] .btn .pp-ai{font-size:1.35rem;line-height:1}' +
    '#cards>div[style*="margin-top:20px"] .btn.b3{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.35)}' +
    '#cards>.pp-det h4{font-size:1.05rem}#cards>.pp-phys{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(0,229,255,.1),rgba(139,92,246,.14))}#cards>.pp-phys h4{margin:0 0 4px!important}#cards>.pp-phys p{margin:0!important}#cards>.pp-phys button{margin:0}' +
    /* assets */
    '.pp-port{position:relative;overflow:hidden;margin:0 0 18px;padding:26px;border-radius:24px;background:linear-gradient(135deg,rgba(0,229,255,.13),rgba(139,92,246,.18));border:1px solid var(--bd2,rgba(255,255,255,.14))}' +
    '.pp-port small{display:block;color:var(--mut,#94A3B8);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700}.pp-port .v{font-size:clamp(2rem,5vw,2.8rem);font-weight:800;letter-spacing:-.03em;margin:6px 0 14px;font-variant-numeric:tabular-nums}' +
    '.pp-bar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.08)}.pp-bar i{display:block;transition:width .6s cubic-bezier(.2,.8,.2,1)}.pp-leg{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:.84rem;color:var(--mut,#94A3B8)}.pp-leg b{color:var(--txt,#F8FAFC)}.pp-leg span:before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;background:var(--c)}' +
    '.pp-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pp-acts button{padding:11px 18px;border-radius:13px;border:1px solid var(--bd2,rgba(255,255,255,.14));background:var(--pan,#111827);color:inherit;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;transition:transform .2s,border-color .2s}.pp-acts button:hover{transform:translateY(-2px);border-color:var(--pri,#00E5FF)}.pp-acts button.p{background:var(--pri,#c6ff3d);color:#06101f;border:0}' +
    '#assets>div[style*="grid-template-columns"]{gap:14px!important}#assets .panel{position:relative;padding-left:78px!important;transition:transform .25s,border-color .25s}#assets .panel:hover{transform:translateY(-3px);border-color:var(--pri,#00E5FF)}' +
    '.pp-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pp-meta span{font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.1);color:var(--mut,#94a3b8)}.pp-meta .pp-sh{color:var(--c);border-color:color-mix(in srgb,var(--c) 45%,transparent);background:color-mix(in srgb,var(--c) 12%,transparent)}' +
    '.pp-coin{position:absolute;left:20px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:1.15rem;color:#fff}' +
    '.pp-empty{margin:0 0 16px;padding:14px 18px;border-radius:16px;border:1px dashed var(--bd2,rgba(255,255,255,.14));color:var(--mut,#94A3B8);font-size:.9rem}' +
    /* transactions */
    '.pp-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 16px}.pp-sum div{padding:16px 18px;border-radius:18px;background:var(--pan,#111827);border:1px solid var(--bd,rgba(255,255,255,.08))}.pp-sum small{display:block;color:var(--mut,#94A3B8);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700}.pp-sum b{display:block;margin-top:5px;font-size:1.3rem;font-variant-numeric:tabular-nums}.pp-sum .in b{color:#34d399}.pp-sum .out b{color:#f87171}' +
    '.pp-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 14px}.pp-chips{display:flex;gap:8px;flex-wrap:wrap}.pp-chip{padding:8px 15px;border-radius:99px;border:1px solid var(--bd2,rgba(255,255,255,.14));background:transparent;color:var(--mut,#94A3B8);font:inherit;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .2s}.pp-chip:hover{color:var(--txt,#fff);border-color:var(--pri,#00E5FF)}.pp-chip.on{background:var(--pri,#00E5FF);border-color:transparent;color:#06101f}' +
    '.pp-q{flex:1;min-width:180px;max-width:320px;margin-left:auto;padding:9px 14px;border-radius:99px;border:1px solid var(--bd2,rgba(255,255,255,.14));background:var(--pan,#111827);color:inherit;font:inherit;font-size:.9rem}.pp-q:focus{outline:none;border-color:var(--pri,#00E5FF)}' +
    '#txB tr.pp-day td{padding:12px 22px 8px;background:rgba(255,255,255,.025);color:var(--mut,#94A3B8);font-size:.74rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;border-bottom:1px solid var(--bd,rgba(255,255,255,.08))}#txB tr.pp-hide{display:none}#txB tr:not(.pp-day){transition:background .2s}#txB tr:not(.pp-day):hover{background:rgba(255,255,255,.035)}' +
    '.pp-none{display:none;padding:34px;text-align:center;color:var(--mut,#94A3B8)}.pp-none.on{display:block}' +
    '@media(max-width:700px){.pp-sum{grid-template-columns:1fr}.pp-q{max-width:none;margin-left:0;flex-basis:100%}.pp-tools{margin-bottom:10px}}' +
    /* order */
    '@media(min-width:1000px){#orderForm{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,380px);gap:8px 32px;align-items:start}#orderForm>.sh{grid-column:1/-1}#orderForm>.panel{grid-column:1;max-width:none!important}#orderForm>.pp-side{grid-column:2;grid-row:2}}' +
    '.pp-side{display:flex;flex-direction:column;gap:14px}.pp-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pp-tile{position:relative;text-align:left;padding:16px;border-radius:20px;border:2px solid var(--bd2,rgba(255,255,255,.14));background:var(--pan,#111827);color:inherit;font:inherit;cursor:pointer;transition:transform .2s,border-color .2s}.pp-tile:hover{transform:translateY(-3px)}.pp-tile.on{border-color:var(--pri,#00E5FF);box-shadow:0 14px 34px -20px var(--pri,#00E5FF)}' +
    '.pp-tile b{display:block;font-size:1.05rem}.pp-tile em{display:block;font-style:normal;color:var(--mut,#94A3B8);font-size:.8rem;margin:3px 0 8px}.pp-tile ul{margin:0;padding-left:16px;color:var(--mut,#94A3B8);font-size:.78rem;line-height:1.55}.pp-price{position:absolute;top:14px;right:14px;font-size:.78rem;font-weight:800;color:var(--pri,#00E5FF)}' +
    '.pp-pv{position:relative;aspect-ratio:1.586;border-radius:22px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:#fff;box-shadow:0 30px 60px -28px rgba(0,0,0,.8);transition:background .5s;background:linear-gradient(135deg,#3b4252,#1b1f2a 55%,#4a5163)}.pp-pv.gold{background:linear-gradient(135deg,#8a6a1c,#3a2a08 55%,#c9a24a)}' +
    '.pp-pv:before{content:"";position:absolute;right:-30%;top:-40%;width:90%;height:120%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.18),transparent 62%)}.pp-pv .b{font-weight:800;letter-spacing:.14em;font-size:.95rem;position:relative}.pp-pv .n{position:relative;font-family:ui-monospace,monospace;font-size:1.15rem;letter-spacing:.12em}.pp-pv .h{position:relative;display:flex;justify-content:space-between;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;opacity:.9}' +
    '.pp-note{font-size:.82rem;color:var(--mut,#94A3B8);line-height:1.55}' +
    '@media(prefers-reduced-motion:reduce){.pg.on>*{animation:none!important}#cards>#cardFull{transition:none}.pp-bar i{transition:none}}';
  var st0 = document.createElement('style'); st0.id = 'nc-pp-css'; st0.textContent = CSS; (document.head || document.documentElement).appendChild(st0);

  /* ───── My Cards ───── */
  function cards() {
    var p = $('cards'); if (!p) return;
    var pn = p.querySelectorAll(':scope>.panel'); if (pn[0]) pn[0].classList.add('pp-det'); if (pn[1]) pn[1].classList.add('pp-phys');
    var row = p.querySelector('div[style*="margin-top:20px"]');
    if (row) [].forEach.call(row.querySelectorAll('.btn'), function (b) {
      if (b.querySelector('.pp-ai')) return;
      var t = b.textContent.trim(), m = t.match(/^(\S+)\s+(.*)$/); if (!m) return;
      b.innerHTML = '<span class="pp-ai">' + esc(m[1]) + '</span><span>' + esc(m[2]) + '</span>';
    });
    var c = $('cardFull'); if (c && !c._tilt && !matchMedia('(prefers-reduced-motion:reduce)').matches && matchMedia('(hover:hover)').matches) {
      c._tilt = 1;
      c.addEventListener('mousemove', function (e) { var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = 'perspective(900px) rotateY(' + (x * 9).toFixed(2) + 'deg) rotateX(' + (-y * 9).toFixed(2) + 'deg) scale(1.015)'; });
      c.addEventListener('mouseleave', function () { c.style.transform = ''; });
    }
  }

  /* ───── Crypto Assets ───── */
  function assets() {
    var p = $('assets'); if (!p) return;
    var grid = p.querySelector('div[style*="grid-template-columns"]'); if (!grid) return;
    var coins = [['aBtc', 'aBtcU', '₿', '#f7931a', 'Bitcoin'], ['aEth', 'aEthU', 'Ξ', '#627eea', 'Ethereum']];
    var vals = coins.map(function (c) { return Math.max(0, num(($(c[1]) || {}).textContent)); }), total = vals.reduce(function (a, b) { return a + b; }, 0);
    var h = $('ppPort');
    if (!h) { h = document.createElement('div'); h.id = 'ppPort'; grid.parentNode.insertBefore(h, grid); }
    var cur = (($(coins[0][1]) || {}).textContent || '').replace(/[0-9.,\s≈\-]/g, '') || '$';
    var money = function (v) { return cur + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var sig = vals.join('|') + cur; if (h._sig === sig) return; h._sig = sig;
    h.className = 'pp-port';
    h.innerHTML = '<small>Total crypto value</small><div class="v">' + esc(money(total)) + '</div>' +
      (total > 0 ? '<div class="pp-bar">' + coins.map(function (c, i) { return '<i style="width:' + (vals[i] / total * 100).toFixed(1) + '%;background:' + c[3] + '"></i>'; }).join('') + '</div><div class="pp-leg">' + coins.map(function (c, i) { return '<span style="--c:' + c[3] + '">' + esc(c[4]) + ' <b>' + (vals[i] / total * 100).toFixed(0) + '%</b></span>'; }).join('') + '</div>'
        : '<div class="pp-empty" style="margin:0">You do not hold any crypto yet. Add some to see your portfolio here.</div>') +
      '<div class="pp-acts"><button class="p" data-go="btnAdd">+ Add crypto</button><button data-go="btnExchangeV2">⇄ Exchange</button><button data-go="btnWithdrawV2">↗ Withdraw</button></div>';
    [].forEach.call(h.querySelectorAll('[data-go]'), function (b) { b.onclick = function () { var t = $(b.getAttribute('data-go')); if (t) { var d = document.querySelector('.mi[data-p="dash"]'); if (d) d.click(); setTimeout(function () { var t2 = $(b.getAttribute('data-go')); if (t2) t2.click(); }, 120); } }; });
    var SVG = {
      1: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 2l-6.500 10.200L12 16l6.500-3.800z" opacity=".9"/><path d="M12 17.200l-6.500-3.800L12 22l6.500-8.600z" opacity=".75"/></svg>'
    };
    [].forEach.call(grid.querySelectorAll('.panel'), function (pn, i) {
      var c = coins[i]; if (!c) return;
      if (!pn.querySelector('.pp-coin')) { var d = document.createElement('div'); d.className = 'pp-coin'; d.style.background = c[3]; d.innerHTML = SVG[i] || c[2]; pn.appendChild(d); }
      var amt = parseFloat((($(c[0]) || {}).textContent || '').replace(/[^0-9.]/g, '')) || 0;
      var tag = pn.querySelector('.pp-meta') || document.createElement('div'); tag.className = 'pp-meta';
      var share = total > 0 ? Math.round(vals[i] / total * 100) : 0, unit = amt > 0 ? vals[i] / amt : 0;
      tag.innerHTML = '<span class="pp-sh" style="--c:' + c[3] + '">' + share + '% of portfolio</span>' + (unit ? '<span class="pp-un">1 ' + (i ? 'ETH' : 'BTC') + ' ≈ ' + cur + unit.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</span>' : '');
      if (!tag.parentNode) pn.appendChild(tag);
    });
  }

  /* ───── Transactions ───── */
  var F = { chip: 'all', q: '' };
  function rowInfo(tr) {
    var td = tr.children; if (td.length < 4) return null;
    var n = td.length, amtTxt = td[n - 2].textContent.trim(), dateTxt = td[0].textContent.trim();
    return { date: dateTxt, ts: Date.parse(dateTxt) || 0, type: n >= 5 ? td[1].textContent.trim() : '', desc: td[n >= 5 ? 2 : 1].textContent.trim(), amt: num(amtTxt) * (/^[-−–]/.test(amtTxt) ? (num(amtTxt) < 0 ? 1 : -1) : 1), neg: /^[-−–]/.test(amtTxt), pos: /^\+/.test(amtTxt), status: td[n - 1].textContent.trim() };
  }
  function txTools() {
    var p = $('tx'); if (!p) return;
    var tbl = p.querySelector('.tbl'); if (!tbl) return;
    if (!$('ppTools')) {
      var w = document.createElement('div'); w.id = 'ppTools';
      w.innerHTML = '<div class="pp-sum" id="ppSum"></div><div class="pp-tools"><div class="pp-chips">' + [['all', 'All'], ['in', 'Income'], ['out', 'Spending'], ['crypto', 'Crypto'], ['wd', 'Withdrawals']].map(function (c) { return '<button class="pp-chip' + (c[0] === 'all' ? ' on' : '') + '" data-c="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div><input class="pp-q" id="ppQ" type="search" placeholder="Search transactions" aria-label="Search transactions"></div>';
      tbl.parentNode.insertBefore(w, tbl);
      var none = document.createElement('div'); none.id = 'ppNone'; none.className = 'pp-none'; none.textContent = 'Nothing found. Try another filter or search.'; tbl.parentNode.insertBefore(none, tbl.nextSibling);
      w.addEventListener('click', function (e) { var b = e.target.closest('.pp-chip'); if (!b) return; F.chip = b.getAttribute('data-c'); [].forEach.call(w.querySelectorAll('.pp-chip'), function (x) { x.classList.toggle('on', x === b); }); applyTx(); });
      $('ppQ').addEventListener('input', debounce(function () { F.q = $('ppQ').value.trim().toLowerCase(); applyTx(); }, 120));
    }
    applyTx();
  }
  var applying = false;
  function applyTx() {
    var b = $('txB'); if (!b || applying) return; applying = true; if (mo) mo.disconnect();
    try {
      [].forEach.call(b.querySelectorAll('tr.pp-day'), function (r) { r.remove(); });
      var rows = [].slice.call(b.querySelectorAll('tr')), last = '', now = new Date(), y = new Date(now.getTime() - 864e5), shown = 0, inn = 0, out = 0, cur = '', mth = now.getMonth(), yr = now.getFullYear();
      rows.forEach(function (tr) {
        var r = rowInfo(tr); if (!r) return;
        if (!cur) { var m = tr.children[tr.children.length - 2].textContent.match(/[^\d\s+\-−–.,]+/); if (m) cur = m[0]; }
        var ok = true, t = (r.type + ' ' + r.desc).toLowerCase();
        if (F.chip === 'in') ok = r.pos || (!r.neg && r.amt > 0); else if (F.chip === 'out') ok = r.neg; else if (F.chip === 'crypto') ok = /crypto|btc|eth|trade|exchange|swap|bought|sold/.test(t); else if (F.chip === 'wd') ok = /withdraw|transfer/.test(t);
        if (ok && F.q) ok = (t + ' ' + r.date.toLowerCase() + ' ' + r.status.toLowerCase()).indexOf(F.q) > -1;
        tr.classList.toggle('pp-hide', !ok);
        var d = r.ts ? new Date(r.ts) : null;
        if (d && d.getMonth() === mth && d.getFullYear() === yr && !/reject|fail/i.test(r.status)) { if (r.neg) out += Math.abs(r.amt); else inn += Math.abs(r.amt); }
        if (!ok) return; shown++;
        if (r.date !== last) {
          last = r.date; var lab = r.date;
          if (d) { var s = d.toDateString(); lab = s === now.toDateString() ? 'Today' : s === y.toDateString() ? 'Yesterday' : r.date; }
          var h = document.createElement('tr'); h.className = 'pp-day'; h.innerHTML = '<td colspan="' + tr.children.length + '">' + esc(lab) + '</td>'; tr.parentNode.insertBefore(h, tr);
        }
      });
      var f = function (v) { return (cur || '$') + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
      var sm = $('ppSum'); if (sm) sm.innerHTML = '<div class="in"><small>Money in · this month</small><b>+' + esc(f(inn)) + '</b></div><div class="out"><small>Money out · this month</small><b>−' + esc(f(out)) + '</b></div><div><small>Net</small><b>' + (inn - out < 0 ? '−' : '') + esc(f(Math.abs(inn - out))) + '</b></div>';
      var nn = $('ppNone'); if (nn) nn.classList.toggle('on', rows.length > 0 && !shown);
    } finally { applying = false; if (mo && b) mo.observe(b, { childList: true }); }
  }
  var mo = null;
  function watchTx() { var b = $('txB'); if (!b || mo) return; mo = new MutationObserver(debounce(applyTx, 80)); mo.observe(b, { childList: true }); }

  /* ───── Order New Card ───── */
  function order() {
    var f = $('orderForm'); if (!f || $('ppSide')) return;
    var sel = $('oType'), name = $('oName'); if (!sel || !name) return;
    var side = document.createElement('div'); side.id = 'ppSide'; side.className = 'pp-side';
    side.innerHTML = '<div class="pp-pv" id="ppPv"><div class="b">NORDIC CRYPTO</div><div class="n">•••• •••• •••• ••••</div><div class="h"><span id="ppPvName">Your name</span><span id="ppPvKind">Metal</span></div></div>' +
      '<div class="pp-tiles"><button type="button" class="pp-tile on" data-i="0"><span class="pp-price">FREE</span><b>Metal</b><em>Brushed steel finish</em><ul><li>Contactless and chip</li><li>Free delivery</li></ul></button>' +
      '<button type="button" class="pp-tile" data-i="1"><span class="pp-price">+$100</span><b>Gold</b><em>24k-look finish</em><ul><li>Premium weight</li><li>Gift box</li></ul></button></div>' +
      '<div class="pp-note">Delivery time depends on your country. You can follow your order live on the next screen once it is placed.</div>';
    f.appendChild(side);
    function sync() { var i = sel.selectedIndex < 0 ? 0 : sel.selectedIndex; [].forEach.call(side.querySelectorAll('.pp-tile'), function (t, k) { t.classList.toggle('on', k === i); }); $('ppPv').classList.toggle('gold', i === 1); $('ppPvKind').textContent = i === 1 ? 'Gold' : 'Metal'; $('ppPvName').textContent = (name.value.trim() || 'Your name').toUpperCase(); }
    side.addEventListener('click', function (e) { var t = e.target.closest('.pp-tile'); if (!t) return; sel.selectedIndex = +t.getAttribute('data-i'); sel.dispatchEvent(new Event('change', { bubbles: true })); sync(); });
    sel.addEventListener('change', sync); name.addEventListener('input', sync); sync();
  }

  function tick() { try { cards(); assets(); txTools(); watchTx(); order(); } catch (e) {} }
  var d = debounce(tick, 120);
  new MutationObserver(function (m) { if (m.some(function (x) { return x.target && x.target.closest && x.target.closest('#cards,#assets,#tx,#order') && !(x.target.closest('#ppTools,#ppPort,#ppSide,#txB')); })) d(); }).observe(document.documentElement, { childList: true, subtree: true });
  /* assets values are written as text; re-check when the page is opened */
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.mi')) setTimeout(tick, 200); }, true);
  tick(); setTimeout(tick, 1500); setTimeout(tick, 4000);
})();
