/* access-pro.js v1 — "My accounts": Banking + Exchange under one login.
   A client who has one account type applies for the other through a short trading / banking questionnaire; the team reviews it in the admin panel.
   Once approved the client switches between the two accounts with one tap. Needs worker actions myAccess / applyAccess / switchAccount. */
(function () {
  'use strict';
  if (window.__ncAccess) return; window.__ncAccess = 1;
  var WORKER = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { try { return typeof getSessionToken === 'function' ? getSessionToken() : localStorage.getItem('session_token'); } catch (e) { return null; } }
  function post(action, body) {
    return fetch(WORKER + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error. Please check your internet and try again.' }; });
  }
  function isAdmin() { try { return localStorage.getItem('user_role') === 'admin' || !!window.adminViewingEmail; } catch (e) { return false; } }

  /* ───── questionnaires (values must match the worker) ───── */
  var NAME = { exchange: 'Exchange', banking: 'Banking' };
  var Q = {
    exchange: [
      { t: 'Your trading background', s: 'Helps us tune the account to how you trade.', q: [
        { k: 'experience', l: 'How long have you traded or invested in crypto?', o: [['none', 'No experience yet'], ['lt1', 'Under 1 year'], ['1to3', '1 – 3 years'], ['3to5', '3 – 5 years'], ['5plus', 'Over 5 years']] },
        { k: 'frequency', l: 'How often do you plan to trade?', o: [['rare', 'Rarely'], ['monthly', 'Monthly'], ['weekly', 'Weekly'], ['daily', 'Daily']] }] },
      { t: 'What you want to trade', s: 'Choose everything that applies.', q: [
        { k: 'instruments', l: 'Which markets interest you?', multi: 1, o: [['spot', 'Spot crypto'], ['futures', 'Futures'], ['options', 'Options'], ['forex', 'Forex'], ['stocks', 'Stocks'], ['defi', 'DeFi / staking']] },
        { k: 'goal', l: 'Your main goal', o: [['longterm', 'Long-term growth'], ['active', 'Active trading'], ['arbitrage', 'Arbitrage'], ['payments', 'Payments & transfers'], ['other', 'Something else']] }] },
      { t: 'Size and risk', s: 'There are no wrong answers. We only want the full picture.', q: [
        { k: 'volume', l: 'Expected monthly trading volume', o: [['lt1k', 'Under $1,000'], ['1to10k', '$1,000 – $10,000'], ['10to50k', '$10,000 – $50,000'], ['50to250k', '$50,000 – $250,000'], ['250kplus', 'Over $250,000']] },
        { k: 'risk', l: 'How much risk are you comfortable with?', o: [['low', 'Low · protect capital'], ['medium', 'Medium · balanced'], ['high', 'High · aggressive']] }] },
      { t: 'Source of funds', s: 'Where the money you will trade with comes from.', q: [
        { k: 'funds', l: 'Main source of funds', o: [['salary', 'Salary'], ['business', 'Own business'], ['savings', 'Savings'], ['investments', 'Investments'], ['crypto', 'Crypto gains'], ['other', 'Other']] }] }
    ],
    banking: [
      { t: 'How you will use Banking', s: 'Your everyday account, cards and transfers.', q: [
        { k: 'purpose', l: 'Main purpose of the account', o: [['daily', 'Daily spending'], ['savings', 'Saving'], ['business', 'Business payments'], ['travel', 'Travel'], ['salary', 'Receiving salary'], ['other', 'Other']] },
        { k: 'card', l: 'Which card would you like?', o: [['virtual', 'Virtual card'], ['metal', 'Metal card'], ['either', 'Either is fine']] }] },
      { t: 'About you', s: 'Required for banking compliance.', q: [
        { k: 'employment', l: 'Employment status', o: [['employed', 'Employed'], ['self', 'Self-employed'], ['business', 'Business owner'], ['student', 'Student'], ['retired', 'Retired'], ['other', 'Other']] },
        { k: 'income', l: 'Monthly income', o: [['lt1k', 'Under $1,000'], ['1to3k', '$1,000 – $3,000'], ['3to6k', '$3,000 – $6,000'], ['6to10k', '$6,000 – $10,000'], ['10kplus', 'Over $10,000']] }] },
      { t: 'Expected activity', s: 'So we can set the right limits for you.', q: [
        { k: 'expected', l: 'Expected monthly turnover', o: [['lt1k', 'Under $1,000'], ['1to5k', '$1,000 – $5,000'], ['5to20k', '$5,000 – $20,000'], ['20kplus', 'Over $20,000']] },
        { k: 'funds', l: 'Main source of funds', o: [['salary', 'Salary'], ['business', 'Own business'], ['savings', 'Savings'], ['investments', 'Investments'], ['crypto', 'Crypto gains'], ['other', 'Other']] }] }
    ]
  };
  var ACK = {
    exchange: [['risk', 'I understand that trading crypto involves risk and I can lose part or all of my funds.'], ['ownFunds', 'I will only trade with funds that belong to me.'], ['accurate', 'The information I gave is accurate and complete.']],
    banking: [['ownFunds', 'The funds I use belong to me.'], ['accurate', 'The information I gave is accurate and complete.']]
  };
  var PERKS = {
    exchange: ['Live spot market, 24 coins', 'Instant swaps at the live rate', 'Portfolio & P/L overview', 'Same login, same security'],
    banking: ['IBAN & multi-currency account', 'Virtual and metal cards', 'SEPA, Interac, PayID payouts', 'Same login, same security']
  };

  /* ───── icons ───── */
  var IC = {
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>'
  };

  /* ───── styles ───── */
  var css = document.createElement('style');
  css.textContent =
    '.acx-ov{position:fixed;inset:0;z-index:2147481000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,6,11,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:acxFade .25s ease both;-webkit-tap-highlight-color:transparent}' +
    '@keyframes acxFade{from{opacity:0}to{opacity:1}}@keyframes acxUp{from{opacity:0;transform:translateY(26px) scale(.985)}to{opacity:1;transform:none}}@keyframes acxSheet{from{transform:translateY(100%)}to{transform:none}}' +
    '@keyframes acxIn{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}@keyframes acxInL{from{opacity:0;transform:translateX(-26px)}to{opacity:1;transform:none}}' +
    '@keyframes acxPop{0%{transform:scale(0)}60%{transform:scale(1.18)}100%{transform:scale(1)}}@keyframes acxDraw{to{stroke-dashoffset:0}}@keyframes acxPulse{0%{box-shadow:0 0 0 0 rgba(198,255,61,.5)}100%{box-shadow:0 0 0 16px rgba(198,255,61,0)}}' +
    '@keyframes acxSpin{to{transform:rotate(360deg)}}@keyframes acxShine{from{transform:translateX(-120%)}to{transform:translateX(120%)}}@keyframes acxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
    '@keyframes acxConf{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(var(--r));opacity:0}}' +
    '.acx{position:relative;width:100%;max-width:880px;max-height:94vh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;border-radius:28px;padding:26px 24px 22px;color:#e9f1fa;font-family:inherit;border:1px solid rgba(198,255,61,.16);background:radial-gradient(110% 70% at 0% 0%,rgba(198,255,61,.12),transparent 55%),radial-gradient(90% 60% at 100% 100%,rgba(70,140,255,.10),transparent 60%),#0a1018;box-shadow:0 40px 90px -30px #000,inset 0 1px 0 rgba(255,255,255,.06);animation:acxUp .38s cubic-bezier(.2,.8,.2,1) both;scrollbar-width:thin}' +
    '.acx *{box-sizing:border-box}.acx button{font-family:inherit}' +
    '.acx-hd{display:flex;align-items:flex-start;gap:12px;margin-bottom:18px}.acx-hd h2{margin:0;font-size:25px;font-weight:800;letter-spacing:-.02em;line-height:1.15}.acx-hd p{margin:6px 0 0;color:#8b98ab;font-size:14px;line-height:1.5}' +
    '.acx-x{margin-left:auto;flex:none;width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#c7d2e0;cursor:pointer;display:grid;place-items:center;transition:.18s}.acx-x:hover{background:rgba(255,255,255,.1);transform:rotate(90deg)}.acx-x svg{width:16px;height:16px}' +
    '.acx-bk{flex:none;width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#c7d2e0;cursor:pointer;display:grid;place-items:center;transition:.18s}.acx-bk:hover{background:rgba(255,255,255,.1)}.acx-bk svg{width:17px;height:17px}' +
    '.acx-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}' +
    '.acx-card{position:relative;overflow:hidden;border-radius:22px;padding:22px 20px 20px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.015));transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s,box-shadow .25s;display:flex;flex-direction:column;animation:acxUp .5s cubic-bezier(.2,.8,.2,1) both}' +
    '.acx-card:nth-child(2){animation-delay:.08s}.acx-card:hover{transform:translateY(-4px);border-color:rgba(198,255,61,.35);box-shadow:0 22px 50px -26px rgba(198,255,61,.45)}' +
    '.acx-card.cur{border-color:rgba(198,255,61,.55);box-shadow:0 0 0 1px rgba(198,255,61,.25),0 26px 60px -30px rgba(198,255,61,.5)}' +
    '.acx-card:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.07) 50%,transparent 65%);transform:translateX(-120%);pointer-events:none}.acx-card:hover:before{animation:acxShine .9s ease}' +
    '.acx-ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(198,255,61,.22),rgba(198,255,61,.05));border:1px solid rgba(198,255,61,.3);color:#d6ff5c;margin-bottom:14px}.acx-ic svg{width:26px;height:26px}' +
    '.acx-card h3{margin:0;font-size:21px;font-weight:800;letter-spacing:-.01em}.acx-card .d{color:#8b98ab;font-size:13.5px;margin:6px 0 14px;line-height:1.5}' +
    '.acx-pk{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}.acx-pk li{display:flex;gap:9px;align-items:center;font-size:13.5px;color:#cfd9e6}.acx-pk i{flex:none;width:18px;height:18px;border-radius:50%;background:rgba(198,255,61,.16);color:#d6ff5c;display:grid;place-items:center}.acx-pk i svg{width:10px;height:10px}' +
    '.acx-tag{position:absolute;top:16px;right:16px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:99px;display:flex;align-items:center;gap:5px}.acx-tag svg{width:11px;height:11px}' +
    '.acx-tag.on{background:rgba(198,255,61,.16);color:#d6ff5c}.acx-tag.wait{background:rgba(255,196,60,.14);color:#ffc43c}.acx-tag.no{background:rgba(255,92,92,.13);color:#ff7b7b}' +
    '.acx-btn{margin-top:auto;width:100%;padding:15px 16px;border-radius:15px;border:0;font-weight:800;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:transform .15s,filter .2s,box-shadow .2s;min-height:50px}.acx-btn svg{width:18px;height:18px;flex:none}' +
    '.acx-btn.p{color:#0a1204;background:linear-gradient(135deg,#d6ff5c,#a6e22e);box-shadow:0 14px 30px -14px #c6ff3d}.acx-btn.p:hover{filter:brightness(1.06);transform:translateY(-1px)}.acx-btn:active{transform:scale(.98)}' +
    '.acx-btn.g{color:#e9f1fa;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)}.acx-btn.g:hover{background:rgba(255,255,255,.12)}.acx-btn[disabled]{opacity:.55;cursor:not-allowed;filter:none;transform:none}' +
    '.acx-btn.ld span{display:none}.acx-btn.ld:after{content:"";width:20px;height:20px;border-radius:50%;border:3px solid rgba(10,18,4,.25);border-top-color:#0a1204;animation:acxSpin .7s linear infinite}' +
    '.acx-note{margin-top:16px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:#8b98ab;font-size:12.5px;line-height:1.55;display:flex;gap:10px;align-items:flex-start}.acx-note svg{flex:none;width:18px;height:18px;color:#d6ff5c;margin-top:1px}' +
    '.acx-warn{margin-top:12px;padding:12px 14px;border-radius:14px;background:rgba(255,196,60,.09);border:1px solid rgba(255,196,60,.25);color:#ffd68a;font-size:13px;line-height:1.5}' +
    /* wizard */
    '.acx-pr{display:flex;gap:6px;margin:2px 0 20px}.acx-pr i{flex:1;height:5px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden;position:relative}.acx-pr i:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#d6ff5c,#a6e22e);transform:scaleX(0);transform-origin:left;transition:transform .45s cubic-bezier(.2,.8,.2,1)}.acx-pr i.d:after{transform:scaleX(1)}.acx-pr i.c:after{transform:scaleX(.5)}' +
    '.acx-st{animation:acxIn .34s cubic-bezier(.2,.8,.2,1) both}.acx-st.rev{animation-name:acxInL}.acx-st h3{margin:0 0 4px;font-size:20px;font-weight:800}.acx-st .s{color:#8b98ab;font-size:13.5px;margin-bottom:18px}' +
    '.acx-q{margin-bottom:22px}.acx-q>b{display:block;font-size:14.5px;font-weight:700;margin-bottom:10px;color:#e9f1fa}' +
    '.acx-op{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:9px}' +
    '.acx-o{position:relative;text-align:left;padding:14px 14px 14px 44px;min-height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#dbe5f1;font-size:14px;font-weight:600;cursor:pointer;transition:.18s;line-height:1.3}' +
    '.acx-o:before{content:"";position:absolute;left:14px;top:50%;width:18px;height:18px;margin-top:-9px;border-radius:50%;border:2px solid rgba(255,255,255,.25);transition:.18s}.acx-o.m:before{border-radius:6px}' +
    '.acx-o:hover{border-color:rgba(198,255,61,.4);background:rgba(198,255,61,.06)}.acx-o.on{border-color:#c6ff3d;background:rgba(198,255,61,.12);color:#fff;box-shadow:0 0 0 1px rgba(198,255,61,.35)}' +
    '.acx-o.on:before{border-color:#c6ff3d;background:#c6ff3d;box-shadow:inset 0 0 0 3px #0a1018}.acx-o.m.on:before{box-shadow:none;background:#c6ff3d url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230a1204\' stroke-width=\'4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M5 12.5l4.5 4.5L19 7.5\'/%3E%3C/svg%3E") center/12px no-repeat}' +
    '.acx-o.bad{animation:acxShake .35s}@keyframes acxShake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}' +
    '.acx-ck{display:flex;gap:12px;align-items:flex-start;padding:13px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);cursor:pointer;margin-bottom:9px;font-size:13.5px;line-height:1.5;color:#cfd9e6;text-align:left;width:100%;transition:.18s}' +
    '.acx-ck:hover{border-color:rgba(198,255,61,.4)}.acx-ck.on{border-color:#c6ff3d;background:rgba(198,255,61,.09)}.acx-ck i{flex:none;width:22px;height:22px;border-radius:7px;border:2px solid rgba(255,255,255,.25);display:grid;place-items:center;transition:.18s;color:transparent;margin-top:1px}.acx-ck.on i{background:#c6ff3d;border-color:#c6ff3d;color:#0a1204}.acx-ck i svg{width:12px;height:12px}' +
    '.acx-ta{width:100%;min-height:84px;resize:vertical;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.28);color:#e9f1fa;padding:12px 14px;font-size:15px;font-family:inherit;outline:0;transition:.18s}.acx-ta:focus{border-color:#c6ff3d;box-shadow:0 0 0 3px rgba(198,255,61,.14)}' +
    '.acx-ft{display:flex;gap:10px;margin-top:20px;position:sticky;bottom:-22px;padding:12px 0 2px;background:linear-gradient(0deg,#0a1018 70%,transparent)}.acx-ft .acx-btn{margin-top:0}.acx-ft .g{flex:0 0 auto;width:auto;padding:15px 20px}' +
    '.acx-err{margin-top:12px;color:#ff8d8d;font-size:13.5px;min-height:0}' +
    /* result */
    '.acx-res{text-align:center;padding:26px 6px 8px;animation:acxUp .45s cubic-bezier(.2,.8,.2,1) both}.acx-res h3{margin:18px 0 8px;font-size:24px;font-weight:800}.acx-res p{color:#9fb0c4;font-size:14.5px;line-height:1.6;max-width:430px;margin:0 auto 22px}' +
    '.acx-ring{position:relative;width:96px;height:96px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(198,255,61,.22),rgba(198,255,61,.04));border:2px solid rgba(198,255,61,.5);animation:acxPop .55s cubic-bezier(.2,.8,.2,1) both,acxPulse 1.6s .5s ease-out 2}' +
    '.acx-ring svg{width:46px;height:46px;color:#d6ff5c}.acx-ring path{stroke-dasharray:40;stroke-dashoffset:40;animation:acxDraw .5s .35s ease forwards}.acx-ring.w{border-color:rgba(255,196,60,.5);background:radial-gradient(circle,rgba(255,196,60,.2),transparent);animation:acxPop .55s both}.acx-ring.w svg{color:#ffc43c}.acx-ring.w svg *{animation:none;stroke-dasharray:none}' +
    '.acx-steps{display:flex;justify-content:center;gap:0;margin:0 auto 22px;max-width:420px;text-align:center}.acx-steps div{flex:1;font-size:12px;color:#8b98ab;position:relative;padding-top:24px}.acx-steps div:before{content:"";position:absolute;top:6px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#2a3544;z-index:1}.acx-steps div:after{content:"";position:absolute;top:11px;left:-50%;width:100%;height:2px;background:#2a3544}.acx-steps div:first-child:after{display:none}' +
    '.acx-steps div.d{color:#d6ff5c}.acx-steps div.d:before,.acx-steps div.d:after{background:#c6ff3d}.acx-steps div.c:before{background:#ffc43c;animation:acxPulse 1.6s infinite}' +
    '.acx-cf{position:absolute;left:50%;top:44%;width:9px;height:14px;border-radius:2px;pointer-events:none;animation:acxConf 1.3s cubic-bezier(.15,.7,.3,1) forwards}' +
    '.acx-ld{display:grid;place-items:center;padding:60px 0}.acx-ld i{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:#c6ff3d;animation:acxSpin .8s linear infinite}' +
    /* top bar pill */
    '.acx-pill{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 13px 0 10px;border-radius:12px;border:1px solid rgba(198,255,61,.28);background:rgba(198,255,61,.07);color:#d6ff5c;font-size:13px;font-weight:700;cursor:pointer;transition:.18s;font-family:inherit;white-space:nowrap}.acx-pill:hover{background:rgba(198,255,61,.14)}.acx-pill svg{width:17px;height:17px;flex:none}.acx-pill b{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:9px;background:#ff5c5c;color:#fff;font-size:10px;display:none;place-items:center;padding:0 4px}' +
    '.acx-pill{position:relative}.acx-pill.dot b{display:grid}' +
    '@media (max-width:720px){.acx-ov{padding:0;align-items:flex-end}.acx{max-width:none;max-height:96vh;height:auto;border-radius:26px 26px 0 0;padding:20px 16px calc(18px + env(safe-area-inset-bottom));animation:acxSheet .38s cubic-bezier(.2,.8,.2,1) both}.acx-grid{grid-template-columns:1fr}.acx-hd h2{font-size:22px}.acx-op{grid-template-columns:1fr 1fr}.acx-pill span{display:none}.acx-pill{padding:0 10px}.acx-ft{bottom:-18px}}' +
    '@media (max-width:380px){.acx-op{grid-template-columns:1fr}}' +
    '@media (max-height:560px) and (orientation:landscape){.acx-ov{align-items:center;padding:8px}.acx{max-height:98vh;border-radius:20px}}' +
    '@media (prefers-reduced-motion:reduce){.acx,.acx-ov,.acx-card,.acx-st,.acx-res,.acx-ring,.acx-ring path,.acx-cf{animation:none!important}.acx-ring path{stroke-dashoffset:0}.acx-card:before{display:none}}';
  document.head.appendChild(css);

  /* ───── state ───── */
  var D = null, root = null, view = 'hub', W = null, loading = false;
  function loadInfo() { loading = true; return post('myAccess').then(function (r) { loading = false; if (r && r.ok) { D = r; syncLocal(r); } else D = D || { fail: (r && r.error) || 'Could not load your accounts.' }; return D; }); }
  function syncLocal(r) {
    var s = S(); if (!s.user) return;
    if (r.accounts) s.user.accounts = r.accounts;
    if (r.accountType) s.user.accountType = r.accountType;
  }
  function reqOf(type) {
    var l = (D && D.requests || []).filter(function (x) { return x.type === type; }); l.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); return l[0] || null;
  }
  function has(type) { return !!(D && D.accounts && D.accounts.indexOf(type) > -1); }
  function curType() { return (D && D.accountType) || (S().user && S().user.accountType) || 'banking'; }
  function other(t) { return t === 'exchange' ? 'banking' : 'exchange'; }

  /* ───── open / close ───── */
  function open() {
    if (root || isAdmin()) return;
    root = document.createElement('div'); root.className = 'acx-ov'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'My accounts');
    root.innerHTML = '<div class="acx" id="acxBox"></div>'; document.body.appendChild(root); document.documentElement.style.overflow = 'hidden';
    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    view = 'hub'; W = null; render(); loadInfo().then(function () { if (root && view === 'hub') render(); });
  }
  function close() {
    if (!root) return; root.remove(); root = null; document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey); refreshPill();
  }
  function onKey(e) { if (e.key === 'Escape') { if (view === 'wiz' && W && W.step > 0) return back(); close(); } }
  function box() { return $('acxBox'); }

  /* ───── render ───── */
  function render() {
    var b = box(); if (!b) return;
    if (view === 'wiz') return renderWiz();
    if (view === 'done') return;
    var h = '<div class="acx-hd"><div><h2>My accounts</h2><p>Banking and Exchange under one login. Apply for the one you do not have yet and switch between them in one tap.</p></div><button type="button" class="acx-x" data-a="close" aria-label="Close">' + IC.x + '</button></div>';
    if (!D) { b.innerHTML = h + '<div class="acx-ld"><i></i></div>'; return; }
    if (D.fail) { b.innerHTML = h + '<div class="acx-warn">' + esc(D.fail) + '</div><div class="acx-ft"><button class="acx-btn g" data-a="retry" type="button"><span>Try again</span></button></div>'; return; }
    h += '<div class="acx-grid">' + ['banking', 'exchange'].map(card).join('') + '</div>';
    if (!D.verified) h += '<div class="acx-warn">Complete your identity verification first. Then you can apply for the second account.</div>';
    h += '<div class="acx-note">' + IC.shield + '<div>Your applications are reviewed by our team, usually within one business day. We will notify you here in the app as soon as there is a decision. Your balance and personal details stay on the same profile.</div></div>';
    b.innerHTML = h;
  }
  function card(t) {
    var r = reqOf(t), mine = has(t), cur = mine && curType() === t, tag = '', btn = '', ds = t === 'exchange' ? 'Trade crypto on the live market, swap instantly and follow your portfolio.' : 'Your everyday account with an IBAN, cards, payouts and multi-currency balances.';
    if (cur) tag = '<span class="acx-tag on">' + IC.check + 'Current</span>';
    else if (mine) tag = '<span class="acx-tag on">' + IC.check + 'Active</span>';
    else if (r && r.status === 'pending') tag = '<span class="acx-tag wait">' + IC.clock + 'In review</span>';
    else if (r && r.status === 'rejected') tag = '<span class="acx-tag no">' + IC.x + 'Not approved</span>';
    if (cur) btn = '<button class="acx-btn g" type="button" disabled><span>You are here</span></button>';
    else if (mine) btn = '<button class="acx-btn p" type="button" data-a="switch" data-t="' + t + '">' + IC.swap + '<span>Switch to ' + NAME[t] + '</span></button>';
    else if (r && r.status === 'pending') btn = '<button class="acx-btn g" type="button" data-a="status" data-t="' + t + '">' + IC.clock + '<span>View status</span></button>';
    else if (!D.verified) btn = '<button class="acx-btn g" type="button" disabled>' + IC.lock + '<span>Verification needed</span></button>';
    else {
      var wait = r && r.status === 'rejected' ? Math.ceil((3 * 864e5 - (Date.now() - (r.reviewedAt || 0))) / 864e5) : 0;
      if (wait > 0) btn = '<button class="acx-btn g" type="button" disabled>' + IC.clock + '<span>Apply again in ' + wait + (wait === 1 ? ' day' : ' days') + '</span></button>';
      else btn = '<button class="acx-btn p" type="button" data-a="apply" data-t="' + t + '"><span>' + (r && r.status === 'rejected' ? 'Apply again' : 'Apply for ' + NAME[t]) + '</span>' + IC.arrow + '</button>';
    }
    var rej = r && r.status === 'rejected' && r.reason && !mine ? '<div class="acx-warn" style="margin:0 0 14px">Reason: ' + esc(r.reason) + '</div>' : '';
    return '<div class="acx-card' + (cur ? ' cur' : '') + '">' + tag + '<div class="acx-ic">' + (t === 'exchange' ? IC.chart : IC.bank) + '</div><h3>' + NAME[t] + '</h3><div class="d">' + ds + '</div><ul class="acx-pk">' +
      PERKS[t].map(function (p) { return '<li><i>' + IC.check + '</i>' + p + '</li>'; }).join('') + '</ul>' + rej + btn + '</div>';
  }

  /* ───── wizard ───── */
  function startWiz(t) {
    W = { t: t, step: 0, a: {}, ack: {}, notes: '', rev: false, busy: false }; view = 'wiz'; renderWiz();
  }
  function renderWiz() {
    var b = box(), steps = Q[W.t], n = steps.length + 1, last = W.step === steps.length;
    var pr = '<div class="acx-pr" aria-hidden="true">'; for (var i = 0; i < n; i++) pr += '<i class="' + (i < W.step ? 'd' : i === W.step ? 'c' : '') + '"></i>'; pr += '</div>';
    var h = '<div class="acx-hd"><button type="button" class="acx-bk" data-a="back" aria-label="Back">' + IC.back + '</button><div><h2>Apply for ' + NAME[W.t] + '</h2><p>Step ' + (W.step + 1) + ' of ' + n + '</p></div><button type="button" class="acx-x" data-a="close" aria-label="Close">' + IC.x + '</button></div>' + pr;
    h += '<div class="acx-st' + (W.rev ? ' rev' : '') + '">';
    if (!last) {
      var s = steps[W.step];
      h += '<h3>' + esc(s.t) + '</h3><div class="s">' + esc(s.s) + '</div>';
      s.q.forEach(function (q) {
        h += '<div class="acx-q" data-k="' + q.k + '"><b>' + esc(q.l) + '</b><div class="acx-op" role="' + (q.multi ? 'group' : 'radiogroup') + '">';
        q.o.forEach(function (o) {
          var on = q.multi ? (W.a[q.k] || []).indexOf(o[0]) > -1 : W.a[q.k] === o[0];
          h += '<button type="button" class="acx-o' + (q.multi ? ' m' : '') + (on ? ' on' : '') + '" data-a="opt" data-k="' + q.k + '" data-v="' + o[0] + '" role="' + (q.multi ? 'checkbox' : 'radio') + '" aria-checked="' + on + '">' + esc(o[1]) + '</button>';
        }); h += '</div></div>';
      });
      h += '<div class="acx-err" id="acxErr" role="alert"></div><div class="acx-ft"><button class="acx-btn p" type="button" data-a="next"><span>Continue</span>' + IC.arrow + '</button></div>';
    } else {
      h += '<h3>Almost done</h3><div class="s">Confirm the statements below and send your application.</div>';
      ACK[W.t].forEach(function (a) { h += '<button type="button" class="acx-ck' + (W.ack[a[0]] ? ' on' : '') + '" data-a="ack" data-k="' + a[0] + '" role="checkbox" aria-checked="' + !!W.ack[a[0]] + '"><i>' + IC.check + '</i><span>' + esc(a[1]) + '</span></button>'; });
      h += '<div class="acx-q" style="margin-top:16px"><b>Anything else we should know? <span style="color:#8b98ab;font-weight:500">(optional)</span></b><textarea class="acx-ta" id="acxNotes" maxlength="500" placeholder="For example, your trading strategy or why you need this account">' + esc(W.notes) + '</textarea></div>';
      h += '<div class="acx-err" id="acxErr" role="alert"></div><div class="acx-ft"><button class="acx-btn p" type="button" data-a="send" id="acxSend"><span>Send application</span>' + IC.arrow + '</button></div>';
    }
    h += '</div>'; b.innerHTML = h; b.scrollTop = 0;
    var ta = $('acxNotes'); if (ta) ta.addEventListener('input', function () { W.notes = ta.value; });
  }
  function err(m) { var e = $('acxErr'); if (e) e.textContent = m || ''; }
  function back() { if (!W || W.step === 0) { view = 'hub'; render(); return; } W.step--; W.rev = true; renderWiz(); W.rev = false; }
  function next() {
    var s = Q[W.t][W.step], miss = null;
    s.q.forEach(function (q) { if (miss) return; if (q.multi ? !(W.a[q.k] && W.a[q.k].length) : !W.a[q.k]) miss = q; });
    if (miss) {
      err(miss.multi ? 'Please choose at least one option.' : 'Please answer: ' + miss.l);
      var el = document.querySelector('.acx-q[data-k="' + miss.k + '"]'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); [].forEach.call(el.querySelectorAll('.acx-o'), function (o) { o.classList.remove('bad'); void o.offsetWidth; o.classList.add('bad'); }); }
      return;
    }
    W.step++; W.rev = false; renderWiz();
  }
  function send() {
    if (W.busy) return; var need = ACK[W.t].filter(function (a) { return !W.ack[a[0]]; });
    if (need.length) { err('Please confirm all statements to continue.'); return; }
    W.busy = true; var bt = $('acxSend'); if (bt) { bt.classList.add('ld'); bt.disabled = true; } err('');
    var a = {}; Object.keys(W.a).forEach(function (k) { a[k] = W.a[k]; }); a.ack = { }; ACK[W.t].forEach(function (x) { a.ack[x[0]] = true; }); a.notes = W.notes;
    post('applyAccess', { type: W.t, answers: a }).then(function (r) {
      if (!W) return; W.busy = false;
      if (!r || !r.ok) { var bt2 = $('acxSend'); if (bt2) { bt2.classList.remove('ld'); bt2.disabled = false; } err((r && r.error) || 'Could not send your application.'); return; }
      var t = W.t; D = D || {}; D.requests = (D.requests || []).concat([{ id: r.request.id, type: t, status: 'pending', createdAt: r.request.createdAt }]);
      done(t);
    });
  }
  function done(t) {
    view = 'done'; var b = box(); if (!b) return;
    b.innerHTML = '<div class="acx-hd"><div></div><button type="button" class="acx-x" data-a="close" aria-label="Close">' + IC.x + '</button></div><div class="acx-res" style="position:relative"><div class="acx-ring">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h3>Application sent</h3><p>Thank you. Our team will review your ' + NAME[t] + ' application, usually within one business day. We will notify you here as soon as there is a decision.</p>' +
      '<div class="acx-steps"><div class="d">Sent</div><div class="c">In review</div><div>Decision</div></div><button class="acx-btn p" type="button" data-a="hub" style="max-width:320px;margin:0 auto"><span>Back to my accounts</span></button></div>';
    confetti(b); refreshPill();
  }
  function confetti(host) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    var cols = ['#d6ff5c', '#a6e22e', '#6ee7b7', '#7cc4ff', '#fff'], h = host.querySelector('.acx-res') || host;
    for (var i = 0; i < 26; i++) { var c = document.createElement('i'); c.className = 'acx-cf'; var ang = Math.random() * Math.PI * 2, d = 90 + Math.random() * 150;
      c.style.cssText = 'background:' + cols[i % cols.length] + ';--x:' + Math.cos(ang) * d + 'px;--y:' + (Math.sin(ang) * d - 40) + 'px;--r:' + (Math.random() * 720 - 360) + 'deg;animation-delay:' + (Math.random() * .15) + 's';
      h.appendChild(c); (function (n) { setTimeout(function () { n.remove(); }, 1700); })(c); }
  }
  function statusView(t) {
    var r = reqOf(t); if (!r) return; var b = box(); view = 'status';
    b.innerHTML = '<div class="acx-hd"><button type="button" class="acx-bk" data-a="hub" aria-label="Back">' + IC.back + '</button><div><h2>' + NAME[t] + ' application</h2><p>Sent ' + esc(new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</p></div><button type="button" class="acx-x" data-a="close" aria-label="Close">' + IC.x + '</button></div>' +
      '<div class="acx-res" style="padding-top:8px"><div class="acx-ring w"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><h3>We are reviewing it</h3><p>Usually this takes up to one business day. You will get a notification in the app when there is a decision.</p>' +
      '<div class="acx-steps"><div class="d">Sent</div><div class="c">In review</div><div>Decision</div></div></div>';
  }

  /* ───── switching ───── */
  function doSwitch(t, btn) {
    if (btn) { btn.classList.add('ld'); btn.disabled = true; }
    post('switchAccount', { to: t }).then(function (r) {
      if (!r || !r.ok) { if (btn) { btn.classList.remove('ld'); btn.disabled = false; } toastMsg((r && r.error) || 'Could not switch the account.', 1); return; }
      var s = S(); if (s.user) { s.user.accountType = r.accountType; s.user.accounts = r.accounts; }
      if (D) { D.accountType = r.accountType; D.accounts = r.accounts; }
      close();
      try { window._lastAppliedAccountType = null; document.body.dataset.acctApplied = ''; if (typeof applyAccountType === 'function') applyAccountType(); } catch (e) { }
      try { var mi = document.querySelector('.mi[data-p="dash"]'); if (mi) mi.click(); } catch (e) { }
      try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
      refreshPill(); toastMsg('Switched to ' + NAME[t], 0);
    });
  }
  function toastMsg(m, warn) { try { if (typeof toast === 'function') return toast(m, warn); } catch (e) { } }

  /* ───── clicks ───── */
  function onClick(e) {
    var el = e.target.closest('[data-a]'); if (!el || !root) return; var a = el.getAttribute('data-a'), t = el.getAttribute('data-t');
    if (a === 'close') return close();
    if (a === 'hub') { view = 'hub'; return render(); }
    if (a === 'retry') { D = null; render(); return loadInfo().then(function () { if (root) render(); }); }
    if (a === 'apply') return startWiz(t);
    if (a === 'status') return statusView(t);
    if (a === 'switch') return doSwitch(t, el);
    if (a === 'back') return back();
    if (a === 'next') return next();
    if (a === 'send') return send();
    if (a === 'ack') { var k = el.getAttribute('data-k'); W.ack[k] = !W.ack[k]; el.classList.toggle('on', !!W.ack[k]); el.setAttribute('aria-checked', !!W.ack[k]); return err(''); }
    if (a === 'opt') {
      var key = el.getAttribute('data-k'), v = el.getAttribute('data-v'), multi = el.classList.contains('m'); err('');
      if (multi) { var l = W.a[key] || []; var i = l.indexOf(v); if (i > -1) l.splice(i, 1); else l.push(v); W.a[key] = l; el.classList.toggle('on', i < 0); el.setAttribute('aria-checked', i < 0); }
      else { W.a[key] = v; [].forEach.call(el.parentNode.children, function (o) { var on = o === el; o.classList.toggle('on', on); o.setAttribute('aria-checked', on); }); }
    }
  }

  /* ───── entry points: sidebar item + top bar pill ───── */
  var lastPill = '';
  function pillHtml() {
    var cur = curType();
    return '<span>' + NAME[cur] + '</span>';
  }
  function refreshPill() {
    var p = $('acxPill'); if (!p) return;
    var cur = curType(), pend = D && (D.requests || []).some(function (r) { return r.status === 'pending'; }), ok = D && (D.requests || []).some(function (r) { return r.status === 'approved' && !has(r.type); });
    var html = (cur === 'exchange' ? IC.chart : IC.bank) + pillHtml(); if (html !== lastPill) { p.innerHTML = html; lastPill = html; }
    p.classList.toggle('dot', false); p.title = 'My accounts'; p.setAttribute('aria-label', 'My accounts: ' + NAME[cur]);
  }
  function mount() {
    if (isAdmin()) return;
    var top = document.querySelector('.top > div[style*="flex"]'), sb = $('settingsBtn');
    if (top && !$('acxPill') && sb) { var p = document.createElement('button'); p.type = 'button'; p.id = 'acxPill'; p.className = 'acx-pill'; sb.parentNode.insertBefore(p, sb); p.addEventListener('click', open); lastPill = ''; refreshPill(); }
    var menu = document.querySelector('#sideBar .menu');
    if (menu && !$('acxMi')) {
      var li = document.createElement('li'); li.className = 'mi'; li.id = 'acxMi'; li.setAttribute('role', 'button'); li.tabIndex = 0;
      li.innerHTML = IC.swap.replace('<svg ', '<svg style="width:20px;height:20px" ') + '<span class="tx">My accounts</span>';
      menu.appendChild(li);
      li.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); open(); }, true);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    var mi = $('acxMi'); if (mi) mi.classList.remove('on');
  }
  var iv = setInterval(function () { mount(); refreshPill(); }, 1200); mount();
  /* first load: learn which accounts the client has, so the pill shows the right name */
  setTimeout(function () { if (!isAdmin() && token()) loadInfo().then(refreshPill); }, 1800);
  window.openAccounts = open;
})();
