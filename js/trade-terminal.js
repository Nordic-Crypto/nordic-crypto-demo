/* ============================================================
   NORDIC CRYPTO — TRADE TERMINAL v2.0 (live)
   ============================================================
   Professional trading terminal (Binance Spot style).
   
   All market data is realistic but synthetic:
     • Prices    — from live CoinGecko feed (_exPricesCache)
     • Candles   — generated from price + volatility
     • Order book — generated around current price
     • Trades    — generated stream
   
   Real operations:
     • Buy / Sell / Convert — via Worker ?action=trade
     • Limit orders — saved to state.openOrders
     • Balance & P&L — tracked from server
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // SECTION 1: STATE
  // ============================================================

  var TT = {
    open: false,
    coin: 'BTC',
    timeframe: '4h',
    candles: [],
    bids: [],
    asks: [],
    recentTrades: [],
    hoverX: -1,
    hoverY: -1,
    viewStart: 0,
    viewCount: 60,
    maxCandles: 200,
    priceDirection: 'flat', // 'up' | 'down' | 'flat'
    lastPrice: 0,
    indicators: { ma: true, ema: true, vol: true },
    intervals: []
  };

  var COINS = ['BTC', 'ETH', 'USDT', 'SOL', 'BNB'];
  // v2.0 live market data (Binance public streams) + TradingView symbols
  var BIN = { BTC: 'btcusdt', ETH: 'ethusdt', SOL: 'solusdt', BNB: 'bnbusdt' };
  var TV_SYM = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT', BNB: 'BINANCE:BNBUSDT', USDT: 'KRAKEN:USDTUSD' };
  var LV = { ws: null, coin: null, price: {}, priceAt: {}, tickerAt: 0, depthAt: 0, tradeAt: 0, stats: null, tradesLive: false, fail: 0, retryT: 0, pollT: 0 };
  var FEE_RATE = 0.001; // 0.1%

  // ============================================================
  // SECTION 2: HELPERS
  // ============================================================

  function $(id) { return document.getElementById(id); }

  function fmtMoney(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPrice(n) {
    if (n >= 1000) return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return '$' + Number(n).toFixed(4);
    return '$' + Number(n).toFixed(8);
  }

  function fmtCrypto(n, symbol) {
    var d = (symbol === 'USDT') ? 2 : 8;
    return Number(n).toFixed(d);
  }

  function fmtVolume(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    return Number(n).toFixed(2);
  }

  function getCoinPrice(symbol) {
    var lp = LV.price[symbol];
    if (lp > 0 && (Date.now() - (LV.priceAt[symbol] || 0)) < 20000) return lp;
    if (window._exPricesCache && window._exPricesCache.length) {
      var coin = window._exPricesCache.find(function (c) { return c.symbol === symbol; });
      if (coin) return Number(coin.usd) || 0;
    }
    if (!window.st) return 0;
    if (symbol === 'BTC') return Number(window.st.btcP) || 80000;
    if (symbol === 'ETH') return Number(window.st.ethP) || 2500;
    if (symbol === 'USDT') return 1;
    if (symbol === 'SOL') return 115;
    if (symbol === 'BNB') return 767;
    return 0;
  }

  function getCoinBalance(symbol) {
    if (!window.st) return 0;
    return Number(window.st[symbol.toLowerCase()]) || 0;
  }

  function getUsdBalance() {
    if (!window.st) return 0;
    return Number(window.st.usd) || 0;
  }

  // ============================================================
  // SECTION 3: OPEN / CLOSE
  // ============================================================

  window.openTradeTerminalFull = function () {
    var term = $('tradeTerminal');
    if (!term) {
      console.warn('[TT] #tradeTerminal not found in DOM');
      return;
    }

    term.classList.add('on');
    TT.open = true;

    // Initialize everything
    initTerminal();
    selectCoin('BTC');
    selectTimeframe('4h');
    startLiveUpdates();
  };

  window.closeTradeTerminalFull = function () {
    var term = $('tradeTerminal');
    if (term) term.classList.remove('on');
    TT.open = false;
    liveStop();
    tvDestroy();

    // Stop intervals
    TT.intervals.forEach(function (id) { clearInterval(id); });
    TT.intervals = [];
  };

  // ============================================================
  // SECTION 4: INIT
  // ============================================================

  function initTerminal() {
    bindHeader();
    bindTabs();
    bindFormInputs();
    bindOrderType();
    bindQuickPct();
    bindChartMouse();
    bindMaskClick();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // ============================================================
  // SECTION 5: HEADER BINDINGS
  // ============================================================

  function bindHeader() {
    // Coin selector
    document.querySelectorAll('.tt-coin-selector button').forEach(function (btn) {
      btn.onclick = function () {
        selectCoin(this.getAttribute('data-coin'));
      };
    });

    // Close
    var closeBtn = document.querySelector('.tt-close');
    if (closeBtn) closeBtn.onclick = closeTradeTerminalFull;

    // Timeframes
    document.querySelectorAll('.tt-timeframes button').forEach(function (btn) {
      btn.onclick = function () {
        selectTimeframe(this.getAttribute('data-tf'));
      };
    });

    // Indicators
    document.querySelectorAll('.tt-indicators button').forEach(function (btn) {
      btn.onclick = function () {
        var ind = this.getAttribute('data-ind');
        TT.indicators[ind] = !TT.indicators[ind];
        this.classList.toggle('on', TT.indicators[ind]);
        drawChart();
      };
    });
  }

  function selectCoin(coin) {
    TT.coin = coin;
    document.querySelectorAll('.tt-coin-selector button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-coin') === coin);
    });

    // Update labels
    updateFormLabels();
    // Generate fresh candles + order book
    generateCandles();
    generateOrderBook();
    generateRecentTrades();
    renderOrderBook();
    renderRecentTrades();
    drawChart();
    updateHeader();
    updatePreview();
    if (TT.open) { liveSwitch(coin); tvLoad(); }
  }

  function selectTimeframe(tf) {
    TT.timeframe = tf;
    document.querySelectorAll('.tt-timeframes button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-tf') === tf);
    });
    generateCandles();
    drawChart();
  }

  // ============================================================
  // SECTION 6: TABS
  // ============================================================

  function bindTabs() {
    document.querySelectorAll('.tt-form-tabs button').forEach(function (btn) {
      btn.onclick = function () {
        var tab = this.getAttribute('data-tab');
        document.querySelectorAll('.tt-form-tabs button').forEach(function (b) { b.classList.remove('on'); });
        this.classList.add('on');
        document.querySelectorAll('.tt-form').forEach(function (f) {
          f.classList.toggle('on', f.getAttribute('data-form') === tab);
        });
        updatePreview();
      };
    });
  }

  function bindOrderType() {
    document.querySelectorAll('.tt-order-type button').forEach(function (btn) {
      btn.onclick = function () {
        var type = this.getAttribute('data-type');
        var parent = this.closest('.tt-order-type');
        parent.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        this.classList.add('on');

        var form = this.closest('.tt-form');
        var limitWrap = form.querySelector('.tt-limit-price');
        if (limitWrap) limitWrap.classList.toggle('on', type === 'limit');
        if (limitWrap && type === 'limit') {
          var li = limitWrap.querySelector('input');
          var cp = getCoinPrice(TT.coin);
          if (li && !li.value && cp > 0) { li.value = cp >= 1 ? cp.toFixed(2) : cp.toFixed(6); updatePreview(); }
        }
      };
    });
  }

  // ============================================================
  // SECTION 7: QUICK % BUTTONS
  // ============================================================

  function bindQuickPct() {
    document.querySelectorAll('.tt-quick button').forEach(function (btn) {
      btn.onclick = function () {
        var pct = parseInt(this.getAttribute('data-pct'), 10) / 100;
        var form = this.closest('.tt-form');
        if (!form) return;
        var formType = form.getAttribute('data-form');

        if (formType === 'buy') {
          var amount = getUsdBalance() * pct;
          var input = $('ttBuyAmount');
          if (input) input.value = amount.toFixed(2);
        } else if (formType === 'sell') {
          var amount2 = getCoinBalance(TT.coin) * pct;
          var input2 = $('ttSellAmount');
          if (input2) input2.value = amount2.toFixed(8);
        } else if (formType === 'convert') {
          var from = $('ttConvertFrom').value;
          var amount3 = getCoinBalance(from) * pct;
          var input3 = $('ttConvertAmount');
          if (input3) input3.value = amount3.toFixed(8);
        }
        updatePreview();
      };
    });
  }

  // ============================================================
  // SECTION 8: FORM INPUTS
  // ============================================================

  function bindFormInputs() {
    ['ttBuyAmount', 'ttBuyLimitPrice', 'ttSellAmount', 'ttSellLimitPrice', 'ttConvertAmount'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', updatePreview);
    });

    var convFrom = $('ttConvertFrom');
    var convTo = $('ttConvertTo');
    if (convFrom) convFrom.addEventListener('change', updatePreview);
    if (convTo) convTo.addEventListener('change', updatePreview);

    // Submit buttons
    var buySubmit = $('ttBuySubmit');
    if (buySubmit) buySubmit.onclick = submitBuy;

    var sellSubmit = $('ttSellSubmit');
    if (sellSubmit) sellSubmit.onclick = submitSell;

    var convertSubmit = $('ttConvertSubmit');
    if (convertSubmit) convertSubmit.onclick = submitConvert;
  }

  // ============================================================
  // SECTION 9: UPDATE PREVIEW
  // ============================================================

  function updatePreview() {
    var price = getCoinPrice(TT.coin);

    // BUY
    var buyAmt = parseFloat(($('ttBuyAmount') || {}).value) || 0;
    var buyReceived = price > 0 ? buyAmt / price : 0;
    var buyFee = buyAmt * FEE_RATE;
    var buyReceiveEl = $('ttBuyReceive');
    if (buyReceiveEl) buyReceiveEl.textContent = fmtCrypto(buyReceived, TT.coin) + ' ' + TT.coin;
    var buyRateEl = $('ttBuyRate');
    if (buyRateEl) buyRateEl.textContent = '1 ' + TT.coin + ' = ' + fmtPrice(price);
    var buyFeeEl = $('ttBuyFee');
    if (buyFeeEl) buyFeeEl.textContent = fmtMoney(buyFee);
    var buyBalEl = $('ttBuyBalance');
    if (buyBalEl) buyBalEl.textContent = fmtMoney(getUsdBalance());
    var buyBtnEl = $('ttBuySubmit');
    if (buyBtnEl) buyBtnEl.textContent = 'Buy ' + TT.coin;

    // SELL
    var sellAmt = parseFloat(($('ttSellAmount') || {}).value) || 0;
    var sellReceived = sellAmt * price;
    var sellFee = sellReceived * FEE_RATE;
    var sellReceiveEl = $('ttSellReceive');
    if (sellReceiveEl) sellReceiveEl.textContent = fmtMoney(sellReceived - sellFee);
    var sellRateEl = $('ttSellRate');
    if (sellRateEl) sellRateEl.textContent = '1 ' + TT.coin + ' = ' + fmtPrice(price);
    var sellBalEl = $('ttSellBalance');
    if (sellBalEl) sellBalEl.textContent = fmtCrypto(getCoinBalance(TT.coin), TT.coin) + ' ' + TT.coin;
    var sellBtnEl = $('ttSellSubmit');
    if (sellBtnEl) sellBtnEl.textContent = 'Sell ' + TT.coin;

    // CONVERT
    var convFromEl = $('ttConvertFrom');
    var convToEl = $('ttConvertTo');
    var convAmtEl = $('ttConvertAmount');
    if (convFromEl && convToEl && convAmtEl) {
      var fromCoin = convFromEl.value;
      var toCoin = convToEl.value;
      var convAmt = parseFloat(convAmtEl.value) || 0;
      var fromPrice = getCoinPrice(fromCoin);
      var toPrice = getCoinPrice(toCoin);
      var rate = toPrice > 0 ? fromPrice / toPrice : 0;
      var result = convAmt * rate;
      var convResultEl = $('ttConvertResult');
      if (convResultEl) convResultEl.value = result > 0 ? result.toFixed(8) : '';
      var convRateEl = $('ttConvertRate');
      if (convRateEl) convRateEl.textContent = '1 ' + fromCoin + ' = ' + rate.toFixed(8) + ' ' + toCoin;
      var convFromBalEl = $('ttConvertFromBalance');
      if (convFromBalEl) convFromBalEl.textContent = 'Balance: ' + fmtCrypto(getCoinBalance(fromCoin), fromCoin);
      var convToBalEl = $('ttConvertToBalance');
      if (convToBalEl) convToBalEl.textContent = 'Balance: ' + fmtCrypto(getCoinBalance(toCoin), toCoin);
    }
    ttValidate();
  }

  function updateFormLabels() {
    // Update all mentions of coin in labels
    var buyLabel = $('ttBuyLabel');
    if (buyLabel) buyLabel.textContent = 'Amount (USD)';
    var sellLabel = $('ttSellLabel');
    if (sellLabel) sellLabel.textContent = 'Amount (' + TT.coin + ')';
  }

  // ============================================================
  // SECTION 10: UPDATE HEADER
  // ============================================================

  function updateHeader() {
    if (liveHeader()) return;
    var price = getCoinPrice(TT.coin);
    var priceEl = document.querySelector('.tt-price');
    if (priceEl) priceEl.textContent = fmtPrice(price);

    // Change % (fake, based on volatility)
    var change = TT.candles.length >= 2
      ? ((TT.candles[TT.candles.length - 1].c - TT.candles[0].o) / TT.candles[0].o) * 100
      : 0;
    var changeEl = document.querySelector('.tt-change');
    if (changeEl) {
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.classList.remove('up', 'down');
      changeEl.classList.add(change >= 0 ? 'up' : 'down');
    }

    // Stats
    var high = TT.candles.reduce(function (m, c) { return Math.max(m, c.h); }, 0);
    var low = TT.candles.reduce(function (m, c) { return Math.min(m, c.l); }, Infinity);
    var vol = TT.candles.reduce(function (s, c) { return s + c.v; }, 0);
    var statsEl = document.querySelector('.tt-stats');
    if (statsEl) {
      statsEl.innerHTML =
        '<div>24h High:<b>' + fmtPrice(high) + '</b></div>' +
        '<div>24h Low:<b>' + fmtPrice(low) + '</b></div>' +
        '<div>24h Vol:<b>' + fmtVolume(vol) + ' ' + TT.coin + '</b></div>';
    }
  }

  // ============================================================
  // SECTION 11: GENERATE CANDLES
  // ============================================================

      /**
   * Generate realistic OHLC candles for the chart.
   * 
   * Strategy:
   *   1. Start from the current live price (last candle close).
   *   2. Walk backwards in time — each earlier candle is derived
   *      from the next one with realistic volatility.
   *   3. Use mean reversion: price gently gravitates toward a
   *      long-term anchor (current price ± 3%) to avoid runaway.
   *   4. Result: smooth, realistic chart with no end-of-chart jumps.
   */
  function generateCandles() {
    var basePrice = getCoinPrice(TT.coin);
    if (basePrice <= 0) basePrice = 100;

    var tfMinutes = { '1h': 60, '4h': 240, '1d': 1440 };
    var minutes = tfMinutes[TT.timeframe] || 240;
    var now = Date.now();
    var N = TT.maxCandles;

    // Volatility per candle (scaled by timeframe)
    // 4h → ~1.2% swing; 1h → ~0.6%; 1d → ~3%
    var tfVolFactor = { '1h': 0.006, '4h': 0.012, '1d': 0.03 };
    var sigma = basePrice * (tfVolFactor[TT.timeframe] || 0.012);

    // Mean-reversion anchor: current price is the long-term center
    var anchor = basePrice;

    // Generate candles backwards: index 0 = oldest, N-1 = newest
    // We start with newest candle close = current price, then walk back.
    var closes = new Array(N);
    closes[N - 1] = basePrice;

    for (var i = N - 2; i >= 0; i--) {
      var next = closes[i + 1];
      // Random walk with mean reversion toward anchor
      var reversion = (anchor - next) * 0.03; // pull toward anchor
      var noise = (Math.random() - 0.5) * sigma * 2;
      var c = next + reversion + noise;
      // Clamp to ±15% from anchor (prevents runaway)
      var maxDev = anchor * 0.15;
      if (c < anchor - maxDev) c = anchor - maxDev;
      if (c > anchor + maxDev) c = anchor + maxDev;
      closes[i] = c;
    }

    // Build OHLC from closes
    var candles = [];
    for (var k = 0; k < N; k++) {
      var closePrice = closes[k];
      var openPrice = (k === 0) ? closePrice : closes[k - 1];

      // Wick size — small relative to body
      var wickSize = sigma * (0.3 + Math.random() * 0.7);
      var high = Math.max(openPrice, closePrice) + wickSize * Math.random();
      var low  = Math.min(openPrice, closePrice) - wickSize * Math.random();

      // Volume — higher on larger moves
      var movePct = Math.abs(closePrice - openPrice) / openPrice;
      var baseVol = basePrice * 80;
      var vol = baseVol * (0.5 + Math.random() * 1.0) * (1 + movePct * 20);

      candles.push({
        t: now - (N - 1 - k) * minutes * 60 * 1000,
        o: openPrice,
        h: high,
        l: low,
        c: closePrice,
        v: vol
      });
    }

    // Last candle close MUST equal live price exactly (no jump)
    if (candles.length) {
      var last = candles[candles.length - 1];
      last.c = basePrice;
      last.h = Math.max(last.h, basePrice);
      last.l = Math.min(last.l, basePrice);
      last.o = Math.max(0.001, Math.min(last.o, basePrice * 1.005));
    }

    TT.candles = candles;
    TT.viewStart = Math.max(0, candles.length - TT.viewCount);
  }
   
  // ============================================================
  // SECTION 12: GENERATE ORDER BOOK
  // ============================================================

  function generateOrderBook() {
    var midPrice = getCoinPrice(TT.coin);
    if (midPrice <= 0) midPrice = 100;

    var step = midPrice * 0.0002; // 0.02% step
    var bids = [];
    var asks = [];

    for (var i = 0; i < 20; i++) {
      var bidPrice = midPrice - step * (i + 1) * (0.9 + Math.random() * 0.2);
      var askPrice = midPrice + step * (i + 1) * (0.9 + Math.random() * 0.2);
      var bidAmt = (0.5 + Math.random() * 2) * (1 - i / 25);
      var askAmt = (0.5 + Math.random() * 2) * (1 - i / 25);
      bids.push({ price: bidPrice, amount: bidAmt, total: bidAmt * bidPrice });
      asks.push({ price: askPrice, amount: askAmt, total: askAmt * askPrice });
    }
    TT.bids = bids;
    TT.asks = asks.reverse(); // asks от высшей к низшей
  }

  function renderOrderBook() {
    var asksEl = document.querySelector('.tt-ob-asks');
    var bidsEl = document.querySelector('.tt-ob-bids');
    if (!asksEl || !bidsEl) return;

    var maxAskTotal = TT.asks.reduce(function (m, a) { return Math.max(m, a.total); }, 0);
    var maxBidTotal = TT.bids.reduce(function (m, b) { return Math.max(m, b.total); }, 0);

    var asksHtml = '';
    TT.asks.forEach(function (a) {
      var barW = (a.total / maxAskTotal) * 100;
      asksHtml += '<div class="tt-ob-row ask" data-price="' + a.price + '">' +
        '<span class="tt-ob-bar" style="width:' + barW + '%"></span>' +
        '<span class="tt-ob-price">' + fmtPrice(a.price) + '</span>' +
        '<span class="tt-ob-amount">' + a.amount.toFixed(4) + '</span>' +
        '<span class="tt-ob-total">' + a.total.toFixed(0) + '</span>' +
      '</div>';
    });
    asksEl.innerHTML = asksHtml;

    var bidsHtml = '';
    TT.bids.forEach(function (b) {
      var barW = (b.total / maxBidTotal) * 100;
      bidsHtml += '<div class="tt-ob-row bid" data-price="' + b.price + '">' +
        '<span class="tt-ob-bar" style="width:' + barW + '%"></span>' +
        '<span class="tt-ob-price">' + fmtPrice(b.price) + '</span>' +
        '<span class="tt-ob-amount">' + b.amount.toFixed(4) + '</span>' +
        '<span class="tt-ob-total">' + b.total.toFixed(0) + '</span>' +
      '</div>';
    });
    bidsEl.innerHTML = bidsHtml;

    // Spread
    var spread = TT.asks.length && TT.bids.length
      ? (TT.asks[TT.asks.length - 1].price - TT.bids[0].price)
      : 0;
    var spreadEl = document.querySelector('.tt-ob-spread-price');
    if (spreadEl) spreadEl.textContent = '$' + spread.toFixed(spread >= 1 ? 2 : 4);
    var spLbl = document.querySelector('.tt-ob-spread-label');
    if (spLbl && TT.bids.length && spread > 0) spLbl.textContent = 'Spread ' + (spread / TT.bids[0].price * 100).toFixed(3) + '%';

    // Click on row → fill limit price
    document.querySelectorAll('.tt-ob-row').forEach(function (row) {
      row.onclick = function () {
        var price = parseFloat(this.getAttribute('data-price'));
        var limitBuy = $('ttBuyLimitPrice');
        if (limitBuy && limitBuy.closest('.tt-limit-price').classList.contains('on')) {
          limitBuy.value = price.toFixed(2);
        }
        var limitSell = $('ttSellLimitPrice');
        if (limitSell && limitSell.closest('.tt-limit-price').classList.contains('on')) {
          limitSell.value = price.toFixed(2);
        }
      };
    });
  }

  // ============================================================
  // SECTION 13: GENERATE RECENT TRADES
  // ============================================================

  function generateRecentTrades() {
    var midPrice = getCoinPrice(TT.coin);
    if (midPrice <= 0) midPrice = 100;
    var trades = [];
    for (var i = 0; i < 30; i++) {
      trades.push({
        price: midPrice * (1 + (Math.random() - 0.5) * 0.001),
        amount: Math.random() * 2 + 0.001,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        time: Date.now() - i * (500 + Math.random() * 2000)
      });
    }
    TT.recentTrades = trades;
  }

    function renderRecentTrades() {
    var el = document.querySelector('.tt-rt-list');
    if (!el) return;
    var html = '';
    TT.recentTrades.slice(0, 30).forEach(function (t) {
      var timeStr = new Date(t.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      var priceStr = fmtPrice(t.price);
      var amountStr = t.amount.toFixed(4);
      var totalStr = '$' + (t.price * t.amount).toFixed(2);

      html += '<div class="tt-rt-row ' + t.side + '">' +
        '<span class="tt-rt-price">' + priceStr + '</span>' +
        '<span class="tt-rt-amount">' + amountStr + '</span>' +
        '<span class="tt-rt-total">' + totalStr + '</span>' +
        '<span class="tt-rt-time">' + timeStr + '</span>' +
      '</div>';
    });
    el.innerHTML = html;
  }

  // ============================================================
  // SECTION 14: CANVAS CHART
  // ============================================================

  var canvas, ctx;

  function resizeCanvas() {
    canvas = $('ttChart');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    drawChart();
  }

  function bindChartMouse() {
    canvas = $('ttChart');
    if (!canvas) return;

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      TT.hoverX = e.clientX - rect.left;
      TT.hoverY = e.clientY - rect.top;
      drawChart();
    });

    canvas.addEventListener('mouseleave', function () {
      TT.hoverX = -1;
      TT.hoverY = -1;
      drawChart();
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.deltaY < 0) TT.viewCount = Math.max(20, TT.viewCount - 5);
      else TT.viewCount = Math.min(TT.maxCandles, TT.viewCount + 5);
      TT.viewStart = Math.max(0, TT.candles.length - TT.viewCount);
      drawChart();
    }, { passive: false });

    var isDragging = false, dragStartX = 0, dragStartView = 0;
    canvas.addEventListener('mousedown', function (e) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartView = TT.viewStart;
    });
    window.addEventListener('mouseup', function () { isDragging = false; });
    window.addEventListener('mousemove', function (e) {
      if (!isDragging || !TT.open) return;
      var dx = e.clientX - dragStartX;
      var cw = canvas.getBoundingClientRect().width;
      var perCandle = cw / TT.viewCount;
      var shift = Math.round(-dx / perCandle);
      var newStart = Math.max(0, Math.min(TT.candles.length - TT.viewCount, dragStartView + shift));
      if (newStart !== TT.viewStart) {
        TT.viewStart = newStart;
        drawChart();
      }
    });
  }

  function drawChart() {
    if (!ctx || !canvas || TT.tvActive) return;
    var w = canvas.getBoundingClientRect().width;
    var h = canvas.getBoundingClientRect().height;

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0e15';
    ctx.fillRect(0, 0, w, h);

    if (!TT.candles.length) return;

    // Visible candles
    var viewCandles = TT.candles.slice(TT.viewStart, TT.viewStart + TT.viewCount);
    if (!viewCandles.length) return;

    // Chart area
    var padTop = 20;
    var padBottom = TT.indicators.vol ? 70 : 30;
    var padLeft = 60;
    var padRight = 80;
    var chartW = w - padLeft - padRight;
    var chartH = h - padTop - padBottom;

    // Price range
    var minPrice = viewCandles.reduce(function (m, c) { return Math.min(m, c.l); }, Infinity);
    var maxPrice = viewCandles.reduce(function (m, c) { return Math.max(m, c.h); }, -Infinity);
    var priceRange = maxPrice - minPrice;
    if (priceRange <= 0) priceRange = 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;
    priceRange = maxPrice - minPrice;

    function priceToY(p) {
      return padTop + chartH * (1 - (p - minPrice) / priceRange);
    }

    function xToIndex(x) {
      return Math.floor((x - padLeft) / (chartW / viewCandles.length));
    }

    // ---- Grid + Y axis ----
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.fillStyle = '#7a8a9e';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;

    for (var i = 0; i <= 5; i++) {
      var y = padTop + (chartH / 5) * i;
      var price = maxPrice - (priceRange / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(fmtPrice(price), padLeft - 8, y + 3);
    }

    // ---- Volume area ----
    var volAreaTop = padTop + chartH + 10;
    var volAreaH = padBottom - 30;
    var maxVol = viewCandles.reduce(function (m, c) { return Math.max(m, c.v); }, 0);

    if (TT.indicators.vol && maxVol > 0) {
      viewCandles.forEach(function (c, i) {
        var x = padLeft + i * (chartW / viewCandles.length);
        var cw = (chartW / viewCandles.length) * 0.7;
        var vh = (c.v / maxVol) * volAreaH;
        ctx.fillStyle = c.c >= c.o ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
        ctx.fillRect(x + cw * 0.15, volAreaTop + volAreaH - vh, cw, vh);
      });
    }

    // ---- Candles ----
    var candleW = (chartW / viewCandles.length) * 0.7;
    var candleGap = (chartW / viewCandles.length) * 0.3;

    viewCandles.forEach(function (c, i) {
      var x = padLeft + i * (chartW / viewCandles.length) + candleGap / 2;
      var yO = priceToY(c.o);
      var yC = priceToY(c.c);
      var yH = priceToY(c.h);
      var yL = priceToY(c.l);
      var isUp = c.c >= c.o;
      var color = isUp ? '#10b981' : '#ef4444';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleW / 2, yH);
      ctx.lineTo(x + candleW / 2, yL);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      var bodyTop = Math.min(yO, yC);
      var bodyH = Math.max(1, Math.abs(yC - yO));
      ctx.fillRect(x, bodyTop, candleW, bodyH);
    });

    // ---- MA(7) ----
    if (TT.indicators.ma) drawMA(viewCandles, 7, '#fbbf24', padLeft, chartW, priceToY);
    if (TT.indicators.ma) drawMA(viewCandles, 25, '#47dcff', padLeft, chartW, priceToY);
    if (TT.indicators.ema) drawEMA(viewCandles, 12, '#a78bfa', padLeft, chartW, priceToY);

    // ---- Current price line ----
    var lastCandle = viewCandles[viewCandles.length - 1];
    var lastY = priceToY(lastCandle.c);
    ctx.strokeStyle = 'rgba(200,255,77,0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, lastY);
    ctx.lineTo(w - padRight, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price badge
    ctx.fillStyle = '#c8ff4d';
    ctx.fillRect(w - padRight + 2, lastY - 9, padRight - 4, 18);
    ctx.fillStyle = '#0a0f04';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fmtPrice(lastCandle.c), w - padRight / 2 - 2, lastY + 3);

    // ---- Crosshair ----
    if (TT.hoverX > padLeft && TT.hoverX < w - padRight && TT.hoverY > padTop && TT.hoverY < padTop + chartH) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(TT.hoverX, padTop);
      ctx.lineTo(TT.hoverX, padTop + chartH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padLeft, TT.hoverY);
      ctx.lineTo(w - padRight, TT.hoverY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label at crosshair
      var hoverPrice = maxPrice - (TT.hoverY - padTop) / chartH * priceRange;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(w - padRight + 2, TT.hoverY - 9, padRight - 4, 18);
      ctx.fillStyle = '#0a0e15';
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtPrice(hoverPrice), w - padRight / 2 - 2, TT.hoverY + 3);
    }

    // ---- X axis time labels ----
    ctx.fillStyle = '#7a8a9e';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    var labelCount = 6;
    for (var k = 0; k < labelCount; k++) {
      var idx = Math.floor((viewCandles.length / (labelCount - 1)) * k);
      if (idx >= viewCandles.length) idx = viewCandles.length - 1;
      var c = viewCandles[idx];
      var x = padLeft + idx * (chartW / viewCandles.length) + candleW / 2;
      var d = new Date(c.t);
      var label = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
      if (TT.timeframe === '1d') {
        label = d.getDate() + '/' + (d.getMonth() + 1);
      }
      ctx.fillText(label, x, padTop + chartH + padBottom - 8);
    }
  }

  function drawMA(candles, period, color, padLeft, chartW, priceToY) {
    if (candles.length < period) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    var started = false;
    for (var i = period - 1; i < candles.length; i++) {
      var sum = 0;
      for (var j = i - period + 1; j <= i; j++) sum += candles[j].c;
      var ma = sum / period;
      var x = padLeft + i * (chartW / candles.length) + (chartW / candles.length) / 2;
      var y = priceToY(ma);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawEMA(candles, period, color, padLeft, chartW, priceToY) {
    if (candles.length < period) return;
    var k = 2 / (period + 1);
    var ema = candles[0].c;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < candles.length; i++) {
      ema = candles[i].c * k + ema * (1 - k);
      var x = padLeft + i * (chartW / candles.length) + (chartW / candles.length) / 2;
      var y = priceToY(ema);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ============================================================
  // SECTION 15: SUBMIT TRADES
  // ============================================================

  async function submitBuy() {
    var amount = parseFloat(($('ttBuyAmount') || {}).value) || 0;
    var price = getCoinPrice(TT.coin);
    if (amount < 10) { ttErr('Minimum purchase is $10'); return; }
    if (amount > getUsdBalance()) { ttErr('Insufficient balance'); return; }
    if (price <= 0) { ttErr('Price unavailable'); return; }

    var limitWrap = document.querySelector('.tt-form[data-form="buy"] .tt-limit-price');
    var isLimit = limitWrap && limitWrap.classList.contains('on');
    var limitPrice = parseFloat(($('ttBuyLimitPrice') || {}).value) || price;

    if (TT.busy) return;
    if (!(await ttConfirm({ side: 'buy', coin: TT.coin, amount: amount, price: isLimit ? limitPrice : price, limit: isLimit }))) return;
    TT.busy = true;
    try { await executeTrade('buy', TT.coin, amount, isLimit ? limitPrice : price, isLimit ? 'limit' : 'market'); }
    catch (e) {} finally { TT.busy = false; }
  }

  async function submitSell() {
    var amount = parseFloat(($('ttSellAmount') || {}).value) || 0;
    var price = getCoinPrice(TT.coin);
    if (amount <= 0) { ttErr('Enter amount'); return; }
    if (amount > getCoinBalance(TT.coin)) { ttErr('Insufficient ' + TT.coin); return; }
    if (price <= 0) { ttErr('Price unavailable'); return; }

    var limitWrap = document.querySelector('.tt-form[data-form="sell"] .tt-limit-price');
    var isLimit = limitWrap && limitWrap.classList.contains('on');
    var limitPrice = parseFloat(($('ttSellLimitPrice') || {}).value) || price;

    if (TT.busy) return;
    if (!(await ttConfirm({ side: 'sell', coin: TT.coin, amount: amount, price: isLimit ? limitPrice : price, limit: isLimit }))) return;
    TT.busy = true;
    try { await executeTrade('sell', TT.coin, amount, isLimit ? limitPrice : price, isLimit ? 'limit' : 'market'); }
    catch (e) {} finally { TT.busy = false; }
  }

  async function submitConvert() {
    var amount = parseFloat(($('ttConvertAmount') || {}).value) || 0;
    var fromCoin = ($('ttConvertFrom') || {}).value;
    var toCoin = ($('ttConvertTo') || {}).value;
    if (fromCoin === toCoin) { ttErr('Choose different coins'); return; }
    if (amount <= 0) { ttErr('Enter amount'); return; }
    if (amount > getCoinBalance(fromCoin)) { ttErr('Insufficient ' + fromCoin); return; }

    var fromPrice = getCoinPrice(fromCoin);
    var toPrice = getCoinPrice(toCoin);
    if (fromPrice <= 0 || toPrice <= 0) { ttErr('Price unavailable'); return; }
    var rate = fromPrice / toPrice;

    var token = localStorage.getItem('session_token');
    if (!token) { ttErr('Not authenticated'); return; }

    if (TT.busy) return;
    if (!(await ttConfirm({ side: 'convert', from: fromCoin, to: toCoin, amount: amount, rate: rate }))) return;
    TT.busy = true;
    try {
      var res = await fetch(window.WORKER_URL + '?action=trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          clientTradeId: 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          type: 'convert',
          symbol: toCoin,
          amount: amount,
          price: rate,
          orderType: 'market',
          sourceSymbol: fromCoin,
          targetSymbol: toCoin
        })
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Convert failed');

      // Update local state
      if (window.st) {
        window.st.usd = data.usd;
        window.st.btc = data.btc;
        window.st.eth = data.eth;
        if (data.usdt !== undefined) window.st.usdt = data.usdt;
        if (data.sol !== undefined) window.st.sol = data.sol;
        if (data.bnb !== undefined) window.st.bnb = data.bnb;
      }

      if (typeof window.render === 'function') window.render();
      if (typeof window.renderExchangeDash === 'function') window.renderExchangeDash();
      if (typeof window.playChime === 'function') window.playChime();
      if (typeof window.addNotification === 'function') {
        window.addNotification('Converted ' + amount.toFixed(6) + ' ' + fromCoin + ' → ' + toCoin, '🔄');
      }

      selectCoin(TT.coin); // refresh
      closeTradeTerminalFull();

      if (typeof window.toast === 'function') {
        window.toast('✅ Converted ' + amount.toFixed(6) + ' ' + fromCoin + ' → ' + toCoin);
      }
    } catch (e) {
      ttErr('Convert failed: ' + e.message);
    } finally { TT.busy = false; }
  }

    /**
   * Execute a market/limit trade via Worker ?action=trade.
   * This is the ONLY function that sends trades — no legacy overrides.
   */
  async function executeTrade(type, symbol, amount, price, orderType) {
    var token = localStorage.getItem('session_token');
    if (!token) { ttErr('Not authenticated'); return; }

    var clientTradeId = 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    try {
      var res = await fetch(window.WORKER_URL + '?action=trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          clientTradeId: clientTradeId,
          type: type,
          symbol: symbol,
          amount: amount,
          price: price,
          orderType: orderType || 'market',
          limitPrice: orderType === 'limit' ? price : null
        })
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Trade failed');

      // Update local state
      if (window.st) {
        window.st.usd = data.usd;
        window.st.btc = data.btc;
        window.st.eth = data.eth;
        if (data.usdt !== undefined) window.st.usdt = data.usdt;
        if (data.sol !== undefined) window.st.sol = data.sol;
        if (data.bnb !== undefined) window.st.bnb = data.bnb;
      }

      // Re-render
      if (typeof window.render === 'function') window.render();
      if (typeof window.renderExchangeDash === 'function') window.renderExchangeDash();
      if (typeof window.playChime === 'function') window.playChime();

      // v1.1: the server executes market orders at ITS price — show that one, not the client's guess
      var execPrice = (data.trade && Number(data.trade.price) > 0) ? Number(data.trade.price) : price;
      var action = type === 'buy' ? 'Bought' : 'Sold';
      var amountStr = type === 'buy'
        ? (amount / execPrice).toFixed(8) + ' ' + symbol
        : amount.toFixed(8) + ' ' + symbol;
      if (typeof window.addNotification === 'function') {
        window.addNotification(action + ' ' + amountStr + ' @ $' + execPrice.toFixed(2), type === 'buy' ? '📈' : '📉');
      }

      // Record in history
      if (typeof window.recordTradeInHistory === 'function') {
               // 🛡️ SAFETY NET: Ensure trade lands in state.orders even if Worker
      // hasn't been updated to do it. This guarantees Order History works.
      if (window.st) {
        if (!Array.isArray(window.st.orders)) window.st.orders = [];
        var orderId = data.trade && data.trade.id ? data.trade.id : ('trade_' + Date.now());
        var already = window.st.orders.some(function (o) { return o.id === orderId; });
        if (!already) {
          window.st.orders.unshift({
            id: orderId,
            ts: Date.now(),
            type: type,
            symbol: symbol,
            amount: Number(amount),
            price: execPrice,
            total: type === 'buy' ? Number(amount) : Number(amount) * execPrice,
            orderType: orderType || 'market',
            status: 'filled',
            filled: type === 'buy' ? Number(amount) / execPrice : Number(amount),
            filledAt: Date.now()
          });
          if (window.st.orders.length > 500) window.st.orders.length = 500;
        }

        // Save to server (best-effort)
        if (typeof window.saveToServer === 'function') {
          try { window.saveToServer(); } catch (e) {}
        }
      }
        window.recordTradeInHistory({
          type: type,
          symbol: symbol,
          amount: amount,
          price: price
        });
      }

      // Refresh order history + open orders immediately
      if (typeof window.loadOrderHistory === 'function') window.loadOrderHistory();
      if (typeof window.refreshOpenOrders === 'function') window.refreshOpenOrders();

      if (typeof window.toast === 'function') {
        window.toast('✅ ' + action + ' ' + amountStr);
      }

      // For market orders: keep terminal OPEN (don't close)
      // The user can see their trade appear in Order History instantly.
      return data;

    } catch (e) {
      ttErr('Trade failed: ' + e.message);
      throw e;
    }
  }
  // ============================================================
  // SECTION 16: LIVE UPDATES
  // ============================================================

  function startLiveUpdates() {
    // Order book + recent trades every 2 sec
    var id1 = setInterval(function () {
      if (!TT.open) return;
      if (!liveFresh('depth')) { generateOrderBook(); renderOrderBook(); }
      if (liveFresh('trade')) return;
      // Add fake trade to recent list (only when there is no live feed)
      var mid = getCoinPrice(TT.coin);
      TT.recentTrades.unshift({
        price: mid * (1 + (Math.random() - 0.5) * 0.001),
        amount: Math.random() * 0.5,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        time: Date.now()
      });
      if (TT.recentTrades.length > 30) TT.recentTrades.length = 30;
      renderRecentTrades();
    }, 2000);

    // Full update every 5 sec
    var id2 = setInterval(function () {
      if (!TT.open) return;
      updateHeader();
      updatePreview();
      drawChart();
    }, 5000);

    TT.intervals.push(id1, id2);
  }

  // ============================================================
  // SECTION 17: MASK CLICK
  // ============================================================

  function bindMaskClick() {
    var term = $('tradeTerminal');
    if (term) {
      term.addEventListener('click', function (e) {
        // Click outside panels → close
        if (e.target === term) closeTradeTerminalFull();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && TT.open) closeTradeTerminalFull();
    });
  }

  // ============================================================
  // SECTION 18: PUBLIC API
  // ============================================================

  window.TT = TT;
  // ============================================================
  // SECTION 19: ORDER HISTORY
  // ============================================================

  var _ohCurrentFilter = 'all';

  /**
   * Fetch order history from Worker and render.
   */
  async function loadOrderHistory(filter) {
  var token = localStorage.getItem('session_token');
  if (!token) return;
  _ohCurrentFilter = filter || _ohCurrentFilter;

  var serverOrders = [];

  // Try server first
  try {
    var res = await fetch(window.WORKER_URL + '?action=getOrders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, filter: _ohCurrentFilter })
    });
    var data = await res.json();
    if (data.ok) serverOrders = data.orders || [];
  } catch (e) {
    console.warn('[TT] Order history fetch failed:', e);
  }

  // Merge with local state.orders (in case Worker hasn't been updated)
  var localOrders = (window.st && window.st.orders) || [];
  var byId = {};
  serverOrders.forEach(function (o) { byId[o.id] = o; });
  localOrders.forEach(function (o) { if (!byId[o.id]) byId[o.id] = o; });

  var merged = Object.values(byId);

  // Apply filter
  if (_ohCurrentFilter && _ohCurrentFilter !== 'all') {
    merged = merged.filter(function (o) { return o.status === _ohCurrentFilter; });
  }

  // Sort by timestamp desc
  merged.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

  renderOrderHistory(merged.slice(0, 100));
}
  /**
   * Render the order history list.
   */
    function renderOrderHistory(orders) {
    var el = document.querySelector('.tt-oh-list');
    if (!el) return;

    var countEl = document.getElementById('ttCountHistory');
    if (countEl) {
      countEl.textContent = orders.length;
      countEl.dataset.empty = orders.length === 0 ? '1' : '0';
    }

    if (!orders.length) {
      el.innerHTML = '<div class="tt-empty">No orders yet</div>';
      return;
    }

    var html = '';
    orders.forEach(function (o) {
      var statusIcon, statusClass;
      if (o.status === 'filled') { statusIcon = '✓'; statusClass = 'filled'; }
      else if (o.status === 'open') { statusIcon = '⏳'; statusClass = 'open'; }
      else if (o.status === 'cancelled') { statusIcon = '✗'; statusClass = 'cancelled'; }
      else { statusIcon = '•'; statusClass = 'cancelled'; }

      var typeLabel = o.type === 'buy' ? 'BUY' : (o.type === 'sell' ? 'SELL' : 'CONV');
      var typeClass = o.type === 'buy' ? 'buy' : 'sell';

      var amtStr = (o.type === 'buy')
        ? (Number(o.amount) / Number(o.price)).toFixed(6) + ' ' + o.symbol
        : Number(o.amount).toFixed(6) + ' ' + o.symbol;

      var priceStr = '$' + Number(o.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      var totalStr = '$' + Number(o.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      var t = new Date(o.ts);
      var now = Date.now();
      var diff = now - o.ts;
      var timeStr;
      if (diff < 60000) timeStr = 'Just now';
      else if (diff < 3600000) timeStr = Math.floor(diff / 60000) + 'm';
      else if (diff < 86400000) timeStr = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      else timeStr = t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      html += '<div class="tt-oh-row" data-order-id="' + o.id + '">' +
        '<span class="tt-oh-status-icon ' + statusClass + '">' + statusIcon + '</span>' +
        '<span class="tt-oh-type ' + typeClass + '">' + typeLabel + '</span>' +
        '<span class="tt-oh-symbol">' + o.symbol + '</span>' +
        '<span class="tt-oh-amount">' + amtStr + '</span>' +
        '<span class="tt-oh-price">' + priceStr + '</span>' +
        '<span class="tt-oh-total">' + totalStr + '</span>' +
        '<span class="tt-oh-time">' + timeStr + '</span>' +
        '<span></span>' +
      '</div>';
    });
    el.innerHTML = html;
  }

  /**
   * Cancel an open order.
   */
  async function cancelOrder(orderId) {
    var token = localStorage.getItem('session_token');
    if (!token) return;

    try {
      var res = await fetch(window.WORKER_URL + '?action=cancelOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, orderId: orderId })
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Cancel failed');

      if (typeof window.toast === 'function') window.toast('✅ Order cancelled');
      loadOrderHistory();
      if (typeof window.refreshOpenOrders === 'function') window.refreshOpenOrders();
    } catch (e) {
      if (typeof window.toast === 'function') window.toast('❌ ' + e.message);
    }
  }

  /**
   * Bind filter buttons.
   */
   function bindOrderHistoryFilters() {
    // Bottom tabs: Order History / Open Orders / Recent Trades
    document.querySelectorAll('.tt-bottom-tabs button').forEach(function (btn) {
      if (btn._bound) return;
      btn._bound = true;
      btn.onclick = function () {
        var tab = this.getAttribute('data-tab');
        document.querySelectorAll('.tt-bottom-tabs button').forEach(function (b) { b.classList.remove('on'); });
        this.classList.add('on');
        document.querySelectorAll('.tt-tab-content').forEach(function (c) {
          c.classList.toggle('on', c.getAttribute('data-tab-content') === tab);
        });

        // Show/hide filters (only on history tab)
        var filters = document.getElementById('ttOhFilters');
        if (filters) filters.classList.toggle('hidden', tab !== 'history');

        // Load data for this tab
        if (tab === 'history') {
          loadOrderHistory();
        } else if (tab === 'open') {
          if (typeof window.refreshOpenOrders === 'function') window.refreshOpenOrders();
          renderOpenOrders();
        } else if (tab === 'trades') {
          renderRecentTrades();
        }
      };
    });

    // Filters: All / Filled / Open / Cancelled
    document.querySelectorAll('.tt-bottom-filters button').forEach(function (btn) {
      if (btn._bound) return;
      btn._bound = true;
      btn.onclick = function () {
        document.querySelectorAll('.tt-bottom-filters button').forEach(function (b) { b.classList.remove('on'); });
        this.classList.add('on');
        var filter = this.getAttribute('data-filter');
        loadOrderHistory(filter);
      };
    });
  }

  /**
   * Render Open Orders list from window.st.openOrders.
   */
  function renderOpenOrders() {
    var el = document.querySelector('.tt-oo-list');
    if (!el) return;

    var orders = (window.st && window.st.openOrders) || [];
    var openOrders = orders.filter(function (o) { return o.status === 'open'; });

    // Update tab count
    var countEl = document.getElementById('ttCountOpen');
    if (countEl) {
      countEl.textContent = openOrders.length;
      countEl.dataset.empty = openOrders.length === 0 ? '1' : '0';
    }

    if (!openOrders.length) {
      el.innerHTML = '<div class="tt-empty">No open orders</div>';
      return;
    }

    var html = '';
    openOrders.forEach(function (o) {
      var typeLabel = o.type === 'buy' ? 'BUY' : 'SELL';
      var typeClass = o.type === 'buy' ? 'buy' : 'sell';
      var amtStr = (o.type === 'buy' ? (Number(o.amount) / Number(o.price)) : Number(o.amount)).toFixed(6) + ' ' + o.symbol;
      var priceStr = '$' + Number(o.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      var oTotal = Number(o.total) || (o.type === 'buy' ? Number(o.amount) : Number(o.amount) * Number(o.price));
      var totalStr = '$' + oTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      var timeStr = new Date(o.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      html += '<div class="tt-oo-row" data-order-id="' + o.id + '">' +
        '<span class="tt-oh-status-icon open">⏳</span>' +
        '<span class="tt-oh-type ' + typeClass + '">' + typeLabel + '</span>' +
        '<span class="tt-oh-symbol">' + o.symbol + '</span>' +
        '<span class="tt-oh-amount">' + amtStr + '</span>' +
        '<span class="tt-oh-price">' + priceStr + '</span>' +
        '<span class="tt-oh-total">' + totalStr + '</span>' +
        '<span class="tt-oh-time">' + timeStr + '</span>' +
        '<span><button class="tt-oo-cancel" data-order-id="' + o.id + '">Cancel</button></span>' +
      '</div>';
    });
    el.innerHTML = html;

    el.querySelectorAll('.tt-oo-cancel').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var orderId = this.getAttribute('data-order-id');
        if (typeof cancelOrder === 'function') cancelOrder(orderId);
      };
    });
  }

  /**
   * Refresh order history while terminal is open.
   */
  function startOrderHistoryRefresh() {
    setInterval(function () {
      if (window.TT && window.TT.open) {
        loadOrderHistory();
      }
    }, 5000);
  }

  // Expose for external use
  window.loadOrderHistory = loadOrderHistory;
  window.renderOrderHistory = renderOrderHistory;
  window.renderOpenOrders = renderOpenOrders;
  window.cancelOrder = cancelOrder;

  // Hook into terminal open
  var _origOpenTTFull = window.openTradeTerminalFull;
  if (typeof _origOpenTTFull === 'function') {
    window.openTradeTerminalFull = function () {
      _origOpenTTFull.apply(this, arguments);
      setTimeout(function () {
        bindOrderHistoryFilters();
        loadOrderHistory('all');
      }, 300);
    };
  }

  // Start periodic refresh
  startOrderHistoryRefresh();

  // Bind filters on load
  setTimeout(bindOrderHistoryFilters, 1000);
  // ============================================================
  // SECTION 20 (v2.0): LIVE MARKET DATA + TRADINGVIEW + CONFIRM + UX
  // ============================================================
  //  • Prices / 24h stats / order book / trades — Binance public market data
  //    (WebSocket, with automatic fallback to HTTPS polling).
  //    If both are unreachable the old built-in simulated data keeps working.
  //  • Chart — TradingView (falls back to the built-in canvas chart if it cannot load).
  //  • Orders are still executed by the Worker at ITS price (unchanged).
  // ============================================================

  var TV = { n: 0, loading: false, cbs: [], watch: 0 };
  var _liveTradesTimer = 0;

  function noop() {}

  function liveFresh(kind) {
    var t = kind === 'depth' ? LV.depthAt : (kind === 'trade' ? LV.tradeAt : LV.tickerAt);
    return LV.coin === TT.coin && !!t && (Date.now() - t) < (kind === 'trade' ? 20000 : 6000);
  }

  function liveStop() {
    clearTimeout(LV.retryT);
    clearInterval(LV.pollT);
    LV.pollT = 0;
    var ws = LV.ws;
    LV.ws = null;
    if (ws) { try { ws.onclose = null; ws.onmessage = null; ws.close(); } catch (e) {} }
  }

  function liveSwitch(coin) {
    liveStop();
    LV.coin = coin;
    LV.tickerAt = 0; LV.depthAt = 0; LV.tradeAt = 0; LV.stats = null; LV.tradesLive = false; LV.fail = 0;
    var s = BIN[coin];
    if (!s || !TT.open) return;            // USDT: stays at ~1.00 with the built-in data
    liveRest(coin);                        // instant snapshot, the socket takes over right after
    liveOpen(coin, s);
  }

  function liveOpen(coin, s) {
    var url = 'wss://stream.binance.com:9443/stream?streams=' + s + '@ticker/' + s + '@depth20@1000ms/' + s + '@trade';
    var ws;
    try { ws = new WebSocket(url); } catch (e) { livePollStart(coin); return; }
    LV.ws = ws;
    var opened = false;
    ws.onopen = function () { opened = true; LV.fail = 0; clearInterval(LV.pollT); LV.pollT = 0; };
    ws.onmessage = function (ev) {
      if (LV.ws !== ws || TT.coin !== coin) return;
      try { onLive(JSON.parse(ev.data)); } catch (e) {}
    };
    ws.onerror = noop;
    ws.onclose = function () {
      if (LV.ws !== ws) return;
      LV.ws = null;
      if (!TT.open || TT.coin !== coin) return;
      LV.fail = (LV.fail || 0) + 1;
      if (LV.fail >= 2) livePollStart(coin);                 // blocked or flaky: poll over HTTPS meanwhile
      clearTimeout(LV.retryT);
      LV.retryT = setTimeout(function () { if (TT.open && TT.coin === coin && !LV.ws) liveOpen(coin, s); }, Math.min(15000, 1500 * LV.fail));
    };
    setTimeout(function () { if (LV.ws === ws && !opened) livePollStart(coin); }, 6000);
  }

  function livePollStart(coin) {
    if (LV.pollT || !TT.open) return;
    LV.pollT = setInterval(function () {
      if (!TT.open || TT.coin !== coin) { clearInterval(LV.pollT); LV.pollT = 0; return; }
      liveRest(coin);
    }, 3000);
  }

  function liveRest(coin) {
    var sym = (BIN[coin] || '').toUpperCase();
    if (!sym) return;
    var base = 'https://api.binance.com/api/v3/';
    function get(path) { return fetch(base + path).then(function (r) { return r.json(); }); }
    get('ticker/24hr?symbol=' + sym).then(function (d) {
      if (TT.coin !== coin || !d || !d.lastPrice) return;
      onLive({ stream: 'rest@ticker', data: { c: d.lastPrice, P: d.priceChangePercent, h: d.highPrice, l: d.lowPrice, v: d.volume } });
    }).catch(noop);
    get('depth?symbol=' + sym + '&limit=20').then(function (d) {
      if (TT.coin !== coin || !d || !d.bids) return;
      onLive({ stream: 'rest@depth20', data: { bids: d.bids, asks: d.asks } });
    }).catch(noop);
    get('trades?symbol=' + sym + '&limit=30').then(function (d) {
      if (TT.coin !== coin || !Array.isArray(d)) return;
      LV.tradesLive = true;
      TT.recentTrades = d.slice().reverse().map(function (t) {
        return { price: +t.price, amount: +t.qty, side: t.isBuyerMaker ? 'sell' : 'buy', time: t.time };
      });
      LV.tradeAt = Date.now();
      scheduleTrades();
    }).catch(noop);
  }

  function onLive(msg) {
    var d = msg && msg.data, st = (msg && msg.stream) || '';
    if (!d) return;
    if (st.indexOf('@ticker') > 0) liveTicker(d);
    else if (st.indexOf('@depth') > 0) liveDepth(d);
    else if (st.indexOf('@trade') > 0) liveTrade(d);
  }

  function liveTicker(d) {
    var p = parseFloat(d.c);
    if (!(p > 0)) return;
    var prev = LV.price[LV.coin];
    LV.price[LV.coin] = p;
    LV.priceAt[LV.coin] = Date.now();
    LV.tickerAt = Date.now();
    LV.stats = { pct: parseFloat(d.P) || 0, high: parseFloat(d.h) || p, low: parseFloat(d.l) || p, vol: parseFloat(d.v) || 0 };
    TT.lastPrice = p;
    paintHeader(prev);
    updatePreview();
  }

  function paintHeader(prev) {
    var p = LV.price[LV.coin], s = LV.stats;
    if (!p || !s) return;
    var priceEl = document.querySelector('.tt-price');
    if (priceEl) {
      var txt = fmtPrice(p);
      if (priceEl.textContent !== txt) {
        priceEl.textContent = txt;
        if (prev && prev !== p) {
          priceEl.classList.remove('ncx-up', 'ncx-dn');
          void priceEl.offsetWidth;
          priceEl.classList.add(p > prev ? 'ncx-up' : 'ncx-dn');
        }
      }
    }
    var changeEl = document.querySelector('.tt-change');
    if (changeEl) {
      var ct = (s.pct >= 0 ? '+' : '') + s.pct.toFixed(2) + '%';
      if (changeEl.textContent !== ct) changeEl.textContent = ct;
      changeEl.classList.toggle('up', s.pct >= 0);
      changeEl.classList.toggle('down', s.pct < 0);
    }
    var statsEl = document.querySelector('.tt-stats');
    if (statsEl) {
      var html = '<div>24h High:<b>' + fmtPrice(s.high) + '</b></div>' +
                 '<div>24h Low:<b>' + fmtPrice(s.low) + '</b></div>' +
                 '<div>24h Vol:<b>' + fmtVolume(s.vol) + ' ' + TT.coin + '</b></div>';
      if (statsEl.__ncx !== html) { statsEl.innerHTML = html; statsEl.__ncx = html; }
    }
  }

  function liveHeader() {
    if (liveFresh('ticker') && LV.stats) { paintHeader(); return true; }
    return false;
  }

  function liveDepth(d) {
    var b = d.bids || d.b, a = d.asks || d.a;
    if (!b || !a || !b.length || !a.length) return;
    function row(x) { var pr = parseFloat(x[0]), q = parseFloat(x[1]); return { price: pr, amount: q, total: pr * q }; }
    TT.bids = b.slice(0, 20).map(row);
    TT.asks = a.slice(0, 20).map(row).reverse();      // best ask last, like the built-in book
    LV.depthAt = Date.now();
    renderOrderBook();
  }

  function liveTrade(d) {
    if (!LV.tradesLive) { TT.recentTrades = []; LV.tradesLive = true; }
    TT.recentTrades.unshift({ price: parseFloat(d.p), amount: parseFloat(d.q), side: d.m ? 'sell' : 'buy', time: d.T || Date.now() });
    if (TT.recentTrades.length > 30) TT.recentTrades.length = 30;
    LV.tradeAt = Date.now();
    scheduleTrades();
  }

  function scheduleTrades() {
    if (_liveTradesTimer) return;
    _liveTradesTimer = setTimeout(function () { _liveTradesTimer = 0; renderRecentTrades(); }, 400);
  }

  // ---------- TradingView ----------

  function tvScript(cb) {
    if (window.TradingView && window.TradingView.widget) { cb(true); return; }
    TV.cbs.push(cb);
    if (TV.loading) return;
    TV.loading = true;
    var done = false;
    function fin(ok) {
      if (done) return; done = true; TV.loading = false;
      var l = TV.cbs.slice(); TV.cbs = [];
      l.forEach(function (f) { try { f(ok && !!(window.TradingView && window.TradingView.widget)); } catch (e) {} });
    }
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload = function () { fin(true); };
    s.onerror = function () { fin(false); };
    document.head.appendChild(s);
    setTimeout(function () { fin(false); }, 10000);
  }

  function tvLoad() {
    var panel = document.querySelector('.tt-chart-panel');
    if (!panel || !TT.open || TT.tvFailed) return;
    var host = $('ncTv');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ncTv';
      panel.appendChild(host);
    }
    var coin = TT.coin;
    host.innerHTML = '<div class="ncx-tv-load">Loading chart…</div>';
    if (!(window.TradingView && window.TradingView.widget)) {
      tvScript(function (ok) { if (!ok) tvFail(); else if (TT.open && TT.coin === coin) tvLoad(); });
      TT.tvActive = true; panel.classList.add('ncx-tv-on');
      return;
    }
    var id = 'ncTvInner' + (++TV.n);
    var inner = document.createElement('div');
    inner.id = id;
    inner.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0';
    host.innerHTML = '';
    host.appendChild(inner);
    var ivMap = { '1h': '60', '4h': '240', '1d': 'D' };
    try {
      new window.TradingView.widget({
        autosize: true,
        symbol: TV_SYM[coin] || 'BINANCE:BTCUSDT',
        interval: ivMap[TT.timeframe] || '60',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0a0e15',
        backgroundColor: '#0a0e15',
        gridColor: 'rgba(255,255,255,0.04)',
        enable_publishing: false,
        allow_symbol_change: false,
        save_image: false,
        hide_side_toolbar: window.innerWidth < 700,
        withdateranges: true,
        studies: ['Volume@tv-basicstudies'],
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
        },
        container_id: id
      });
    } catch (e) { tvFail(); return; }
    TT.tvActive = true;
    panel.classList.add('ncx-tv-on');
    clearTimeout(TV.watch);
    TV.watch = setTimeout(function () { if (TT.open && TT.tvActive && !host.querySelector('iframe')) tvFail(); }, 12000);
  }

  function tvFail() {
    TT.tvFailed = true;
    TT.tvActive = false;
    var host = $('ncTv');
    if (host && host.parentNode) host.parentNode.removeChild(host);
    var panel = document.querySelector('.tt-chart-panel');
    if (panel) panel.classList.remove('ncx-tv-on');
    resizeCanvas();
  }

  function tvDestroy() {
    clearTimeout(TV.watch);
    var host = $('ncTv');
    if (host) host.innerHTML = '';
    TT.tvActive = false;
  }

  // ---------- notifications, order confirmation, hints ----------

  function ttToast(msg, isErr) {
    var el = $('ncxToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ncxToast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'ncx-toast ' + (isErr ? 'err' : 'ok') + ' show';
    clearTimeout(el.__t);
    el.__t = setTimeout(function () { el.classList.remove('show'); }, isErr ? 4200 : 2600);
  }

  function ttErr(msg) { ttToast(String(msg), true); }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function ttConfirm(o) {
    return new Promise(function (resolve) {
      var old = $('ncxConfirm');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var rows = [], title, cls;
      if (o.side === 'buy') {
        title = 'Confirm purchase'; cls = 'buy';
        rows = [
          ['Order', o.limit ? 'Limit buy' : 'Market buy'],
          ['Pair', o.coin + '/USD'],
          ['You pay', fmtMoney(o.amount)],
          ['Price', (o.limit ? '' : '≈ ') + fmtPrice(o.price)],
          ['You receive', '≈ ' + fmtCrypto(o.amount / o.price, o.coin) + ' ' + o.coin]
        ];
      } else if (o.side === 'sell') {
        title = 'Confirm sale'; cls = 'sell';
        rows = [
          ['Order', o.limit ? 'Limit sell' : 'Market sell'],
          ['Pair', o.coin + '/USD'],
          ['You sell', fmtCrypto(o.amount, o.coin) + ' ' + o.coin],
          ['Price', (o.limit ? '' : '≈ ') + fmtPrice(o.price)],
          ['You receive', '≈ ' + fmtMoney(o.amount * o.price)]
        ];
      } else {
        title = 'Confirm conversion'; cls = 'convert';
        rows = [
          ['You convert', fmtCrypto(o.amount, o.from) + ' ' + o.from],
          ['Rate', '1 ' + o.from + ' = ' + Number(o.rate).toFixed(8) + ' ' + o.to],
          ['You receive', '≈ ' + (o.amount * o.rate).toFixed(8) + ' ' + o.to],
          ['Fee', 'Free']
        ];
      }
      var ov = document.createElement('div');
      ov.id = 'ncxConfirm';
      ov.className = 'ncx-ov';
      ov.innerHTML =
        '<div class="ncx-box ' + cls + '" role="dialog" aria-modal="true">' +
          '<div class="ncx-title">' + title + '</div>' +
          rows.map(function (r) { return '<div class="ncx-row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') +
          (o.limit ? '' : '<div class="ncx-note">Market orders are filled at the live exchange price at the moment of execution.</div>') +
          '<div class="ncx-actions"><button type="button" class="ncx-cancel">Cancel</button><button type="button" class="ncx-ok ' + cls + '">Confirm</button></div>' +
        '</div>';
      document.body.appendChild(ov);
      var okBtn = ov.querySelector('.ncx-ok');
      function close(v) {
        document.removeEventListener('keydown', onKey, true);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(false); }
        else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); close(true); }
      }
      document.addEventListener('keydown', onKey, true);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(false); });
      ov.querySelector('.ncx-cancel').onclick = function () { close(false); };
      okBtn.onclick = function () { close(true); };
      setTimeout(function () { try { okBtn.focus(); } catch (e) {} }, 30);
    });
  }

  function ttValidate() {
    var msgs = { buy: '', sell: '', convert: '' };
    var buy = parseFloat(($('ttBuyAmount') || {}).value) || 0;
    if (buy > 0 && buy < 10) msgs.buy = 'Minimum purchase is $10';
    else if (buy > getUsdBalance() + 1e-9) msgs.buy = 'Insufficient USD balance';
    var sell = parseFloat(($('ttSellAmount') || {}).value) || 0;
    if (sell > getCoinBalance(TT.coin) + 1e-12) msgs.sell = 'Insufficient ' + TT.coin + ' balance';
    var from = ($('ttConvertFrom') || {}).value, to = ($('ttConvertTo') || {}).value;
    var conv = parseFloat(($('ttConvertAmount') || {}).value) || 0;
    if (from && to && from === to) msgs.convert = 'Choose different coins';
    else if (conv > 0 && from && conv > getCoinBalance(from) + 1e-12) msgs.convert = 'Insufficient ' + from + ' balance';
    ['buy', 'sell', 'convert'].forEach(function (k) {
      var btn = $(k === 'buy' ? 'ttBuySubmit' : (k === 'sell' ? 'ttSellSubmit' : 'ttConvertSubmit'));
      if (!btn) return;
      var h = btn.parentNode.querySelector('.ncx-hint[data-for="' + k + '"]');
      if (!h) {
        h = document.createElement('div');
        h.className = 'ncx-hint';
        h.setAttribute('data-for', k);
        btn.parentNode.insertBefore(h, btn.nextSibling);
      }
      if (h.textContent !== msgs[k]) h.textContent = msgs[k];
      btn.classList.toggle('ncx-dim', !!msgs[k]);
    });
  }

  function ncxStyles() {
    if ($('ncxStyles')) return;
    var st = document.createElement('style');
    st.id = 'ncxStyles';
    st.textContent =
      '.tt-chart-panel{position:relative}' +
      '#ncTv{position:absolute;left:0;right:0;top:0;bottom:0;z-index:3;background:#0a0e15;border-radius:inherit;overflow:hidden}' +
      '.tt-chart-panel.ncx-tv-on #ttChart{visibility:hidden}' +
      '.tt-chart-panel.ncx-tv-on .tt-chart-toolbar{display:none!important}' +
      '.ncx-tv-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#7a8a9e;font:600 13px ui-monospace,monospace}' +
      '@media(max-width:900px){.tt-chart-panel{min-height:380px}}' +
      '.tt-price{transition:color .6s}.tt-price.ncx-up{color:#10b981;transition:none}.tt-price.ncx-dn{color:#ef4444;transition:none}' +
      '.ncx-hint{min-height:0;margin-top:8px;font:600 12px -apple-system,Segoe UI,Roboto,sans-serif;color:#f87171;text-align:center}.ncx-hint:empty{display:none}' +
      '.tt-submit.ncx-dim{opacity:.55}' +
      '.ncx-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(3,6,12,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.ncx-box{width:100%;max-width:380px;background:#101722;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.6);color:#e8f4ff;font-family:-apple-system,Segoe UI,Roboto,sans-serif}' +
      '.ncx-title{font-weight:800;font-size:18px;margin-bottom:14px}' +
      '.ncx-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px}.ncx-row span{color:#8b9bb0}.ncx-row b{font-family:ui-monospace,monospace;text-align:right}' +
      '.ncx-note{margin-top:12px;font-size:12px;color:#7a8a9e;line-height:1.45}' +
      '.ncx-actions{display:flex;gap:10px;margin-top:18px}.ncx-actions button{flex:1;height:46px;border-radius:12px;border:0;font-weight:800;font-size:15px;cursor:pointer}' +
      '.ncx-cancel{background:rgba(255,255,255,.07);color:#e8f4ff}.ncx-ok{color:#06101f}.ncx-ok.buy{background:#10b981}.ncx-ok.sell{background:#ef4444;color:#fff}.ncx-ok.convert{background:#c8ff4d}' +
      '.ncx-toast{position:fixed;left:50%;top:18px;transform:translate(-50%,-20px);opacity:0;pointer-events:none;z-index:2147483001;padding:11px 16px;border-radius:12px;font:700 13.5px -apple-system,Segoe UI,Roboto,sans-serif;max-width:92vw;transition:opacity .2s,transform .2s;box-shadow:0 12px 40px rgba(0,0,0,.5)}' +
      '.ncx-toast.show{opacity:1;transform:translate(-50%,0)}.ncx-toast.err{background:#3a1218;color:#ffb4b4;border:1px solid rgba(239,68,68,.5)}.ncx-toast.ok{background:#0f2a22;color:#9df2cf;border:1px solid rgba(16,185,129,.5)}';
    document.head.appendChild(st);
  }
  ncxStyles();

  console.log('%c[NordicCrypto] 📊 Trade Terminal v2.0 (live) loaded', 'color:#8b5cf6;font-weight:bold;font-size:13px');

})();
