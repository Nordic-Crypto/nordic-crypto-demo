/* ca-au-pay.js v1 — payout methods for Canada and Australia in the Withdraw window
   🇨🇦 Interac e-Transfer · Canadian bank transfer (EFT: institution / transit / account)
   🇦🇺 PayID (email / mobile / ABN) · Australian bank transfer (BSB + account)
   Replaces the plain "Method" dropdown with method tiles. Money logic lives on the server (it validates, converts and holds). */
(function () {
  'use strict';
  if (window.__ncCaAu) return; window.__ncCaAu = 1;
  var WORKER = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  function digits(x) { return String(x || '').replace(/\D/g, ''); }

  var CA_BANKS = { '001': 'BMO', '002': 'Scotiabank', '003': 'RBC Royal Bank', '004': 'TD Canada Trust', '006': 'National Bank', '010': 'CIBC', '016': 'HSBC Canada', '030': 'Canadian Western Bank', '039': 'Laurentian Bank', '219': 'ATB Financial', '614': 'Tangerine', '815': 'Desjardins', '829': 'Desjardins' };
  var AU_BANKS = { '01': 'ANZ', '03': 'Westpac', '73': 'Westpac', '06': 'Commonwealth Bank', '08': 'NAB', '11': 'St.George', '30': 'Bankwest', '18': 'Macquarie', '92': 'ING' };

  /* flags and coin are drawn as SVG: Windows has no flag emoji and older systems miss the coin emoji */
  var SVG = {
    CA: '<svg viewBox="0 0 30 20" width="1.5em" height="1em" style="vertical-align:-.12em;border-radius:3px"><rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#e8112d"/><rect x="22.5" width="7.5" height="20" fill="#e8112d"/><path d="M15 3l1.6 3.2 2.2-.8-.9 4.4 2.1-1.3.4 1.5-3.2 2.9.3 1.1-3.4-.4v3.2h-.2v-3.2l-3.4.4.3-1.1-3.2-2.9.4-1.5 2.1 1.3-.9-4.4 2.2.8z" fill="#e8112d"/></svg>',
    AU: '<svg viewBox="0 0 30 20" width="1.5em" height="1em" style="vertical-align:-.12em;border-radius:3px"><rect width="30" height="20" fill="#012169"/><path d="M0 0l15 10M15 0L0 10" stroke="#fff" stroke-width="2"/><path d="M7.5 0v10M0 5h15" stroke="#fff" stroke-width="3.4"/><path d="M7.5 0v10M0 5h15" stroke="#c8102e" stroke-width="2"/><g fill="#fff"><circle cx="7.5" cy="15.2" r="1.7"/><circle cx="22" cy="4.5" r="1"/><circle cx="26" cy="9" r="1"/><circle cx="22" cy="16" r="1.2"/><circle cx="18" cy="10" r="1"/></g></svg>',
    COIN: '<svg viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-.12em"><circle cx="12" cy="12" r="10.5" fill="#f7b731" stroke="#c98a0a" stroke-width="1.4"/><circle cx="12" cy="12" r="7.3" fill="none" stroke="#c98a0a" stroke-width="1"/><path d="M10 7.5h3a2 2 0 010 4h-3m0 0h3.4a2 2 0 010 4H10m0-8v8M11.5 6.2v1.3m0 8.5v1.3" fill="none" stroke="#7a4f00" stroke-width="1.3" stroke-linecap="round"/></svg>',
    BANK: '<svg viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-.12em" fill="none" stroke="#47dcff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5v2H3zM5 11v7M9.5 11v7M14.5 11v7M19 11v7M3 20h18"/></svg>',
    CARD: '<svg viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-.12em" fill="none" stroke="#ec4899" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></svg>'
  };
  function fl(c) { return SVG[c] || ''; }
  var M = {
    etransfer: { cur: 'CAD', flag: fl('CA'), name: 'Interac e-Transfer', sub: 'Email or mobile', eta: 'Usually within minutes after approval', chip: 'Fast', color: '#ffd23f' },
    eft:       { cur: 'CAD', flag: fl('CA'), name: 'Canadian bank', sub: 'Institution · transit · account', eta: '1–3 business days after approval', chip: 'Direct deposit', color: '#ff5d5d' },
    payid:     { cur: 'AUD', flag: fl('AU'), name: 'PayID', sub: 'Email, mobile or ABN', eta: 'Usually within minutes after approval', chip: 'Fast', color: '#2dd4bf' },
    bsb:       { cur: 'AUD', flag: fl('AU'), name: 'Australian bank', sub: 'BSB + account number', eta: 'Same or next business day after approval', chip: 'Direct credit', color: '#60a5fa' }
  };
  var STD = [['iban', 'Bank (IBAN)', 'SEPA / SWIFT', SVG.BANK], ['card', 'Card payout', 'Visa / Mastercard', SVG.CARD], ['crypto', 'Crypto', 'BTC · ETH · USDT', SVG.COIN]];

  /* ───── styles ───── */
  var css = document.createElement('style');
  css.textContent =
    '#ncRp{margin:6px 0 4px}#ncRp .rp-g{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7c9cbb;margin:14px 0 8px;display:flex;align-items:center;gap:8px}#ncRp .rp-g:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(71,220,255,.25),transparent)}' +
    '#ncRp .rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}#ncRp .rp-3{grid-template-columns:repeat(3,1fr)}#ncRp .rp-3 .rp-s{display:none}#ncRp .rp-3 .rp-t{padding:10px 8px}' +
    '#ncRp .rp-t{position:relative;text-align:left;padding:11px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);color:#e8f4ff;cursor:pointer;transition:transform .18s,border-color .18s,background .18s,box-shadow .18s;font-family:inherit;overflow:hidden}' +
    '#ncRp .rp-t:hover{transform:translateY(-2px);border-color:rgba(71,220,255,.4)}' +
    '#ncRp .rp-t.on{border-color:var(--c,#47dcff);background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));box-shadow:0 0 0 1px var(--c,#47dcff) inset,0 8px 26px -10px var(--c,#47dcff)}' +
    '#ncRp .rp-t.on:after{content:"✓";position:absolute;right:9px;top:8px;width:18px;height:18px;border-radius:50%;background:var(--c,#47dcff);color:#04121a;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;animation:rpPop .3s cubic-bezier(.3,1.6,.5,1)}' +
    '#ncRp .rp-i{font-size:22px;line-height:1;margin-bottom:6px;display:block}#ncRp .rp-n{font-weight:700;font-size:13px;display:block}#ncRp .rp-s{font-size:11px;color:#7c9cbb;display:block;margin-top:2px}' +
    '#ncRp .rp-k{display:inline-block;margin-top:7px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:rgba(255,255,255,.07);color:var(--c,#9fe)}' +
    '@keyframes rpPop{from{transform:scale(0)}to{transform:scale(1)}}@keyframes rpIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '#ncRf{animation:rpIn .35s ease both;margin-top:4px}#ncRf .rp-h{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);margin:12px 0 4px}' +
    '#ncRf .rp-h b{font-size:14px}#ncRf .rp-h small{display:block;color:#7c9cbb;font-size:11.5px;margin-top:2px}#ncRf .rp-h .fl{font-size:26px}' +
    '#ncRf .rp-seg{display:flex;gap:6px;margin-top:4px}#ncRf .rp-seg button{flex:1;padding:9px 6px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#cfe3f5;font-size:12.5px;cursor:pointer;font-family:inherit;transition:.15s}#ncRf .rp-seg button.on{background:rgba(71,220,255,.14);border-color:#47dcff;color:#fff}' +
    '#ncRf .rp-row{display:flex;gap:8px}#ncRf .rp-row>div{flex:1;min-width:0}' +
    '#ncRf .wd-input.bad{border-color:#ff6b6b}#ncRf .wd-input.good{border-color:#34d399}' +
    '#ncRf .rp-bk{margin-top:6px;font-size:12px;color:#34d399;min-height:16px;display:flex;align-items:center;gap:6px}' +
    '#ncRf .rp-pv{margin-top:14px;padding:14px;border-radius:14px;background:radial-gradient(120% 140% at 0 0,rgba(71,220,255,.14),rgba(168,85,247,.08));border:1px solid rgba(71,220,255,.22)}' +
    '#ncRf .rp-pv .l{display:flex;justify-content:space-between;font-size:12px;color:#9db4cb;padding:3px 0}#ncRf .rp-pv .big{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.02em;margin:2px 0 6px;font-variant-numeric:tabular-nums}' +
    '#ncRf .rp-pv .big small{font-size:13px;font-weight:600;color:#7c9cbb;margin-left:4px}' +
    '#ncRf .rp-eta{display:flex;align-items:center;gap:8px;font-size:12px;color:#cfe3f5;margin-top:8px}#ncRf .rp-eta i{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:rpPulse 1.8s infinite}@keyframes rpPulse{70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}' +
    '#ncRf .rp-note{font-size:11.5px;color:#8aa3bb;line-height:1.45;margin-top:10px}' +
    '.rp-proc{padding:22px 4px;text-align:center}.rp-proc .rg{width:92px;height:92px;margin:0 auto 18px;position:relative}.rp-proc .rg svg{width:92px;height:92px;animation:rpSpin 1.3s linear infinite}@keyframes rpSpin{to{transform:rotate(360deg)}}' +
    '.rp-proc .rg span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px}' +
    '.rp-st{display:flex;flex-direction:column;gap:9px;text-align:left;max-width:290px;margin:16px auto 0}.rp-st div{display:flex;align-items:center;gap:10px;font-size:13px;color:#5b7189;transition:.3s}.rp-st div.on{color:#e8f4ff}.rp-st div.ok{color:#34d399}.rp-st div:before{content:"";width:14px;height:14px;border-radius:50%;border:2px solid currentColor;box-sizing:border-box}.rp-st div.ok:before{background:#34d399;border-color:#34d399;box-shadow:inset 0 0 0 3px #0f1420}.rp-st div.on:before{border-top-color:transparent;animation:rpSpin .8s linear infinite}' +
    '.rp-ok{padding:18px 2px;text-align:center;position:relative;overflow:hidden}.rp-ok .ck{width:84px;height:84px;margin:0 auto 14px}.rp-ok .ck circle{stroke-dasharray:252;stroke-dashoffset:252;animation:rpDraw .7s .05s ease forwards}.rp-ok .ck path{stroke-dasharray:60;stroke-dashoffset:60;animation:rpDraw .45s .6s ease forwards}@keyframes rpDraw{to{stroke-dashoffset:0}}' +
    '.rp-ok h3{margin:0 0 4px;font-size:20px;color:#fff;-webkit-text-fill-color:#fff;background:none}.rp-ok .amt{font-size:30px;font-weight:800;margin:8px 0 2px;font-variant-numeric:tabular-nums}.rp-ok .amt small{display:block;font-size:12px;color:#7c9cbb;font-weight:500;margin-top:2px}' +
    '.rp-ok .rc{margin:14px 0;padding:6px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-align:left}.rp-ok .rc div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;font-size:13px;border-bottom:1px dashed rgba(255,255,255,.08)}.rp-ok .rc div:last-child{border:0}.rp-ok .rc span{color:#7c9cbb}.rp-ok .rc b{text-align:right;word-break:break-all;font-weight:600}' +
    '.rp-conf i{position:absolute;top:-10px;width:7px;height:12px;border-radius:2px;animation:rpFall 1.9s ease-in forwards;opacity:0}@keyframes rpFall{10%{opacity:1}100%{transform:translateY(360px) rotate(540deg);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){#ncRp *,#ncRf,.rp-ok *,.rp-proc *,.rp-conf i{animation:none!important;transition:none!important}.rp-ok .ck circle,.rp-ok .ck path{stroke-dashoffset:0!important}}';
  document.head.appendChild(css);

  /* ───── state ───── */
  var cur = 'iban', sub = { payid: 'email' }, busy = false;
  function rate(c) { var s = S(); return { USD: 1, CAD: s.cadR || 1.38, AUD: s.audR || 1.52, EUR: s.eurR || 0.92 }[c] || 1; }
  function userCountry() {
    var v = S().verification, c = v && v.personalInfo && v.personalInfo.country; c = String(c || (S().user && S().user.country) || '').toUpperCase();
    if (c === 'CANADA') c = 'CA'; if (c === 'AUSTRALIA') c = 'AU';
    var cc = String(S().currency || '').toUpperCase(); return c === 'CA' || c === 'AU' ? c : (cc === 'CAD' ? 'CA' : cc === 'AUD' ? 'AU' : '');
  }
  function tile(k) {
    var m = M[k], c = m.color;
    return '<button type="button" class="rp-t' + (cur === k ? ' on' : '') + '" data-rp="' + k + '" style="--c:' + c + '"><span class="rp-i">' + m.flag + '</span><span class="rp-n">' + m.name + '</span><span class="rp-s">' + m.sub + '</span><span class="rp-k">' + m.chip + '</span></button>';
  }
  function stdTile(a) { return '<button type="button" class="rp-t' + (cur === a[0] ? ' on' : '') + '" data-rp="' + a[0] + '" style="--c:#47dcff"><span class="rp-i">' + a[3] + '</span><span class="rp-n">' + a[1] + '</span><span class="rp-s">' + a[2] + '</span></button>'; }
  function groups() {
    var uc = userCountry(), ca = '<div class="rp-g">' + fl('CA') + ' Canada</div><div class="rp-grid">' + tile('etransfer') + tile('eft') + '</div>',
      au = '<div class="rp-g">' + fl('AU') + ' Australia</div><div class="rp-grid">' + tile('payid') + tile('bsb') + '</div>',
      std = '<div class="rp-g">Worldwide</div><div class="rp-grid rp-3">' + STD.map(stdTile).join('') + '</div>';
    return uc === 'CA' ? ca + au + std : uc === 'AU' ? au + ca + std : std + ca + au;
  }
  function mount() {
    var modal = $('withdrawModal'), sel = $('wdMethod'); if (!modal || !sel) return;
    var form = modal.querySelector('.wd-form-stage'); if (!form) return;
    if (!sel.querySelector('option[value="etransfer"]')) {
      ['etransfer', 'eft', 'payid', 'bsb'].forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = M[k].name + ' (' + M[k].cur + ')'; sel.appendChild(o); });
    }
    var lab = sel.previousElementSibling; if (lab && lab.tagName === 'LABEL') lab.style.display = 'none'; sel.style.display = 'none';
    var box = $('ncRp');
    if (!box) { box = document.createElement('div'); box.id = 'ncRp'; sel.parentNode.insertBefore(box, sel); box.addEventListener('click', function (e) { var b = e.target.closest('[data-rp]'); if (b) pick(b.getAttribute('data-rp')); }); }
    var open = modal.style.display !== 'none' && form.style.display !== 'none';
    if (open && !box.__open) { box.__open = 1; cur = 'iban'; sub.payid = 'email'; shown = 0; var cs0 = $('ncwCur'); if (cs0) cs0.disabled = false; paint(); }
    if (!open) box.__open = 0;
    if (sel.value !== cur && !box.__busyPick) { cur = sel.value || 'iban'; paint(); }
  }
  function paint() { var box = $('ncRp'); if (box) box.innerHTML = groups(); form(); }

  function pick(k) {
    var sel = $('wdMethod'); if (!sel) return; cur = k; sel.value = k;
    var box = $('ncRp'); box.__busyPick = 1;
    try { if (typeof window.wdSwitchMethod === 'function') window.wdSwitchMethod(); } catch (e) {}
    paint();
    var cs = $('ncwCur'); if (cs) { if (M[k]) { cs.value = M[k].cur; cs.disabled = true; } else { if (cs.disabled) { var d0 = String(S().currency || 'USD').toUpperCase(); cs.value = [].some.call(cs.options, function (o) { return o.value === d0; }) ? d0 : 'USD'; } cs.disabled = false; } cs.dispatchEvent(new Event('change')); }
    var er = $('wdError'); if (er) er.style.display = 'none';
    setTimeout(function () { box.__busyPick = 0; }, 100);
  }

  /* ───── the form for a rail ───── */
  function inp(id, label, ph, extra) { return '<label class="wd-label">' + label + '</label><input type="text" id="' + id + '" class="wd-input" placeholder="' + ph + '" autocomplete="off" ' + (extra || '') + '>'; }
  function form() {
    var old = $('ncRf'); if (old) old.remove();
    if (!M[cur]) return;
    var m = M[cur], h = '<div id="ncRf"><div class="rp-h"><span class="fl">' + m.flag + '</span><div><b>' + m.name + '</b><small>Paid out in ' + m.cur + ' · ' + m.eta.toLowerCase() + '</small></div></div>';
    h += inp('rpName', 'Recipient full name', cur === 'payid' || cur === 'bsb' ? 'Jack Smith' : 'Alex Tremblay', 'maxlength="70"');
    if (cur === 'etransfer') h += inp('rpContact', 'Recipient email or mobile', 'name@email.ca or (416) 555-0199', 'inputmode="email" maxlength="100"') + inp('rpMsg', 'Message (optional)', 'e.g. Rent', 'maxlength="40"');
    if (cur === 'eft') h += '<div class="rp-row"><div>' + inp('rpIns', 'Institution', '004', 'inputmode="numeric" maxlength="3"') + '</div><div>' + inp('rpTr', 'Transit', '12345', 'inputmode="numeric" maxlength="5"') + '</div></div>' + inp('rpAcc', 'Account number', '1234567', 'inputmode="numeric" maxlength="12"') + '<div class="rp-bk" id="rpBank"></div>';
    if (cur === 'payid') h += '<label class="wd-label">PayID type</label><div class="rp-seg" id="rpSeg">' + [['email', 'Email'], ['mobile', 'Mobile'], ['abn', 'ABN']].map(function (x) { return '<button type="button" data-t="' + x[0] + '" class="' + (sub.payid === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' + inp('rpPid', 'PayID', '', 'maxlength="100"');
    if (cur === 'bsb') h += '<div class="rp-row"><div>' + inp('rpBsb', 'BSB', '062-000', 'inputmode="numeric" maxlength="7"') + '</div><div>' + inp('rpAcc', 'Account number', '12345678', 'inputmode="numeric" maxlength="10"') + '</div></div><div class="rp-bk" id="rpBank"></div>';
    h += '<div class="rp-pv" id="rpPv"></div><div class="rp-eta"><i></i><span>' + m.eta + '. Every withdrawal is reviewed first.</span></div>' +
      '<div class="rp-note">🔒 Double-check the details: a ' + (cur === 'etransfer' || cur === 'payid' ? 'contact' : 'bank account') + ' entered wrongly can delay your payout. The first payout to a new destination can wait up to 24 h for a safety check.</div></div>';
    var box = $('ncRp'); box.insertAdjacentHTML('afterend', h);
    var f = $('ncRf');
    f.addEventListener('input', onInput); var seg = $('rpSeg');
    if (seg) seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; sub.payid = b.getAttribute('data-t'); [].forEach.call(seg.children, function (x) { x.classList.toggle('on', x === b); }); payidPh(); onInput(); });
    payidPh(); preview();
  }
  function payidPh() { var e = $('rpPid'); if (!e) return; var t = sub.payid; e.placeholder = t === 'email' ? 'name@email.com.au' : t === 'mobile' ? '04XX XXX XXX' : '51 824 753 556'; e.inputMode = t === 'email' ? 'email' : 'numeric'; e.value = ''; }
  var pvTimer;
  function onInput(e) {
    var t = e && e.target; if (t) t.classList.remove('bad', 'good');
    var b = $('rpBank');
    if (b) { var txt = ''; if (cur === 'eft') { var i = digits(($('rpIns') || {}).value); txt = CA_BANKS[i] ? '✓ ' + CA_BANKS[i] : ''; } if (cur === 'bsb') { var x = digits(($('rpBsb') || {}).value); txt = AU_BANKS[x.slice(0, 2)] && x.length >= 3 ? '✓ ' + AU_BANKS[x.slice(0, 2)] : ''; } b.textContent = txt; }
    if (t && t.id === 'rpBsb') { var d = digits(t.value).slice(0, 6); t.value = d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; }
    if (t && t.id === 'rpPid' && sub.payid === 'abn') { var a = digits(t.value).slice(0, 11); t.value = a.replace(/^(\d{2})(\d{0,3})(\d{0,3})(\d{0,3}).*/, function (_, p, q, r, s) { return [p, q, r, s].filter(Boolean).join(' '); }); }
    if (t && t.id === 'rpPid' && sub.payid === 'mobile') { var p = digits(t.value).slice(0, 10); t.value = p.replace(/^(\d{4})(\d{0,3})(\d{0,3}).*/, function (_, a, b2, c) { return [a, b2, c].filter(Boolean).join(' '); }); }
    preview();
  }
  function amtUsd() { var a = $('wdAmount'), cs = $('ncwCur'), v = parseFloat(a && a.value) || 0, code = (cs && cs.value) || (M[cur] && M[cur].cur) || 'USD'; return { v: v, code: code, usd: v / rate(code) }; }
  var shown = 0;
  function preview() {
    var pv = $('rpPv'); if (!pv || !M[cur]) return; var m = M[cur], a = amtUsd();
    var recv = a.usd * rate(m.cur);
    pv.innerHTML = '<div class="l"><span>Recipient receives</span><span>' + m.cur + '</span></div><div class="big"><span id="rpBig">' + nf(shown) + '</span><small>' + m.cur + '</small></div>' +
      '<div class="l"><span>Debited from your balance</span><b>$' + nf(a.usd) + '</b></div><div class="l"><span>Rate</span><span>1 USD = ' + nf(rate(m.cur), 4) + ' ' + m.cur + '</span></div>';
    var from = shown, to = recv, t0 = performance.now(); cancelAnimationFrame(pvTimer);
    (function step(t) { var k = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - k, 3), el = $('rpBig'); shown = from + (to - from) * e; if (el) el.textContent = nf(shown); if (k < 1) pvTimer = requestAnimationFrame(step); else shown = to; })(t0);
  }
  document.addEventListener('input', function (e) { if (e.target && (e.target.id === 'wdAmount')) preview(); });

  /* ───── collect + validate ───── */
  function collect() {
    var name = (($('rpName') || {}).value || '').trim(), d = { name: name }, bad = null, v;
    function need(id, msg) { var el = $(id); if (el) { el.classList.add('bad'); if (!bad) { bad = msg; el.focus(); } } }
    if (name.length < 2) need('rpName', 'Enter the recipient’s full name.');
    if (cur === 'etransfer') { v = (($('rpContact') || {}).value || '').trim(); d.contact = v; d.msg = (($('rpMsg') || {}).value || '').trim(); if (v.indexOf('@') > -1 ? !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) : !/^1?[2-9]\d{9}$/.test(digits(v))) need('rpContact', 'Enter a valid email or a Canadian mobile number.'); }
    if (cur === 'eft') { d.institution = digits(($('rpIns') || {}).value); d.transit = digits(($('rpTr') || {}).value); d.account = digits(($('rpAcc') || {}).value); if (d.institution.length !== 3) need('rpIns', 'Institution number is 3 digits.'); else if (d.transit.length !== 5) need('rpTr', 'Transit number is 5 digits.'); else if (d.account.length < 7 || d.account.length > 12) need('rpAcc', 'Account number is 7 to 12 digits.'); }
    if (cur === 'payid') { d.payidType = sub.payid; d.payid = (($('rpPid') || {}).value || '').trim(); var pd = digits(d.payid); if (sub.payid === 'email' ? !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.payid) : sub.payid === 'mobile' ? !/^(04|614)\d{8,9}$/.test(pd) : pd.length !== 11) need('rpPid', sub.payid === 'email' ? 'Enter a valid PayID email.' : sub.payid === 'mobile' ? 'Enter a mobile like 04XX XXX XXX.' : 'ABN has 11 digits.'); }
    if (cur === 'bsb') { d.bsb = digits(($('rpBsb') || {}).value); d.account = digits(($('rpAcc') || {}).value); if (d.bsb.length !== 6) need('rpBsb', 'BSB is 6 digits.'); else if (d.account.length < 6 || d.account.length > 10) need('rpAcc', 'Account number is 6 to 10 digits.'); }
    return { d: d, err: bad };
  }
  function err(msg) { var e = $('wdError'); if (e) { e.textContent = msg; e.style.display = 'block'; } }
  function stage(which) {
    var m = $('withdrawModal'); if (!m) return; var f = m.querySelector('.wd-form-stage'), p = m.querySelector('.wd-processing'), s = m.querySelector('.wd-success');
    if (f) f.style.display = which === 'form' ? 'block' : 'none'; if (p) p.style.display = which === 'proc' ? 'block' : 'none'; if (s) s.style.display = which === 'ok' ? 'block' : 'none';
    var c = m.querySelector('.wd-modal-card'); if (c) c.scrollTop = 0;
  }

  /* ───── submit ───── */
  function submit() {
    if (busy) return; var er = $('wdError'); if (er) er.style.display = 'none';
    var m = M[cur], a = amtUsd(); if (!(a.v > 0)) return err('Enter a valid amount.');
    var bal = typeof S().usd === 'number' ? S().usd : 0; if (a.usd > bal + 0.005) return err('Insufficient balance. Available: $' + nf(bal));
    var c = collect(); if (c.err) return err(c.err);
    var token = typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); if (!token) return err('Session expired. Please sign in again.');
    busy = true; var btn = document.querySelector('#withdrawModal .wd-btn-submit'); if (btn) btn.disabled = true;
    var usd = Math.round(a.usd * 100) / 100;
    function go(otp) {
      return fetch(WORKER + '?action=withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, amount: usd, method: cur, details: c.d, otp: otp }) }).then(function (r) { return r.json(); });
    }
    go().then(function (r) {
      if (r && r.needOtp) { return askOtp(r.error).then(function (code) { if (code == null) return { ok: false, error: 'Withdrawal was not confirmed.' }; return go(code); }); }
      return r;
    }).then(function (r) {
      busy = false; if (btn) btn.disabled = false;
      if (!r || !r.ok) return err((r && r.error) || 'Withdrawal failed. Please try again.');
      var wd = r.withdrawal; if (!window.st) window.st = {}; if (!window.st.withdrawals) window.st.withdrawals = [];
      if (wd && !window.st.withdrawals.some(function (w) { return w.id === wd.id; })) window.st.withdrawals.unshift(wd);
      if (typeof r.usd === 'number') window.st.usd = r.usd;
      if (typeof window.render === 'function') try { window.render(); } catch (e) {}
      play(m, wd, usd);
    }).catch(function () { busy = false; if (btn) btn.disabled = false; err('Connection error. Please try again.'); });
  }
  function askOtp(msg) {
    return new Promise(function (res) {
      var o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px';
      o.innerHTML = '<div style="width:100%;max-width:370px;background:#0f1420;border:1px solid rgba(71,220,255,.3);border-radius:18px;padding:22px;color:#fff"><div style="font-size:19px;font-weight:800;margin-bottom:6px">Confirm withdrawal</div><div style="font-size:13px;color:#9db4cb;margin-bottom:14px">' + esc(msg || 'Enter the 6-digit code we emailed you.') + '</div><input id="rpOtp" inputmode="numeric" maxlength="6" placeholder="······" style="width:100%;box-sizing:border-box;text-align:center;font:700 28px ui-monospace,monospace;letter-spacing:9px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#080b12;color:#fff;outline:none"><div style="display:flex;gap:10px;margin-top:14px"><button id="rpOn" class="wd-btn wd-btn-cancel" style="flex:1">Cancel</button><button id="rpOy" class="wd-btn wd-btn-submit" style="flex:1">Confirm</button></div></div>';
      document.body.appendChild(o); var i = o.querySelector('#rpOtp'); setTimeout(function () { i.focus(); }, 40);
      function done(v) { o.remove(); res(v); }
      o.querySelector('#rpOn').onclick = function () { done(null); };
      function ok() { var v = digits(i.value); if (v.length === 6) done(v); else i.style.borderColor = '#ff6b6b'; }
      o.querySelector('#rpOy').onclick = ok; i.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
    });
  }

  /* ───── animation ───── */
  function play(m, wd, usd) {
    var p = document.querySelector('#withdrawModal .wd-processing'), s = document.querySelector('#withdrawModal .wd-success'); if (!p || !s) return;
    var d = (wd && wd.details) || {}, paid = d.payAmount || Math.round(usd * rate(m.cur) * 100) / 100;
    var steps = ['Checking details', 'Securing the payout', 'Sending to review'];
    p.innerHTML = '<div class="rp-proc"><div class="rg"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="40" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/><circle cx="46" cy="46" r="40" fill="none" stroke="' + m.color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="70 190"/></svg><span>' + m.flag + '</span></div><b style="font-size:17px">' + m.name + '</b><div style="color:#7c9cbb;font-size:13px;margin-top:4px">' + m.cur + ' ' + nf(paid) + '</div><div class="rp-st">' + steps.map(function (t) { return '<div>' + t + '</div>'; }).join('') + '</div></div>';
    stage('proc'); var rows = p.querySelectorAll('.rp-st div'), i = 0;
    (function next() { if (i > 0) rows[i - 1].className = 'ok'; if (i >= rows.length) return setTimeout(function () { done(); }, 350); rows[i].className = 'on'; i++; setTimeout(next, 650); })();
    function mask(x) { x = String(x || ''); return x.length > 8 ? x.slice(0, 3) + '•••' + x.slice(-4) : x; }
    function done() {
      var where = d.contact ? (d.contactType === 'email' ? d.contact.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : mask(d.contact)) : d.payid ? (d.payidType === 'email' ? String(d.payid).replace(/^(.{2}).*(@.*)$/, '$1•••$2') : mask(d.payid)) : d.bsb ? d.bsb + ' · •••• ' + String(d.account || '').slice(-4) : d.institution ? d.institution + '-' + d.transit + ' · •••• ' + String(d.account || '').slice(-4) : '—';
      s.innerHTML = '<div class="rp-ok"><div class="rp-conf" id="rpConf"></div><svg class="ck" viewBox="0 0 84 84" fill="none"><circle cx="42" cy="42" r="40" stroke="' + m.color + '" stroke-width="4" transform="rotate(-90 42 42)"/><path d="M26 43l11 11 21-24" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg><h3>Withdrawal submitted</h3><div style="color:#9db4cb;font-size:13px">' + m.name + ' · sent for approval</div>' +
        '<div class="amt" id="rpAmt">' + m.cur + ' 0.00<small>$' + nf(usd) + ' debited from your balance</small></div>' +
        '<div class="rc"><div><span>Recipient</span><b>' + esc(d.name || '—') + '</b></div><div><span>' + (d.contact || d.payid ? 'Sent to' : 'Account') + '</span><b>' + esc(where) + '</b></div>' + (d.bank ? '<div><span>Bank</span><b>' + esc(d.bank) + '</b></div>' : '') + '<div><span>Estimated</span><b style="color:#34d399">' + m.eta + '</b></div><div><span>Reference</span><b>' + esc(String((wd && wd.id) || '').slice(-8).toUpperCase()) + '</b></div></div>' +
        '<button type="button" class="wd-btn wd-btn-submit" data-rp-done="1" style="width:100%" onclick="closeWithdraw()">Done</button></div>';
      stage('ok');
      var t0 = performance.now(); (function tick(t) { var k = Math.min(1, (t - t0) / 900), el = $('rpAmt'); if (el) { var sm = el.querySelector('small'); el.firstChild.nodeValue = m.cur + ' ' + nf(paid * (1 - Math.pow(1 - k, 3))); if (sm && !sm.parentNode) el.appendChild(sm); } if (k < 1 && el) requestAnimationFrame(tick); })(t0);
      var cf = $('rpConf'), cols = [m.color, '#47dcff', '#a855f7', '#ffd23f', '#34d399'];
      if (cf && !(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) for (var n = 0; n < 34; n++) { var e = document.createElement('i'); e.style.left = (Math.random() * 100) + '%'; e.style.background = cols[n % 5]; e.style.animationDelay = (Math.random() * .5) + 's'; cf.appendChild(e); }
      if (typeof window.playChime === 'function') try { window.playChime(); } catch (x) {}
    }
  }

  /* ───── wiring ───── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#withdrawModal .wd-btn-submit'); if (!b || !M[cur] || !$('ncRf')) return;
    /* only the form's own Submit button: never the Done / Close button of the result screen */
    if (b.hasAttribute('data-rp-done') || !b.closest('.wd-form-stage')) return;
    e.preventDefault(); e.stopImmediatePropagation(); submit();
  }, true);
  setInterval(mount, 400);
})();
