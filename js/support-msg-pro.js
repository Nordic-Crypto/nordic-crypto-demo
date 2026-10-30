/* support-msg-pro.js v1.0 — admin: send a support message to a client's chat without waiting for the client to write.
   The client gets a push notification (if enabled) and a red counter on the Support button. Needs chat-fix.js + worker with push. */
(function () {
  'use strict';
  if (window.__ncSupMsg) return; window.__ncSupMsg = 1;
  var WORKER = 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function isAdmin() { try { return localStorage.getItem('user_role') === 'admin'; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(a, b) { b.token = tok(); return fetch(WORKER + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); }); }

  var TPL = [
    ['Greeting', 'Hello! This is NordicCrypto support. How can we help you today?'],
    ['Withdrawal', 'Your withdrawal is being processed. We will update you as soon as it is completed.'],
    ['Verification', 'To continue, please complete identity verification in your account. Let us know if you need any help.'],
    ['Deposit', 'We have received your deposit. Thank you! It will be reflected in your balance shortly.'],
    ['Follow-up', 'Just checking in: is there anything else we can help you with?']
  ];
  var css = document.createElement('style');
  css.textContent =
    '.ncm-ov{position:fixed;inset:0;z-index:100003;background:rgba(3,6,12,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px}' +
    '.ncm-box{width:100%;max-width:460px;background:#12161d;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:22px;font-family:system-ui}' +
    '.ncm-h{display:flex;justify-content:space-between;align-items:flex-start}.ncm-h h2{margin:0;font-size:19px}.ncm-x{background:rgba(255,255,255,.07);border:0;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}' +
    '.ncm-to{color:#8b95a5;font-size:13px;margin:4px 0 14px}.ncm-to b{color:#fff}' +
    '.ncm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.ncm-chip{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#cbd5e1;border-radius:99px;padding:6px 12px;font:600 12px system-ui;cursor:pointer}.ncm-chip:hover{border-color:#c8ff3d;color:#c8ff3d}' +
    '.ncm-ta{width:100%;box-sizing:border-box;min-height:110px;resize:vertical;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:14px/1.5 system-ui}' +
    '.ncm-foot{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;color:#8b95a5}' +
    '.ncm-btn{display:block;width:100%;margin-top:12px;padding:13px;border:0;border-radius:12px;font:700 14px system-ui;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#38bdf8);color:#05070a}.ncm-btn.g{background:rgba(255,255,255,.08);color:#fff}.ncm-btn:disabled{opacity:.6}' +
    '.ncm-ok{margin-top:12px;padding:12px 14px;border-radius:12px;background:rgba(16,185,129,.12);color:#34d399;font-size:13px;line-height:1.5}.ncm-err{margin-top:10px;color:#ff6b86;font-size:13px}';
  document.head.appendChild(css);

  var ov;
  function close() { if (ov) { ov.remove(); ov = null; } }
  function open(email, name) {
    close();
    ov = document.createElement('div'); ov.className = 'ncm-ov';
    ov.innerHTML = '<div class="ncm-box"><div class="ncm-h"><h2>Message to client</h2><button class="ncm-x" id="ncmX">×</button></div>' +
      '<div class="ncm-to">To: <b>' + esc(name || email) + '</b> · ' + esc(email) + '<br>Appears in the client’s Support chat with a push notification and a red counter on the Support button.</div>' +
      '<div class="ncm-chips">' + TPL.map(function (t, i) { return '<button type="button" class="ncm-chip" data-i="' + i + '">' + t[0] + '</button>'; }).join('') + '</div>' +
      '<textarea class="ncm-ta" id="ncmTa" maxlength="1000" placeholder="Write a message…"></textarea>' +
      '<div class="ncm-foot"><span>Sent as “Support”</span><span id="ncmCnt">0 / 1000</span></div><div id="ncmMsg"></div>' +
      '<button class="ncm-btn" id="ncmSend">Send message</button></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    $('ncmX').onclick = close;
    var ta = $('ncmTa'); setTimeout(function () { ta.focus(); }, 50);
    ta.addEventListener('input', function () { $('ncmCnt').textContent = ta.value.length + ' / 1000'; });
    ov.querySelector('.ncm-chips').onclick = function (e) { var b = e.target.closest('[data-i]'); if (!b) return; ta.value = TPL[+b.dataset.i][1]; ta.dispatchEvent(new Event('input')); ta.focus(); };
    var sending = false;
    $('ncmSend').onclick = function () {
      var text = ta.value.trim(); if (!text || sending) return;
      sending = true; var btn = $('ncmSend'); btn.disabled = true; btn.textContent = 'Sending…'; $('ncmMsg').innerHTML = '';
      api('sendChatMessage', { email: email, text: text, clientMsgId: 'adm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) })
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.error) || 'Failed');
          ta.value = ''; ta.disabled = true; btn.remove();
          $('ncmMsg').innerHTML = '<div class="ncm-ok">✓ Sent. The client sees it as a new message (red counter on Support) and gets a push notification if notifications are enabled on their phone.</div>' +
            '<button class="ncm-btn g" id="ncmOpen">Open chat</button>';
          $('ncmOpen').onclick = function () { close(); if (typeof window.openAdminChat === 'function') window.openAdminChat(email); };
        })
        .catch(function (e) { sending = false; btn.disabled = false; btn.textContent = 'Send message'; $('ncmMsg').innerHTML = '<div class="ncm-err">' + esc(e.message || 'Could not send') + '</div>'; });
    };
  }
  window.ncSendSupportMessage = open;

  var ICON = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.6A8 8 0 1121 12z"/></svg>';
  function inject() {
    if (!isAdmin()) return;
    var d = document.querySelector('.ap-dr [data-act="msg"]');
    if (d && d.parentNode && !d.parentNode.querySelector('[data-ncm-e]')) {
      var b = document.createElement('button'); b.type = 'button'; b.className = d.className.replace(/\bpri\b|\bbad\b|\bfull\b/g, '').trim(); b.setAttribute('data-ncm-e', d.getAttribute('data-e'));
      b.innerHTML = ICON.replace('15px;height:15px', '15px;height:15px;vertical-align:-3px;margin-right:6px') + 'Chat message'; d.parentNode.insertBefore(b, d);
    }
    [].forEach.call(document.querySelectorAll('tr.row[data-open] .acts'), function (a) {
      if (a.querySelector('[data-ncm-e]')) return;
      var first = a.querySelector('button'); var tr = a.closest('tr');
      var b = document.createElement('button'); b.type = 'button'; b.className = first ? first.className : 'ap-btn sm ic'; b.title = 'Message in chat';
      b.setAttribute('data-ncm-e', tr.getAttribute('data-open')); b.innerHTML = ICON; a.appendChild(b);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ncm-e]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var em = b.getAttribute('data-ncm-e'), nm = '';
    var h = b.closest('.ap-dr') && document.querySelector('.ap-dr-h h2'); if (h) nm = h.textContent;
    else { var tr = b.closest('tr'); var bb = tr && tr.querySelector('.who b'); if (bb) nm = bb.textContent; }
    open(em, nm);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  // inject synchronously right after the list is re-rendered (before the browser paints) so the icon never blinks
  var busyInj = false;
  new MutationObserver(function (list) {
    if (busyInj) return;
    for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { busyInj = true; try { inject(); } finally { busyInj = false; } break; }
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(inject, 2000); inject();
})();
