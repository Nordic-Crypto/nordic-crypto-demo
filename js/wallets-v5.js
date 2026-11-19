/* NordicCrypto — wallets-v5.js v1
   "My wallets" — let a client link a self-custody wallet (MetaMask, Trust, Exodus, Coinbase, …).
   Two honest connection paths, exactly like every real exchange:
     1) Connect — the wallet itself approves (EIP-6963 / window.ethereum eth_requestAccounts, plus an
        optional personal_sign to prove ownership). The seed phrase NEVER leaves the wallet; Nordic
        only receives the public address.
     2) Watch-only — the client pastes a public address (0x… or bitcoin). View balance/history only.
   Optional WalletConnect QR for mobile wallets is enabled when window.NC_WC_PROJECT_ID is set.
   We store ONLY the public address on the account. There is deliberately no field for a recovery
   phrase or a wallet password, because no legitimate wallet connection ever needs one. */
(function () {
  'use strict';
  if (window.__ncWallets) return; window.__ncWallets = 1;

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['My wallets', 'Mine wallets', 'Omat lompakot', 'Mis monederos', 'Mine lommebøker', 'Mina plånböcker', 'Mes portefeuilles', 'Meine Wallets'],
    sub: ['Link a wallet you own — the wallet approves it, your 12 words stay with you.', 'Tilknyt en wallet, du ejer — walletten godkender det, dine 12 ord bliver hos dig.', 'Linkitä omistamasi lompakko — lompakko hyväksyy sen, 12 sanaasi pysyvät sinulla.', 'Vincula un monedero tuyo: el monedero lo aprueba y tus 12 palabras se quedan contigo.', 'Koble til en lommebok du eier — lommeboken godkjenner det, de 12 ordene dine blir hos deg.', 'Länka en plånbok du äger — plånboken godkänner det, dina 12 ord stannar hos dig.', 'Reliez un portefeuille vous appartenant : le portefeuille approuve, vos 12 mots restent chez vous.', 'Verbinde eine eigene Wallet — die Wallet bestätigt, deine 12 Wörter bleiben bei dir.'],
    connected: ['Connected wallets', 'Tilknyttede wallets', 'Linkitetyt lompakot', 'Monederos vinculados', 'Tilkoblede lommebøker', 'Anslutna plånböcker', 'Portefeuilles reliés', 'Verbundene Wallets'],
    none: ['No wallets yet. Connect one below.', 'Ingen wallets endnu. Tilknyt en nedenfor.', 'Ei vielä lompakoita. Linkitä yksi alla.', 'Aún no hay monederos. Vincula uno abajo.', 'Ingen lommebøker ennå. Koble til en nedenfor.', 'Inga plånböcker ännu. Anslut en nedan.', 'Aucun portefeuille. Reliez-en un ci-dessous.', 'Noch keine Wallets. Verbinde unten eine.'],
    connect: ['Connect a wallet', 'Tilknyt en wallet', 'Linkitä lompakko', 'Vincular un monedero', 'Koble til en lommebok', 'Anslut en plånbok', 'Relier un portefeuille', 'Wallet verbinden'],
    detected: ['Detected in this browser', 'Fundet i denne browser', 'Havaittu tässä selaimessa', 'Detectado en este navegador', 'Funnet i denne nettleseren', 'Hittad i denna webbläsare', 'Détecté dans ce navigateur', 'In diesem Browser erkannt'],
    popular: ['Mobile & other wallets', 'Mobile og andre wallets', 'Mobiili- ja muut lompakot', 'Móviles y otros monederos', 'Mobil og andre lommebøker', 'Mobila och andra plånböcker', 'Mobiles et autres portefeuilles', 'Mobile & andere Wallets'],
    scan: ['Scan QR with your wallet app', 'Scan QR med din wallet-app', 'Skannaa QR lompakkosovelluksella', 'Escanea el QR con tu app de monedero', 'Skann QR med wallet-appen din', 'Skanna QR med din plånboksapp', 'Scannez le QR avec votre app', 'QR mit deiner Wallet-App scannen'],
    watch: ['Add a watch-only address', 'Tilføj en se-kun-adresse', 'Lisää vain katseluun -osoite', 'Añadir una dirección solo lectura', 'Legg til en kun-visning-adresse', 'Lägg till en bevaknings­adress', 'Ajouter une adresse en lecture seule', 'Nur-Ansicht-Adresse hinzufügen'],
    watchSub: ['Paste a public address to track its balance. View only — nothing can be moved.', 'Indsæt en offentlig adresse for at følge saldoen. Kun visning — intet kan flyttes.', 'Liitä julkinen osoite saldon seuraamiseksi. Vain katselu — mitään ei voi siirtää.', 'Pega una dirección pública para ver su saldo. Solo lectura: no se puede mover nada.', 'Lim inn en offentlig adresse for å følge saldoen. Kun visning — ingenting kan flyttes.', 'Klistra in en publik adress för att se saldot. Endast visning — inget kan flyttas.', 'Collez une adresse publique pour suivre le solde. Lecture seule — rien ne peut bouger.', 'Füge eine öffentliche Adresse ein, um den Saldo zu sehen. Nur Ansicht — nichts bewegbar.'],
    addrPh: ['Public address (0x… or bc1…)', 'Offentlig adresse (0x… eller bc1…)', 'Julkinen osoite (0x… tai bc1…)', 'Dirección pública (0x… o bc1…)', 'Offentlig adresse (0x… eller bc1…)', 'Publik adress (0x… eller bc1…)', 'Adresse publique (0x… ou bc1…)', 'Öffentliche Adresse (0x… oder bc1…)'],
    labelPh: ['Name (optional)', 'Navn (valgfrit)', 'Nimi (valinnainen)', 'Nombre (opcional)', 'Navn (valgfritt)', 'Namn (valfritt)', 'Nom (facultatif)', 'Name (optional)'],
    add: ['Add', 'Tilføj', 'Lisää', 'Añadir', 'Legg til', 'Lägg till', 'Ajouter', 'Hinzufügen'],
    remove: ['Remove', 'Fjern', 'Poista', 'Quitar', 'Fjern', 'Ta bort', 'Retirer', 'Entfernen'],
    removeQ: ['Remove this wallet from your account?', 'Fjern denne wallet fra din konto?', 'Poistetaanko tämä lompakko tililtäsi?', '¿Quitar este monedero de tu cuenta?', 'Fjerne denne lommeboken fra kontoen din?', 'Ta bort denna plånbok från ditt konto?', 'Retirer ce portefeuille de votre compte ?', 'Diese Wallet aus deinem Konto entfernen?'],
    verified: ['Verified', 'Verificeret', 'Vahvistettu', 'Verificado', 'Verifisert', 'Verifierad', 'Vérifié', 'Verifiziert'],
    watchTag: ['Watch-only', 'Se-kun', 'Vain katselu', 'Solo lectura', 'Kun visning', 'Bevakning', 'Lecture seule', 'Nur Ansicht'],
    connecting: ['Connecting…', 'Tilknytter…', 'Yhdistetään…', 'Conectando…', 'Kobler til…', 'Ansluter…', 'Connexion…', 'Verbinde…'],
    approve: ['Approve the connection in your wallet…', 'Godkend forbindelsen i din wallet…', 'Hyväksy yhteys lompakossasi…', 'Aprueba la conexión en tu monedero…', 'Godkjenn tilkoblingen i lommeboken…', 'Godkänn anslutningen i din plånbok…', 'Approuvez la connexion dans votre portefeuille…', 'Bestätige die Verbindung in deiner Wallet…'],
    signMsg: ['Nordic — prove you own this wallet', 'Nordic — bevis at du ejer denne wallet', 'Nordic — todista omistavasi tämä lompakko', 'Nordic — demuestra que posees este monedero', 'Nordic — bevis at du eier denne lommeboken', 'Nordic — bevisa att du äger denna plånbok', 'Nordic — prouvez que ce portefeuille est le vôtre', 'Nordic — beweise, dass dir diese Wallet gehört'],
    done: ['Wallet connected', 'Wallet tilknyttet', 'Lompakko linkitetty', 'Monedero vinculado', 'Lommebok tilkoblet', 'Plånbok ansluten', 'Portefeuille relié', 'Wallet verbunden'],
    noInj: ['No wallet extension found in this browser. Use a mobile wallet (QR) or add a watch-only address.', 'Ingen wallet-udvidelse fundet. Brug en mobil wallet (QR) eller tilføj en se-kun-adresse.', 'Lompakkolaajennusta ei löytynyt. Käytä mobiililompakkoa (QR) tai lisää katseluosoite.', 'No se encontró extensión de monedero. Usa un monedero móvil (QR) o una dirección solo lectura.', 'Ingen wallet-utvidelse funnet. Bruk en mobil lommebok (QR) eller legg til en kun-visning-adresse.', 'Ingen plånbokstillägg hittades. Använd en mobil plånbok (QR) eller en bevakningsadress.', 'Aucune extension trouvée. Utilisez un portefeuille mobile (QR) ou une adresse en lecture seule.', 'Keine Wallet-Erweiterung gefunden. Nutze eine mobile Wallet (QR) oder eine Nur-Ansicht-Adresse.'],
    rejected: ['Connection cancelled in the wallet.', 'Forbindelse annulleret i walletten.', 'Yhteys peruttiin lompakossa.', 'Conexión cancelada en el monedero.', 'Tilkobling avbrutt i lommeboken.', 'Anslutning avbröts i plånboken.', 'Connexion annulée dans le portefeuille.', 'Verbindung in der Wallet abgebrochen.'],
    safe: ['Nordic will never ask for your 12/24-word recovery phrase or wallet password. Anyone who asks for them is trying to steal your funds.', 'Nordic beder aldrig om din 12/24-ords genoprettelsessætning eller wallet-adgangskode. Enhver, der gør, forsøger at stjæle dine penge.', 'Nordic ei koskaan kysy 12/24 sanan palautuslausetta tai lompakon salasanaa. Jokainen joka kysyy, yrittää varastaa varasi.', 'Nordic nunca pedirá tu frase de recuperación de 12/24 palabras ni la contraseña del monedero. Quien las pida intenta robarte.', 'Nordic ber aldri om gjenopprettingsfrasen på 12/24 ord eller wallet-passordet. Alle som spør, prøver å stjele pengene dine.', 'Nordic ber aldrig om din återställningsfras på 12/24 ord eller plånbokslösenord. Den som frågar försöker stjäla dina pengar.', 'Nordic ne demandera jamais votre phrase de récupération de 12/24 mots ni le mot de passe du portefeuille. Quiconque les demande veut vous voler.', 'Nordic fragt niemals nach deiner 12/24-Wörter-Wiederherstellungsphrase oder dem Wallet-Passwort. Wer danach fragt, will dich bestehlen.'],
    close: ['Close', 'Luk', 'Sulje', 'Cerrar', 'Lukk', 'Stäng', 'Fermer', 'Schließen'],
    wcSoon: ['Mobile QR connection isn’t configured yet. For now, connect a browser extension or add a watch-only address.', 'Mobil QR-forbindelse er ikke konfigureret endnu. Tilknyt en browserudvidelse eller tilføj en se-kun-adresse.', 'Mobiili-QR-yhteyttä ei ole vielä määritetty. Yhdistä selainlaajennus tai lisää katseluosoite.', 'La conexión por QR móvil aún no está configurada. Conecta una extensión o añade una dirección solo lectura.', 'Mobil QR-tilkobling er ikke konfigurert ennå. Koble til en nettleserutvidelse eller legg til en kun-visning-adresse.', 'Mobil QR-anslutning är inte konfigurerad ännu. Anslut ett webbläsartillägg eller lägg till en bevakningsadress.', 'La connexion QR mobile n’est pas encore configurée. Reliez une extension ou ajoutez une adresse en lecture seule.', 'Mobile QR-Verbindung ist noch nicht eingerichtet. Verbinde eine Browser-Erweiterung oder füge eine Nur-Ansicht-Adresse hinzu.'],
    roNote: ['Read-only — wallets this client has linked.', 'Skrivebeskyttet — wallets denne klient har tilknyttet.', 'Vain luku — tämän asiakkaan linkittämät lompakot.', 'Solo lectura: monederos que este cliente ha vinculado.', 'Skrivebeskyttet — lommebøker denne klienten har koblet til.', 'Skrivskyddat — plånböcker denna klient har länkat.', 'Lecture seule — portefeuilles reliés par ce client.', 'Nur Ansicht — von diesem Kunden verknüpfte Wallets.'],
    entry: ['My wallets', 'Mine wallets', 'Omat lompakot', 'Mis monederos', 'Mine lommebøker', 'Mina plånböcker', 'Mes portefeuilles', 'Meine Wallets'],
    entrySub: ['Connect MetaMask, Trust, Exodus…', 'Tilknyt MetaMask, Trust, Exodus…', 'Linkitä MetaMask, Trust, Exodus…', 'Vincula MetaMask, Trust, Exodus…', 'Koble til MetaMask, Trust, Exodus…', 'Anslut MetaMask, Trust, Exodus…', 'Reliez MetaMask, Trust, Exodus…', 'MetaMask, Trust, Exodus verbinden…']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k]; if (!a) return k; var s = a[LG.indexOf(lang())] || a[0]; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function isClient() { try { return !!tok() && localStorage.getItem('user_role') !== 'admin' && !window.adminViewingEmail; } catch (e) { return false; } }
  /* admin "viewing as client": allow opening the screen READ-ONLY to see that client's linked wallets */
  function isViewer() { try { return !!window.adminViewingEmail; } catch (e) { return false; } }
  function canOpen() { return isClient() || isViewer(); }
  function wurl() { return window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev'; }
  function post(action, body) { var b = Object.assign({ token: tok() }, body || {}); if (isViewer()) b.email = window.adminViewingEmail; return fetch(wurl() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; }); }
  function toast(t) { try { if (typeof window.toast === 'function') return window.toast(t); } catch (e) { } }
  function short(a) { a = String(a || ''); return a.length > 14 ? a.slice(0, 7) + '…' + a.slice(-5) : a; }

  var I = {
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3m4 0v4m-4 0h4m-7 0h0"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
  };
  /* generic, non-logo tiles for popular wallets (brand marks are avoided; names shown as text) */
  var POP = [
    { id: 'metamask', name: 'MetaMask', c1: '#f6851b', c2: '#e2761b', g: 'M' },
    { id: 'trust', name: 'Trust Wallet', c1: '#3375bb', c2: '#2a62a0', g: 'T' },
    { id: 'exodus', name: 'Exodus', c1: '#8b5cf6', c2: '#6d28d9', g: 'E' },
    { id: 'coinbase', name: 'Coinbase Wallet', c1: '#2158f6', c2: '#1545c6', g: 'C' }
  ];

  function css() {
    if ($('nwCss')) return; var s = document.createElement('style'); s.id = 'nwCss';
    s.textContent = [
      '#nw{position:fixed;inset:0;z-index:100052;display:none;align-items:center;justify-content:center;padding:16px;font-family:inherit;color:#eef5f2}#nw.on{display:flex}',
      '#nw .nw-ov{position:absolute;inset:0;background:rgba(2,5,7,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
      '#nw .nw-w{position:relative;width:min(540px,100%);max-height:calc(100vh - 32px);overflow:hidden auto;border-radius:28px;background:linear-gradient(180deg,#161d1f,#0a0e10);border:1px solid rgba(255,255,255,.08);box-shadow:0 60px 140px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1);padding:22px 22px 20px;scrollbar-width:thin}',
      '#nw .nw-w:before{content:"";position:absolute;left:-70px;top:-100px;width:300px;height:190px;border-radius:50%;background:#62e8c2;opacity:.16;filter:blur(44px);pointer-events:none}#nw .nw-w>*{position:relative}',
      '#nw .nw-x{position:absolute;right:16px;top:16px;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#c6d2ce;cursor:pointer;font-size:18px;line-height:1;z-index:3}',
      '#nw .nw-hi{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(140deg,#a3fbe3,#45cfa8);color:#03251b;margin-bottom:12px}#nw .nw-hi svg{width:24px;height:24px}',
      '#nw h2{margin:0;font-size:21px;font-weight:760;letter-spacing:-.02em}#nw .nw-sub{margin:4px 0 16px;font-size:12.5px;color:#93a39e;line-height:1.5;max-width:92%}',
      '#nw .nw-lbl{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#86968f;margin:16px 2px 9px}',
      '#nw .nw-card{border-radius:20px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);padding:7px}',
      '#nw .nw-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:14px}',
      '#nw .nw-ava{width:40px;height:40px;border-radius:12px;flex:none;display:grid;place-items:center;font-weight:800;font-size:16px;color:#fff;overflow:hidden}#nw .nw-ava img{width:100%;height:100%;object-fit:cover}',
      '#nw .nw-m{min-width:0;flex:1}#nw .nw-m b{display:block;font-size:14.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#nw .nw-m small{display:block;font-size:12px;color:#93a39e;font-family:ui-monospace,Menlo,monospace;margin-top:1px}',
      '#nw .nw-tag{flex:none;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:750}#nw .nw-tag.v{background:rgba(98,232,194,.14);color:#62e8c2}#nw .nw-tag.w{background:rgba(255,255,255,.07);color:#a7b3ae}#nw .nw-tag svg{width:11px;height:11px}',
      '#nw .nw-del{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(255,107,122,.1);border:1px solid rgba(255,107,122,.14);color:#ff8d9a;cursor:pointer}#nw .nw-del svg{width:15px;height:15px}',
      '#nw .nw-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '#nw button.nw-tile{display:flex;align-items:center;gap:11px;padding:12px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);color:#eef5f2;font:inherit;font-weight:620;font-size:13.5px;cursor:pointer;text-align:left;transition:transform .14s,border-color .14s}#nw button.nw-tile:hover{transform:translateY(-1px);border-color:rgba(98,232,194,.4)}',
      '#nw .nw-tile .nw-ava{width:36px;height:36px;border-radius:11px;font-size:15px}#nw .nw-tile span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#nw .nw-ava.br{position:relative;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -2px 4px rgba(0,0,0,.25),0 4px 12px var(--glow,rgba(0,0,0,.3));border:1px solid rgba(255,255,255,.14)}',
      '#nw .nw-ava.br:after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(120% 80% at 30% 20%,rgba(255,255,255,.4),transparent 60%);opacity:.5;pointer-events:none}',
      '#nw .nw-tile .nw-ava img{border-radius:9px}',
      '#nw .nw-tile.on{border-color:rgba(98,232,194,.5);box-shadow:0 0 0 1px rgba(98,232,194,.25)}',
      '#nw .nw-wa{margin-top:9px;display:flex;gap:8px}#nw .nw-wa input{flex:1;min-width:0;height:46px;padding:0 13px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fff;font:inherit;font-size:13.5px;outline:none}#nw .nw-wa input:focus{border-color:rgba(98,232,194,.55);box-shadow:0 0 0 4px rgba(98,232,194,.1)}#nw .nw-wa input.bad{border-color:#ff6b7a}',
      '#nw .nw-wl{margin-top:8px}#nw .nw-wl input{width:100%;box-sizing:border-box;height:42px;padding:0 13px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fff;font:inherit;font-size:13.5px;outline:none}',
      '#nw .nw-addbtn{flex:none;padding:0 18px;height:46px;border-radius:13px;border:0;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;font:inherit;font-weight:720;font-size:14px;cursor:pointer}#nw .nw-addbtn[disabled]{opacity:.55;cursor:default}',
      '#nw .nw-note{margin:10px 2px 0;font-size:12px;color:#93a39e;line-height:1.5}',
      '#nw .nw-safe{margin-top:16px;display:flex;gap:10px;padding:12px 13px;border-radius:16px;background:rgba(255,194,74,.07);border:1px solid rgba(255,194,74,.22);font-size:12px;line-height:1.5;color:#e8d9b4}#nw .nw-safe svg{width:18px;height:18px;flex:none;color:#ffc24a;margin-top:1px}',
      '#nw .nw-busy{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,12,14,.86);border-radius:28px;z-index:4;text-align:center;padding:30px}#nw.busy .nw-busy{display:flex}',
      '#nw .nw-spin{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:#62e8c2;animation:nwSp 1s linear infinite}@keyframes nwSp{to{transform:rotate(360deg)}}',
      '#nw .nw-busy b{font-size:15px;font-weight:650}#nw .nw-busy small{font-size:12.5px;color:#9fb6ae;max-width:280px}',
      '#nw .nw-close{width:100%;height:50px;margin-top:16px;border-radius:15px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e6efeb;font:inherit;font-weight:700;font-size:14.5px;cursor:pointer}',
      '@media(max-width:760px){#nw{align-items:flex-end;padding:0}#nw .nw-w{width:100%;max-height:94dvh;border-radius:26px 26px 0 0;border-bottom:0}#nw .nw-tiles{grid-template-columns:1fr}}',
      /* light theme */
      'html[data-theme="light"] #nw .nw-w{background:linear-gradient(180deg,#fff,#f4f7f3);color:#0c111b;border-color:rgba(15,23,42,.1)}',
      'html[data-theme="light"] #nw h2{color:#0c111b}html[data-theme="light"] #nw .nw-card,html[data-theme="light"] #nw button.nw-tile,html[data-theme="light"] #nw .nw-wa input,html[data-theme="light"] #nw .nw-wl input{background:#fff;border-color:rgba(15,23,42,.1);color:#0c111b}',
      'html[data-theme="light"] #nw .nw-m small,html[data-theme="light"] #nw .nw-sub,html[data-theme="light"] #nw .nw-note{color:#475569}html[data-theme="light"] #nw .nw-x{background:#fff;border-color:rgba(15,23,42,.12);color:#1e293b}',
      'html[data-theme="light"] #nw .nw-busy{background:rgba(255,255,255,.92)}html[data-theme="light"] #nw .nw-busy b{color:#0c111b}html[data-theme="light"] #nw .nw-close{background:#fff;border-color:rgba(15,23,42,.12);color:#1e293b}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ───────── EIP-6963 provider discovery ───────── */
  var providers = [];
  function onAnnounce(e) {
    try {
      var d = e.detail; if (!d || !d.provider || !d.info) return;
      if (!providers.some(function (p) { return p.info.uuid === d.info.uuid; })) providers.push(d);
      if (isOpen()) renderConnect();
    } catch (x) { }
  }
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  function discover() { providers = []; try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (x) { } }
  function injectedList() {
    var list = providers.slice();
    if (!list.length && window.ethereum) {
      var name = window.ethereum.isMetaMask ? 'MetaMask' : window.ethereum.isTrust ? 'Trust Wallet' : window.ethereum.isCoinbaseWallet ? 'Coinbase Wallet' : 'Browser wallet';
      list = [{ info: { name: name, icon: '', uuid: 'legacy' }, provider: window.ethereum }];
    }
    return list;
  }

  /* if a popular wallet is actually installed, reuse the OFFICIAL icon it supplies via EIP-6963
     (the wallet distributes its own logo for exactly this) — we never hand-draw a brand mark */
  function injMatch(id) {
    return injectedList().filter(function (p) {
      var n = (p.info.name || '').toLowerCase(), pr = p.provider || {};
      return (id === 'metamask' && (pr.isMetaMask || /metamask/.test(n))) ||
        (id === 'trust' && (pr.isTrust || pr.isTrustWallet || /trust/.test(n))) ||
        (id === 'coinbase' && (pr.isCoinbaseWallet || /coinbase/.test(n))) ||
        (id === 'exodus' && (pr.isExodus || /exodus/.test(n)));
    })[0];
  }

  function hexMsg(s) { var o = '0x'; for (var i = 0; i < s.length; i++) { var h = s.charCodeAt(i).toString(16); o += h.length < 2 ? '0' + h : h; } return o; }

  function connectInjected(entry) {
    var prov = entry.provider, nm = entry.info.name;
    busy(T('approve'));
    prov.request({ method: 'eth_requestAccounts' }).then(function (accs) {
      var addr = (accs && accs[0] || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(addr)) throw { code: 0 };
      var msg = T('signMsg') + '\nAddress: ' + addr + '\n' + new Date().toISOString();
      return prov.request({ method: 'personal_sign', params: [hexMsg(msg), addr] })
        .then(function () { return { addr: addr, verified: true }; }, function () { return { addr: addr, verified: false }; });
    }).then(function (r) {
      return post('wallets', { op: 'save', type: 'evm', chain: 'ethereum', label: nm, address: r.addr, verified: r.verified });
    }).then(function (d) {
      unbusy();
      if (d && d.ok) { WALLETS = d.wallets || WALLETS; toast('✓ ' + T('done')); render(); }
      else toast((d && d.error) || T('rejected'));
    }).catch(function (err) {
      unbusy();
      toast(err && (err.code === 4001 || err.code === 0) ? T('rejected') : T('rejected'));
    });
  }

  function popularClick(id) {
    /* if the wallet injects a provider, use it; otherwise it's a mobile wallet → QR (or guidance) */
    var inj = injectedList(), match = inj.filter(function (p) {
      var n = (p.info.name || '').toLowerCase();
      return (id === 'metamask' && (p.provider.isMetaMask || /metamask/.test(n))) ||
        (id === 'trust' && (p.provider.isTrust || /trust/.test(n))) ||
        (id === 'coinbase' && (p.provider.isCoinbaseWallet || /coinbase/.test(n))) ||
        (id === 'exodus' && /exodus/.test(n));
    })[0];
    if (match) return connectInjected(match);
    openWC();
  }

  function openWC() {
    if (window.NC_WC_PROJECT_ID && window.NCWalletConnect && typeof window.NCWalletConnect.open === 'function') {
      try { return window.NCWalletConnect.open({ onAddress: saveWatched }); } catch (x) { }
    }
    toast(T('wcSoon'));
  }
  function saveWatched(addr, label) {
    var a = String(addr || '').trim(); var type = /^0x/i.test(a) ? 'evm' : 'btc';
    return post('wallets', { op: 'save', type: type, chain: type === 'btc' ? 'bitcoin' : 'ethereum', label: label || 'Wallet', address: a, verified: false })
      .then(function (d) { if (d && d.ok) { WALLETS = d.wallets || WALLETS; toast('✓ ' + T('done')); render(); } else toast((d && d.error) || 'Error'); return d; });
  }

  function addWatch() {
    var inp = $('nwAddr'), lab = $('nwLabel'); if (!inp) return;
    var a = inp.value.trim();
    var evm = /^0x[0-9a-fA-F]{40}$/.test(a), btc = /^(bc1[a-z0-9]{20,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/.test(a);
    if (!evm && !btc) { inp.classList.add('bad'); inp.focus(); return; }
    var btn = $('nwAddBtn'); if (btn) { btn.disabled = true; }
    var type = evm ? 'evm' : 'btc';
    post('wallets', { op: 'save', type: type, chain: type === 'btc' ? 'bitcoin' : 'ethereum', label: (lab && lab.value.trim()) || (evm ? 'Ethereum wallet' : 'Bitcoin wallet'), address: a, verified: false })
      .then(function (d) { if (btn) btn.disabled = false; if (d && d.ok) { WALLETS = d.wallets || WALLETS; toast('✓ ' + T('done')); render(); } else { toast((d && d.error) || 'Error'); } });
  }

  function removeWallet(id) {
    if (!window.confirm(T('removeQ'))) return;
    post('wallets', { op: 'remove', id: id }).then(function (d) { if (d && d.ok) { WALLETS = d.wallets || WALLETS; render(); } });
  }

  /* ───────── rendering ───────── */
  var WALLETS = [], el = null;
  function isOpen() { return !!el && el.classList.contains('on'); }
  function busy(msg) { if (!el) return; var b = el.querySelector('.nw-busy small'); if (b) b.textContent = msg || ''; el.classList.add('busy'); }
  function unbusy() { if (el) el.classList.remove('busy'); }

  function avatar(info, fallbackGlyph, c1, c2) {
    var glow = (c1 || '#45cfa8') + '55';
    if (info && info.icon) return '<span class="nw-ava br" style="--glow:' + glow + '"><img src="' + esc(info.icon) + '" alt=""></span>';
    return '<span class="nw-ava br" style="background:linear-gradient(145deg,' + (c1 || '#45cfa8') + ',' + (c2 || '#2a9d7c') + ');--glow:' + glow + '">' + esc(fallbackGlyph || '•') + '</span>';
  }

  function renderConnect() {
    var inj = injectedList(), host = el && el.querySelector('#nwInj'); if (!host) return;
    if (inj.length) {
      host.parentNode.style.display = '';
      host.innerHTML = inj.map(function (p, i) {
        var g = (p.info.name || 'W').charAt(0).toUpperCase();
        return '<button type="button" class="nw-tile" data-nw="inj" data-i="' + i + '">' + avatar(p.info, g, '#45cfa8', '#2a9d7c') + '<span>' + esc(p.info.name || 'Wallet') + '</span></button>';
      }).join('');
    } else { host.parentNode.style.display = 'none'; }
  }

  function render() {
    if (!el) return;
    var ro = isViewer(); /* admin preview = read-only */
    var wl = WALLETS.map(function (w) {
      var g = (w.label || 'W').charAt(0).toUpperCase();
      var pop = POP.filter(function (p) { return (w.label || '').toLowerCase().indexOf(p.id) > -1 || (w.label || '').toLowerCase() === p.name.toLowerCase(); })[0];
      return '<div class="nw-item">' + avatar(null, g, pop ? pop.c1 : '#3a4a52', pop ? pop.c2 : '#222c32') +
        '<div class="nw-m"><b>' + esc(w.label || 'Wallet') + '</b><small>' + esc(ro ? w.address : short(w.address)) + '</small></div>' +
        '<span class="nw-tag ' + (w.verified ? 'v' : 'w') + '">' + (w.verified ? I.check + T('verified') : I.eye + T('watchTag')) + '</span>' +
        (ro ? '' : '<button type="button" class="nw-del" data-nw="del" data-id="' + esc(w.id) + '" aria-label="' + esc(T('remove')) + '">' + I.trash + '</button>') + '</div>';
    }).join('');

    var popTiles = POP.map(function (p) {
      var m = injMatch(p.id), ava;
      if (m && m.info && m.info.icon) ava = '<span class="nw-ava br" style="--glow:' + p.c1 + '55"><img src="' + esc(m.info.icon) + '" alt=""></span>';
      else ava = '<span class="nw-ava br" style="background:linear-gradient(145deg,' + p.c1 + ',' + p.c2 + ');--glow:' + p.c1 + '55">' + p.g + '</span>';
      return '<button type="button" class="nw-tile" data-nw="pop" data-id="' + p.id + '">' + ava + '<span>' + esc(p.name) + '</span></button>';
    }).join('') + '<button type="button" class="nw-tile" data-nw="wc"><span class="nw-ava br" style="background:linear-gradient(145deg,#3b99fc,#1a6fe0);--glow:#3b99fc55">' + I.qr + '</span><span>' + esc(T('scan')) + '</span></button>';

    el.querySelector('.nw-w').innerHTML =
      '<button type="button" class="nw-x" data-nw="x" aria-label="' + esc(T('close')) + '">×</button>' +
      '<div class="nw-hi">' + I.wallet + '</div>' +
      '<h2>' + esc(T('title')) + '</h2><p class="nw-sub">' + esc(ro ? T('roNote') : T('sub')) + '</p>' +
      (ro
        ? (WALLETS.length ? '<div class="nw-lbl">' + esc(T('connected')) + '</div><div class="nw-card">' + wl + '</div>'
          : '<div class="nw-card" style="padding:18px 14px;text-align:center;color:#93a39e;font-size:13.5px">' + esc(T('none')) + '</div>')
        : (
          (WALLETS.length ? '<div class="nw-lbl">' + esc(T('connected')) + '</div><div class="nw-card">' + wl + '</div>' : '') +
          '<div class="nw-lbl">' + esc(T('connect')) + '</div>' +
          '<div id="nwInjWrap"><div class="nw-lbl" style="margin-top:0;color:#62e8c2">' + esc(T('detected')) + '</div><div class="nw-tiles" id="nwInj"></div></div>' +
          '<div class="nw-lbl">' + esc(T('popular')) + '</div><div class="nw-tiles">' + popTiles + '</div>' +
          '<div class="nw-lbl">' + esc(T('watch')) + '</div><p class="nw-note" style="margin-top:-2px">' + esc(T('watchSub')) + '</p>' +
          '<div class="nw-wl"><input id="nwLabel" maxlength="32" placeholder="' + esc(T('labelPh')) + '"></div>' +
          '<div class="nw-wa"><input id="nwAddr" autocomplete="off" spellcheck="false" placeholder="' + esc(T('addrPh')) + '"><button type="button" class="nw-addbtn" id="nwAddBtn" data-nw="add">' + esc(T('add')) + '</button></div>' +
          '<div class="nw-safe">' + I.shield + '<span>' + esc(T('safe')) + '</span></div>'
        )) +
      '<button type="button" class="nw-close" data-nw="x">' + esc(T('close')) + '</button>' +
      '<div class="nw-busy"><div class="nw-spin"></div><b>' + esc(T('connecting')) + '</b><small></small></div>';
    if (!ro) renderConnect();
  }

  function open() {
    if (!canOpen()) return;
    css();
    if (!el) {
      el = document.createElement('div'); el.id = 'nw'; el.className = 'nc-no-i18n'; el.setAttribute('data-nci18n', 'off'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.innerHTML = '<div class="nw-ov" data-nw="x"></div><div class="nw-w"></div>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-nw]'); if (!b) return;
        var k = b.getAttribute('data-nw');
        if (k === 'x') return close();
        if (k === 'add') return addWatch();
        if (k === 'wc') return openWC();
        if (k === 'pop') return popularClick(b.getAttribute('data-id'));
        if (k === 'del') return removeWallet(b.getAttribute('data-id'));
        if (k === 'inj') { var i = +b.getAttribute('data-i'); var inj = injectedList(); if (inj[i]) connectInjected(inj[i]); return; }
      });
      el.addEventListener('input', function (e) { if (e.target && e.target.id === 'nwAddr') e.target.classList.remove('bad'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
    }
    render();
    el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    discover();
    post('wallets', { op: 'list' }).then(function (d) { if (d && d.ok) { WALLETS = d.wallets || []; if (isOpen()) render(); } });
  }
  function close() { if (!el) return; el.classList.remove('on', 'busy'); document.documentElement.style.overflow = ''; }

  window.NCWallets = { open: open, close: close };
  window.openWallets = open;

  /* sidebar entry "My wallets": intercept in the capture phase so the legacy page-switcher's own
     onclick never runs (which would blank the page) — we just open the overlay instead. */
  function navLabel() { var li = $('navWallets'); if (!li) return; var tx = li.querySelector('.tx'); if (tx && tx.textContent !== T('entry')) tx.textContent = T('entry'); li.setAttribute('title', T('entry')); }
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('#navWallets');
    if (!li) return;
    e.stopPropagation(); e.preventDefault();
    try { var ms = document.querySelectorAll('.mi'); for (var i = 0; i < ms.length; i++) ms[i].classList.remove('on'); } catch (x) { }
    open();
  }, true);
  navLabel();
  window.addEventListener('nc-lang', function () { navLabel(); if (isOpen()) render(); });
  document.addEventListener('DOMContentLoaded', navLabel);
  setTimeout(navLabel, 1500);
})();
