/* NordicCrypto — flows-v5.js v1
   Withdraw + Exchange in the new design (same look as the transaction card, "Add money" and NC rewards).
   Only the look and layout change: every input, id, check, OTP step, limit and server call of the old
   withdraw (withdraw-flow / withdraw-crypto / ca-au-pay / wd-otp) and exchange (swap-pro) windows keeps working.
   Withdraw: phone sheet / desktop window, big amount with currency pill and 25 % · 50 % · Max, cleaner method
   tiles (local Canada/Australia payouts folded away), sticky buttons, "Track transfer" on the success screen.
   Exchange: violet accent, aurora, sheet on phones. Dark + light theme. Load after swap-pro.js and wd-otp.js. */
(function () {
  'use strict';
  if (window.__ncFlowsV5) return; window.__ncFlowsV5 = 1;
  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['Withdraw', 'Udbetal', 'Nosta', 'Retirar', 'Ta ut', 'Ta ut', 'Retirer', 'Auszahlen'],
    avail: ['Available', 'Til rådighed', 'Käytettävissä', 'Disponible', 'Tilgjengelig', 'Tillgängligt', 'Disponible', 'Verfügbar'],
    amount: ['Amount', 'Beløb', 'Summa', 'Importe', 'Beløp', 'Belopp', 'Montant', 'Betrag'],
    sendTo: ['Send to', 'Send til', 'Lähetä', 'Enviar a', 'Send til', 'Skicka till', 'Envoyer vers', 'Senden an'],
    more: ['Local payouts · Canada & Australia', 'Lokale udbetalinger · Canada og Australien', 'Paikalliset maksut · Kanada ja Australia', 'Pagos locales · Canadá y Australia', 'Lokale utbetalinger · Canada og Australia', 'Lokala utbetalningar · Kanada och Australien', 'Paiements locaux · Canada et Australie', 'Lokale Auszahlungen · Kanada & Australien'],
    details: ['Recipient details', 'Modtageroplysninger', 'Saajan tiedot', 'Datos del destinatario', 'Mottakeropplysninger', 'Mottagaruppgifter', 'Coordonnées du bénéficiaire', 'Empfängerdaten'],
    track: ['Track transfer', 'Følg overførslen', 'Seuraa siirtoa', 'Seguir transferencia', 'Følg overføringen', 'Följ överföringen', 'Suivre le virement', 'Überweisung verfolgen'],
    safe: ['Your money stays on your balance until the transfer is sent.', 'Dine penge bliver på din saldo, indtil overførslen sendes.', 'Rahasi pysyvät saldollasi, kunnes siirto lähetetään.', 'Tu dinero sigue en tu saldo hasta que se envía la transferencia.', 'Pengene blir på saldoen din til overføringen sendes.', 'Pengarna stannar på ditt saldo tills överföringen skickas.', 'Votre argent reste sur votre solde jusqu’à l’envoi du virement.', 'Ihr Geld bleibt auf Ihrem Guthaben, bis die Überweisung gesendet wird.'],
    exch: ['Exchange', 'Veksling', 'Vaihto', 'Cambio', 'Veksling', 'Växling', 'Échange', 'Umtausch']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k) { var a = K[k]; return a ? a[LG.indexOf(lang())] || a[0] : k; }
  function $(id) { return document.getElementById(id); }
  var IC = {
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8m0 0-5 5m5-5 5 5M5 4h14"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3"/></svg>',
    track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
  };

  var css = document.createElement('style'); css.id = 'flowsV5Css';
  css.textContent =
/* ================= WITHDRAW ================= */
'#withdrawModal{z-index:100052!important}' +
'#withdrawModal .wd-modal-bg{background:rgba(2,5,7,.62)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}' +
'#withdrawModal .wd-modal-card{--c:#62e8c2;position:relative;max-width:500px!important;padding:22px 24px 0!important;border-radius:30px!important;color:#eef5f2!important;background:linear-gradient(180deg,#161d1f,#0a0e10)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:0 60px 140px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1)!important;overflow-x:hidden!important;scrollbar-width:thin}' +
'#withdrawModal .wv-au{position:absolute;left:0;right:0;top:0;height:220px;pointer-events:none;overflow:hidden;-webkit-mask:linear-gradient(#000 30%,transparent);mask:linear-gradient(#000 30%,transparent);z-index:0}#withdrawModal .wv-au i{position:absolute;border-radius:50%;filter:blur(44px)}#withdrawModal .wv-au i:nth-child(1){width:300px;height:190px;left:-70px;top:-100px;background:#62e8c2;opacity:.2}#withdrawModal .wv-au i:nth-child(2){width:260px;height:170px;right:-70px;top:-90px;background:#6fb2ff;opacity:.12}' +
'#withdrawModal .wd-modal-card>*:not(.wv-au){position:relative;z-index:1}#withdrawModal .wv-grab{display:none;width:40px;height:5px;border-radius:9px;background:rgba(255,255,255,.22);margin:-10px auto 12px}' +
'#withdrawModal .wd-form-header{align-items:center!important;margin-bottom:16px!important}#withdrawModal .wd-form-title{display:flex;align-items:center;gap:10px;font-size:22px!important;font-weight:760!important;letter-spacing:-.02em;color:#fff!important;background:none!important;-webkit-text-fill-color:currentColor}' +
'#withdrawModal .wv-ti{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;flex:none;background:linear-gradient(140deg,#a3fbe3,#45cfa8);color:#03251b}#withdrawModal .wv-ti svg{width:18px;height:18px}' +
'#withdrawModal .wd-form-sub{display:inline-flex;align-items:center;gap:6px;margin-top:8px!important;padding:5px 11px;border-radius:99px;background:rgba(98,232,194,.1);border:1px solid rgba(98,232,194,.22);color:#a9eed8!important;font-size:12.5px!important;font-weight:600}' +
'#withdrawModal .wd-form-close{width:36px!important;height:36px!important;border-radius:12px!important;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.08)!important;color:#c6d2ce!important}' +
/* amount */
'#withdrawModal .wv-amt{padding:14px 14px 12px;border-radius:24px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);margin:0 0 16px;transition:border-color .15s,box-shadow .15s}#withdrawModal .wv-amt:focus-within{border-color:rgba(98,232,194,.5);box-shadow:0 0 0 4px rgba(98,232,194,.08)}' +
'#withdrawModal .wv-amt>label{display:block;text-align:center;font-size:11.5px;color:#86968f;margin-bottom:2px}#withdrawModal .wv-row{display:flex;align-items:center;gap:8px}' +
'#withdrawModal .wv-amt #wdAmount{flex:1;min-width:0;height:62px!important;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;text-align:center;font-family:inherit!important;font-size:40px!important;font-weight:760!important;letter-spacing:-.03em;color:#fff!important;outline:none}#withdrawModal .wv-amt #wdAmount::placeholder{color:#3d4a46}' +
'#withdrawModal .wv-amt #ncwCur{flex:none;width:auto!important;height:40px!important;padding:0 30px 0 12px!important;border-radius:99px!important;background:rgba(255,255,255,.07) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27 fill=%27none%27 stroke=%27%23a9b8b3%27 stroke-width=%272.4%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") right 10px center/14px no-repeat!important;border:1px solid rgba(255,255,255,.12)!important;color:#fff!important;font:inherit!important;font-weight:700!important;font-size:13.5px!important;-webkit-appearance:none;appearance:none;cursor:pointer;max-width:110px}' +
'#withdrawModal .wv-pills{display:flex;gap:6px;justify-content:center;margin-top:6px}#withdrawModal .wv-pill{padding:7px 13px;border-radius:99px;font:inherit;font-weight:650;font-size:12.5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#cbd7d3;cursor:pointer}#withdrawModal .wv-pill:hover,#withdrawModal .wv-pill.on{background:rgba(98,232,194,.14);border-color:rgba(98,232,194,.45);color:#62e8c2}' +
'#withdrawModal #ncwHint{text-align:center;font-size:12.5px;color:#93a39e;margin-top:6px}#withdrawModal #ncwHint:empty{display:none}' +
'#withdrawModal .wv-sec{display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#86968f;margin:4px 2px 10px}' +
/* methods */
'#withdrawModal #ncRp .rp-g{display:none!important}#withdrawModal #ncRp .rp-grid{gap:8px!important;margin-bottom:10px!important}' +
'#withdrawModal #ncRp .rp-t{border-radius:18px!important;background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:none!important;transition:transform .15s,border-color .15s,background .15s!important;padding:12px!important;min-height:0!important}' +
'#withdrawModal #ncRp .rp-t:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.18)!important}' +
'#withdrawModal #ncRp .rp-t.on{background:linear-gradient(135deg,rgba(98,232,194,.14),rgba(98,232,194,.03))!important;border:1.5px solid rgba(98,232,194,.6)!important;box-shadow:0 10px 26px -12px rgba(69,207,168,.45)!important}' +
'#withdrawModal #ncRp .rp-t.on:after,#withdrawModal #ncRp .rp-t.on:before{background:#62e8c2!important;color:#03251b!important;border-color:#62e8c2!important}' +
'#withdrawModal #ncRp .rp-i{width:38px!important;height:38px!important;border-radius:13px!important;display:grid!important;place-items:center;background:rgba(255,255,255,.06);margin-bottom:8px}#withdrawModal #ncRp .rp-t.on .rp-i{background:rgba(98,232,194,.16)}#withdrawModal #ncRp .rp-i svg{width:20px;height:20px}' +
'#withdrawModal #ncRp .rp-n{font-size:13.5px!important;font-weight:650!important;color:#fff!important}#withdrawModal #ncRp .rp-s{font-size:11.5px!important;color:#86968f!important}' +
'#withdrawModal .wv-more{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin:0 0 10px;padding:11px 14px;border-radius:16px;border:1px dashed rgba(255,255,255,.14);background:none;color:#b6c4bf;font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-align:left}#withdrawModal .wv-more svg{width:16px;height:16px;transition:transform .2s;flex:none}#withdrawModal .wv-more.open svg{transform:rotate(180deg)}#withdrawModal .wv-more:hover{border-color:rgba(98,232,194,.4);color:#fff}' +
'#withdrawModal .wv-loc{display:none}#withdrawModal .wv-loc.open{display:block}' +
/* fields */
'#withdrawModal .wd-label{font-size:11.5px!important;letter-spacing:.04em!important;text-transform:none!important;color:#86968f!important;margin:12px 2px 6px!important;font-weight:600!important}' +
'#withdrawModal .wd-input:not(#wdAmount):not(#ncwCur),#withdrawModal select.wd-input:not(#ncwCur),#withdrawModal .wd-fields input,#withdrawModal .wd-fields select{height:50px!important;border-radius:15px!important;background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.1)!important;color:#fff!important;font-family:inherit!important;font-size:15px!important;padding:0 14px!important;box-shadow:none!important}' +
'#withdrawModal .wd-input:focus,#withdrawModal .wd-fields input:focus{border-color:rgba(98,232,194,.55)!important;box-shadow:0 0 0 4px rgba(98,232,194,.08)!important}' +
'#withdrawModal .wv-safe{display:flex;gap:9px;align-items:flex-start;margin:14px 0 4px;padding:11px 13px;border-radius:16px;background:rgba(98,232,194,.06);border:1px solid rgba(98,232,194,.16);font-size:12.5px;line-height:1.45;color:#c4d0cc}#withdrawModal .wv-safe svg{width:16px;height:16px;flex:none;color:#62e8c2;margin-top:1px}' +
/* sticky buttons */
'#withdrawModal .wd-actions{position:sticky!important;bottom:0;z-index:5!important;margin:14px -24px 0!important;padding:14px 24px calc(18px + env(safe-area-inset-bottom))!important;background:linear-gradient(180deg,rgba(10,14,16,0),#0b0f11 30%)!important;display:grid!important;grid-template-columns:1fr 1.6fr;gap:8px!important;border:0!important}' +
'#withdrawModal .wd-btn{height:54px!important;border-radius:17px!important;font-family:inherit!important;font-weight:700!important;font-size:15px!important}#withdrawModal .wd-btn-cancel{background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.09)!important;color:#dbe5e1!important}' +
'#withdrawModal .wd-btn-submit{background:linear-gradient(135deg,#a6fbe2,#45cfa8)!important;color:#03251b!important;border:0!important;box-shadow:0 12px 32px -8px rgba(69,207,168,.45),inset 0 1px 0 rgba(255,255,255,.55)!important}' +
/* processing / success */
'#withdrawModal .wd-success-amount{background:none!important;-webkit-text-fill-color:currentColor;color:#fff!important;font-size:38px!important;font-weight:770!important;letter-spacing:-.03em}' +
'#withdrawModal .wd-success-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:8px;padding-bottom:20px}#withdrawModal .wv-track{height:54px;border-radius:17px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#e6efeb;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}#withdrawModal .wv-track svg{width:18px;height:18px}' +
'#withdrawModal .wd-success-details,#withdrawModal .wd-live-data{border-radius:18px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important}' +
'@media (max-width:760px){#withdrawModal{padding:0!important;align-items:flex-end!important}#withdrawModal .wd-modal-card{max-width:none!important;width:100%!important;max-height:94vh!important;max-height:94dvh!important;border-radius:28px 28px 0 0!important;border-bottom:0!important;padding:18px 16px 0!important;animation:wvSheet .38s cubic-bezier(.2,.9,.25,1) both!important}#withdrawModal .wv-grab{display:block}#withdrawModal .wd-actions{margin:14px -16px 0!important;padding:14px 16px calc(16px + env(safe-area-inset-bottom))!important}#withdrawModal .wv-amt #wdAmount{font-size:34px!important}}' +
'@keyframes wvSheet{from{transform:translateY(100%)}to{transform:none}}' +
/* light */
'html[data-theme="light"] #withdrawModal .wd-modal-card{background:linear-gradient(180deg,#fff,#f4f7f3)!important;color:#0c111b!important;border-color:rgba(15,23,42,.1)!important;box-shadow:0 40px 100px rgba(15,23,42,.25)!important}html[data-theme="light"] #withdrawModal .wd-form-title{color:#0c111b!important}html[data-theme="light"] #withdrawModal .wd-form-sub{background:#e9f8f2;color:#0a7a56!important;border-color:rgba(10,122,86,.25)}' +
'html[data-theme="light"] #withdrawModal .wv-amt,html[data-theme="light"] #withdrawModal #ncRp .rp-t{background:#fff!important;border-color:rgba(15,23,42,.1)!important}html[data-theme="light"] #withdrawModal .wv-amt #wdAmount{color:#0c111b!important}html[data-theme="light"] #withdrawModal .wv-amt #ncwCur{background-color:#f1f4f2!important;color:#0c111b!important;border-color:rgba(15,23,42,.12)!important}' +
'html[data-theme="light"] #withdrawModal #ncRp .rp-n{color:#0c111b!important}html[data-theme="light"] #withdrawModal #ncRp .rp-t.on{background:#effaf5!important;border-color:#0a9a6c!important}html[data-theme="light"] #withdrawModal .wd-fields input,html[data-theme="light"] #withdrawModal .wd-input:not(#wdAmount):not(#ncwCur){background:#fff!important;border-color:rgba(15,23,42,.14)!important;color:#0c111b!important}' +
'html[data-theme="light"] #withdrawModal .wd-actions{background:linear-gradient(180deg,rgba(244,247,243,0),#f4f7f3 30%)!important}html[data-theme="light"] #withdrawModal .wd-btn-cancel,html[data-theme="light"] #withdrawModal .wv-pill,html[data-theme="light"] #withdrawModal .wv-track,html[data-theme="light"] #withdrawModal .wd-form-close{background:#fff!important;border-color:rgba(15,23,42,.12)!important;color:#1e293b!important}html[data-theme="light"] #withdrawModal .wd-btn-submit{background:linear-gradient(135deg,#14a37a,#0a7a56)!important;color:#fff!important}' +
'html[data-theme="light"] #withdrawModal .wv-safe{background:#effaf5;color:#334155}html[data-theme="light"] #withdrawModal .wv-more{color:#475569;border-color:rgba(15,23,42,.18)}html[data-theme="light"] #withdrawModal .wd-success-amount{color:#0c111b!important}' +
/* ================= EXCHANGE ================= */
'.sw-ov{z-index:100052!important;background:rgba(2,5,7,.62)!important}' +
'.sw-ov .sw{position:relative;overflow:hidden;background:linear-gradient(180deg,#191a24,#0b0d12)!important;border:1px solid rgba(180,156,255,.18)!important;box-shadow:0 60px 140px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1)!important}' +
'.sw-ov .sw:before{content:"";position:absolute;left:-60px;top:-110px;width:320px;height:220px;border-radius:50%;background:#b49cff;opacity:.2;filter:blur(46px);pointer-events:none}.sw-ov .sw:after{content:"";position:absolute;right:-80px;top:-90px;width:260px;height:180px;border-radius:50%;background:#62e8c2;opacity:.12;filter:blur(46px);pointer-events:none}.sw-ov .sw>*{position:relative;z-index:1}' +
'.sw-ov .sw-hd h3,.sw-ov .sw-hd b,.sw-ov .sw-hd h2{display:flex;align-items:center;gap:10px;font-weight:760!important;letter-spacing:-.02em}.sw-ov .wv-ti2{width:34px;height:34px;border-radius:12px;display:inline-grid;place-items:center;background:linear-gradient(140deg,#d6c8ff,#9b7bff);color:#1a0f3d;flex:none}.sw-ov .wv-ti2 svg{width:17px;height:17px}' +
'.sw-ov .sw-box{border-radius:22px!important;background:rgba(255,255,255,.04)!important;border-color:rgba(255,255,255,.08)!important}.sw-ov .sw-box:focus-within{border-color:rgba(180,156,255,.5)!important;box-shadow:0 0 0 4px rgba(180,156,255,.1)!important}' +
'.sw-ov .sw-flip button{background:#12131c!important;border:1px solid rgba(180,156,255,.45)!important;color:#c9b8ff!important;box-shadow:0 8px 24px rgba(0,0,0,.45)!important}' +
'.sw-ov .sw-chips button{border-radius:12px!important}.sw-ov .sw-info{border-radius:18px!important}' +
'.sw-ov .sw-go:not([disabled]){background:linear-gradient(135deg,#d6c8ff,#9b7bff)!important;color:#1a0f3d!important;box-shadow:0 14px 34px -10px rgba(155,123,255,.55)!important}' +
'html[data-theme="light"] .sw-ov .sw{background:linear-gradient(180deg,#fff,#f6f5fb)!important;border-color:rgba(106,79,214,.18)!important;box-shadow:0 40px 100px rgba(15,23,42,.25)!important}html[data-theme="light"] .sw-ov .sw:before{opacity:.12}html[data-theme="light"] .sw-ov .sw-box{background:#fff!important;border-color:rgba(15,23,42,.1)!important}html[data-theme="light"] .sw-ov .sw-go:not([disabled]){background:linear-gradient(135deg,#8b6cf6,#6a4fd6)!important;color:#fff!important}html[data-theme="light"] .sw-ov .sw-flip button{background:#fff!important;color:#6a4fd6!important}' +
'@media (prefers-reduced-motion:reduce){#withdrawModal *,.sw-ov *{animation:none!important}}';
  document.head.appendChild(css);

  /* ───────── withdraw: rebuild the layout around the original controls ───────── */
  function availNum() { var t = ($('wdAvailable') || {}).textContent || ''; var n = Number(t.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function setAmt(v) { var a = $('wdAmount'); if (!a) return; a.value = v > 0 ? (Math.floor(v * 100) / 100).toFixed(2) : ''; a.dispatchEvent(new Event('input', { bubbles: true })); a.dispatchEvent(new Event('change', { bubbles: true })); }
  function srcIsCash() { var s = $('ncwSrc'); return !s || !s.offsetParent || /cash|usd|^$/i.test(s.value || ''); }
  function enhance() {
    var m = $('withdrawModal'); if (!m) return;
    var card = m.querySelector('.wd-modal-card'), st = m.querySelector('.wd-form-stage'); if (!card) return;
    if (!card.querySelector('.wv-au')) { var au = document.createElement('div'); au.className = 'wv-au'; au.innerHTML = '<i></i><i></i>'; card.insertBefore(au, card.firstChild); var g = document.createElement('div'); g.className = 'wv-grab'; card.insertBefore(g, au.nextSibling); }
    if (!st) return;
    var title = st.querySelector('.wd-form-title');
    if (title && !title.querySelector('.wv-ti')) { var ti = document.createElement('span'); ti.className = 'wv-ti'; ti.innerHTML = IC.out; title.insertBefore(ti, title.firstChild); }
    var amt = $('wdAmount'), cur = $('ncwCur');
    if (amt && !st.querySelector('.wv-amt')) {
      var box = document.createElement('div'); box.className = 'wv-amt';
      box.innerHTML = '<label for="wdAmount" class="wv-l">' + T('amount') + '</label><div class="wv-row"></div><div class="wv-pills"><button type="button" class="wv-pill" data-p=".25">25%</button><button type="button" class="wv-pill" data-p=".5">50%</button><button type="button" class="wv-pill" data-p="1">Max</button></div>';
      amt.parentNode.insertBefore(box, amt);
      var row = box.querySelector('.wv-row'); row.appendChild(amt);
      if (cur) { var curWrap = cur.parentNode; row.appendChild(cur); [].forEach.call(curWrap.querySelectorAll('.wd-label'), function (l) { l.style.display = 'none'; }); if (!curWrap.children.length || [].every.call(curWrap.children, function (x) { return x.style.display === 'none'; })) curWrap.style.display = 'none'; }
      var hint = $('ncwHint'); if (hint) box.appendChild(hint);
      [].forEach.call(st.querySelectorAll('.wd-label'), function (l) { if (/^amount$/i.test(l.textContent.trim()) && !l.closest('.wd-fields')) l.style.display = 'none'; });
      box.addEventListener('click', function (e) { var p = e.target.closest('.wv-pill'); if (!p) return; if (!srcIsCash()) { var mx = document.querySelector('#withdrawModal [data-max], #withdrawModal .ncw-max'); if (mx && p.getAttribute('data-p') === '1') { mx.click(); return; } } setAmt(availNum() * Number(p.getAttribute('data-p'))); [].forEach.call(box.querySelectorAll('.wv-pill'), function (x) { x.classList.toggle('on', x === p); }); });
      amt.addEventListener('input', function () { [].forEach.call(box.querySelectorAll('.wv-pill'), function (x) { x.classList.remove('on'); }); });
    }
    var rp = $('ncRp');
    if (rp && !rp.querySelector('.wv-more') && rp.querySelector('.rp-grid')) {
      if (!(rp.previousElementSibling && rp.previousElementSibling.classList.contains('wv-sec'))) { var lab = document.createElement('span'); lab.className = 'wv-sec'; lab.textContent = T('sendTo'); rp.parentNode.insertBefore(lab, rp); }
      var grids = rp.querySelectorAll('.rp-grid');
      if (grids.length > 1) {
        var loc = document.createElement('div'); loc.className = 'wv-loc';
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'wv-more'; btn.innerHTML = '<span>' + T('more') + '</span>' + IC.chev;
        [].slice.call(rp.children).forEach(function (ch, i) { if (i > 1) loc.appendChild(ch); });
        rp.appendChild(btn); rp.appendChild(loc);
        btn.onclick = function () { var o = !loc.classList.contains('open'); loc.classList.toggle('open', o); btn.classList.toggle('open', o); };
      }
    }
    if (rp) { var loc2 = rp.querySelector('.wv-loc'), b2 = rp.querySelector('.wv-more'); if (loc2 && loc2.querySelector('.rp-t.on') && !loc2.classList.contains('open')) { loc2.classList.add('open'); if (b2) b2.classList.add('open'); } }
    if (cur) [].forEach.call(cur.options, function (o) { if (/^[A-Z]{3}$/.test(o.value) && o.textContent !== o.value) { o.title = o.textContent; o.textContent = o.value; } });
    var acts = st.querySelector('.wd-actions');
    if (acts && !st.querySelector('.wv-safe')) { var sf = document.createElement('div'); sf.className = 'wv-safe'; sf.innerHTML = IC.lock + '<span>' + T('safe') + '</span>'; acts.parentNode.insertBefore(sf, acts); }
    /* success: track the transfer in the new transaction card */
    var sa = m.querySelector('.wd-success-actions');
    if (sa && sa.offsetParent && !sa.querySelector('.wv-track')) {
      var tb = document.createElement('button'); tb.type = 'button'; tb.className = 'wv-track'; tb.innerHTML = IC.track + T('track');
      tb.onclick = function () {
        var w = ((window.st || {}).withdrawals || []).slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); })[0];
        try { if (typeof window.closeWithdraw === 'function') window.closeWithdraw(); else m.classList.remove('on'); } catch (e) { m.classList.remove('on'); }
        if (w && window.NCTxCard) setTimeout(function () { window.NCTxCard.open({ isWithdrawal: true, wdId: w.id, ts: w.createdAt, amt: -(Number(w.amount) || 0), status: 'Under Review', desc: 'Withdrawal via ' + String(w.method || 'iban').toUpperCase() }); }, 300);
      };
      sa.insertBefore(tb, sa.firstChild);
    }
  }
  function enhanceSwap() {
    var hd = document.querySelector('.sw-ov .sw-hd'); if (!hd || hd.querySelector('.wv-ti2')) return;
    var t = hd.querySelector('h3,h2,b,strong') || hd.firstElementChild; if (!t) return;
    var ic = document.createElement('span'); ic.className = 'wv-ti2'; ic.innerHTML = IC.swap; t.insertBefore(ic, t.firstChild);
  }
  new MutationObserver(function () { if (document.querySelector('.sw-ov')) enhanceSwap(); }).observe(document.body, { childList: true });
  var wm = null;
  function watchWd() { var m = $('withdrawModal'); if (!m || wm) return; wm = new MutationObserver(function () { if (m.classList.contains('on') || getComputedStyle(m).display !== 'none') enhance(); }); wm.observe(m, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true }); }
  setInterval(function () { watchWd(); var m = $('withdrawModal'); if (m && getComputedStyle(m).display !== 'none') enhance(); }, 400);
  window.addEventListener('nc-lang', function () { var l = document.querySelector('#withdrawModal .wv-l'); if (l) l.textContent = T('amount'); var s = document.querySelector('#withdrawModal .wv-sec'); if (s) s.textContent = T('sendTo'); var mo = document.querySelector('#withdrawModal .wv-more span'); if (mo) mo.textContent = T('more'); var sf = document.querySelector('#withdrawModal .wv-safe span'); if (sf) sf.textContent = T('safe'); });
})();
