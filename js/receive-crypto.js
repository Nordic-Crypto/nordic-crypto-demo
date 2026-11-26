/* receive-crypto.js v3 — "Receive crypto" as a full sidebar PAGE (#receive / #rcPage).
   Shows the client's BTC/ETH deposit addresses any time with a big QR, copyable address and
   network warning. Addresses come from the same source as the deposit flow (window.getDepositWallet).
   Read-only, never moves money. 8 languages, dark/light, responsive to phones. No modal. */
(function () {
  'use strict';
  if (window.__ncRecv) return; window.__ncRecv = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['Receive crypto', 'Modtag krypto', 'Vastaanota kryptoa', 'Recibir cripto', 'Motta krypto', 'Ta emot krypto', 'Recevoir des cryptos', 'Krypto empfangen'],
    sub: ['Send crypto to these addresses to top up your account', 'Send krypto til disse adresser for at fylde din konto op', 'Lähetä kryptoa näihin osoitteisiin täydentääksesi tiliäsi', 'Envía cripto a estas direcciones para recargar tu cuenta', 'Send krypto til disse adressene for å fylle på kontoen', 'Skicka krypto till dessa adresser för att fylla på kontot', 'Envoyez des cryptos à ces adresses pour recharger votre compte', 'Sende Krypto an diese Adressen, um dein Konto aufzuladen'],
    addr: ['Your {c} deposit address', 'Din {c}-indbetalingsadresse', '{c}-talletusosoitteesi', 'Tu dirección de depósito {c}', 'Din {c}-innskuddsadresse', 'Din {c}-insättningsadress', 'Votre adresse de dépôt {c}', 'Ihre {c}-Einzahlungsadresse'],
    scan: ['Scan the QR or copy the address below', 'Scan QR-koden eller kopiér adressen nedenfor', 'Skannaa QR tai kopioi osoite alta', 'Escanea el QR o copia la dirección de abajo', 'Skann QR-koden eller kopier adressen under', 'Skanna QR-koden eller kopiera adressen nedan', 'Scannez le QR ou copiez l’adresse ci-dessous', 'Scanne den QR-Code oder kopiere die Adresse unten'],
    network: ['Network', 'Netværk', 'Verkko', 'Red', 'Nettverk', 'Nätverk', 'Réseau', 'Netzwerk'],
    copy: ['Copy address', 'Kopiér adresse', 'Kopioi osoite', 'Copiar dirección', 'Kopier adresse', 'Kopiera adress', 'Copier l’adresse', 'Adresse kopieren'],
    copied: ['Address copied', 'Adresse kopieret', 'Osoite kopioitu', 'Dirección copiada', 'Adresse kopiert', 'Adress kopierad', 'Adresse copiée', 'Adresse kopiert'],
    warnT: ['Send only {c} on the {n} network', 'Send kun {c} på {n}-netværket', 'Lähetä vain {c} {n}-verkossa', 'Envía solo {c} en la red {n}', 'Send kun {c} på {n}-nettverket', 'Skicka endast {c} på {n}-nätverket', 'Envoyez uniquement du {c} sur le réseau {n}', 'Sende nur {c} über das {n}-Netzwerk'],
    warnS: ['Other coins or networks sent here can’t be recovered.', 'Andre mønter eller netværk sendt hertil kan ikke gendannes.', 'Muita kolikoita tai verkkoja ei voi palauttaa.', 'Otras monedas o redes enviadas aquí no se pueden recuperar.', 'Andre mynter eller nettverk sendt hit kan ikke gjenopprettes.', 'Andra mynt eller nätverk som skickas hit kan inte återställas.', 'Les autres cryptos ou réseaux envoyés ici sont irrécupérables.', 'Andere Coins oder Netzwerke, die hierher gesendet werden, sind nicht wiederherstellbar.'],
    auto: ['Credited automatically after network confirmations — usually 10–30 minutes.', 'Krediteres automatisk efter netværksbekræftelser — normalt 10–30 minutter.', 'Hyvitetään automaattisesti verkon vahvistusten jälkeen — yleensä 10–30 minuuttia.', 'Se acredita automáticamente tras las confirmaciones de red — normalmente 10–30 minutos.', 'Krediteres automatisk etter nettverksbekreftelser — vanligvis 10–30 minutter.', 'Krediteras automatiskt efter nätverksbekräftelser — vanligtvis 10–30 minuter.', 'Crédité automatiquement après confirmations réseau — généralement 10–30 minutes.', 'Wird nach Netzwerkbestätigungen automatisch gutgeschrieben — meist 10–30 Minuten.'],
    soonT: ['Address is being set up', 'Adresse oprettes', 'Osoitetta luodaan', 'Dirección en configuración', 'Adresse settes opp', 'Adress skapas', 'Adresse en cours de création', 'Adresse wird eingerichtet'],
    soon: ['Your {c} address is being set up. Please check back shortly or contact support.', 'Din {c}-adresse oprettes. Kom tilbage snart, eller kontakt support.', '{c}-osoitettasi luodaan. Tarkista pian uudelleen tai ota yhteyttä tukeen.', 'Tu dirección {c} se está configurando. Vuelve pronto o contacta con soporte.', 'Din {c}-adresse settes opp. Kom tilbake snart, eller kontakt support.', 'Din {c}-adress skapas. Kom tillbaka snart eller kontakta support.', 'Votre adresse {c} est en cours de création. Revenez bientôt ou contactez le support.', 'Deine {c}-Adresse wird eingerichtet. Bitte schau bald wieder vorbei oder kontaktiere den Support.']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k], s = a ? (a[LG.indexOf(lang())] || a[0]) : k; if (v) for (var p in v) s = s.replace(new RegExp('\\{' + p + '\\}', 'g'), v[p]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function toast(m) { try { if (typeof window.toast === 'function') return window.toast(m); } catch (e) {} }

  var COINS = [
    { c: 'BTC', name: 'Bitcoin', net: 'Bitcoin', color: '#f7931a', letter: '₿' },
    { c: 'ETH', name: 'Ethereum', net: 'Ethereum (ERC-20)', color: '#627eea', letter: 'Ξ' }
  ];
  function wallet(c) { try { return (typeof window.getDepositWallet === 'function' && window.getDepositWallet(c)) || ''; } catch (e) { return ''; } }

  function css() {
    if ($('rcCss')) return;
    var s = document.createElement('style'); s.id = 'rcCss';
    s.textContent = [
      '#rcPage{max-width:920px}',
      '#rcPage *{box-sizing:border-box}',
      '.rcp-tabs{display:flex;gap:10px;margin:0 0 18px}',
      '.rcp-tab{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:11px 18px;border-radius:14px;border:1px solid var(--bd,rgba(255,255,255,.1));background:var(--field,rgba(255,255,255,.04));color:var(--txt,#cfe0f1);font:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:.16s}',
      '.rcp-tab:hover{border-color:var(--pri,#5fe3bf);transform:translateY(-1px)}',
      '.rcp-tab.on{border-color:var(--pri,#5fe3bf);background:rgba(95,227,191,.12);color:var(--pri,#8ff0d6);box-shadow:0 8px 22px -12px rgba(95,227,191,.6)}',
      '.rcp-dot{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:14px;flex:none;box-shadow:0 3px 8px rgba(0,0,0,.3)}',
      '.rcp-grid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:18px;align-items:stretch}',
      '.rcp-card{background:var(--pan,#0d121b);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:22px;padding:22px;box-shadow:0 24px 60px -34px rgba(0,0,0,.8)}',
      '.rcp-qrcard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center}',
      '.rcp-qr{width:216px;height:216px;border-radius:18px;background:#fff;padding:12px;display:grid;place-items:center;box-shadow:0 10px 30px -10px rgba(0,0,0,.45)}',
      '.rcp-qr canvas,.rcp-qr img{width:192px!important;height:192px!important;image-rendering:pixelated}',
      '.rcp-scan{font-size:12.5px;color:var(--mut,#8fa6bd);line-height:1.4;max-width:220px}',
      '.rcp-netchip{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:var(--field,rgba(255,255,255,.05));border:1px solid var(--bd,rgba(255,255,255,.08));font-size:12px;font-weight:700;color:var(--txt,#dce7f3)}',
      '.rcp-right{display:flex;flex-direction:column;gap:14px}',
      '.rcp-lbl{display:block;font-size:12px;color:var(--mut,#8fa6bd);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}',
      '.rcp-addrbox{background:var(--field,rgba(255,255,255,.04));border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:16px;padding:16px 18px}',
      '.rcp-addr{font:600 15px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--txt,#fff);word-break:break-all}',
      '.rcp-cp{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:14px;padding:14px;border-radius:14px;border:0;cursor:pointer;font:inherit;font-weight:800;font-size:14.5px;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;transition:.15s;box-shadow:0 10px 26px -12px rgba(69,207,168,.8)}',
      '.rcp-cp:hover{filter:brightness(1.04);transform:translateY(-1px)}.rcp-cp:active{transform:none}',
      '.rcp-cp svg{width:18px;height:18px}',
      '.rcp-warn{display:flex;gap:12px;padding:14px 16px;border-radius:16px;background:rgba(255,180,80,.08);border:1px solid rgba(255,180,80,.22)}',
      '.rcp-warn svg{flex:none;width:20px;height:20px;color:#ffb454;margin-top:1px}.rcp-warn b{display:block;font-size:13.5px;color:#ffcf8a}.rcp-warn span{display:block;font-size:12.5px;color:var(--mut,#b9a07a);margin-top:3px;line-height:1.4}',
      '.rcp-auto{display:flex;gap:12px;padding:14px 16px;border-radius:16px;background:rgba(95,227,191,.06);border:1px solid rgba(95,227,191,.18);font-size:12.5px;color:var(--mut,#9fb6c6);line-height:1.45}.rcp-auto svg{flex:none;width:18px;height:18px;color:var(--pri,#5fe3bf);margin-top:1px}',
      '.rcp-soon{grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--mut,#8fa6bd)}.rcp-soon b{display:block;font-size:16px;color:var(--txt,#cfe0f1);margin-bottom:8px}.rcp-soon span{font-size:13px;max-width:340px;display:inline-block;line-height:1.5}',
      '@media (max-width:760px){.rcp-grid{grid-template-columns:1fr}.rcp-qr{width:200px;height:200px}.rcp-qr canvas,.rcp-qr img{width:176px!important;height:176px!important}.rcp-tabs{gap:8px}.rcp-tab{flex:1;justify-content:center;padding:11px}}'
    ].join('');
    document.head.appendChild(s);
  }

  var cur = 'BTC';
  var ICN = {
    warn: '<path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cp: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    net: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>'
  };
  function svg(p, cls) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || '') + '">' + p + '</svg>'; }

  function drawQR(box, addr) {
    box.innerHTML = ''; box.style.display = '';
    (function attempt(tries) {
      if (!box.isConnected) return;   // coin switched / page left
      if (typeof window.QRious === 'function') {
        try { var cv = document.createElement('canvas'); new window.QRious({ element: cv, value: addr, size: 384, level: 'H', padding: 0 }); box.appendChild(cv); return; } catch (e) {}
      }
      if (tries < 24) setTimeout(function () { attempt(tries + 1); }, 150);   // QRious loads deferred — wait for it
      else box.style.display = 'none';
    })(0);
  }

  function render() {
    var host = $('rcPage'); if (!host) return;
    css();
    var coin = COINS.filter(function (x) { return x.c === cur; })[0] || COINS[0];
    var addr = wallet(coin.c);
    host.className = 'nc-no-i18n'; host.setAttribute('data-nci18n', 'off');
    var tabs = '<div class="rcp-tabs">' + COINS.map(function (x) {
      return '<button type="button" class="rcp-tab' + (x.c === cur ? ' on' : '') + '" data-c="' + x.c + '"><span class="rcp-dot" style="background:' + x.color + '">' + x.letter + '</span>' + esc(x.name) + '</button>';
    }).join('') + '</div>';

    var body;
    if (!addr) {
      body = '<div class="rcp-grid"><div class="rcp-soon">' + svg(ICN.clock) + '<b>' + esc(T('soonT')) + '</b><span>' + esc(T('soon', { c: coin.c })) + '</span></div></div>';
    } else {
      body = '<div class="rcp-grid">' +
        '<div class="rcp-card rcp-qrcard">' +
          '<div class="rcp-qr" id="rcPageQr"></div>' +
          '<div class="rcp-netchip">' + svg(ICN.net) + esc(T('network')) + ': ' + esc(coin.net) + '</div>' +
          '<div class="rcp-scan">' + esc(T('scan')) + '</div>' +
        '</div>' +
        '<div class="rcp-right">' +
          '<div class="rcp-card">' +
            '<span class="rcp-lbl">' + esc(T('addr', { c: coin.c })) + '</span>' +
            '<div class="rcp-addrbox"><div class="rcp-addr">' + esc(addr) + '</div></div>' +
            '<button type="button" class="rcp-cp" data-cp="' + esc(addr) + '">' + svg(ICN.cp) + esc(T('copy')) + '</button>' +
          '</div>' +
          '<div class="rcp-warn">' + svg(ICN.warn) + '<div><b>' + esc(T('warnT', { c: coin.c, n: coin.net })) + '</b><span>' + esc(T('warnS')) + '</span></div></div>' +
          '<div class="rcp-auto">' + svg(ICN.clock) + '<span>' + esc(T('auto')) + '</span></div>' +
        '</div>' +
      '</div>';
    }

    host.innerHTML = '<div class="sh"><h2>' + esc(T('title')) + '</h2><p>' + esc(T('sub')) + '</p></div>' + tabs + body;
    var qr = $('rcPageQr'); if (qr) drawQR(qr, addr);
  }

  function visible() { var p = $('receive'); return !!(p && (p.classList.contains('on') || p.style.display === 'block')); }

  /* delegated clicks inside the page: coin tabs + copy */
  document.addEventListener('click', function (e) {
    var host = $('rcPage'); if (!host) return;
    var t = e.target.closest && e.target.closest('[data-c],[data-cp]');
    if (!t || !host.contains(t)) return;
    if (t.hasAttribute('data-cp')) {
      var a = t.getAttribute('data-cp');
      try { navigator.clipboard.writeText(a).then(function () { toast(T('copied')); }); }
      catch (x) { try { var ta = document.createElement('textarea'); ta.value = a; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(T('copied')); } catch (y) {} }
      return;
    }
    if (t.hasAttribute('data-c')) { cur = t.getAttribute('data-c'); render(); }
  });

  /* when the user opens the Receive page from the sidebar, render it (the nav handler shows the page) */
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('#navReceive'); if (!li) return;
    setTimeout(render, 0);   // after the nav handler has switched the page on
  });

  /* re-render on language change while the page is open */
  window.addEventListener('nc-lang', function () { if (visible()) render(); });
  function label() { var li = $('navReceive'); if (!li) return; var tx = li.querySelector('.tx'); if (tx) tx.textContent = T('title'); li.setAttribute('title', T('title')); }
  window.addEventListener('nc-lang', label);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', label); else label();

  /* public: navigate to the Receive page (optionally pre-select a coin) */
  window.openReceiveCrypto = function (coin) {
    if (coin) cur = coin;
    var li = $('navReceive');
    if (li && typeof li.click === 'function') li.click(); else render();
    setTimeout(render, 0);
  };
})();
