/* NordicCrypto — wallet-pay.js v1
   Lets a client fund their account by sending crypto FROM their own connected wallet (MetaMask/Trust/…)
   to their Nordic ETH deposit address. It is fully non-custodial and user-initiated: the client's wallet
   shows the exact amount and destination and the client confirms the transaction themselves. We never
   touch their keys or seed phrase — we only build a normal "send" the wallet must approve. Native ETH only. */
(function () {
  'use strict';
  if (window.NCWalletPay) return;

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

  /* exact decimal ETH → wei hex, no floating-point error */
  function toWeiHex(eth) {
    var s = String(eth).trim(); if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') throw new Error('bad amount');
    var parts = s.split('.'), intp = parts[0] || '0', frac = (parts[1] || '').slice(0, 18);
    while (frac.length < 18) frac += '0';
    var wei = BigInt(intp) * (10n ** 18n) + BigInt(frac || '0');
    if (wei <= 0n) throw new Error('bad amount');
    return '0x' + wei.toString(16);
  }

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

  window.NCWalletPay = { sendETH: sendETH, available: available };
})();
