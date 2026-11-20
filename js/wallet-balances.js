/* NordicCrypto — wallet-balances.js v2
   Reads the PUBLIC on-chain balance of a connected wallet address (read-only, no keys, no secrets):
     • EVM address → native ETH via a public JSON-RPC (eth_getBalance), with fallback endpoints
     • EVM address → ERC-20 token balances (USDT / USDC / DAI) via eth_call balanceOf
     • Bitcoin address → confirmed balance via a public explorer API (blockstream / mempool.space)
   USD value uses the price the app already tracks (window.st.ethP / st.btcP); stablecoins are valued at $1.
   Everything is best-effort: on any failure it resolves to null/[] and the UI simply shows no balance.
   Results are cached briefly. */
(function () {
  'use strict';
  if (window.NCWalletBalance) return;

  var EVM_RPC = ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com', 'https://cloudflare-eth.com', 'https://rpc.ankr.com/eth'];
  var BTC_API = ['https://blockstream.info/api/address/', 'https://mempool.space/api/address/'];
  // Ethereum mainnet ERC-20 tokens we surface. Stablecoins are valued at $1.
  var TOKENS = [
    { symbol: 'USDT', contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, stable: true },
    { symbol: 'USDC', contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, stable: true },
    { symbol: 'DAI',  contract: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, stable: true }
  ];
  var TTL = 3 * 60 * 1000;
  var cache = {};

  function price(sym) { try { var s = window.st || {}; if (sym === 'ETH') return Number(s.ethP) || 0; if (sym === 'BTC') return Number(s.btcP) || 0; } catch (e) {} return 0; }
  function fetchT(url, opt, ms) { return Promise.race([fetch(url, opt), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms || 8000); })]); }
  function tryEach(list, fn) { var i = -1; function next() { i++; if (i >= list.length) return Promise.reject(new Error('all failed')); return fn(list[i]).catch(next); } return next(); }

  /* BigInt hex -> decimal number scaled by 10^decimals, keeping precision without floating-point drift */
  function fromUnits(hex, decimals) {
    var v;
    try { v = BigInt(hex); } catch (e) { return 0; }
    if (v <= 0n) return 0;
    var base = 10n ** BigInt(decimals);
    var intp = v / base, frac = v % base;
    var fracStr = frac.toString(); while (fracStr.length < decimals) fracStr = '0' + fracStr;
    return Number(intp.toString() + '.' + fracStr.slice(0, 8));
  }

  function evm(addr) {
    var body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] });
    return tryEach(EVM_RPC, function (u) {
      return fetchT(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || typeof j.result !== 'string' || j.result.indexOf('0x') !== 0) throw new Error('bad');
        var eth = Number(BigInt(j.result)) / 1e18;
        return { native: eth, symbol: 'ETH' };
      });
    });
  }

  /* ERC-20 balanceOf(address): selector 0x70a08231 + 32-byte left-padded address */
  function callToken(rpc, tok, addr) {
    var data = '0x70a08231' + '000000000000000000000000' + String(addr).toLowerCase().replace(/^0x/, '');
    var body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: tok.contract, data: data }, 'latest'] });
    return fetchT(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || typeof j.result !== 'string' || j.result.indexOf('0x') !== 0) throw new Error('bad');
      var amt = fromUnits(j.result, tok.decimals);
      return { symbol: tok.symbol, amount: amt, usd: tok.stable ? amt : 0, contract: tok.contract };
    });
  }

  function tokens(addr) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(String(addr || ''))) return Promise.resolve([]);
    return Promise.all(TOKENS.map(function (tok) {
      return tryEach(EVM_RPC, function (u) { return callToken(u, tok, addr); }).catch(function () { return null; });
    })).then(function (arr) { return arr.filter(function (t) { return t && t.amount > 0; }); });
  }

  function btc(addr) {
    return tryEach(BTC_API, function (u) {
      return fetchT(u + encodeURIComponent(addr)).then(function (r) { return r.json(); }).then(function (j) {
        var cs = (j && j.chain_stats) || {};
        var sats = (Number(cs.funded_txo_sum) || 0) - (Number(cs.spent_txo_sum) || 0);
        return { native: sats / 1e8, symbol: 'BTC' };
      });
    });
  }

  function get(address, type) {
    var key = (type || 'evm') + ':' + String(address).toLowerCase();
    var c = cache[key]; if (c && Date.now() - c.t < TTL) return Promise.resolve(c.v);
    return (type === 'btc' ? btc(address) : evm(address))
      .then(function (b) { if (b) { b.usd = b.native * price(b.symbol); } cache[key] = { t: Date.now(), v: b }; return b; })
      .catch(function () { cache[key] = { t: Date.now(), v: null }; return null; });
  }

  /* Tokens for an EVM address, cached briefly. BTC has no tokens here. */
  function getTokens(address, type) {
    if (type === 'btc') return Promise.resolve([]);
    var key = 'tok:' + String(address).toLowerCase();
    var c = cache[key]; if (c && Date.now() - c.t < TTL) return Promise.resolve(c.v);
    return tokens(address).then(function (list) { cache[key] = { t: Date.now(), v: list }; return list; })
      .catch(function () { cache[key] = { t: Date.now(), v: [] }; return []; });
  }

  window.NCWalletBalance = { get: get, getTokens: getTokens };
})();
