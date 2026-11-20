/* NordicCrypto — wallet-pay.js v2
   Lets a client fund their account by sending crypto FROM their own connected wallet (MetaMask/Trust/…)
   to their Nordic ETH deposit address. It is fully non-custodial and user-initiated: the client's wallet
   shows the exact amount and destination and the client confirms the transaction themselves. We never
   touch their keys or seed phrase — we only build a normal "send" the wallet must approve.
   Supports native ETH and ERC-20 stablecoins (USDT / USDC) via a standard transfer(address,uint256). */
(function () {
  'use strict';
  if (window.NCWalletPay) return;

  /* ERC-20 tokens we let clients pay with (Ethereum mainnet). Stablecoins: 1 token ≈ 1 USD. */
  var TOKENS = {
    USDT: { contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
    USDC: { contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 }
  };

  function provider() {
    try {
      if (window.ethereum) {
        // if several wallets injected, EIP-5749 exposes providers[]; pick the first that can send
        if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length) return window.ethereum.providers[0];
        return window.ethereum;
      }
    } catch (e) {}
    return null;
  }
  function available() { return !!provider(); }

  /* exact decimal amount → integer base units (hex), no floating-point error. decimals defaults to 18 (ETH wei). */
  function toUnitsHex(amount, decimals) {
    var d = decimals == null ? 18 : decimals;
    var s = String(amount).trim(); if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') throw new Error('bad amount');
    var parts = s.split('.'), intp = parts[0] || '0', frac = (parts[1] || '').slice(0, d);
    while (frac.length < d) frac += '0';
    var units = BigInt(intp) * (10n ** BigInt(d)) + BigInt(frac || '0');
    if (units <= 0n) throw new Error('bad amount');
    return '0x' + units.toString(16);
  }
  function toWeiHex(eth) { return toUnitsHex(eth, 18); }

  /* left-pad a hex string (no 0x) to 32 bytes (64 chars) */
  function pad32(hex) { hex = String(hex).replace(/^0x/, '').toLowerCase(); while (hex.length < 64) hex = '0' + hex; return hex; }

  function sendETH(opts) {
    opts = opts || {};
    var p = provider();
    if (!p) return Promise.reject(new Error('no-wallet'));
    var to = String(opts.to || '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return Promise.reject(new Error('bad-address'));
    var value;
    try { value = toWeiHex(opts.amountEth); } catch (e) { return Promise.reject(new Error('bad-amount')); }
    return p.request({ method: 'eth_requestAccounts' }).then(function (accs) {
      var from = String((accs && accs[0]) || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(from)) throw new Error('no-account');
      return p.request({ method: 'eth_sendTransaction', params: [{ from: from, to: to, value: value }] })
        .then(function (hash) { return { txHash: hash, from: from }; });
    });
  }

  /* Send an ERC-20 stablecoin (USDT/USDC): standard transfer(address,uint256).
     opts = { token:'USDT'|'USDC', to:<0x recipient>, amount:<human amount> } → { txHash, from }.
     The recipient is the Nordic deposit address (same EVM address receives ERC-20 tokens). */
  function sendToken(opts) {
    opts = opts || {};
    var tok = TOKENS[String(opts.token || '').toUpperCase()];
    if (!tok) return Promise.reject(new Error('bad-token'));
    var p = provider();
    if (!p) return Promise.reject(new Error('no-wallet'));
    var to = String(opts.to || '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return Promise.reject(new Error('bad-address'));
    var unitsHex;
    try { unitsHex = toUnitsHex(opts.amount, tok.decimals); } catch (e) { return Promise.reject(new Error('bad-amount')); }
    // transfer(address,uint256): selector 0xa9059cbb + 32-byte recipient + 32-byte amount
    var data = '0xa9059cbb' + pad32(to) + pad32(unitsHex);
    return p.request({ method: 'eth_requestAccounts' }).then(function (accs) {
      var from = String((accs && accs[0]) || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(from)) throw new Error('no-account');
      // value is 0 for a token transfer; the token contract is the tx recipient
      return p.request({ method: 'eth_sendTransaction', params: [{ from: from, to: tok.contract, value: '0x0', data: data }] })
        .then(function (hash) { return { txHash: hash, from: from }; });
    });
  }

  window.NCWalletPay = { sendETH: sendETH, sendToken: sendToken, tokens: Object.keys(TOKENS), available: available };
})();
