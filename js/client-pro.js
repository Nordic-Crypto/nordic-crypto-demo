/* ============================================================
   NC CLIENT PRO v1.0 — Banking + Exchange dashboard layer
   Load AFTER app.legacy.js (before </body>). Idempotent: runs on a
   light timer and only touches elements it owns, plus a few fixes:
     • Exchange "Portfolio value" now = USD + all crypto (was USD only)
     • "24h Change" is real (balance history minus deposits), not
       "profit vs deposits"; shows — when there is not enough data
     • Real 24h % for coins from CoinGecko (falls back silently)
     • Hide-balance (privacy) toggle, quick actions, spending
       insights, allocation bar, count-up animation
   ============================================================ */
(function () {
  'use strict';
  if (window.__cpProLoaded) return;
  window.__cpProLoaded = true;

  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v) { return typeof window.fmtCurrency === 'function' ? window.fmtCurrency(v) : '$' + Number(v || 0).toFixed(2); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  /* ---------- privacy toggle ---------- */
  var EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function applyPriv() {
    var on = lsGet('nc_priv') === '1';
    document.body.classList.toggle('cp-priv', on);
    document.querySelectorAll('.cp-eye').forEach(function (b) { b.innerHTML = on ? EYE_OFF : EYE; b.title = on ? 'Show balances' : 'Hide balances'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function eyeBtn() {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cp-eye'; b.setAttribute('aria-label', 'Hide balances');
    b.onclick = function () { lsSet('nc_priv', lsGet('nc_priv') === '1' ? '0' : '1'); applyPriv(); };
    return b;
  }

  /* ---------- 24h market data (CoinGecko, optional) ---------- */
  var CG = { t: 0, d: null }, CG_IDS = { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', SOL: 'solana', BNB: 'binancecoin' };
  function loadCg() {
    if (Date.now() - CG.t < 120000) return; CG.t = Date.now();
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,binancecoin&vs_currencies=usd&include_24hr_change=true')
      .then(function (r) { return r.json(); }).then(function (d) { if (d && d.bitcoin) { CG.d = d; applyCg(); } }).catch(function () { });
  }
  function chg(sym) { var id = CG_IDS[sym], x = CG.d && CG.d[id]; return x && typeof x.usd_24h_change === 'number' ? x.usd_24h_change : null; }
  function applyCg() {
    var c = window._exPricesCache; if (Array.isArray(c)) c.forEach(function (r) { var v = chg(r.symbol); if (v != null) r.change24h = v; });
    if (typeof window.renderExchangeCoins === 'function' && c) window.renderExchangeCoins();
    [['btcChange', 'BTC'], ['ethChange', 'ETH']].forEach(function (p) { var el = $(p[0]), v = chg(p[1]); if (el && v != null) { el.textContent = (v >= 0 ? '▲ +' : '▼ ') + v.toFixed(2) + '%'; el.className = v >= 0 ? 'cp-up' : 'cp-dn'; } });
  }

  /* ---------- valuation ---------- */
  function price(sym) {
    var s = S();
    if (sym === 'BTC') return s.btcP || 0; if (sym === 'ETH') return s.ethP || 0; if (sym === 'USDT') return 1;
    var c = window._exPricesCache; if (Array.isArray(c)) for (var i = 0; i < c.length; i++) if (c[i].symbol === sym) return c[i].usd || 0;
    return 0;
  }
  function holdings() {
    var s = S(), out = [];
    [['USD', s.usd, 1, '#22c55e', 'Cash (USD)'], ['BTC', s.btc, price('BTC'), '#f7931a', 'Bitcoin'], ['ETH', s.eth, price('ETH'), '#627eea', 'Ethereum'], ['USDT', s.usdt, 1, '#26a17b', 'Tether'], ['SOL', s.sol, price('SOL'), '#9945ff', 'Solana'], ['BNB', s.bnb, price('BNB'), '#f3ba2f', 'BNB']].forEach(function (h) {
      var amt = Number(h[1] || 0), val = amt * h[2]; if (amt > 0 && val >= 0) out.push({ sym: h[0], amt: amt, val: val, c: h[3], name: h[4] });
    });
    return out;
  }
  function totalValue() { return holdings().reduce(function (a, h) { return a + h.val; }, 0); }

  /* ---------- count-up ---------- */
  var anim = {};
  function countUp(el, target, fmt) {
    if (!el || !isFinite(target)) return;
    var id = el.id, prev = anim[id] ? anim[id].to : null;
    if (anim[id] && anim[id].to === target) { if (el.textContent !== fmt(target) && !anim[id].raf) el.textContent = fmt(target); return; }
    if (prev == null || window.matchMedia('(prefers-reduced-motion:reduce)').matches) { anim[id] = { to: target }; el.textContent = fmt(target); return; }
    var from = prev, t0 = performance.now(), dur = 700; if (anim[id].raf) cancelAnimationFrame(anim[id].raf);
    anim[id] = { to: target };
    (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (target - from) * e); if (k < 1) anim[id].raf = requestAnimationFrame(step); else { anim[id].raf = 0; el.textContent = fmt(target); } })(t0);
  }

  /* ---------- BANKING ---------- */
  var QA = [
    ['btnAdd', 'Add money', 'M12 5v14M5 12h14', 'linear-gradient(135deg,#22d3ee,#3b82f6)', 'rgba(34,211,238,.7)'],
    ['btnWithdrawV2', 'Send', 'M7 17 17 7M8 7h9v9', 'linear-gradient(135deg,#fb923c,#ef4444)', 'rgba(251,146,60,.7)'],
    ['btnExchangeV2', 'Exchange', 'M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4', 'linear-gradient(135deg,#ec4899,#8b5cf6)', 'rgba(236,72,153,.7)'],
    ['btnReceiveHero', 'Receive', 'M17 7 7 17M16 17H7V8', 'linear-gradient(135deg,#34d399,#10b981)', 'rgba(52,211,153,.7)'],
    ['__cards', 'Card', 'M2 6h20v12H2zM2 10h20', 'linear-gradient(135deg,#a78bfa,#6366f1)', 'rgba(167,139,250,.7)']
  ];
  function buildBanking() {
    var dash = $('dash'); if (!dash) return;
    var hero = dash.querySelector('.nc3-hero');
    if (hero && !$('cpQa')) {
      var qa = document.createElement('div'); qa.className = 'cp-qa'; qa.id = 'cpQa';
      qa.innerHTML = QA.map(function (q, i) { return '<button type="button" data-i="' + i + '"><i style="--g:' + q[3] + ';--s:' + q[4] + '"><svg viewBox="0 0 24 24"><path d="' + q[2] + '"/></svg></i>' + q[1] + '</button>'; }).join('');
      qa.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return; var q = QA[+b.getAttribute('data-i')];
        if (q[0] === '__cards') { var n = document.querySelector('[data-p="cards"]'); if (n) n.click(); return; }
        var t = $(q[0]); if (t) t.click();
      };
      hero.parentNode.insertBefore(qa, hero.nextSibling);
      var ha = dash.querySelector('.nc3-hero-actions'); if (ha) ha.style.display = 'none';
    }
    var k = dash.querySelector('.nc3-balance-top .nc3-kicker');
    if (k && !k.querySelector('.cp-eye')) { k.appendChild(eyeBtn()); applyPriv(); }
    var eur = $('balEur');
    if (eur && !$('cpSpark')) { var sp = document.createElement('div'); sp.className = 'cp-spark'; sp.id = 'cpSpark'; var top = dash.querySelector('.nc3-balance-top'); top.parentNode.insertBefore(sp, top.nextSibling); }
    var lower = dash.querySelector('.nc3-lower');
    if (lower && !$('cpIns')) {
      var sec = document.createElement('section'); sec.className = 'cp-ins'; sec.id = 'cpIns';
      lower.parentNode.insertBefore(sec, lower.nextSibling);
    }
  }
  var MC = ['#22d3ee', '#a78bfa', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#f97316'];
  function mcol(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return MC[h % MC.length]; }
  function renderInsights() {
    var sec = $('cpIns'); if (!sec) return;
    var txs = S().txs || [], since = Date.now() - 30 * 86400000, spend = 0, inc = 0, m = {};
    txs.forEach(function (t) {
      var ts = t.ts || Date.parse(t.date) || 0; if (ts && ts < since) return; if (/rejected|cancel|failed/i.test(t.status || '')) return;
      var a = Number(t.amt || 0);
      if (a < 0) { spend += -a; var name = String(t.desc || 'Other').replace(/^(Card payment|Payment|Purchase)\s*[—–-]\s*/i, '').replace(/^Withdrawal.*/i, 'Withdrawals').replace(/^Bought .*/i, 'Crypto purchases').replace(/^Transfer .*/i, 'Transfers'); name = name.slice(0, 28); m[name] = (m[name] || 0) + -a; }
      else if (a > 0 && !/bonus/i.test(t.desc || '')) inc += a;
    });
    var rows = Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5), mx = rows.length ? rows[0][1] : 1;
    var sig = JSON.stringify([rows, inc]); if (sec.getAttribute('data-sig') === sig) return; sec.setAttribute('data-sig', sig);
    var net = inc - spend, tot = inc + spend || 1;
    sec.innerHTML = '<div class="cp-row2"><div class="cp-card"><div class="nc3-kicker">Spending insights</div><h2>Where your money goes · 30 days</h2>' +
      (rows.length ? '<div class="cp-merch">' + rows.map(function (r) { var c = mcol(r[0]); return '<div style="--c:' + c + '"><em>' + esc(r[0].charAt(0).toUpperCase()) + '</em><span>' + esc(r[0]) + '<i><u style="width:' + Math.max(4, r[1] / mx * 100).toFixed(0) + '%"></u></i></span><b>' + money(r[1]) + '</b></div>'; }).join('') + '</div>' : '<div class="cp-empty">No spending in the last 30 days.<br>Card payments will show up here automatically.</div>') + '</div>' +
      '<div class="cp-card"><div class="nc3-kicker">Cash flow</div><h2>Income vs spending</h2><div class="cp-big cp-num ' + (net >= 0 ? 'cp-up' : 'cp-dn') + '">' + (net >= 0 ? '+' : '−') + money(Math.abs(net)) + '</div><div class="cp-sub">Net over the last 30 days</div>' +
      '<div class="cp-split"><i style="width:' + (inc / tot * 100).toFixed(1) + '%;background:#10b981"></i><i style="width:' + (spend / tot * 100).toFixed(1) + '%;background:#ef4444"></i></div>' +
      '<div class="cp-leg"><div style="--c:#10b981"><u></u>Income<b>' + money(inc) + '</b></div><div style="--c:#ef4444"><u></u>Spending<b>' + money(spend) + '</b></div></div></div></div>';
  }

  function renderSpark() {
    var el = $('cpSpark'); if (!el) return; var s = S(), pts = [], hist = s.balanceHistory || [], now = Date.now(), cut = now - 7 * 86400000;
    hist.forEach(function (p) { var t = p.t || p.ts; if (t >= cut && isFinite(p.v)) pts.push([t, p.v]); });
    if (pts.length < 3) { var run = Number(s.usd || 0), tx = (s.txs || []).filter(function (t) { return t.ts && t.ts >= cut; }).sort(function (a, b) { return b.ts - a.ts; }); pts = [[now, run]]; tx.forEach(function (t) { run -= Number(t.amt || 0); pts.unshift([t.ts, run]); }); pts.unshift([cut, run]); }
    if (pts.length < 2) { el.innerHTML = ''; return; }
    var sig = pts.length + '|' + Math.round(pts[pts.length - 1][1]); if (el.getAttribute('data-sig') === sig) return; el.setAttribute('data-sig', sig);
    var t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1, mn = Infinity, mx = -Infinity; pts.forEach(function (p) { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); }); var r = (mx - mn) || 1;
    var xy = pts.map(function (p) { return (((p[0] - t0) / ((t1 - t0) || 1)) * 100).toFixed(2) + ',' + (88 - ((p[1] - mn) / r) * 70).toFixed(2); });
    var up = pts[pts.length - 1][1] >= pts[0][1], c = up ? '#34d399' : '#f87171';
    el.innerHTML = '<small>7 days</small><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="cpSg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".32"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs><polygon fill="url(#cpSg)" points="0,100 ' + xy.join(' ') + ' 100,100"/><polyline fill="none" stroke="' + c + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" points="' + xy.join(' ') + '"/></svg>';
  }

  /* ---------- EXCHANGE ---------- */
  function buildExchange() {
    var ex = $('exchangeDash'); if (!ex) return;
    var ha = ex.querySelector('.ex-hero-actions');
    if (ha && !ha.querySelector('.cp-eye')) { ha.insertBefore(eyeBtn(), ha.firstChild); applyPriv(); }
    var stats = ex.querySelector('.ex-bal-stats');
    if (stats && !$('cpAlloc')) { var a = document.createElement('div'); a.className = 'cp-alloc'; a.id = 'cpAlloc'; stats.parentNode.insertBefore(a, stats.nextSibling); }
  }
  function fix24h() {
    var el = $('exPnl24h'); if (!el) return;
    var s = S(), hist = s.balanceHistory || [], now = Date.now(), cut = now - 86400000, base = null;
    for (var i = 0; i < hist.length; i++) { var t = hist[i].t || hist[i].ts; if (t >= cut - 3600000) { base = hist[i]; break; } }
    var cur = totalValue();
    if (!base || (now - (base.t || base.ts)) < 3600000 * 3 || !(base.v > 0)) { el.textContent = '—'; el.className = 'cp-flat'; el.title = 'Not enough history yet'; return; }
    var dep = 0; (s.txs || []).forEach(function (t) { var ts = t.ts || 0; if (ts >= (base.t || base.ts) && Number(t.amt) > 0) dep += Number(t.amt); });
    var base2 = base.v + dep, pct = base2 > 0 ? ((cur - base2) / base2) * 100 : 0;
    if (!isFinite(pct) || Math.abs(pct) > 500) { el.textContent = '—'; el.className = 'cp-flat'; return; }
    el.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'; el.className = pct > 0.005 ? 'cp-up' : pct < -0.005 ? 'cp-dn' : 'cp-flat'; el.title = 'Portfolio change over 24h, excluding deposits';
  }
  function renderExchange() {
    var ex = $('exchangeDash'); if (!ex || ex.style.display === 'none') return;
    var hs = holdings(), tot = hs.reduce(function (a, h) { return a + h.val; }, 0);
    countUp($('exBalance'), tot, money);
    var bt = $('exBalanceBtc'), bp = price('BTC'); if (bt && bp > 0) bt.textContent = '≈ ' + (tot / bp).toFixed(8) + ' BTC';
    var ac = $('exAssetsCount'); if (ac) ac.textContent = hs.length;
    fix24h();
    var td = $('exTotalDeposits'); if (td) { var d = 0; (S().txs || []).forEach(function (t) { if (Number(t.amt) > 0 && !/bonus/i.test(t.desc || '')) d += Number(t.amt); }); td.textContent = money(d); }
    var al = $('cpAlloc');
    if (al) {
      var sig = JSON.stringify(hs.map(function (h) { return [h.sym, Math.round(h.val)]; })); if (al.getAttribute('data-sig') !== sig) {
        al.setAttribute('data-sig', sig);
        al.innerHTML = hs.length && tot > 0 ? '<h5>Allocation</h5><div class="cp-split">' + hs.map(function (h) { return '<i title="' + h.sym + '" style="width:' + (h.val / tot * 100).toFixed(2) + '%;background:' + h.c + '"></i>'; }).join('') + '</div><div class="cp-leg">' + hs.map(function (h) { return '<div style="--c:' + h.c + '"><u></u>' + h.sym + '<b>' + (h.val / tot * 100).toFixed(1) + '%</b></div>'; }).join('') + '</div>' : '<h5>Allocation</h5><div class="cp-sub" style="margin-top:8px">Fund your account to see your allocation.</div>';
      }
    }
    var grid = ex.querySelector('.ex-assets-grid');
    if (grid) {
      var extra = hs.filter(function (h) { return h.sym === 'USDT' || h.sym === 'SOL' || h.sym === 'BNB' || h.sym === 'USD'; }), sig2 = JSON.stringify(extra.map(function (h) { return [h.sym, h.amt, Math.round(h.val)]; }));
      var old = grid.querySelectorAll('.cp-extra'); var cur = grid.getAttribute('data-cp');
      if (cur !== sig2) {
        grid.setAttribute('data-cp', sig2); old.forEach(function (o) { o.remove(); });
        extra.forEach(function (h) { var d = document.createElement('div'); d.className = 'ex-asset-card cp-extra'; d.innerHTML = '<div class="ex-asset-icon-big" style="background:' + h.c + ';color:#fff;font-weight:800;font-size:15px;display:grid;place-items:center">' + esc(h.sym === 'USD' ? '$' : h.sym.slice(0, 3)) + '</div><div class="ex-asset-info"><div class="ex-asset-label">' + esc(h.name) + '</div><div class="ex-asset-amount">' + h.amt.toFixed(h.sym === 'USD' ? 2 : 6) + ' ' + h.sym + '</div><div class="ex-asset-value">' + money(h.val) + '</div></div>'; grid.appendChild(d); });
      }
    }
  }
  function renderBankingBits() {
    var dash = $('dash'); if (!dash) return;
    renderInsights(); renderSpark();
    var b = $('bal'); if (b) { var v = Number(S().usd); if (isFinite(v) && b.offsetParent !== null) countUp(b, v, money); }
  }


  /* ---------- DEPOSIT MODAL: show the address the admin assigned ---------- */
  var QRS = { BTC: 'Bitcoin network', ETH: 'Ethereum network (ERC-20)' };
  function fillDeposit() {
    var m = $('mMethod'), txt = $('mDestText'); if (!m || !txt) return;
    var v = m.value, coin = v === 'Bitcoin (BTC)' ? 'BTC' : v === 'Ethereum (ETH)' ? 'ETH' : null;
    var wrap = $('mDestWrap'), qrw = $('mQrWrap'), net = $('mDestNetwork'), qr = $('mQrCode'), addr = '';
    if (!coin) { if (qrw) qrw.style.display = 'none'; return; }
    try { addr = (typeof window.getDepositWallet === 'function' && window.getDepositWallet(coin)) || ''; } catch (e) { }
    if (!addr) { var h = $('mDest'); addr = h && h.value || ''; }
    if (wrap) wrap.style.display = 'block';
    if (addr) {
      txt.textContent = addr; txt.style.wordBreak = 'break-all';
      if (net) net.textContent = QRS[coin];
      if (qrw) qrw.style.display = 'flex';
      if (qr && qr.getAttribute('data-v') !== addr) {
        qr.setAttribute('data-v', addr); qr.innerHTML = '';
        try { var cv = document.createElement('canvas'); qr.appendChild(cv); new window.QRious({ element: cv, value: addr, size: 120, level: 'M' }); }
        catch (e) { qr.innerHTML = '<div style="color:#475569;font-size:11px;padding:8px;text-align:center">QR unavailable</div>'; }
      }
    } else {
      txt.textContent = 'No ' + coin + ' address assigned yet. Contact support.'; if (net) net.textContent = '—'; if (qrw) qrw.style.display = 'none';
    }
  }
  function hookDeposit() {
    if (window.__cpDepHooked || typeof window.refreshDest !== 'function') return; window.__cpDepHooked = true;
    var o = window.refreshDest; window.refreshDest = function () { var r = o.apply(this, arguments); try { fillDeposit(); } catch (e) { } return r; };
    var m = $('mMethod'); if (m) m.addEventListener('change', function () { setTimeout(fillDeposit, 0); });
  }


  /* ---------- no card yet: friendly CTA instead of a "FROZEN / NO CARD" placeholder ---------- */
  function noCard() {
    var c = $('cardDash'); if (!c) return;
    var has = !!(S().card && S().card.num), cta = $('cpNoCard');
    c.classList.toggle('cp-nocard', !has);
    if (!has && !cta) {
      var d = document.createElement('div'); d.id = 'cpNoCard'; d.className = 'cp-nocard-cta';
      d.innerHTML = '<b>No card yet</b><span>Order a virtual or metal card in a minute.</span><button type="button" class="btn b1">Order my card</button>';
      d.querySelector('button').onclick = function () { var n = document.querySelector('.nav [data-p], [data-p="newcard"], [data-p="order"]'); var all = document.querySelectorAll('[data-p]'); for (var i = 0; i < all.length; i++) { if (/order/i.test(all[i].textContent)) { all[i].click(); return; } } };
      c.appendChild(d);
    } else if (has && cta) cta.remove();
  }

  /* ---------- loop ---------- */
  function tick() {
    if (!window.st || document.hidden) return;
    hookDeposit(); noCard(); buildBanking(); buildExchange(); renderBankingBits(); renderExchange(); loadCg();
  }
  function start() { applyPriv(); tick(); setInterval(tick, 2000); document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
