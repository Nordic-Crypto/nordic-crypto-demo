/* NordicCrypto — wallet-connect.js v1
   Optional WalletConnect v2 bridge for MOBILE wallets (Trust, Exodus, Rainbow, …).
   It is only ACTIVE when the site sets a free project id:  window.NC_WC_PROJECT_ID = '...'
   (create one at https://cloud.reown.com — formerly WalletConnect Cloud).

   What it does: opens the official WalletConnect QR modal (which shows the real wallet logos),
   the user scans it with their phone wallet and approves. We then receive the public ADDRESS and a
   signature proving ownership. The seed phrase never leaves the user's wallet — same guarantee as the
   browser-extension path. Nothing here ever asks for a recovery phrase.

   wallets-v5.js calls:  window.NCWalletConnect.open({ projectId, signMsg, busy, unbusy, toast, save, strings })
   where save(address, label, verified) persists the wallet (verified = a signature was produced). */
(function () {
  'use strict';
  if (window.NCWalletConnect) return;

  var SDK_URL = 'https://unpkg.com/@walletconnect/ethereum-provider@2.17.0/dist/index.umd.js';
  var sdkPromise = null, provider = null;

  function loadSDK() {
    if (window.EthereumProvider) return Promise.resolve(window.EthereumProvider);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SDK_URL; s.async = true;
      s.onload = function () { window.EthereumProvider ? resolve(window.EthereumProvider) : reject(new Error('SDK missing')); };
      s.onerror = function () { sdkPromise = null; reject(new Error('Could not load WalletConnect')); };
      document.head.appendChild(s);
      setTimeout(function () { if (!window.EthereumProvider) { sdkPromise = null; reject(new Error('WalletConnect timed out')); } }, 15000);
    });
    return sdkPromise;
  }

  function hexMsg(s) { var o = '0x'; for (var i = 0; i < s.length; i++) { var h = s.charCodeAt(i).toString(16); o += h.length < 2 ? '0' + h : h; } return o; }

  function open(opts) {
    opts = opts || {};
    var S = opts.strings || {};
    var busy = opts.busy || function () {}, unbusy = opts.unbusy || function () {}, toast = opts.toast || function () {};
    var save = opts.save || function () { return Promise.resolve(); };
    var pid = opts.projectId || window.NC_WC_PROJECT_ID;
    if (!pid) { toast('WalletConnect is not configured yet.'); return; }

    busy(S.connecting);
    loadSDK().then(function (EthereumProvider) {
      var init = provider ? Promise.resolve(provider) : EthereumProvider.init({
        projectId: pid,
        chains: [1],
        optionalChains: [1, 137, 56, 42161, 10, 8453],
        showQrModal: true,
        metadata: {
          name: 'Nordic',
          description: 'Connect your wallet to Nordic',
          url: location.origin,
          icons: [location.origin + '/favicon.ico']
        }
      });
      return init.then(function (p) {
        provider = p;
        busy(S.approve);
        return p.connect().then(function () { return p; });
      });
    }).then(function (p) {
      var addr = (p.accounts && p.accounts[0]) || '';
      addr = String(addr).toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(addr)) throw new Error('No address');
      var label = 'Wallet';
      try { var peer = p.session && p.session.peer && p.session.peer.metadata; if (peer && peer.name) label = peer.name; } catch (e) {}
      /* prove ownership with a signature (optional — if the wallet refuses, save as unverified) */
      var msg = (opts.signMsg || 'Verify wallet ownership') + '\nAddress: ' + addr + '\n' + new Date().toISOString();
      return p.request({ method: 'personal_sign', params: [hexMsg(msg), addr] })
        .then(function () { return { addr: addr, label: label, verified: true }; },
              function () { return { addr: addr, label: label, verified: false }; });
    }).then(function (r) {
      unbusy();
      return save(r.addr, r.label, r.verified);
    }).catch(function (err) {
      unbusy();
      var m = err && err.message || '';
      if (/reject|cancel|User/i.test(m) || (err && err.code === 4001)) toast(S.rejected || 'Connection cancelled.');
      else if (/load|timed out|SDK/i.test(m)) toast('Could not reach WalletConnect. Check your connection and try again.');
      else toast(S.rejected || 'Could not connect.');
      /* drop a failed session so the next attempt starts clean */
      try { if (provider && provider.disconnect) provider.disconnect(); } catch (e) {}
      provider = null;
    });
  }

  window.NCWalletConnect = { open: open };
})();
