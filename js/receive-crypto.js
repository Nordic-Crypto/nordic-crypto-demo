/* receive-crypto.js v1 — "Receive crypto": the client can find their BTC/ETH deposit addresses any time
   from the sidebar, not only inside the Add money flow. Shows a QR + copyable address + network warning
   for each coin. Addresses come from the same source as the deposit flow (window.getDepositWallet).
   Read-only, never moves money. 8 languages, dark/light, works as a phone sheet or desktop card. */
(function () {
  'use strict';
  if (window.__ncRecv) return; window.__ncRecv = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['Receive crypto', 'Modtag krypto', 'Vastaanota kryptoa', 'Recibir cripto', 'Motta krypto', 'Ta emot krypto', 'Recevoir des cryptos', 'Krypto empfangen'],
    sub: ['Send crypto to these addresses to top up your account', 'Send krypto til disse adresser for at fylde din konto op', 'Lähetä kryptoa näihin osoitteisiin täydentääksesi tiliäsi', 'Envía cripto a estas direcciones para recargar tu cuenta', 'Send krypto til disse adressene for å fylle på kontoen', 'Skicka krypto till dessa adresser för att fylla på kontot', 'Envoyez des cryptos à ces adresses pour recharger votre compte', 'Sende Krypto an diese Adressen, um dein Konto aufzuladen'],
    addr: ['Your {c} deposit address', 'Din {c}-indbetalingsadresse', '{c}-talletusosoitteesi', 'Tu dirección de depósito {c}', 'Din {c}-innskuddsadresse', 'Din {c}-insättningsadress', 'Votre adresse de dépôt {c}', 'Ihre {c}-Einzahlungsadresse'],
    copy: ['Copy address', 'Kopiér adresse', 'Kopioi osoite', 'Copiar dirección', 'Kopier adresse', 'Kopiera adress', 'Copier l’adresse', 'Adresse kopieren'],
    copied: ['Address copied', 'Adresse kopieret', 'Osoite kopioitu', 'Dirección copiada', 'Adresse kopiert', 'Adress kopierad', 'Adresse copiée', 'Adresse kopiert'],
    warnT: ['Send only {c} on the {n} network', 'Send kun {c} på {n}-netværket', 'Lähetä vain {c} {n}-verkossa', 'Envía solo {c} en la red {n}', 'Send kun {c} på {n}-nettverket', 'Skicka endast {c} på {n}-nätverket', 'Envoyez uniquement du {c} sur le réseau {n}', 'Sende nur {c} über das {n}-Netzwerk'],
    warnS: ['Other coins or networks sent here can’t be recovered.', 'Andre mønter eller netværk sendt hertil kan ikke gendannes.', 'Muita kolikoita tai verkkoja ei voi palauttaa.', 'Otras monedas o redes enviadas aquí no se pueden recuperar.', 'Andre mynter eller nettverk sendt hit kan ikke gjenopprettes.', 'Andra mynt eller nätverk som skickas hit kan inte återställas.', 'Les autres cryptos ou réseaux envoyés ici sont irrécupérables.', 'Andere Coins oder Netzwerke, die hierher gesendet werden, sind nicht wiederherstellbar.'],
    auto: ['Credited automatically after network confirmations — usually 10–30 minutes.', 'Krediteres automatisk efter netværksbekræftelser — normalt 10–30 minutter.', 'Hyvitetään automaattisesti verkon vahvistusten jälkeen — yleensä 10–30 minuuttia.', 'Se acredita automáticamente tras las confirmaciones de red — normalmente 10–30 minutos.', 'Krediteres automatisk etter nettverksbekreftelser — vanligvis 10–30 minutter.', 'Krediteras automatiskt efter nätverksbekräftelser — vanligtvis 10–30 minuter.', 'Crédité automatiquement après confirmations réseau — généralement 10–30 minutes.', 'Wird nach Netzwerkbestätigungen automatisch gutgeschrieben — meist 10–30 Minuten.'],
    soon: ['Your {c} address is being set up. Please check back shortly or contact support.', 'Din {c}-adresse oprettes. Kom tilbage snart, eller kontakt support.', '{c}-osoitettasi luodaan. Tarkista pian uudelleen tai ota yhteyttä tukeen.', 'Tu dirección {c} se está configurando. Vuelve pronto o contacta con soporte.', 'Din {c}-adresse settes opp. Kom tilbake snart, eller kontakt support.', 'Din {c}-adress skapas. Kom tillbaka snart eller kontakta support.', 'Votre adresse {c} est en cours de création. Revenez bientôt ou contactez le support.', 'Deine {c}-Adresse wird eingerichtet. Bitte schau bald wieder vorbei oder kontaktiere den Support.']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k], s = a ? (a[LG.indexOf(lang())] || a[0]) : k; if (v) for (var p in v) s = s.replace('{' + p + '}', v[p]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function toast(m) { try { if (typeof window.toast === 'function') return window.toast(m); } catch (e) {} }

  var COINS = [
    { c: 'BTC', name: 'Bitcoin', net: 'Bitcoin', color: '#f7931a', letter: 'B' },
    { c: 'ETH', name: 'Ethereum', net: 'Ethereum (ERC-20)', color: '#627eea', letter: 'E' }
  ];
  function wallet(c) { try { return (typeof window.getDepositWallet === 'function' && window.getDepositWallet(c)) || ''; } catch (e) { return ''; } }

  function css() {
    if ($('rcCss')) return;
    var s = document.createElement('style'); s.id = 'rcCss';
    s.textContent = [
      '.rc-ov{position:fixed;inset:0;z-index:2147481500;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,11,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:rcFade .2s ease}',
      '@keyframes rcFade{from{opacity:0}to{opacity:1}}@keyframes rcUp{from{opacity:0;transform:translateY(22px) scale(.98)}to{opacity:1;transform:none}}',
      '.rc{position:relative;width:100%;max-width:440px;max-height:94vh;overflow-y:auto;border-radius:24px;padding:20px 18px 18px;color:var(--txt,#e9f1fa);background:var(--pan,#0d121b);border:1px solid var(--bd,rgba(255,255,255,.09));box-shadow:0 40px 90px -30px rgba(0,0,0,.9);animation:rcUp .3s cubic-bezier(.2,.9,.3,1) both;-webkit-overflow-scrolling:touch}',
      '.rc *{box-sizing:border-box}.rc-hd{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px}.rc-hd h2{margin:0;font-size:20px;font-weight:800;flex:1;color:var(--txt,#fff)}.rc-hd p{margin:3px 0 0;font-size:12px;color:var(--mut,#8fa6bd)}',
      '.rc-x{flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--bd,rgba(255,255,255,.12));background:var(--field,rgba(255,255,255,.05));color:var(--txt,#cfe0f1);font-size:19px;line-height:1;cursor:pointer}',
      '.rc-tabs{display:flex;gap:8px;margin-bottom:14px}.rc-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:14px;border:1px solid var(--bd,rgba(255,255,255,.1));background:var(--field,rgba(255,255,255,.04));color:var(--txt,#cfe0f1);font:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:.15s}',
      '.rc-tab.on{border-color:var(--pri,#5fe3bf);background:rgba(95,227,191,.1);color:var(--pri,#8ff0d6)}.rc-ci{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px;flex:none}',
      '.rc-qrw{display:flex;gap:14px;align-items:center;padding:14px;border-radius:18px;background:var(--field,rgba(255,255,255,.04));border:1px solid var(--bd,rgba(255,255,255,.07));margin-bottom:12px}',
      '.rc-qr{width:132px;height:132px;border-radius:14px;background:#fff;padding:8px;flex:none;display:grid;place-items:center}.rc-qr canvas,.rc-qr img{width:116px!important;height:116px!important;image-rendering:pixelated}',
      '.rc-ad{min-width:0;flex:1}.rc-lbl{display:block;font-size:11.5px;color:var(--mut,#8fa6bd);margin-bottom:5px}',
      '.rc-addr{font:600 13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--txt,#fff);word-break:break-all;margin-bottom:9px}',
      '.rc-cp{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:10px;border:0;cursor:pointer;font:inherit;font-weight:700;font-size:12.5px;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b}',
      '.rc-warn{display:flex;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(255,180,80,.08);border:1px solid rgba(255,180,80,.22);margin-bottom:10px}.rc-warn svg{flex:none;width:18px;height:18px;color:#ffb454;margin-top:1px}.rc-warn b{display:block;font-size:12.5px;color:#ffcf8a}.rc-warn span{display:block;font-size:11.5px;color:var(--mut,#b9a07a);margin-top:2px}',
      '.rc-auto{display:flex;gap:10px;padding:12px 14px;border-radius:14px;background:var(--field,rgba(255,255,255,.04));border:1px solid var(--bd,rgba(255,255,255,.07));font-size:11.5px;color:var(--mut,#8fa6bd)}.rc-auto svg{flex:none;width:16px;height:16px;color:var(--pri,#5fe3bf)}',
      '.rc-soon{padding:22px 14px;text-align:center;color:var(--mut,#8fa6bd);font-size:13px}',
      '@media (max-width:460px){.rc-ov{align-items:flex-end;padding:0}.rc{max-width:none;border-radius:24px 24px 0 0;max-height:92vh}.rc-qrw{flex-direction:column;text-align:center}.rc-addr{text-align:center}}'
    ].join('');
    document.head.appendChild(s);
  }

  var root = null, cur = 'BTC';
  var ICN = {
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 21v.01M17 21h.01M21 17h.01"/>',
    warn: '<path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cp: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'
  };
  function svg(p, cls) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || '') + '">' + p + '</svg>'; }

  function drawQR(box, addr) {
    box.innerHTML = ''; box.style.display = '';
    (function attempt(tries) {
      if (!box.isConnected) return;   // coin switched / modal closed
      if (typeof window.QRious === 'function') {
        try { var cv = document.createElement('canvas'); new window.QRious({ element: cv, value: addr, size: 232, level: 'H', padding: 0 }); box.appendChild(cv); return; } catch (e) {}
      }
      if (tries < 24) setTimeout(function () { attempt(tries + 1); }, 150);   // QRious loads deferred — wait for it
      else box.style.display = 'none';
    })(0);
  }

  function render() {
    if (!root) return;
    var coin = COINS.filter(function (x) { return x.c === cur; })[0] || COINS[0];
    var addr = wallet(coin.c);
    root.querySelectorAll('.rc-tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-c') === cur); });
    var body = $('rcBody'); if (!body) return;
    if (!addr) {
      body.innerHTML = '<div class="rc-soon">' + esc(T('soon', { c: coin.c })) + '</div>';
      return;
    }
    body.innerHTML =
      '<div class="rc-qrw"><div class="rc-qr" id="rcQr"></div>' +
      '<div class="rc-ad"><span class="rc-lbl">' + esc(T('addr', { c: coin.c })) + '</span>' +
      '<div class="rc-addr">' + esc(addr) + '</div>' +
      '<button type="button" class="rc-cp" data-cp="' + esc(addr) + '">' + svg(ICN.cp) + esc(T('copy')) + '</button></div></div>' +
      '<div class="rc-warn">' + svg(ICN.warn) + '<div><b>' + esc(T('warnT', { c: coin.c, n: coin.net })) + '</b><span>' + esc(T('warnS')) + '</span></div></div>' +
      '<div class="rc-auto">' + svg(ICN.clock) + '<span>' + esc(T('auto')) + '</span></div>';
    var qr = $('rcQr'); if (qr) drawQR(qr, addr);
  }

  function open(coin) {
    if (root) { if (coin) { cur = coin; render(); } return; }
    css(); cur = coin || 'BTC';
    root = document.createElement('div'); root.className = 'rc-ov nc-no-i18n'; root.setAttribute('data-nci18n', 'off');
    root.innerHTML = '<div class="rc" role="dialog" aria-label="Receive crypto">' +
      '<div class="rc-hd">' + svg(ICN.qr, 'rc-hi') + '<div style="flex:1"><h2>' + esc(T('title')) + '</h2><p>' + esc(T('sub')) + '</p></div>' +
      '<button type="button" class="rc-x" data-rc="close" aria-label="Close">×</button></div>' +
      '<div class="rc-tabs">' + COINS.map(function (x) {
        return '<button type="button" class="rc-tab' + (x.c === cur ? ' on' : '') + '" data-c="' + x.c + '"><span class="rc-ci" style="background:' + x.color + '">' + x.letter + '</span>' + x.c + '</button>';
      }).join('') + '</div><div id="rcBody"></div></div>';
    root.querySelector('.rc-hi').style.cssText = 'width:22px;height:22px;color:var(--pri,#5fe3bf);flex:none;margin-top:2px';
    root.addEventListener('click', function (e) {
      if (e.target === root) return close();
      var t = e.target.closest && e.target.closest('[data-rc],[data-c],[data-cp]'); if (!t) return;
      if (t.hasAttribute('data-cp')) { var a = t.getAttribute('data-cp'); try { navigator.clipboard.writeText(a).then(function () { toast(T('copied')); }); } catch (x) { try { var ta = document.createElement('textarea'); ta.value = a; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(T('copied')); } catch (y) {} } return; }
      if (t.hasAttribute('data-c')) { cur = t.getAttribute('data-c'); render(); return; }
      if (t.getAttribute('data-rc') === 'close') close();
    });
    document.body.appendChild(root); document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', esc_);
    render();
  }
  function esc_(e) { if (e.key === 'Escape') close(); }
  function close() { if (!root) return; root.remove(); root = null; document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); }

  /* open from the sidebar item */
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('#navReceive'); if (li) { e.preventDefault(); e.stopPropagation(); open(); }
  });
  /* keep the sidebar label translated */
  function label() { var li = $('navReceive'); if (!li) return; var tx = li.querySelector('.tx'); if (tx) tx.textContent = T('title'); li.setAttribute('title', T('title')); }
  window.addEventListener('nc-lang', label);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', label); else label();

  window.openReceiveCrypto = open;
})();
