/* admin-notes.js v1 — inside the client drawer: tags (VIP, "Check source of funds"…), internal notes the client never sees, and one activity feed.
   Needs worker actions getClientCard / addClientNote / deleteClientNote / setClientTags. Load after admin-pro.js. */
(function () {
  'use strict';
  if (window.__acNotes) return; window.__acNotes = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var PRESETS = ['VIP', 'Check source of funds', 'High risk', 'Business', 'Slow to reply', 'Fraud watch'];
  var cur = '', card = null, busy = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  function toast(m, w) { try { if (typeof window.toast === 'function') window.toast(m, w); } catch (e) { } }
  function when(ts) { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function css() {
    if ($('anCss')) return; var s = document.createElement('style'); s.id = 'anCss';
    s.textContent =
      '#anBox .tg{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}#anBox .tg span.t{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:4px 6px 4px 11px;border-radius:99px;background:rgba(139,123,255,.16);color:#b8aeff}#anBox .tg span.t.v{background:rgba(200,255,77,.16);color:#d6ff5c}#anBox .tg span.t.r{background:rgba(255,107,107,.14);color:#ff9a9a}#anBox .tg span.t button{border:0;background:rgba(255,255,255,.12);color:inherit;width:18px;height:18px;border-radius:50%;cursor:pointer;line-height:1;font-size:12px;padding:0}' +
      '#anBox .tg button.add{border:1px dashed rgba(255,255,255,.3);background:transparent;color:#aab4c5;font-size:12px;padding:4px 11px;border-radius:99px;cursor:pointer}#anBox .tg button.add:hover{border-color:#c8ff4d;color:#d6ff5c}' +
      '#anBox .pr{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}#anBox .pr button{font-size:12px;padding:4px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:inherit;cursor:pointer}#anBox .pr button:hover{border-color:#c8ff4d}' +
      '#anBox .nt{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border-left:3px solid #8b7bff;font-size:13.5px;margin-bottom:8px;white-space:pre-wrap;word-break:break-word;position:relative}#anBox .nt small{display:block;color:#8b95a5;font-size:11.5px;margin-top:4px;white-space:normal}#anBox .nt button{position:absolute;top:6px;right:8px;border:0;background:transparent;color:#8b95a5;cursor:pointer;font-size:15px}#anBox .nt button:hover{color:#ff8d8d}' +
      '#anBox .na{display:flex;gap:8px;margin-top:8px}#anBox .na textarea,#anBox .ti{flex:1;min-height:44px;resize:vertical;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);color:inherit;font:inherit;font-size:14px;outline:0}#anBox .na textarea:focus,#anBox .ti:focus{border-color:#c8ff4d}' +
      '#anBox .ev{display:flex;gap:11px;padding:8px 0;font-size:13.5px;position:relative}#anBox .ev:not(:last-child):before{content:"";position:absolute;left:4px;top:22px;bottom:-8px;width:2px;background:rgba(255,255,255,.09)}#anBox .ev i{flex:none;width:10px;height:10px;border-radius:50%;margin-top:6px;background:#c8ff4d}#anBox .ev i.bad{background:#ff6b6b}#anBox .ev i.wd{background:#ffb454}#anBox .ev i.staff{background:#8b7bff}#anBox .ev i.in{background:#3ddc97}#anBox .ev small{display:block;color:#8b95a5;font-size:11.5px}' +
      '#anBox .more{font-size:12.5px;color:#aab4c5;background:none;border:0;cursor:pointer;padding:6px 0}#anBox .ld{color:#8b95a5;font-size:13px;padding:8px 0}' +
      'html[data-theme="light"] #anBox .nt{background:#f5f7f1}html[data-theme="light"] #anBox .tg span.t{color:#5b45e0}html[data-theme="light"] #anBox .tg span.t.v{color:#2f5a00}html[data-theme="light"] #anBox .tg span.t.r{color:#a3213a}html[data-theme="light"] #anBox .tg span.t button{background:rgba(15,23,42,.1)}';
    document.head.appendChild(s);
  }
  function tagCls(t) { return /vip/i.test(t) ? 'v' : /risk|fraud|watch/i.test(t) ? 'r' : ''; }
  var showAll = false;
  function render() {
    var b = $('anBox'); if (!b) return;
    if (!card) { b.innerHTML = '<h4>Notes, tags and activity</h4><div class="ld">Loading…</div>'; return; }
    if (card.fail) { b.innerHTML = '<h4>Notes, tags and activity</h4><div class="ld">' + esc(card.fail) + '</div>'; return; }
    var tags = card.tags || [], notes = card.notes || [], act = card.activity || [], shown = showAll ? act : act.slice(0, 6);
    b.innerHTML = '<h4>Tags</h4><div class="tg">' + tags.map(function (t, i) { return '<span class="t ' + tagCls(t) + '">' + esc(t) + '<button data-an="deltag" data-i="' + i + '" aria-label="Remove tag">×</button></span>'; }).join('') + '<button class="add" data-an="newtag">+ Tag</button></div>' +
      '<div class="pr" id="anPre" style="display:none">' + PRESETS.filter(function (p) { return tags.indexOf(p) < 0; }).map(function (p) { return '<button data-an="addtag" data-t="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '<input class="ti" id="anTi" maxlength="24" placeholder="Custom tag, Enter to add" style="max-width:190px;min-height:30px;padding:4px 10px;flex:none"></div>' +
      '<h4>Internal notes <span style="font-weight:500;opacity:.6;text-transform:none;letter-spacing:0">· the client never sees these</span></h4>' +
      (notes.length ? notes.map(function (n) { return '<div class="nt">' + esc(n.text) + '<small>' + esc(n.byName || n.by) + ' · ' + esc(when(n.ts)) + '</small><button data-an="delnote" data-id="' + esc(n.id) + '" title="Delete note" aria-label="Delete note">×</button></div>'; }).join('') : '<div class="ld">No notes yet.</div>') +
      '<div class="na"><textarea id="anTx" maxlength="600" placeholder="Add a note for your team…"></textarea><button class="ap-btn pri" data-an="addnote" style="align-self:flex-start">Save</button></div>' +
      '<h4 style="margin-top:18px">Activity</h4>' + (shown.length ? shown.map(function (e) { return '<div class="ev"><i class="' + esc(e.k || '') + '"></i><div>' + esc(e.t) + '<small>' + (e.by ? esc(e.by) + ' · ' : '') + esc(when(e.ts)) + '</small></div></div>'; }).join('') : '<div class="ld">No activity yet.</div>') + (act.length > 6 ? '<button class="more" data-an="more">' + (showAll ? 'Show less' : 'Show all ' + act.length) + '</button>' : '');
    var ti = $('anTi'); if (ti) ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTag(ti.value); } });
  }
  function setTags(tags) { return post('setClientTags', { email: cur, tags: tags }).then(function (r) { if (!r.ok) toast(r.error || 'Failed', true); else { card.tags = r.tags; render(); } }); }
  function addTag(t) { t = String(t || '').trim(); if (!t) return; var tags = (card.tags || []).slice(); if (tags.indexOf(t) < 0) tags.push(t); setTags(tags); }
  function load(email) {
    cur = email; card = null; showAll = false; render();
    post('getClientCard', { email: email }).then(function (r) { if (cur !== email) return; card = r && r.ok ? r : { fail: (r && r.error) || 'Could not load' }; render(); });
  }
  function onClick(e) {
    var b = e.target.closest('[data-an]'); if (!b || !card || busy) return; var a = b.getAttribute('data-an');
    if (a === 'newtag') { var p = $('anPre'); if (p) { p.style.display = p.style.display === 'none' ? 'flex' : 'none'; var i = $('anTi'); if (i && p.style.display !== 'none') i.focus(); } return; }
    if (a === 'addtag') return addTag(b.getAttribute('data-t'));
    if (a === 'deltag') { var tags = (card.tags || []).slice(); tags.splice(+b.getAttribute('data-i'), 1); return setTags(tags); }
    if (a === 'more') { showAll = !showAll; return render(); }
    if (a === 'addnote') { var tx = $('anTx'), v = tx ? tx.value.trim() : ''; if (!v) { if (tx) tx.focus(); return; } busy = true; b.disabled = true;
      return post('addClientNote', { email: cur, text: v }).then(function (r) { busy = false; if (!r.ok) { b.disabled = false; toast(r.error || 'Failed', true); return; } card.notes = r.notes; render(); toast('Note saved'); }); }
    if (a === 'delnote') { busy = true; return post('deleteClientNote', { email: cur, id: b.getAttribute('data-id') }).then(function (r) { busy = false; if (!r.ok) { toast(r.error || 'Failed', true); return; } card.notes = r.notes || (card.notes || []).filter(function (n) { return n.id !== b.getAttribute('data-id'); }); render(); }); }
  }
  /* put the section into every client drawer that opens */
  function watch() {
    css();
    new MutationObserver(function () {
      var dr = document.querySelector('.ap-dr.on, .ap-dr'); if (!dr) return;
      var body = dr.querySelector('.ap-dr-b'); if (!body || body.querySelector('#anBox')) return;
      var em = ''; var el = dr.querySelector('[data-e]'); if (el) em = el.getAttribute('data-e'); if (!em) return;
      var sec = document.createElement('div'); sec.className = 'ap-sec'; sec.id = 'anBox'; sec.addEventListener('click', onClick);
      var qa = body.querySelector('.ap-agrid'); var host = qa && qa.parentNode && qa.parentNode.parentNode === body ? qa.parentNode : null;
      if (host && host.nextSibling) body.insertBefore(sec, host.nextSibling); else body.appendChild(sec);
      load(em);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
