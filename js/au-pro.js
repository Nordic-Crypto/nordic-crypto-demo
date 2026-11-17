/* NordicCrypto au-pro.js v1 — a proper welcome for clients in Australia.
   - Australian address / phone hints in sign-up, verification and card order (postcode = 4 digits, +61)
   - dashboard welcome card: G'day, balances in A$, Sydney time, one-tap switch to AUD, how to send from an Australian bank
   - never changes money or data; everything is cosmetic and can be dismissed */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function S() { return window.st || {}; }
  function email() { return (ls('user_email') || '').toLowerCase(); }
  function isAdmin() { return ls('user_role') === 'admin' && !window.adminViewingEmail; }
  function country() {
    var v = S().verification, c = v && v.personalInfo && v.personalInfo.country;
    c = String(c || (S().user && S().user.country) || '').trim().toUpperCase();
    return c === 'AUSTRALIA' ? 'AU' : c;
  }
  function isAU() { return country() === 'AU' || S().currency === 'AUD'; }

  /* ── 1. Australian hints in forms ── */
  var HINT = {
    vStreet: ['Drottninggatan 1', '42 George Street'], vCity: ['Stockholm', 'Sydney'], vZip: ['111 51', '2000'],
    oStreet: ['Drottninggatan 1', '42 George Street'], oCity: ['Stockholm', 'Sydney'], oZip: ['111 51', '2000'], oPhone: ['+46...', '+61 4XX XXX XXX']
  };
  function apply(selId, au) {
    var map = selId === 'vCountry' ? ['vStreet', 'vCity', 'vZip'] : ['oStreet', 'oCity', 'oZip', 'oPhone'];
    map.forEach(function (id) {
      var e = $(id); if (!e) return; if (!e.dataset.ncDef) e.dataset.ncDef = e.getAttribute('placeholder') || '';
      e.setAttribute('placeholder', au ? HINT[id][1] : (e.dataset.ncDef || HINT[id][0]));
      if (/Zip$/.test(id)) { if (au) { e.setAttribute('inputmode', 'numeric'); e.setAttribute('maxlength', '4'); } else { e.removeAttribute('maxlength'); e.removeAttribute('inputmode'); } }
    });
  }
  function bind() {
    [['vCountry', function (v) { return v === 'AU'; }], ['oCountry', function (v) { return /^(AU|Australia)$/i.test(v); }]].forEach(function (p) {
      var s = $(p[0]); if (!s || s.dataset.ncAu) return; s.dataset.ncAu = '1';
      s.addEventListener('change', function () { apply(p[0], p[1](s.value)); }); apply(p[0], p[1](s.value));
    });
    var oc = $('onbCountry');
    if (oc && !oc.dataset.ncAu) { oc.dataset.ncAu = '1'; try { if (/^en-AU/i.test(navigator.language || '') || /^Australia\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '')) { oc.value = 'AU'; oc.dispatchEvent(new Event('change')); } } catch (e) {} }
    var vc = $('vCountry');   // pre-select from the sign-up country once
    if (vc && !vc.dataset.ncAuPre && country() === 'AU') { vc.dataset.ncAuPre = '1'; vc.value = 'AU'; apply('vCountry', true); }
  }

  /* ── 2. dashboard welcome card ── */
  var CSS = '#auWelcome{position:relative;overflow:hidden;margin:0 0 18px;padding:18px 20px;border-radius:22px;border:1px solid rgba(255,205,0,.28);background:linear-gradient(120deg,rgba(0,132,61,.20),rgba(255,205,0,.08) 60%,transparent),var(--card-solid,#12151d);color:var(--tx,#fff)}' +
    '#auWelcome .au-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
    '#auWelcome .au-flag{flex:none;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,#00843d,#0a9d4f)}' +
    '#auWelcome .au-tx{flex:1;min-width:200px}#auWelcome .au-tx b{display:block;font-size:1.02rem;letter-spacing:-.01em}#auWelcome .au-tx span{font-size:.82rem;opacity:.72}' +
    '#auWelcome .au-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '#auWelcome button{font:inherit;cursor:pointer;border-radius:999px;padding:8px 14px;font-weight:700;font-size:.8rem;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit}' +
    '#auWelcome button.au-go{background:#ffcd00;border-color:#ffcd00;color:#1a1400}' +
    '#auWelcome .au-x{position:absolute;right:10px;top:8px;border:0!important;background:none!important;opacity:.55;font-size:1rem!important;padding:4px 8px!important}' +
    '#auWelcome .au-how{display:none;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);font-size:.84rem;line-height:1.6}#auWelcome.open .au-how{display:block}' +
    '#auWelcome .au-how ol{margin:6px 0 8px 18px}#auWelcome .au-how small{opacity:.65}' +
    'html[data-theme="light"] #auWelcome{color:#0b0d14;background:linear-gradient(120deg,rgba(0,132,61,.13),rgba(255,205,0,.14) 60%,transparent),#fff}html[data-theme="light"] #auWelcome button{border-color:rgba(10,12,20,.18);background:rgba(10,12,20,.05)}' +
    '@media(max-width:600px){#auWelcome{padding:16px 14px;border-radius:18px}#auWelcome .au-btns{width:100%}}';
  function addCss() { if ($('auCss')) return; var s = document.createElement('style'); s.id = 'auCss'; s.textContent = CSS; document.head.appendChild(s); }
  function sydney() { try { return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).format(new Date()); } catch (e) { return ''; } }
  function first() { var n = ls('user_name') || ''; if (!n || n === 'User') return ''; n = n.split(' ')[0]; return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(); }
  function card() {
    var dash = $('dash'); if (!dash || isAdmin() || !isAU()) return;
    var key = 'nc_au_welcome_' + email(); if (ls(key) === 'x') return;
    var inAud = S().currency === 'AUD', el = $('auWelcome');
    if (!el) {
      addCss(); el = document.createElement('div'); el.id = 'auWelcome';
      var host = dash.querySelector('#bd') || dash.querySelector('.nc3-dashboard') || dash.firstChild; dash.insertBefore(el, host);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.a === 'x') { ls(key, 'x'); el.remove(); }
        else if (b.dataset.a === 'how') el.classList.toggle('open');
        else if (b.dataset.a === 'aud') { var o = document.querySelector('#currMenu .curr-opt[data-cur="AUD"]'); if (o) o.click(); setTimeout(render, 200); }
      });
    }
    render();
  }
  function render() {
    var el = $('auWelcome'); if (!el) return; var inAud = S().currency === 'AUD', open = el.classList.contains('open');
    var sig = (inAud ? 1 : 0) + '|' + first() + '|' + sydney();
    if (el.dataset.sig === sig) return; el.dataset.sig = sig;
    el.innerHTML = '<button class="au-x" data-a="x" aria-label="Close">✕</button>' +
      '<div class="au-row"><div class="au-flag">🇦🇺</div><div class="au-tx"><b>G’day' + (first() ? ', ' + esc(first()) : '') + '! Welcome to NordicCrypto.</b>' +
      '<span>' + (inAud ? 'Your balances and rates are shown in Australian dollars (A$).' : 'Prefer to see everything in Australian dollars?') + ' · Sydney ' + esc(sydney()) + '</span></div>' +
      '<div class="au-btns">' + (inAud ? '' : '<button class="au-go" data-a="aud">Show in A$</button>') + '<button data-a="how">Sending from an Australian bank?</button></div></div>' +
      '<div class="au-how"><b>How to add money from your Australian bank</b><ol><li>In your bank app choose <b>International transfer</b> (SWIFT).</li><li>Open <b>Details</b> on your dashboard and copy the IBAN, SWIFT/BIC and account holder name.</li><li>Send it and keep your transfer receipt. It helps our team if you ever need support.</li></ol><small>Your Australian bank may charge its own international transfer fee and convert A$ at its own rate.</small></div>';
    if (open) el.classList.add('open');
  }
  function tick() { try { bind(); card(); if ($('auWelcome')) render(); } catch (e) {} }
  setInterval(tick, 5000); setTimeout(tick, 1200);
})();
