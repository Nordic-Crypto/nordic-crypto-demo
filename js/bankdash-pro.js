/* ============================================================
   NORDIC CRYPTO — BANKING DASHBOARD PRO v2.0
   1:1 Reference Layout (Nordic Emerald Glass UI)
   ============================================================ */
(function () {
  'use strict';
  if (window.__bdPro) return;
  window.__bdPro = true;

  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function U(v) {
    try { return window.fmtCurrency ? window.fmtCurrency(v) : '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    catch (e) { return '$' + Number(v || 0).toFixed(2); }
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function px(id) { var e = $(id); if (e && !e.disabled) { try { e.click(); } catch (x) {} return true; } return false; }
  function nav(p) { var m = document.querySelector('.mi[data-p="' + p + '"]'); if (m) m.click(); }
  function toast(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) {} }

  var B = { rng: '1', hide: lsGet('bd_hide') === '1', built: false, sig: '' };

  function greetText() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  function userName() {
    var n = lsGet('user_name') || (S().user && S().user.name) || 'Client';
    return n.split(' ')[0];
  }
  function formattedDate() {
    try {
      return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function allTx() {
    var s = S();
    var txs = (s.txs || []).slice();
    txs.forEach(function (t) {
      if (!t.ts) {
        var d = Date.parse(t.date || '');
        t.ts = isFinite(d) ? d : Date.now();
      }
    });
    txs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return txs;
  }

  function totals() {
    var s = S();
    var usd = Number(s.usd) || 0;
    var btcVal = (Number(s.btc) || 0) * (Number(s.btcP) || 0);
    var ethVal = (Number(s.eth) || 0) * (Number(s.ethP) || 0);
    var usdtVal = Number(s.usdt) || 0;
    var othersVal = ((Number(s.sol) || 0) * (Number(s.solP) || 0)) + ((Number(s.bnb) || 0) * (Number(s.bnbP) || 0));
    var total = usd + btcVal + ethVal + usdtVal + othersVal;
    return { usd: usd, btc: btcVal, eth: ethVal, usdt: usdtVal, others: othersVal, total: total };
  }

 function build() {
    var dash = $('dash');
    if (!dash) return false;
    if ($('bd')) { B.built = true; return true; }

    var root = document.createElement('div');
    root.id = 'bd';
    root.className = 'bd';
    root.innerHTML =
      '<div class="bd-greet-row">' +
        '<div>' +
          '<h1 class="bd-greet-title" id="bdGreetTitle">Good morning, Client!</h1>' +
          '<p class="bd-greet-sub">Your financial freedom starts here</p>' +
        '</div>' +
        '<div class="bd-date-pill" id="bdDatePill"></div>' +
      '</div>' +

      '<div class="bd-top-grid">' +
        '<section class="bd-panel" id="bdBalPanel"></section>' +
        '<section class="bd-panel" id="bdCardPanel"></section>' +
        '<section class="bd-qstack" id="bdActionsPanel"></section>' +
      '</div>' +

      '<div class="bd-bot-grid">' +
        '<section class="bd-panel" id="bdTxPanel"></section>' +
        '<section class="bd-panel" id="bdCompPanel"></section>' +
        '<section class="bd-panel bd-sec-card" id="bdSecPanel"></section>' +
      '</div>';

    dash.insertBefore(root, dash.firstChild);
    dash.classList.add('bd-on');
    root.addEventListener('click', onClick);
    B.built = true;
    return true;
  }

  function renderBalance() {
    var t = totals();
    var box = $('bdBalPanel');
    if (!box) return;

    var ranges = ['1', '7', '30', '90', '365'];
    var labels = { '1': '1D', '7': '7D', '30': '1M', '90': '3M', '365': '1Y' };
    var rngHtml = ranges.map(function (r) {
      return '<button type="button" class="' + (B.rng === r ? 'on' : '') + '" data-a="rng" data-v="' + r + '">' + labels[r] + '</button>';
    }).join('');

    var delta = t.total > 0 ? t.total * 0.0125 : 0;
    var pct = t.total > 0 ? '+1.25%' : '0.00%';

    box.innerHTML =
      '<div>' +
        '<div class="bd-bal-head">' +
          '<div class="bd-bal-lbl"><span class="bd-bal-lbl-ic">💳</span> Total Balance</div>' +
          '<div class="bd-rng">' + rngHtml + '</div>' +
        '</div>' +
        '<div class="bd-bal-val-row">' +
          '<div class="bd-bal-num bd-sens">' + esc(U(t.total)) + '</div>' +
          '<button type="button" class="bd-eye-btn" data-a="eye" title="Toggle balance visibility">' + (B.hide ? '🙈' : '👁') + '</button>' +
        '</div>' +
        '<div class="bd-bal-delta up"><span class="bd-sens">▲ +' + esc(U(delta)) + ' ' + pct + '</span> <small>(24h)</small></div>' +
      '</div>' +
      '<div class="bd-chart-box" id="bdChartArea"></div>' +
      '<div class="bd-asset-strip">' +
        '<div class="bd-mini-coin"><span class="bd-mini-ic usd">$</span><div class="bd-mini-meta"><span>USD</span><b class="bd-sens">' + esc(U(t.usd)) + '</b></div></div>' +
        '<div class="bd-mini-coin"><span class="bd-mini-ic btc">₿</span><div class="bd-mini-meta"><span>BTC</span><b class="bd-sens">' + esc(U(t.btc)) + '</b></div></div>' +
        '<div class="bd-mini-coin"><span class="bd-mini-ic eth">Ξ</span><div class="bd-mini-meta"><span>ETH</span><b class="bd-sens">' + esc(U(t.eth)) + '</b></div></div>' +
        '<div class="bd-mini-coin"><span class="bd-mini-ic usdt">₮</span><div class="bd-mini-meta"><span>USDT</span><b class="bd-sens">' + esc(U(t.usdt)) + '</b></div></div>' +
        '<button type="button" class="bd-more-coins" data-a="nav" data-v="assets">+2 more ⌄</button>' +
      '</div>';

    drawAreaChart(t.total);
  }

  function drawAreaChart(currentVal) {
    var wrap = $('bdChartArea');
    if (!wrap) return;
    var W = wrap.clientWidth || 540;
    var H = 152;
    var base = currentVal > 0 ? currentVal : 1000;
    var factors = [0.92, 0.945, 0.935, 0.96, 0.975, 0.955, 0.97, 0.99, 0.982, 1.0];
    var pts = factors.map(function (f, i) {
      return { x: (i / (factors.length - 1)) * (W - 44), y: base * f };
    });

    var minV = base * 0.90;
    var maxV = base * 1.02;
    function mapY(v) { return 12 + (1 - (v - minV) / (maxV - minV)) * (H - 32); }

    var d = 'M ' + pts[0].x.toFixed(1) + ' ' + mapY(pts[0].y).toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var cx = (pts[i - 1].x + pts[i].x) / 2;
      d += ' C ' + cx.toFixed(1) + ' ' + mapY(pts[i - 1].y).toFixed(1) + ', ' +
           cx.toFixed(1) + ' ' + mapY(pts[i].y).toFixed(1) + ', ' +
           pts[i].x.toFixed(1) + ' ' + mapY(pts[i].y).toFixed(1);
    }
    var last = pts[pts.length - 1];
    var area = d + ' L ' + last.x.toFixed(1) + ' ' + (H - 20) + ' L 0 ' + (H - 20) + ' Z';

    var times = ['00:00', '06:00', '12:00', '18:00', '24:00'];
    var xLabels = times.map(function (tm, idx) {
      var tx = (idx / (times.length - 1)) * (W - 44);
      return '<text x="' + tx.toFixed(1) + '" y="' + (H - 3) + '" class="ax-txt" text-anchor="' + (idx === 0 ? 'start' : idx === 4 ? 'end' : 'middle') + '">' + tm + '</text>';
    }).join('');

    var ySteps = [1.0, 0.97, 0.94, 0.91];
    var yLabels = ySteps.map(function (k) {
      var val = base * k;
      var lbl = val >= 1000 ? '$' + Math.round(val / 1000) + 'k' : '$' + Math.round(val);
      return '<text x="' + (W - 2) + '" y="' + (mapY(val) + 3).toFixed(1) + '" class="ax-txt" text-anchor="end">' + lbl + '</text>';
    }).join('');

    wrap.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '">' +
        '<defs>' +
          '<linearGradient id="ncAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#45e6b0" stop-opacity="0.38"/>' +
            '<stop offset="100%" stop-color="#45e6b0" stop-opacity="0.0"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path d="' + area + '" fill="url(#ncAreaGrad)"/>' +
        '<path d="' + d + '" fill="none" stroke="#45e6b0" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="' + last.x.toFixed(1) + '" cy="' + mapY(last.y).toFixed(1) + '" r="4.5" fill="#45e6b0"/>' +
        '<circle cx="' + last.x.toFixed(1) + '" cy="' + mapY(last.y).toFixed(1) + '" r="9" fill="#45e6b0" opacity="0.22"/>' +
        xLabels + yLabels +
      '</svg>';
  }

  function renderCard() {
    var s = S();
    var box = $('bdCardPanel');
    if (!box) return;
    var frozen = s.card && s.card.status === 'Frozen';
    var rawNum = (s.card && s.card.num) ? String(s.card.num).replace(/\s+/g, '') : '4532000000004827';
    var last4 = rawNum.slice(-4) || '4827';
    var usd = Number(s.usd) || 0;

    box.innerHTML =
      '<div class="bd-card-visual">' +
        '<div class="bd-cv-top">' +
          '<div class="bd-cv-brand"><i>N</i> NordicCrypto</div>' +
          '<span class="bd-cv-status ' + (frozen ? 'frozen' : '') + '">● ' + (frozen ? 'Frozen' : 'Active') + '</span>' +
        '</div>' +
        '<div class="bd-cv-chip-row">' +
          '<div class="bd-emv"></div>' +
          '<span style="color:#9cb0bd;font-size:15px">))))</span>' +
        '</div>' +
        '<div class="bd-cv-num-row">' +
          '<span class="bd-cv-num">**** **** **** ' + esc(last4) + '</span>' +
          '<span class="bd-cv-visa">VISA</span>' +
        '</div>' +
      '</div>' +
      '<div class="bd-avail-row">' +
        '<div>' +
          '<div class="bd-avail-lbl">Available Balance</div>' +
          '<div class="bd-avail-val bd-sens">' + esc(U(usd)) + '</div>' +
        '</div>' +
        '<button type="button" class="bd-manage-btn" data-a="nav" data-v="cards">Manage Card →</button>' +
      '</div>' +
      '<div class="bd-card-ctrls">' +
        '<button type="button" class="bd-cctrl" data-a="proxy" data-t="btnFreezeCard"><span class="bd-cctrl-ic">❄</span><span>' + (frozen ? 'Unfreeze' : 'Freeze') + '</span></button>' +
        '<button type="button" class="bd-cctrl" data-a="proxy" data-t="btnLimitsCard"><span class="bd-cctrl-ic">🎚</span><span>Limits</span></button>' +
        '<button type="button" class="bd-cctrl" data-a="proxy" data-t="btnCopyCardV2"><span class="bd-cctrl-ic">📋</span><span>Copy</span></button>' +
        '<button type="button" class="bd-cctrl" data-a="proxy" data-t="btnSettingsCard"><span class="bd-cctrl-ic">⚙</span><span>Settings</span></button>' +
      '</div>';
  }

  function renderActions() {
    var box = $('bdActionsPanel');
    if (!box) return;
    box.innerHTML =
      '<button type="button" class="bd-qbtn pri" data-a="proxy" data-t="btnAdd"><span class="bd-qbtn-l"><span>💳</span> Add Money</span><span>+</span></button>' +
      '<button type="button" class="bd-qbtn" data-a="proxy" data-t="btnWithdrawV2"><span class="bd-qbtn-l"><span>↗</span> Withdraw</span><span>→</span></button>' +
      '<button type="button" class="bd-qbtn" data-a="proxy" data-t="btnExchangeV2"><span class="bd-qbtn-l"><span>⇄</span> Exchange</span><span>⇄</span></button>' +
      '<button type="button" class="bd-qbtn" data-a="proxy" data-t="btnScanDeposits"><span class="bd-qbtn-l"><span>📷</span> Scan Deposits</span></button>' +
      '<button type="button" class="bd-qbtn" data-a="bonus"><span class="bd-qbtn-l"><span>🎁</span> Bonus</span></button>' +
      '<button type="button" class="bd-qbtn" data-a="proxy" data-t="navWallets"><span class="bd-qbtn-l"><span>👛</span> Wallets</span></button>';
  }

  function renderTransactions() {
    var box = $('bdTxPanel');
    if (!box) return;
    var list = allTx().slice(0, 4);

    var rowsHtml = list.length ? list.map(function (t, idx) {
      var a = Number(t.amt) || 0;
      var desc = String(t.desc || 'Transaction');
      var low = desc.toLowerCase();
      var cls = 'in', sym = '↓', amtCls = 'up';
      if (/exchange|swap|convert/.test(low)) { cls = 'swap'; sym = '⇄'; amtCls = 'nt'; }
      else if (/bonus|reward/.test(low)) { cls = 'bonus'; sym = '🎁'; amtCls = 'up'; }
      else if (a < 0 || /withdraw|transfer/.test(low)) { cls = 'out'; sym = '⇄'; amtCls = 'dn'; }

      var dt = t.ts ? new Date(t.ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
               new Date(t.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      var amtStr = a !== 0 ? ((a > 0 ? '+' : '−') + U(Math.abs(a))) : (t.coinAmt ? (t.coinAmt + ' ' + (t.coin || '')) : '—');

      return '<button type="button" class="bd-tx-item" data-a="tx" data-i="' + idx + '">' +
        '<div class="bd-tx-l">' +
          '<span class="bd-tx-ic ' + cls + '">' + sym + '</span>' +
          '<div class="bd-tx-info"><b>' + esc(desc) + '</b><small>' + esc(dt) + '</small></div>' +
        '</div>' +
        '<span class="bd-tx-amt bd-sens ' + amtCls + '">' + esc(amtStr) + '</span>' +
      '</button>';
    }).join('') : '<div style="color:#7f94a3;font-size:13px;padding:24px 0;text-align:center">No recent transactions yet</div>';

    box.innerHTML =
      '<div class="bd-sec-hdr"><h3>Recent Transactions</h3><button type="button" class="bd-sec-link" data-a="nav" data-v="tx">View all →</button></div>' +
      '<div class="bd-tx-list">' + rowsHtml + '</div>';
  }

  function renderComposition() {
    var box = $('bdCompPanel');
    if (!box) return;
    var t = totals();
    var cryptoSum = t.btc + t.eth + t.usdt + t.others;
    var items = cryptoSum > 0 ? [
      { name: 'BTC', val: t.btc, color: '#2dd4bf' },
      { name: 'ETH', val: t.eth, color: '#6366f1' },
      { name: 'USDT', val: t.usdt, color: '#38bdf8' },
      { name: 'Others', val: t.others, color: '#94a3b8' }
    ] : [
      { name: 'BTC', val: 42.8, color: '#2dd4bf' },
      { name: 'ETH', val: 28.1, color: '#6366f1' },
      { name: 'USDT', val: 18.3, color: '#38bdf8' },
      { name: 'Others', val: 10.8, color: '#94a3b8' }
    ];
    var sum = items.reduce(function (acc, x) { return acc + x.val; }, 0) || 1;
    var R = 52;
    var C = 2 * Math.PI * R;
    var offset = 0;

    var circles = items.map(function (it) {
      var len = (it.val / sum) * C;
      var seg = '<circle cx="73" cy="73" r="' + R + '" fill="none" stroke="' + it.color + '" stroke-width="18" ' +
                'stroke-dasharray="' + Math.max(0, len - 2).toFixed(2) + ' ' + C.toFixed(2) + '" ' +
                'stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 73 73)"/>';
      offset += len;
      return seg;
    }).join('');

    var legend = items.map(function (it) {
      var pct = ((it.val / sum) * 100).toFixed(1);
      return '<li><span><i style="background:' + it.color + '"></i>' + it.name + '</span><b>' + pct + '%</b></li>';
    }).join('');

    var centerTotal = '$' + Math.round(t.total).toLocaleString('en-US');

    box.innerHTML =
      '<div class="bd-sec-hdr"><h3>Portfolio Composition</h3></div>' +
      '<div class="bd-comp-wrap">' +
        '<div class="bd-donut-box">' +
          '<svg viewBox="0 0 146 146" width="146" height="146">' +
            '<circle cx="73" cy="73" r="' + R + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>' +
            circles +
          '</svg>' +
          '<div class="bd-donut-center"><b class="bd-sens">' + esc(centerTotal) + '</b><small>Total Value</small></div>' +
        '</div>' +
        '<ul class="bd-comp-leg">' + legend + '</ul>' +
      '</div>';
  }

  function renderSecurity() {
    var box = $('bdSecPanel');
    if (!box) return;
    box.innerHTML =
      '<div class="bd-sec-top">' +
        '<div class="bd-sec-shield">🛡</div>' +
        '<div><h3>Your Account is Protected</h3><p>Advanced security keeps your assets safe.</p></div>' +
      '</div>' +
      '<ul class="bd-sec-list">' +
        '<li><i>✓</i> Identity Verified</li>' +
        '<li><i>✓</i> 2FA Enabled</li>' +
        '<li><i>✓</i> Fraud Protection Active</li>' +
      '</ul>' +
      '<div class="bd-sec-watermark">✓</div>' +
      '<button type="button" class="bd-sec-btn" data-a="proxy" data-t="settingsBtn">Security Center →</button>';
  }

  function render(force) {
    if (!B.built && !build()) return;
    var dash = $('dash');
    if (!dash || dash.offsetParent === null) return;

    var s = S();
    var sig = [s.usd, s.btc, s.eth, s.usdt, s.currency, (s.txs || []).length, s.card && s.card.status, B.rng, B.hide].join('|');
    if (!force && sig === B.sig) return;
    B.sig = sig;

    $('bd').classList.toggle('hide', B.hide);
    var gt = $('bdGreetTitle');
    if (gt) gt.textContent = greetText() + ', ' + userName() + '!';
    var dp = $('bdDatePill');
    if (dp) dp.textContent = '📅 ' + formattedDate();

    renderBalance();
    renderCard();
    renderActions();
    renderTransactions();
    renderComposition();
    renderSecurity();
  }

  function onClick(e) {
    var btn = e.target.closest('[data-a]');
    if (!btn) return;
    var act = btn.getAttribute('data-a');
    if (act === 'eye') {
      B.hide = !B.hide;
      lsSet('bd_hide', B.hide ? '1' : '0');
      render(true);
    } else if (act === 'rng') {
      B.rng = btn.getAttribute('data-v') || '1';
      render(true);
    } else if (act === 'proxy') {
      var target = btn.getAttribute('data-t');
      if (!px(target)) toast('Action unavailable right now');
    } else if (act === 'bonus') {
      if (typeof window.openClientBonus === 'function') window.openClientBonus();
      else toast('Bonus center opened');
    } else if (act === 'nav') {
      nav(btn.getAttribute('data-v'));
    } else if (act === 'tx') {
      var idx = parseInt(btn.getAttribute('data-i'), 10);
      var item = allTx()[idx];
      if (item && typeof window.openTxDetails === 'function') window.openTxDetails(item);
    }
  }

  function init() {
    if (!build()) { setTimeout(init, 350); return; }
    render(true);
    setInterval(function () { render(false); }, 2000);
    window.addEventListener('resize', function () { render(true); });
  }

  window.BankDashPro = { render: function () { render(true); }, state: B };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
