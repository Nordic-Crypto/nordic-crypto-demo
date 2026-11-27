/* ============================================================
   NORDIC CRYPTO — CHAT DOCUMENTS PRO v1.1 (English UI)
   - Admin & Agents can send any document (PDF, HTML, DOCX, XLSX, ZIP, etc.)
   - Admin & Agents can request a document from a client
   - Clients can upload & send a document ONLY when requested by Admin/Agent
   ============================================================ */
(function () {
  'use strict';
  if (window.__chatDocsPro) return;
  window.__chatDocsPro = true;

  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var state = {
    docRequest: null,
    fileCache: {}
  };

  function tok() {
    try { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
    catch (e) { return null; }
  }
  function isAdminRole() {
    try { return localStorage.getItem('user_role') === 'admin'; } catch (e) { return false; }
  }
  function activeClientEmail() {
    if (!isAdminRole()) {
      try { return (localStorage.getItem('user_email') || '').toLowerCase().trim(); } catch (e) { return ''; }
    }
    if (window.currentChatEmail) return String(window.currentChatEmail).toLowerCase().trim();
    if (window.adminViewingEmail) return String(window.adminViewingEmail).toLowerCase().trim();
    var agActive = document.querySelector('#agd .agi.on, [data-chat-email].on');
    if (agActive) return (agActive.getAttribute('data-email') || agActive.getAttribute('data-chat-email') || '').toLowerCase().trim();
    var inp = document.querySelector('#adminChatEmail, [data-admin-chat-email]');
    return inp ? String(inp.value || inp.getAttribute('data-admin-chat-email') || '').toLowerCase().trim() : '';
  }
  function toast(msg, err) {
    try { if (typeof window.toast === 'function') window.toast(msg, !!err); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtSize(bytes) {
    var b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function injectCss() {
    if (document.getElementById('ncChatDocsCss')) return;
    var s = document.createElement('style');
    s.id = 'ncChatDocsCss';
    s.textContent =
      '.nc-cd-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(13,26,36,0.96);border-top:1px solid rgba(69,230,176,0.22);font-size:12px;color:#dbeafe;flex-wrap:wrap}' +
      '.nc-cd-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:10px;border:1px solid rgba(69,230,176,0.38);background:rgba(69,230,176,0.12);color:#45e6b0;font-weight:700;font-size:12px;cursor:pointer;transition:.15s}' +
      '.nc-cd-btn:hover{background:rgba(69,230,176,0.24);color:#fff}' +
      '.nc-cd-btn.req{border-color:rgba(251,191,36,0.42);background:rgba(251,191,36,0.12);color:#fbbf24}' +
      '.nc-cd-btn.req:hover{background:rgba(251,191,36,0.24);color:#fff}' +
      '.nc-cd-req-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:linear-gradient(135deg,rgba(251,191,36,0.16),rgba(69,230,176,0.12));border-top:1px solid rgba(251,191,36,0.38);color:#fef3c7;font-size:12px}' +
      '.nc-cd-req-banner b{display:block;color:#fff;font-size:12.5px;margin-bottom:2px}' +
      '.nc-cd-file-card{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;padding:9px 12px;border-radius:12px;background:rgba(6,14,22,0.78);border:1px solid rgba(69,230,176,0.32);color:#eef5f8;min-width:210px}' +
      '.nc-cd-file-meta{min-width:0;flex:1}' +
      '.nc-cd-file-meta b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}' +
      '.nc-cd-file-meta small{display:block;font-size:10.5px;color:#8fa3b0;margin-top:2px;text-transform:uppercase}' +
      '.nc-cd-dl{padding:6px 11px;border-radius:8px;background:#45e6b0;color:#041814;border:0;font-weight:800;font-size:11.5px;cursor:pointer;white-space:nowrap}' +
      '.nc-cd-dl:hover{filter:brightness(1.08)}';
    document.head.appendChild(s);
  }

  var origFetch = window.fetch;
  if (origFetch && !origFetch.__chatDocsWrapped) {
    window.fetch = function (url, opts) {
      var p = origFetch.apply(this, arguments);
      try {
        var u = String(url || '');
        if (u.indexOf('action=getChat') >= 0 || u.indexOf('action=sendChatFile') >= 0 || u.indexOf('action=requestChatDoc') >= 0) {
          p.then(function (res) {
            return res.clone().json().then(function (data) {
              if (data && data.ok) {
                if (data.docRequest !== undefined) state.docRequest = data.docRequest;
                if (Array.isArray(data.chat)) {
                  data.chat.forEach(function (m) {
                    if (m && m.file && m.id) state.fileCache[m.id] = m.file;
                    if (m && m.file && m.text) state.fileCache[m.text] = m.file;
                  });
                }
                if (data.message && data.message.file) {
                  state.fileCache[data.message.id] = data.message.file;
                  state.fileCache[data.message.text] = data.message.file;
                }
                setTimeout(renderChatUi, 60);
              }
            }).catch(function () {});
          }).catch(function () {});
        }
      } catch (e) {}
      return p;
    };
    window.fetch.__chatDocsWrapped = true;
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Read failed')); };
      reader.readAsDataURL(file);
    });
  }

  async function uploadDocument(file, targetEmail) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('File is too large (max 10 MB)', true);
      return;
    }
    toast('Uploading document: ' + file.name + '...');
    try {
      var b64 = await fileToBase64(file);
      var res = await origFetch(BASE + '?action=sendChatFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tok(),
          email: targetEmail || activeClientEmail(),
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: b64,
          clientMsgId: 'doc_' + Date.now()
        })
      });
      var data = await res.json();
      if (!data.ok) {
        toast(data.error || 'Failed to send document', true);
        return;
      }
      state.docRequest = data.docRequest || null;
      if (data.message && data.message.file) {
        state.fileCache[data.message.id] = data.message.file;
        state.fileCache[data.message.text] = data.message.file;
      }
      toast('Document sent');
      if (typeof window.pollChat === 'function') window.pollChat();
      renderChatUi();
    } catch (e) {
      toast('Connection error while sending file', true);
    }
  }

  async function createDocRequest(targetEmail) {
    var title = window.prompt('Which document would you like to request from the client?\n(e.g. Bank Statement, Signed Agreement, Proof of Source of Funds)', 'Supporting Document (PDF)');
    if (!title || !title.trim()) return;
    var note = window.prompt('Additional note for the client (optional):', '') || '';
    try {
      var res = await origFetch(BASE + '?action=requestChatDoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tok(),
          email: targetEmail,
          title: title.trim(),
          note: note.trim()
        })
      });
      var data = await res.json();
      if (!data.ok) {
        toast(data.error || 'Failed to request document', true);
        return;
      }
      state.docRequest = data.docRequest;
      toast('Document request sent to client');
      if (typeof window.pollChat === 'function') window.pollChat();
      renderChatUi();
    } catch (e) {
      toast('Network error', true);
    }
  }

  async function downloadChatFile(fileMeta, targetEmail) {
    if (!fileMeta || !fileMeta.key) return;
    toast('Downloading ' + fileMeta.name + '...');
    try {
      var res = await origFetch(BASE + '?action=getChatFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tok(),
          email: targetEmail || activeClientEmail(),
          key: fileMeta.key
        })
      });
      var data = await res.json();
      if (!data.ok || !data.dataUrl) {
        toast(data.error || 'Unable to download file', true);
        return;
      }
      var a = document.createElement('a');
      a.href = data.dataUrl;
      a.download = fileMeta.name || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast('Download error', true);
    }
  }

  function pickFileAndSend(targetEmail) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.html,.htm,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip';
    inp.onchange = function () {
      if (inp.files && inp.files[0]) uploadDocument(inp.files[0], targetEmail);
    };
    inp.click();
  }

  function enhanceFileBubbles() {
    var bubbles = document.querySelectorAll('#chatMsgs .cmsg, #adminChatMsgs .cmsg, #agdMsgs .cmsg, .chat-msg');
    bubbles.forEach(function (el) {
      if (el.querySelector('.nc-cd-file-card')) return;
      var txt = (el.textContent || '').trim();
      var matchedMeta = null;
      Object.keys(state.fileCache).forEach(function (k) {
        if (k && txt.indexOf(k) >= 0) matchedMeta = state.fileCache[k];
      });
      if (!matchedMeta && txt.indexOf('📎 ') === 0) {
        var guessedName = txt.replace(/^📎\s*/, '').split('\n')[0].trim();
        Object.keys(state.fileCache).forEach(function (k) {
          var m = state.fileCache[k];
          if (m && m.name === guessedName) matchedMeta = m;
        });
      }
      if (!matchedMeta) return;

      var card = document.createElement('div');
      card.className = 'nc-cd-file-card';
      card.innerHTML =
        '<div class="nc-cd-file-meta">' +
          '<b>📄 ' + esc(matchedMeta.name) + '</b>' +
          '<small>' + esc((matchedMeta.ext || 'FILE').toUpperCase()) + ' · ' + fmtSize(matchedMeta.size) + '</small>' +
        '</div>' +
        '<button type="button" class="nc-cd-dl">Download</button>';
      card.querySelector('.nc-cd-dl').onclick = function (e) {
        e.stopPropagation();
        downloadChatFile(matchedMeta, activeClientEmail());
      };
      el.appendChild(card);
    });
  }

  function renderChatUi() {
    injectCss();
    enhanceFileBubbles();

    var staff = isAdminRole();
    var target = activeClientEmail();

    if (staff) {
      var adminInputs = document.querySelectorAll('#adminChatInput, #agdInput, .admin-chat-input');
      adminInputs.forEach(function (inp) {
        var row = inp.parentElement;
        if (!row || !row.parentElement) return;
        var bar = row.parentElement.querySelector('.nc-cd-bar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'nc-cd-bar';
          bar.innerHTML =
            '<button type="button" class="nc-cd-btn" data-cd="send">📎 Send Document (PDF, HTML…)</button>' +
            '<button type="button" class="nc-cd-btn req" data-cd="req">📋 Request Document</button>';
          row.parentElement.insertBefore(bar, row);
          bar.querySelector('[data-cd="send"]').onclick = function () {
            var em = activeClientEmail();
            if (!em) { toast('Please select a client chat first', true); return; }
            pickFileAndSend(em);
          };
          bar.querySelector('[data-cd="req"]').onclick = function () {
            var em = activeClientEmail();
            if (!em) { toast('Please select a client chat first', true); return; }
            createDocRequest(em);
          };
        }
      });
      return;
    }

    var clientInput = document.getElementById('chatInput');
    if (!clientInput || !clientInput.parentElement || !clientInput.parentElement.parentElement) return;
    var host = clientInput.parentElement.parentElement;
    var existingBanner = host.querySelector('.nc-cd-req-banner');

    var hasOpenReq = state.docRequest && state.docRequest.status === 'open';
    if (!hasOpenReq) {
      if (existingBanner) existingBanner.remove();
      return;
    }

    if (!existingBanner) {
      existingBanner = document.createElement('div');
      existingBanner.className = 'nc-cd-req-banner';
      host.insertBefore(existingBanner, clientInput.parentElement);
    }
    existingBanner.innerHTML =
      '<div style="min-width:0;flex:1">' +
        '<b>📋 Document Requested: ' + esc(state.docRequest.title) + '</b>' +
        (state.docRequest.note ? '<span>' + esc(state.docRequest.note) + '</span>' : '<span>Please upload the requested file (PDF, HTML, image, or archive)</span>') +
      '</div>' +
      '<button type="button" class="nc-cd-btn" id="ncClientUploadDocBtn">📤 Upload File</button>';

    existingBanner.querySelector('#ncClientUploadDocBtn').onclick = function () {
      pickFileAndSend(target);
    };
  }

  setInterval(renderChatUi, 1200);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChatUi);
  else renderChatUi();
})();
