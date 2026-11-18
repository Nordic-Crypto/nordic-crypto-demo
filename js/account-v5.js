/* NordicCrypto — account-v5.js v1
   Settings and Limits in the new design.
   Settings: profile card (photo, name, e-mail) on top, two tabs (Account · Security) instead of one long scroll,
   icon rows, sticky Log out / Close, phone sheet / desktop window, dark + light. Every original element, id and
   handler is kept (language chips, change password / e-mail, 2FA + devices card, delete account, install app).
   Limits: same window and data (limits-pro.js), restyled: clear cards with a usage ring, segmented slots,
   mint progress bar and buttons. Load after limits-pro.js, client-security.js and avatar-pro.js. */
(function () {
  'use strict';
  if (window.__ncAccV5) return; window.__ncAccV5 = 1;
  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    acc: ['Account', 'Konto', 'Tili', 'Cuenta', 'Konto', 'Konto', 'Compte', 'Konto'],
    sec: ['Security', 'Sikkerhed', 'Turvallisuus', 'Seguridad', 'Sikkerhet', 'Säkerhet', 'Sécurité', 'Sicherheit'],
    photo: ['Change photo', 'Skift billede', 'Vaihda kuva', 'Cambiar foto', 'Bytt bilde', 'Byt bild', 'Changer la photo', 'Foto ändern'],
    sub: ['Manage your account', 'Administrer din konto', 'Hallinnoi tiliäsi', 'Gestiona tu cuenta', 'Administrer kontoen din', 'Hantera ditt konto', 'Gérez votre compte', 'Konto verwalten'],
    wallets: ['My wallets', 'Mine wallets', 'Omat lompakot', 'Mis monederos', 'Mine lommebøker', 'Mina plånböcker', 'Mes portefeuilles', 'Meine Wallets'],
    walletsSub: ['Connect MetaMask, Trust, Exodus…', 'Tilknyt MetaMask, Trust, Exodus…', 'Linkitä MetaMask, Trust, Exodus…', 'Vincula MetaMask, Trust, Exodus…', 'Koble til MetaMask, Trust, Exodus…', 'Anslut MetaMask, Trust, Exodus…', 'Reliez MetaMask, Trust, Exodus…', 'MetaMask, Trust, Exodus verbinden…']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k) { var a = K[k]; return a ? a[LG.indexOf(lang())] || a[0] : k; }
  function $(id) { return document.getElementById(id); }
  var SV = {
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg>'
  };

  var s = document.createElement('style'); s.id = 'accV5Css';
  s.textContent =
/* ---------- settings ---------- */
'#settingsMask.sv5{z-index:100052!important;background:rgba(2,5,7,.62)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}' +
'#settingsMask.sv5 .box{position:relative;width:min(520px,calc(100vw - 32px))!important;max-width:none!important;max-height:calc(100vh - 40px)!important;padding:22px 24px 0!important;border-radius:30px!important;overflow-x:hidden!important;overflow-y:auto!important;color:#eef5f2;background:linear-gradient(180deg,#161d1f,#0a0e10)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:0 60px 140px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1)!important;scrollbar-width:thin}' +
'#settingsMask.sv5 .sv-au{position:absolute;left:0;right:0;top:0;height:200px;pointer-events:none;overflow:hidden;-webkit-mask:linear-gradient(#000 30%,transparent);mask:linear-gradient(#000 30%,transparent)}#settingsMask.sv5 .sv-au i{position:absolute;border-radius:50%;filter:blur(44px)}#settingsMask.sv5 .sv-au i:nth-child(1){width:300px;height:190px;left:-70px;top:-100px;background:#62e8c2;opacity:.18}#settingsMask.sv5 .sv-au i:nth-child(2){width:260px;height:170px;right:-70px;top:-90px;background:#b49cff;opacity:.12}' +
'#settingsMask.sv5 .box>*:not(.sv-au):not(.sv-x){position:relative;z-index:1}' +
'#settingsMask.sv5 .sv-grab{display:none;width:40px;height:5px;border-radius:9px;background:rgba(255,255,255,.22);margin:-8px auto 12px}' +
'#settingsMask.sv5 .box>h2{margin:0!important;font-size:22px!important;font-weight:760!important;letter-spacing:-.02em}#settingsMask.sv5 .box>p.d{margin:2px 0 14px!important;font-size:12.5px!important;color:#93a39e!important}' +
'#settingsMask.sv5 .sv-x{position:absolute;right:20px;top:20px;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#c6d2ce;cursor:pointer;z-index:2;font-size:18px;line-height:1}' +
'#settingsMask.sv5 .sv-prof{display:flex;align-items:center;gap:14px;padding:14px;border-radius:22px;margin-bottom:14px;background:linear-gradient(135deg,#123129,#0c1a17 55%,#16130a);border:1px solid rgba(98,232,194,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}' +
'#settingsMask.sv5 #ncAvSetW{margin:0!important;flex:none;display:flex!important;flex-direction:column;align-items:center;gap:4px}#settingsMask.sv5 #ncAvSet{width:68px!important;height:68px!important;margin:0!important}#settingsMask.sv5 #ncAvSetW>div:last-child{font-size:11.5px!important;margin:0!important}' +
'#settingsMask.sv5 .sv-pk{min-width:0;flex:1}#settingsMask.sv5 .sv-pk .settings-row{padding:0!important;background:none!important;border:0!important;margin:0!important}#settingsMask.sv5 #settingsName{font-size:18px!important;font-weight:720!important}#settingsMask.sv5 #settingsEmail{font-size:12.5px!important;color:#9fb6ae!important;overflow-wrap:anywhere;margin-top:2px}#settingsMask.sv5 #settingsRole{margin-top:8px!important;display:inline-block;padding:3px 9px!important;border-radius:99px!important;background:rgba(98,232,194,.14)!important;color:#62e8c2!important;font-size:10.5px!important;font-weight:750!important}' +
'#settingsMask.sv5 .sv-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:16px;background:#131a1c;border:1px solid rgba(255,255,255,.07);margin-bottom:14px;position:sticky;top:-22px;z-index:4!important;backdrop-filter:blur(12px)}' +
'#settingsMask.sv5 .sv-tab{height:40px;border-radius:12px;border:0;background:none;color:#a7b3ae;font:inherit;font-weight:650;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px}#settingsMask.sv5 .sv-tab svg{width:16px;height:16px}#settingsMask.sv5 .sv-tab.on{background:rgba(98,232,194,.14);color:#62e8c2;box-shadow:inset 0 0 0 1px rgba(98,232,194,.35)}#settingsMask.sv5 .sv-tab em{width:8px;height:8px;border-radius:50%;background:#ffc24a;box-shadow:0 0 0 3px rgba(255,194,74,.18)}' +
'#settingsMask.sv5.sv-acc [data-sv="sec"],#settingsMask.sv5.sv-sec [data-sv="acc"],#settingsMask.sv5 [data-sv="hide"]{display:none!important}' +
/* higher-specificity hide overrides so ID-based display rules (e.g. #ncInstRow) can never leak a row into the wrong tab */
'#settingsMask.sv5.sv-sec #ncInstRow,#settingsMask.sv5.sv-sec #ncWalletRow,#settingsMask.sv5.sv-sec #ncLangRow,#settingsMask.sv5.sv-acc #csCard{display:none!important}' +
'#settingsMask.sv5 #ncLangRow{padding:14px!important;border-radius:20px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important;margin:0 0 12px!important}#settingsMask.sv5 #ncLangRowLabel,#settingsMask.sv5 .settings-label{font-size:11.5px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase;color:#86968f!important;margin:0 2px 10px!important}' +
'#settingsMask.sv5 .nc-lang-chip{border-radius:12px!important;padding:8px 11px!important}#settingsMask.sv5 .nc-lang-chip.on{background:rgba(98,232,194,.14)!important;border-color:rgba(98,232,194,.5)!important;color:#62e8c2!important}' +
'#settingsMask.sv5 .settings-section{border:0!important;padding:0!important;margin:0 0 12px!important}' +
'#settingsMask.sv5 .settings-btn-row{display:flex!important;align-items:center;gap:12px;width:100%;min-height:58px;padding:10px 14px!important;margin:0 0 8px!important;border-radius:18px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important;color:#eef5f2!important;font:inherit!important;font-weight:620!important;font-size:14.5px!important;text-align:left;transition:transform .15s,border-color .15s}#settingsMask.sv5 .settings-btn-row:hover{transform:translateY(-1px);border-color:rgba(98,232,194,.35)!important}' +
'#settingsMask.sv5 .settings-btn-row>span:not(.sv-ri):not(.sv-ch){flex:1;min-width:0}#settingsMask.sv5 #csCard .cs-btn{white-space:nowrap}#settingsMask.sv5 .sv-ri{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:rgba(98,232,194,.1);color:#62e8c2;flex:none}#settingsMask.sv5 .sv-ri svg{width:18px;height:18px}#settingsMask.sv5 .sv-ch{width:16px;height:16px;color:#6f807a;flex:none}' +
'#settingsMask.sv5 .settings-btn-row.danger{color:#ff8d9a!important}#settingsMask.sv5 .settings-btn-row.danger .sv-ri{background:rgba(255,107,122,.12);color:#ff6b7a}' +
'#settingsMask.sv5 #csCard{border-radius:20px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important;padding:16px!important;margin:0 0 12px!important}#settingsMask.sv5 #csCard .cs-btn{border-radius:13px!important}#settingsMask.sv5 #csCard .cs-btn:not(.ghost){background:linear-gradient(135deg,#a6fbe2,#45cfa8)!important;color:#03251b!important}#settingsMask.sv5 #csCard .cs-btn.ghost{width:100%!important;padding:12px!important}#settingsMask.sv5 #csCard .cs-sess{border-radius:14px}#settingsMask.sv5 #csCard .cs-ic{border-radius:12px!important}' +
'#settingsMask.sv5 #ncInstRow{display:flex!important;align-items:center;gap:12px;width:100%!important;min-height:58px;margin:0 0 12px!important;padding:10px 14px!important;border-radius:18px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important;color:#eef5f2!important;font:inherit!important;font-weight:620!important;font-size:14.5px!important;justify-content:flex-start!important}' +
'#settingsMask.sv5 .mact{position:sticky!important;bottom:0;z-index:5!important;margin:4px -24px 0!important;padding:14px 24px calc(18px + env(safe-area-inset-bottom))!important;background:linear-gradient(180deg,rgba(10,14,16,0),#0b0f11 32%)!important;display:grid!important;grid-template-columns:1fr 1.4fr;gap:8px!important;border:0!important}' +
'#settingsMask.sv5 .mact .btn{height:52px!important;border-radius:16px!important;justify-content:center!important;font-weight:700!important;font-size:15px!important;gap:8px}#settingsMask.sv5 #btnLogout{background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.09)!important;color:#ffb4bf!important}#settingsMask.sv5 #btnLogout svg{width:17px;height:17px}#settingsMask.sv5 #btnSettingsClose{background:linear-gradient(135deg,#a6fbe2,#45cfa8)!important;color:#03251b!important;border:0!important}' +
'@media (max-width:760px){#settingsMask.sv5{align-items:flex-end!important;padding:0!important}#settingsMask.sv5 .box{width:100%!important;max-height:94vh!important;max-height:94dvh!important;border-radius:28px 28px 0 0!important;border-bottom:0!important;padding:18px 16px 0!important;animation:svSheet .38s cubic-bezier(.2,.9,.25,1) both}#settingsMask.sv5 .sv-grab{display:block}#settingsMask.sv5 .sv-x{right:14px;top:16px}#settingsMask.sv5 .mact{margin:4px -16px 0!important;padding:14px 16px calc(16px + env(safe-area-inset-bottom))!important}#settingsMask.sv5 .sv-tabs{top:-18px}}' +
'@keyframes svSheet{from{transform:translateY(100%)}to{transform:none}}' +
'html[data-theme="light"] #settingsMask.sv5 .box{background:linear-gradient(180deg,#fff,#f4f7f3)!important;color:#0c111b;border-color:rgba(15,23,42,.1)!important;box-shadow:0 40px 100px rgba(15,23,42,.25)!important}html[data-theme="light"] #settingsMask.sv5 .sv-prof{background:linear-gradient(135deg,#e9f8f1,#f7fbf8 60%,#fdf8ea);border-color:rgba(10,122,86,.2)}html[data-theme="light"] #settingsMask.sv5 #settingsEmail{color:#475569!important}html[data-theme="light"] #settingsMask.sv5 #settingsRole{background:#e3f7f0!important;color:#0a7a56!important}' +
'html[data-theme="light"] #settingsMask.sv5 .sv-tabs{background:#f1f4f2;border-color:rgba(15,23,42,.08)}html[data-theme="light"] #settingsMask.sv5 .sv-tab{color:#475569}html[data-theme="light"] #settingsMask.sv5 .sv-tab.on{background:#fff;color:#0a7a56;box-shadow:0 1px 3px rgba(15,23,42,.12),inset 0 0 0 1px rgba(10,122,86,.3)}' +
'html[data-theme="light"] #settingsMask.sv5 #ncLangRow,html[data-theme="light"] #settingsMask.sv5 .settings-btn-row,html[data-theme="light"] #settingsMask.sv5 #csCard,html[data-theme="light"] #settingsMask.sv5 #ncInstRow{background:#fff!important;border-color:rgba(15,23,42,.09)!important;color:#0c111b!important}html[data-theme="light"] #settingsMask.sv5 .settings-btn-row.danger{color:#c42a44!important}html[data-theme="light"] #settingsMask.sv5 .sv-ri{background:#e9f8f2;color:#0a7a56}' +
'html[data-theme="light"] #settingsMask.sv5 .mact{background:linear-gradient(180deg,rgba(244,247,243,0),#f4f7f3 32%)!important}html[data-theme="light"] #settingsMask.sv5 #btnLogout{background:#fff!important;border-color:rgba(15,23,42,.12)!important;color:#c42a44!important}html[data-theme="light"] #settingsMask.sv5 #btnSettingsClose{background:linear-gradient(135deg,#14a37a,#0a7a56)!important;color:#fff!important}html[data-theme="light"] #settingsMask.sv5 .sv-x{background:#fff;border-color:rgba(15,23,42,.12);color:#1e293b}' +
/* ---------- limits (client window only, not the admin editor) ---------- */
'.ncl-ov:not(:has(.ncl-adm)){z-index:100052!important;background:rgba(2,5,7,.62)!important}' +
'.ncl-ov .ncl-box{position:relative;max-width:500px!important;padding:22px 24px 22px!important;border-radius:30px!important;font-family:inherit!important;color:#eef5f2!important;background:linear-gradient(180deg,#161d1f,#0a0e10)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:0 60px 140px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1)!important;overflow-x:hidden!important}' +
'.ncl-ov .ncl-box:before{content:"";position:absolute;left:-70px;top:-100px;width:300px;height:190px;border-radius:50%;background:#62e8c2;opacity:.16;filter:blur(44px);pointer-events:none}.ncl-ov .ncl-box>*{position:relative}' +
'.ncl-ov .ncl-h h2{font-size:22px!important;font-weight:760!important;letter-spacing:-.02em}.ncl-ov .ncl-x{width:36px!important;height:36px!important;border-radius:12px!important;border:1px solid rgba(255,255,255,.08)!important}.ncl-ov .ncl-sub{color:#93a39e!important;font-size:12.5px!important}' +
'.ncl-ov .ncl-card{position:relative;border-radius:22px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important;padding:14px 16px!important;margin-bottom:10px!important}' +
'.ncl-ov .ncl-top{display:flex;align-items:center;gap:11px;margin-bottom:8px}.ncl-ov .ncl-top b{font-size:15px;font-weight:680}.ncl-ov .ncx-ic{width:40px!important;height:40px!important;border-radius:13px!important;background:rgba(98,232,194,.1)!important;color:#62e8c2!important;border:0!important}' +
'.ncl-ov .ncl-chip{margin-left:auto;padding:4px 10px!important;border-radius:99px!important;font-size:11px!important;font-weight:750!important;background:rgba(98,232,194,.14)!important;color:#62e8c2!important}.ncl-ov .ncl-chip.bad{background:rgba(255,107,122,.14)!important;color:#ff8d9a!important}' +
'.ncl-ov .ncl-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0!important;font-size:13px}.ncl-ov .ncl-row span{color:#93a39e}.ncl-ov .ncl-row b{font-weight:650;font-variant-numeric:tabular-nums}' +
'.ncl-ov .ncl-dots{display:flex;gap:5px;margin:2px 0 6px}.ncl-ov .ncl-dots i{flex:1;height:8px!important;border-radius:9px!important;background:rgba(255,255,255,.08)!important}.ncl-ov .ncl-dots i.on{background:linear-gradient(90deg,#45cfa8,#62e8c2)!important}.ncl-ov .ncl-dots i.full{background:#ff6b7a!important}' +
'.ncl-ov .ncl-bar{height:8px!important;border-radius:9px!important;background:rgba(255,255,255,.08)!important;overflow:hidden;margin:2px 0 4px}.ncl-ov .ncl-bar span{display:block;height:100%;min-width:3px;border-radius:9px;background:linear-gradient(90deg,#45cfa8,#62e8c2)!important}' +
'.ncl-ov .ncl-note{font-size:12px!important;color:#93a39e!important;line-height:1.5;padding:11px 13px;border-radius:16px;background:rgba(98,232,194,.05);border:1px solid rgba(98,232,194,.14)}' +
'.ncl-ov .ncl-btn{height:52px!important;border-radius:16px!important;font-family:inherit!important;font-weight:700!important;font-size:15px!important;background:linear-gradient(135deg,#a6fbe2,#45cfa8)!important;color:#03251b!important;border:0!important;box-shadow:0 12px 30px -10px rgba(69,207,168,.45)!important}.ncl-ov .ncl-btn[style*="255,255,255"],.ncl-ov #nclSup,.ncl-ov #nrBack{background:rgba(255,255,255,.06)!important;color:#e6efeb!important;border:1px solid rgba(255,255,255,.1)!important;box-shadow:none!important}' +
'.ncl-ov .ncl-in{border-radius:14px!important;height:48px;background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.1)!important;color:#fff!important;font-family:inherit!important}.ncl-ov textarea.ncl-in{height:auto}' +
'@media (max-width:760px){.ncl-ov:not(:has(.ncl-adm)){align-items:flex-end!important;padding:0!important}.ncl-ov .ncl-box{max-width:none!important;max-height:94vh!important;border-radius:28px 28px 0 0!important;border-bottom:0!important;padding:20px 16px calc(18px + env(safe-area-inset-bottom))!important;animation:svSheet .38s cubic-bezier(.2,.9,.25,1) both}}' +
'html[data-theme="light"] .ncl-ov .ncl-box{background:linear-gradient(180deg,#fff,#f4f7f3)!important;color:#0c111b!important;border-color:rgba(15,23,42,.1)!important}html[data-theme="light"] .ncl-ov .ncl-card{background:#fff!important;border-color:rgba(15,23,42,.09)!important}html[data-theme="light"] .ncl-ov .ncl-row b,html[data-theme="light"] .ncl-ov .ncl-top b,html[data-theme="light"] .ncl-ov .ncl-h h2{color:#0c111b!important}html[data-theme="light"] .ncl-ov .ncx-ic{background:#e9f8f2!important;color:#0a7a56!important}html[data-theme="light"] .ncl-ov .ncl-chip{background:#e3f7f0!important;color:#0a7a56!important}html[data-theme="light"] .ncl-ov .ncl-row span,html[data-theme="light"] .ncl-ov .ncl-sub,html[data-theme="light"] .ncl-ov .ncl-note{color:#475569!important}html[data-theme="light"] .ncl-ov .ncl-btn{background:linear-gradient(135deg,#14a37a,#0a7a56)!important;color:#fff!important}html[data-theme="light"] .ncl-ov #nclSup{background:#fff!important;color:#1e293b!important;border-color:rgba(15,23,42,.12)!important}html[data-theme="light"] .ncl-ov .ncl-x{background:#fff!important;color:#1e293b!important}html[data-theme="light"] .ncl-ov .ncl-dots i,html[data-theme="light"] .ncl-ov .ncl-bar{background:#e6ece8!important}';
  document.head.appendChild(s);

  var tab = 'acc';
  function rowIcon(btn, icon) { if (btn.querySelector('.sv-ri')) return; var l = btn.lastElementChild; if (l && /^[→›>]$/.test(l.textContent.trim())) l.style.display = 'none'; var f = btn.firstElementChild; if (f) f.textContent = f.textContent.replace(/^[^A-Za-zÀ-ÿ0-9]+/, ''); var i = document.createElement('span'); i.className = 'sv-ri'; i.innerHTML = SV[icon]; btn.insertBefore(i, btn.firstChild); var c = document.createElement('span'); c.className = 'sv-ch'; c.innerHTML = SV.chev; btn.appendChild(c); }
  var VER = 'v4';
  function settings() {
    var m = $('settingsMask'); if (!m) return;
    var box = m.querySelector('.box'); if (!box) return;
    if (m.getAttribute('data-nc-ver') !== VER) { m.setAttribute('data-nc-ver', VER); try { console.log('[NordicCrypto] Settings UI ' + VER + ' active'); } catch (e) {} }
    function cl(c, v) { if (m.classList.contains(c) !== v) m.classList.toggle(c, v); } cl('sv5', true); cl('sv-acc', tab === 'acc'); cl('sv-sec', tab === 'sec');
    if (!box.querySelector('.sv-au')) {
      var au = document.createElement('div'); au.className = 'sv-au'; au.innerHTML = '<i></i><i></i>'; box.insertBefore(au, box.firstChild);
      var g = document.createElement('div'); g.className = 'sv-grab'; box.insertBefore(g, au.nextSibling);
      var x = document.createElement('button'); x.type = 'button'; x.className = 'sv-x'; x.setAttribute('aria-label', 'Close'); x.innerHTML = '×'; x.onclick = function () { var c = $('btnSettingsClose'); if (c) c.click(); else m.classList.remove('on'); }; box.appendChild(x);
    }
    var av = $('ncAvSetW'), name = $('settingsName'), prof = box.querySelector('.sv-prof');
    if (!prof && name) {
      prof = document.createElement('div'); prof.className = 'sv-prof';
      var pk = document.createElement('div'); pk.className = 'sv-pk';
      var row = name.closest('.settings-row') || name.parentNode; var sec = row.closest('.settings-section');
      var h2 = box.querySelector('p.d') || box.querySelector('h2');
      h2.parentNode.insertBefore(prof, h2.nextSibling);
      if (av) prof.appendChild(av);
      pk.appendChild(row); prof.appendChild(pk);
      if (sec) sec.setAttribute('data-sv', 'hide');
    } else if (prof && av && av.parentNode !== prof) prof.insertBefore(av, prof.firstChild);
    if (!box.querySelector('.sv-tabs') && prof) {
      var t = document.createElement('div'); t.className = 'sv-tabs'; t.setAttribute('role', 'tablist');
      t.innerHTML = '<button type="button" class="sv-tab" data-t="acc" role="tab">' + SV.user + '<span>' + T('acc') + '</span></button><button type="button" class="sv-tab" data-t="sec" role="tab">' + SV.shield + '<span>' + T('sec') + '</span></button>';
      prof.parentNode.insertBefore(t, prof.nextSibling);
      t.addEventListener('click', function (e) { var b = e.target.closest('.sv-tab'); if (!b) return; tab = b.getAttribute('data-t'); settings(); box.scrollTop = 0; });
    }
    var tabs = box.querySelector('.sv-tabs');
    if (tabs) {
      [].forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tab); var as = String(b.getAttribute('data-t') === tab); if (b.getAttribute('aria-selected') !== as) b.setAttribute('aria-selected', as); });
      var off = !!box.querySelector('#csCard .cs-pill.off'), sb = tabs.querySelector('[data-t="sec"]'), em = sb && sb.querySelector('em');
      if (off && sb && !em) { em = document.createElement('em'); sb.appendChild(em); } else if (!off && em) em.remove();
    }
    /* which tab each block belongs to */
    var lr = $('ncLangRow'); if (lr && lr.getAttribute('data-sv') !== 'acc') lr.setAttribute('data-sv', 'acc');
    [].forEach.call(box.querySelectorAll('.settings-section'), function (sc) {
      if (sc.getAttribute('data-sv') === 'hide') return;
      var want = sc.querySelector('#btnChangePassword,#btnChangeEmail') ? 'sec' : sc.querySelector('#btnDeleteAccount') ? 'acc' : null; if (want && sc.getAttribute('data-sv') !== want) sc.setAttribute('data-sv', want);
    });
    var cs = $('csCard'); if (cs && cs.getAttribute('data-sv') !== 'sec') cs.setAttribute('data-sv', 'sec');
    /* SAFETY NET: any direct child of the box that is real content but still untagged defaults to the
       Account tab, so nothing a future module injects can ever leak into both tabs (no "old look"). */
    var skip = { H2: 1, P: 1 };
    [].forEach.call(box.children, function (ch) {
      if (ch.getAttribute('data-sv')) return;
      var cl = ch.className || '';
      if (/sv-au|sv-grab|sv-x|sv-tabs|sv-prof|mact/.test(cl) || skip[ch.tagName]) return;
      ch.setAttribute('data-sv', 'acc');
    });
    var inst = $('ncInstRow'); if (inst) { if (inst.getAttribute('data-sv') !== 'acc') inst.setAttribute('data-sv', 'acc'); var mact = box.querySelector('.mact'); if (mact && inst.compareDocumentPosition(mact) & Node.DOCUMENT_POSITION_FOLLOWING) { } else if (mact) box.insertBefore(inst, mact); if (!inst.querySelector('.sv-ri')) { inst.textContent = inst.textContent.replace(/^[^A-Za-zÀ-ÿ0-9]+/, ''); var ii = document.createElement('span'); ii.className = 'sv-ri'; ii.innerHTML = SV.app; inst.insertBefore(ii, inst.firstChild); } }
    /* "My wallets" entry — opens the connect-wallet screen (account tab) */
    if (window.NCWallets) {
      var wr = $('ncWalletRow');
      if (!wr) {
        wr = document.createElement('button'); wr.type = 'button'; wr.id = 'ncWalletRow'; wr.className = 'settings-btn-row';
        wr.onclick = function () { try { window.NCWallets.open(); } catch (e) {} };
        var mact2 = box.querySelector('.mact'); var anchor = $('ncInstRow') || mact2;
        if (anchor) box.insertBefore(wr, anchor); else box.appendChild(wr);
      }
      wr.setAttribute('data-sv', 'acc');
      var wlab = T('wallets'), wsub = T('walletsSub');
      var wh = '<span class="sv-ri">' + SV.wallet + '</span><span><b style="display:block;font-weight:650">' + wlab + '</b><small style="display:block;font-size:12px;color:#93a39e;font-weight:500">' + wsub + '</small></span><span class="sv-ch">' + SV.chev + '</span>';
      if (wr.__h !== wh) { wr.innerHTML = wh; wr.__h = wh; }
    }
    var cp = $('btnChangePassword'); if (cp) rowIcon(cp, 'key');
    var ce = $('btnChangeEmail'); if (ce) rowIcon(ce, 'mail');
    var del = $('btnDeleteAccount'); if (del) rowIcon(del, 'trash');
    var lo = $('btnLogout'); if (lo && !lo.querySelector('svg')) { lo.textContent = lo.textContent.replace(/^[^A-Za-zÀ-ÿ0-9]+/, ''); lo.insertAdjacentHTML('afterbegin', SV.out); }
  }
  /* run synchronously (before paint) whenever the window opens or its content changes — no old-design flash */
  var busy = false, wasOn = false, mo = null;
  function run() { if (busy) return; busy = true; try { var m = $('settingsMask'); var on = !!(m && m.classList.contains('on')); if (on && !wasOn) tab = 'acc'; wasOn = on; settings(); } catch (e) {} if (mo) mo.takeRecords(); busy = false; }
  function hook() { var m = $('settingsMask'); if (!m || mo) return !!mo; run(); mo = new MutationObserver(run); mo.observe(m, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true }); return true; }
  if (!hook()) { var bo = new MutationObserver(function () { if (hook()) bo.disconnect(); }); bo.observe(document.documentElement, { childList: true, subtree: true }); document.addEventListener('DOMContentLoaded', hook); }
  setInterval(function () { hook(); var m = $('settingsMask'); if (m && m.classList.contains('on')) run(); }, 1000);
  window.addEventListener('nc-lang', function () { var tb = document.querySelector('#settingsMask .sv-tabs'); if (tb) { tb.querySelector('[data-t="acc"] span').textContent = T('acc'); tb.querySelector('[data-t="sec"] span').textContent = T('sec'); } });
})();
