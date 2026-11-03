/* wd-otp.js v1 — email confirmation code for large withdrawals.
   Wraps fetch: when the server answers a withdrawal with needOtp, asks the client for the 6-digit code
   and resends the same request with it. Works for every withdrawal flow (bank, card, crypto). Load LAST. */
(function () {
  if (window.__ncWdOtp) return; window.__ncWdOtp = 1;
  var ofetch = window.fetch;
  function ask(msg, canResend) {
    return new Promise(function (resolve) {
      var old = document.getElementById('ncOtpBox'); if (old) old.remove();
      var o = document.createElement('div'); o.id = 'ncOtpBox';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
      o.innerHTML = '<div style="width:100%;max-width:380px;background:#12140d;border:1px solid rgba(190,255,60,.28);border-radius:22px;padding:26px 24px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.6)">' +
        '<div style="width:46px;height:46px;border-radius:14px;background:rgba(190,255,60,.12);color:#beff3c;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px">🔒</div>' +
        '<div style="font-size:21px;font-weight:800;margin-bottom:6px">Confirm withdrawal</div>' +
        '<div id="ncOtpMsg" style="font-size:14px;line-height:1.45;opacity:.78;margin-bottom:16px"></div>' +
        '<input id="ncOtpIn" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······" style="width:100%;box-sizing:border-box;text-align:center;font:700 30px ui-monospace,Menlo,monospace;letter-spacing:12px;padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:#0a0b08;color:#fff;outline:none">' +
        '<div style="display:flex;gap:10px;margin-top:16px"><button id="ncOtpNo" type="button" style="flex:1;padding:13px;border-radius:13px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;font-weight:700;cursor:pointer">Cancel</button>' +
        '<button id="ncOtpOk" type="button" style="flex:1;padding:13px;border-radius:13px;border:0;background:#beff3c;color:#0a0b08;font-weight:800;cursor:pointer">Confirm</button></div>' +
        '<button id="ncOtpRe" type="button" style="display:block;margin:14px auto 0;background:none;border:0;color:#beff3c;font-size:13px;cursor:pointer;opacity:.9">Send a new code</button></div>';
      document.body.appendChild(o);
      var m = document.getElementById('ncOtpMsg'), inp = document.getElementById('ncOtpIn');
      m.textContent = msg || 'Enter the 6-digit code we emailed you.';
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);
      function done(v) { o.remove(); resolve(v); }
      document.getElementById('ncOtpNo').onclick = function () { done(null); };
      document.getElementById('ncOtpRe').onclick = function () { done('resend'); };
      function go() { var v = inp.value.replace(/\D/g, ''); if (v.length !== 6) { m.textContent = 'Enter all 6 digits.'; return; } done(v); }
      document.getElementById('ncOtpOk').onclick = go;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }
  function fake(obj) { return new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  window.fetch = function (u, o) {
    var p = ofetch.apply(this, arguments);
    try {
      if (!(typeof u === 'string' && u.indexOf('action=withdraw') > -1 && o && typeof o.body === 'string')) return p;
      var base; try { base = JSON.parse(o.body); } catch (e) { return p; }
      if (base && base.otp) return p;
      var self = this;
      function send(otp) { var b = Object.assign({}, base); if (otp) b.otp = otp; return ofetch.call(self, u, Object.assign({}, o, { body: JSON.stringify(b) })); }
      function loop(resp) {
        return resp.clone().json().catch(function () { return null; }).then(function (d) {
          if (!d || !d.needOtp) return resp;
          return ask(d.error).then(function (v) {
            if (v === null) return fake({ ok: false, error: 'Withdrawal was not confirmed.' });
            return (v === 'resend' ? send('') : send(v)).then(loop);
          });
        });
      }
      return p.then(loop);
    } catch (e) { return p; }
  };
})();
