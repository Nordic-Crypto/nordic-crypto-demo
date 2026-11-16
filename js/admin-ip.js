/* admin-ip.js v1 — admin access by IP
   1) sign-in: when the server says "new location", asks for the 6-digit code that was e-mailed and finishes the sign-in
   2) Security tab (owner only): trusted addresses, pending requests, on/off switch
   Load on every page that has a sign-in form and on the app page. */
(function () {
  'use strict';
  if (window.__ncAdminIp) return; window.__ncAdminIp = 1;
  var ofetch = window.fetch;
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ───── 1. sign-in code ───── */
  function ask(msg) {
    return new Promise(function (resolve) {
      var old = document.getElementById('ncIpBox'); if (old) old.remove();
      var o = document.createElement('div'); o.id = 'ncIpBox';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
      o.innerHTML = '<div style="width:100%;max-width:390px;background:#12140d;border:1px solid rgba(190,255,60,.28);border-radius:22px;padding:26px 24px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.6)">' +
        '<div style="width:46px;height:46px;border-radius:14px;background:rgba(190,255,60,.12);color:#beff3c;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px">🛡️</div>' +
        '<div style="font-size:21px;font-weight:800;margin-bottom:6px">New location</div>' +
        '<div id="ncIpMsg" style="font-size:14px;line-height:1.45;opacity:.8;margin-bottom:16px"></div>' +
        '<input id="ncIpIn" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······" style="width:100%;box-sizing:border-box;text-align:center;font:700 30px ui-monospace,Menlo,monospace;letter-spacing:10px;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:#0a0b08;color:#fff;outline:none">' +
        '<div style="display:flex;gap:10px;margin-top:16px"><button id="ncIpNo" type="button" style="flex:1;padding:13px;border-radius:13px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;cursor:pointer">Cancel</button>' +
        '<button id="ncIpOk" type="button" style="flex:1;padding:13px;border-radius:13px;border:0;background:#beff3c;color:#0a0b08;font-weight:800;cursor:pointer">Approve</button></div></div>';
      document.body.appendChild(o);
      var m = document.getElementById('ncIpMsg'), inp = document.getElementById('ncIpIn');
      m.textContent = msg || 'Enter the 6-digit code we emailed you.';
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);
      function done(v) { o.remove(); resolve(v); }
      document.getElementById('ncIpNo').onclick = function () { done(null); };
      function go() { var v = inp.value.replace(/\D/g, ''); if (v.length !== 6) { m.textContent = 'Enter all 6 digits.'; return; } done(v); }
      document.getElementById('ncIpOk').onclick = go;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }
  function fake(obj) { return new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  window.fetch = function (u, o) {
    var p = ofetch.apply(this, arguments);
    try {
      if (!(typeof u === 'string' && u.indexOf('action=login') > -1 && o && typeof o.body === 'string')) return p;
      var self = this;
      function loop(resp) {
        return resp.clone().json().catch(function () { return null; }).then(function (d) {
          if (!d || !d.needIpCode || !d.ipToken) return resp;
          return ask(d.error).then(function (v) {
            if (v === null) return fake({ ok: false, error: 'Sign-in was not approved.' });
            return ofetch.call(self, u, Object.assign({}, o, { body: JSON.stringify({ ipToken: d.ipToken, ipCode: v }) })).then(loop);
          });
        });
      }
      return p.then(loop);
    } catch (e) { return p; }
  };

  /* ───── 2. Security tab card (owner) ───── */
  function api(action, body) {
    var tok = (typeof getSessionToken === 'function') ? getSessionToken() : localStorage.getItem('session_token');
    var url = (typeof WORKER_LOGIN_URL !== 'undefined' ? WORKER_LOGIN_URL : '') + '?action=' + action;
    return ofetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok }, body || {})) }).then(function (r) { return r.json(); });
  }
  function dt(ts) { if (!ts) return '—'; try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  var D = null, msg = '';
  function render() {
    var c = document.getElementById('aipCard'); if (!c || !D) return;
    var h = '<h3>🛡️ Admin access by IP ' + (D.mode === 'on' && !D.envOff ? '<span class="sx-tag ok" style="background:rgba(60,220,120,.16);color:#5dde9a">protected</span>' : '<span class="sx-tag no">OFF</span>') + '</h3>' +
      '<div style="color:#8b95a5;font-size:12.5px;line-height:1.5;margin-bottom:10px">Admin sessions only work from the addresses below. A new address needs a 6-digit code sent to the admin’s e-mail' + (D.mailReady ? '' : ' (<b style="color:#ff9a9a">e-mail is not configured, so approve new addresses here</b>)') + '. Your address now: <b class="sx-ip">' + esc(D.yourIp) + '</b>.</div>';
    if (msg) h += '<div style="margin-bottom:10px;color:#ffb3b3;font-size:13px">' + esc(msg) + '</div>';
    if (D.envOff) h += '<div style="margin-bottom:10px;color:#ffcf6b;font-size:13px">Emergency switch ADMIN_IP_MODE=off is set in Cloudflare, so protection is off for everyone.</div>';
    if (D.req.length) {
      h += '<div style="margin:6px 0 4px;font-weight:700">Waiting for approval</div><div class="sx-w"><table class="sx-tb"><tr><th>Admin</th><th>IP</th><th>Place</th><th>Device</th><th>When</th><th></th></tr>';
      D.req.forEach(function (r) { h += '<tr><td>' + esc(r.email) + '</td><td class="sx-ip">' + esc(r.ip) + '</td><td>' + esc(r.place || '—') + '</td><td>' + esc(r.ua || '') + '</td><td>' + dt(r.ts) + (r.blocked ? ' <span class="sx-tag no">blocked</span>' : '') + '</td><td><button class="sx-btn s" data-aip="approve" data-k="' + esc(r.k) + '">Approve</button></td></tr>'; });
      h += '</table></div>';
    }
    h += '<div style="margin:12px 0 4px;font-weight:700">Trusted addresses</div><div class="sx-w"><table class="sx-tb"><tr><th>Address</th><th>Label</th><th>Last used</th><th>Valid</th><th></th></tr>';
    D.ips.forEach(function (e) {
      h += '<tr><td class="sx-ip">' + esc(e.k) + (e.current ? ' <span class="sx-tag am">you</span>' : '') + '</td><td>' + esc(e.label) + '</td><td>' + dt(e.lastSeen) + '</td><td>' + (e.exp ? 'until ' + dt(e.exp) : 'permanent') + '</td><td>' + (e.current ? '' : '<button class="sx-btn s d" data-aip="rm" data-k="' + esc(e.k) + '">Remove</button>') + '</td></tr>';
    });
    h += '</table></div>' +
      '<div class="sx-form" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><input class="sx-in sx-ip" id="aipIp" placeholder="IP (empty = this device)" style="flex:1;min-width:150px"><input class="sx-in" id="aipLb" placeholder="Label, e.g. Office" style="flex:1;min-width:130px"><button class="sx-btn" data-aip="add">Trust address</button></div>' +
      '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="sx-btn s ' + (D.mode === 'on' ? 'd' : '') + '" data-aip="mode" data-m="' + (D.mode === 'on' ? 'off' : 'on') + '">' + (D.mode === 'on' ? 'Turn protection off' : 'Turn protection on') + '</button>' +
      '<button class="sx-btn s ' + (D.strict ? 'd' : '') + '" data-aip="strict" data-v="' + (D.strict ? '0' : '1') + '">' + (D.strict ? 'Turn strict mode off' : 'Turn strict mode on') + '</button>' +
      '<span style="flex-basis:100%;color:#8b95a5;font-size:12.5px;line-height:1.5"><b style="color:' + (D.strict ? '#5dde9a' : '#cfd6e2') + '">Strict mode ' + (D.strict ? 'is ON' : 'is off') + '.</b> When on, only the addresses in the list can sign in as admin. Anyone else, even with the right password, sees “Invalid email or password”, gets no e-mail code and cannot be approved by a code. Their attempt appears under “Waiting for approval” so you can see it and approve it from a trusted address.</span>' +
      '<span style="color:#8b95a5;font-size:12px">If you are ever locked out: in Cloudflare → Worker → Settings → Variables, add <b>ADMIN_IP_MODE</b> = <b>off</b>, sign in, then delete it.</span></div>';
    c.innerHTML = h;
  }
  function load() {
    api('adminIpList').then(function (d) {
      if (!d || d.ok === false) { var c = document.getElementById('aipCard'); if (c) c.style.display = 'none'; return; }
      D = d; msg = ''; var c2 = document.getElementById('aipCard'); if (c2) c2.style.display = ''; render();
    }).catch(function () {});
  }
  function act(e) {
    var b = e.target.closest('[data-aip]'); if (!b) return; var a = b.getAttribute('data-aip'), p;
    if (a === 'add') p = api('adminIpAdd', { ip: (document.getElementById('aipIp') || {}).value, label: (document.getElementById('aipLb') || {}).value, forever: true });
    else if (a === 'rm') { if (!confirm('Remove this address? Admins using it will need a code next time.')) return; p = api('adminIpRemove', { k: b.getAttribute('data-k') }); }
    else if (a === 'approve') p = api('adminIpApprove', { k: b.getAttribute('data-k'), forever: false });
    else if (a === 'mode') { if (b.getAttribute('data-m') === 'off' && !confirm('Turn off IP protection? Anyone with an admin password can sign in from anywhere.')) return; p = api('adminIpSet', { mode: b.getAttribute('data-m') }); }
    else if (a === 'strict') { var on = b.getAttribute('data-v') === '1'; if (on && !confirm('Turn strict mode on? From now on only the addresses in this list can sign in as admin. Make sure every address you use is in the list.')) return; p = api('adminIpSet', { strict: on }); }
    if (!p) return; p.then(function (d) { if (d && d.ok) { D = d; msg = ''; } else msg = (d && d.error) || 'Failed'; render(); });
  }
  function mount() {
    var sec = document.querySelector('[data-section="security"]'); if (!sec) return;
    if (document.getElementById('aipCard')) return;
    var root = document.getElementById('sxRoot'), c = document.createElement('div');
    c.id = 'aipCard'; c.className = 'sx-card'; c.style.margin = '0 0 14px'; c.innerHTML = '<div class="sx-e">Loading…</div>';
    c.addEventListener('click', act);
    if (root) sec.insertBefore(c, root); else sec.appendChild(c);
    load();
  }
  setInterval(function () { try { mount(); } catch (e) {} }, 1500);
})();
