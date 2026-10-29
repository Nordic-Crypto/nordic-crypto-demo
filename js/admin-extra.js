/* NordicCrypto admin extras: fiat deposit requests (credit / reject) and "review credits" (real money vs admin-added) */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function wurl() { return (typeof WORKER_LOGIN_URL !== 'undefined' && WORKER_LOGIN_URL) || (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://nordic-deposit-checker.otis-790.workers.dev'; }
  function api(action, body) {
    return fetch(wurl() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, body || {})) }).then(function (r) { return r.json(); });
  }
  function say(m, bad) { if (typeof toast === 'function') toast(m, bad); }
  function usd(v) { v = Number(v || 0); return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ago(t) { var m = Math.max(0, Math.round((Date.now() - Number(t)) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; }

  var C = 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;margin-bottom:16px;color:#e7edf5';
  var B = 'border:0;border-radius:9px;padding:7px 12px;font-weight:700;cursor:pointer;font-size:12px;margin-left:6px;';

  /* ---------- fiat deposit requests ---------- */
  var busy = false;
  function paintReq(card, list) {
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:15px">💰 Deposit requests (bank / card)</b><span style="opacity:.6;font-size:12px">' + list.length + ' waiting</span></div>' +
      (list.length ? list.map(function (r) {
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid rgba(255,255,255,.07);flex-wrap:wrap"><div style="flex:1;min-width:180px"><b>' + esc(r.name || r.email) + '</b><br><span style="opacity:.65;font-size:12px">' + esc(r.email) + ' · ' + esc(r.method) + ' · ' + ago(r.createdAt) + '</span></div>' +
          '<b style="font-size:16px">' + usd(r.amount) + '</b>' +
          '<span><button data-rq="credit" data-e="' + esc(r.email) + '" data-n="' + esc(r.name || '') + '" data-a="' + r.amount + '" data-m="' + esc(r.method) + '" style="' + B + 'background:#c6ff3d;color:#07080c">Credit</button>' +
          '<button data-rq="reject" data-e="' + esc(r.email) + '" data-id="' + esc(r.id) + '" style="' + B + 'background:#ff6b6b;color:#fff">Reject</button></span></div>';
      }).join('') : '<div style="opacity:.6;font-size:13px;padding:6px 0">No open requests.</div>');
  }
  function loadReq(card) {
    if (busy) return; busy = true;
    api('listDepositRequests').then(function (d) { busy = false; if (d && d.ok) paintReq(card, d.requests || []); }).catch(function () { busy = false; });
  }
  function injectReq() {
    var sec = document.querySelector('[data-section="deposits"]'); if (!sec) return;
    var card = $('ncReqCard');
    if (!card) {
      card = document.createElement('div'); card.id = 'ncReqCard'; card.style.cssText = C; card.className = 'nc-no-i18n'; card.setAttribute('data-nci18n', 'off');
      sec.insertBefore(card, sec.firstChild);
      card.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-rq]') : null; if (!b) return;
        var em = b.getAttribute('data-e');
        if (b.getAttribute('data-rq') === 'reject') {
          if (!window.confirm('Reject this deposit request? The client will see it as rejected.')) return;
          api('rejectDepositRequest', { email: em, id: b.getAttribute('data-id') }).then(function (d) {
            if (d && d.ok) { say('Request rejected'); loadReq(card); } else say((d && d.error) || 'Error', true);
          });
        } else {
          if (typeof window.adminAddBalance !== 'function') return;
          window.adminAddBalance(em, b.getAttribute('data-n') || em);
          var m = b.getAttribute('data-m') || '';
          setTimeout(function () {
            var a = $('adminBalanceAmount'), t = $('adminBalanceType'), s = $('adminBalanceSource');
            if (a) a.value = b.getAttribute('data-a');
            if (t) { t.value = /crypto|bitcoin|ethereum/i.test(m) ? 'crypto' : /card/i.test(m) ? 'card' : 'bank'; }
            if (s) s.value = 'real';
          }, 150);
        }
      });
      loadReq(card);
    }
  }
  setInterval(function () {
    try {
      var adm = $('adminPanel'); if (!adm || !adm.classList.contains('on') || document.hidden) return;
      injectReq();
      var sec = document.querySelector('[data-section="deposits"]');
      if (sec && sec.classList.contains('active') && $('ncReqCard')) loadReq($('ncReqCard'));
    } catch (e) {}
  }, 6000);
  setTimeout(function () { try { injectReq(); } catch (e) {} }, 3000);

  /* ---------- review credits ---------- */
  function srcOf(t) {
    if (!t || !(Number(t.amt) > 0)) return null;
    if (t.src === 'real' || t.src === 'admin') return t.src;
    if (t.wdId || t.isWithdrawal) return null;
    if (t.hash || t.crypto) return 'real';
    var ty = String(t.type || ''), d = String(t.desc || '');
    if (/added by admin|admin adjustment/i.test(d)) return 'admin';
    if (ty === 'bonus' || ty === 'correction') return 'admin';
    if (['bank', 'crypto', 'card', 'deposit'].indexOf(ty) >= 0) return 'real';
    if (/bonus|correction|cashback|reward|gift/i.test(d)) return 'admin';
    if (/deposit|top.?up|received|incoming/i.test(d) && !/transfer|trade|exchange|bought|sold/i.test(d)) return 'real';
    return null;
  }
  window.ncReviewCredits = function (email, name) {
    api('getUserState', { email: email }).then(function (d) {
      if (!d || d.ok === false) { say('Could not load', true); return; }
      var txs = (d.txs || []).filter(function (t) { return srcOf(t); });
      var old = $('ncCredMask'); if (old) old.remove();
      var m = document.createElement('div'); m.id = 'ncCredMask'; m.className = 'nc-no-i18n'; m.setAttribute('data-nci18n', 'off');
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100300;display:flex;align-items:center;justify-content:center;padding:16px';
      function draw() {
        m.innerHTML = '<div style="background:#0f1720;border:1px solid rgba(255,255,255,.12);border-radius:18px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;color:#e7edf5">' +
          '<div style="padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center"><div><b>Credits of ' + esc(name || email) + '</b><br><span style="font-size:12px;opacity:.6">Mark each credit as real money or added by admin</span></div><button data-x style="' + B + 'background:rgba(255,255,255,.08);color:#fff">✕</button></div>' +
          '<div style="overflow:auto;padding:6px 18px 16px">' + (txs.length ? txs.map(function (t, i) {
            var s = srcOf(t);
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)"><div style="flex:1;min-width:0"><div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.desc || 'Credit') + '</div><div style="font-size:11px;opacity:.55">' + esc(t.date || '') + '</div></div><b>' + usd(t.amt) + '</b>' +
              '<button data-i="' + i + '" data-s="' + (s === 'real' ? 'admin' : 'real') + '" style="' + B + (s === 'real' ? 'background:#16a34a;color:#fff' : 'background:#f59e0b;color:#07080c') + '">' + (s === 'real' ? '✅ Real money' : '🛠 Admin credit') + '</button></div>';
          }).join('') : '<div style="padding:20px;opacity:.6;text-align:center">No credits yet</div>') + '</div></div>';
      }
      draw();
      m.addEventListener('click', function (e) {
        if (e.target === m || (e.target.closest && e.target.closest('[data-x]'))) { m.remove(); return; }
        var b = e.target.closest ? e.target.closest('[data-i]') : null; if (!b) return;
        var t = txs[Number(b.getAttribute('data-i'))], to = b.getAttribute('data-s');
        api('setTxSource', { email: email, ts: t.ts, amt: t.amt, src: to }).then(function (r) {
          if (r && r.ok) { t.src = to; draw(); say('Updated'); if (window.__ncApRefresh) window.__ncApRefresh(); } else say((r && r.error) || 'Error', true);
        });
      });
      document.body.appendChild(m);
    });
  };
})();
