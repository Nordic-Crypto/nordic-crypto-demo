/* ============================================================
   NORDIC CRYPTO — CHAT DOCUMENTS PRO v2.0 (Admin + Agent Desk + Client)
   - Works in Admin Modal Chat, Agent Desk, and Client Support Chat
   - Auto-detects active client email from API calls & UI headers
   - Admin/Agent can send any document (PDF, HTML, DOCX, XLSX, ZIP, etc.)
   - Admin/Agent can request a document; Client can upload ONLY on request
   ============================================================ */
(function () {
  'use strict';
  if (window.__chatDocsProV2) return;
  window.__chatDocsProV2 = true;

  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  var state = {
    docRequest: null,
    lastActiveClient: '',
    fileCache: {}
  };

  function tok() {
    try { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
    catch (e) { return null; }
  }

  function isStaffMode() {
    try {
      if (localStorage.getItem('user_role') === 'admin') return true;
      if (document.body && /agent/i.test(document.body.innerText.slice(0, 200))) return true;
      if (location.pathname && /agent/i.test(location.pathname)) return true;
    } catch (e) {}
    return false;
  }

  function extractEmailFromText(txt) {
    if (!txt) return '';
    var m = String(txt).match(EMAIL_RE);
    if (!m) return '';
    var em = m[0].toLowerCase().trim();
    if (em.indexOf('@nordiccrypto.') >= 0) return '';
    return em;
  }

  function activeClientEmail() {
    if (!isStaffMode()) {
      try { return (localStorage.getItem('user_email') || '').toLowerCase().trim(); } catch (e) { return ''; }
    }

    /* 1. From visible Admin Chat modal header (e.g. "otis@bloomquix.info" in image_5f783e) */
    var modals = document.querySelectorAll('.modal, [role="dialog"], #adminChatModal, #chatModal, .nc-chat-modal');
    for (var i = 0; i < modals.length; i++) {
      if (modals[i].offsetParent !== null) {
        var hdr = modals[i].querySelector('h1, h2, h3, h4, .modal-title, .hdr, div');
        var found = extractEmailFromText(hdr ? hdr.textContent : modals[i].textContent.slice(0, 250));
        if (found) { state.lastActiveClient = found; return found; }
      }
    }

    /* 2. From Agent Desk active conversation header or sidebar (e.g. "Otis / otis@bloomquix.info" in image_5f78ba) */
    var agHeaders = document.querySelectorAll('#agdChatHdr, .agd-hdr, .chat-hdr, .conv-hdr, main header, .active, .on');
    for (var j = 0; j < agHeaders.length; j++) {
      if (agHeaders[j].offsetParent !== null) {
        var foundAg = extractEmailFromText(agHeaders[j].textContent.slice(0, 220));
        if (foundAg) { state.lastActiveClient = foundAg; return foundAg; }
      }
    }

    /* 3. From global state or last intercepted getChat request */
    if (window.currentChatEmail) return String(window.currentChatEmail).toLowerCase().trim();
    if (state.lastActiveClient) return state.lastActiveClient;

    return '';
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
      '.nc-cd-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(11,22,32,0.95);border-top:1px solid rgba(69,230,176,0.22);font-size:12px;color:#dbeafe;flex-wrap:wrap;z-index:5}' +
      '.nc-cd-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;border:1px solid rgba(69,230,176,0.4);background:rgba(69,230,176,0.13);color:#45e6b0;font-weight:700;font-size:12px;cursor:pointer;transition:.15s;font-family:inherit}' +
      '.nc-cd-btn:hover{background:rgba(69,230,176,0.25);color:#ffffff}' +
      '.nc-cd-btn.req{border-color:rgba(251,191,36,0.45);background:rgba(251,191,36,0.13);color:#fbbf24}' +
      '.nc-cd-btn.req:hover{background:rgba(251,191,36,0.25);color:#ffffff}' +
      '.nc-cd-req-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:linear-gradient(135deg,rgba(251,191,36,0.18),rgba(69,230,176,0.12));border-top:1px solid rgba(251,191,36,0.4);color:#fef3c7;font-size:12px}' +
      '.nc-cd-req-banner b{display:block;color:#ffffff;font-size:12.5px;margin-bottom:2px}' +
      '.nc-cd-file-card{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;padding:9px 12px;border-radius:12px;background:rgba(6,14,22,0.82);border:1px solid rgba(69,230,176,0.35);color:#eef5f8;min-width:210px}' +
      '.nc-cd-file-meta{min-width:0;flex:1}' +
      '.nc-cd-file-meta b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffffff}' +
      '.nc-cd-file-meta small{display:block;font-size:10.5px;color:#8fa3b0;margin-top:2px;text-transform:uppercase}' +
      '.nc-cd-dl{padding:6px 11px;border-radius:8px;background:#45e6b0;color:#041814;border:0;font-weight:800;font-size:11.5px;cursor:pointer;white-space:nowrap}' +
      '.nc-cd-dl:hover{filter:brightness(1.08)}';
    document.head.appendChild(s);
  }

  /* Intercept fetch to track active client email, docRequest status, and file attachments */
  var origFetch = window.fetch;
  if (origFetch && !origFetch.__chatDocsWrapped) {
    window.fetch = function (url, opts) {
      try {
        if (opts && typeof opts.body === 'string' && opts.body.indexOf('"email"') >= 0) {
          var parsedBody = JSON.parse(opts.body);
          if (parsedBody && parsedBody.email && String(parsedBody.email).indexOf('@nordiccrypto.') < 0) {
            state.lastActiveClient = String(parsedBody.email).toLowerCase().trim();
          }
        }
      } catch (e) {}

      var p = origFetch.apply(this, arguments);
      try {
        var u = String(url || '');
        if (u.indexOf('action=getChat') >= 0 || u.indexOf('action=sendChatFile') >= 0 || u.indexOf('action=requestChatDoc') >= 0) {
          p.then(function (res) {
            return res.clone().json().then(function (data) {
              if (data && data.ok) {
                if (data.email && String(data.email).indexOf('@nordiccrypto.') < 0) {
                  state.lastActiveClient = String(data.email).toLowerCase().trim();
                }
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
                setTimeout(renderChatUi, 50);
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
    var em = targetEmail || activeClientEmail();
    if (!em) {
      toast('Please select a client conversation first', true);
      return;
    }
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('File is too large (max 10 MB)', true);
      return;
    }
    toast('Uploading ' + file.name + '...');
    try {
      var b64 = await fileToBase64(file);
      var res = await origFetch(BASE + '?action=sendChatFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tok(),
          email: em,
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
      toast('Document sent successfully');
      if (typeof window.pollChat === 'function') window.pollChat();
      renderChatUi();
    } catch (e) {
      toast('Connection error while sending file', true);
    }
  }

  async function createDocRequest(targetEmail) {
    var em = targetEmail || activeClientEmail();
    if (!em) {
      toast('Please select a client conversation first', true);
      return;
    }
    var title = window.prompt('Which document would you like to request from ' + em + '?\n(e.g. Bank Statement, Signed Agreement, Proof of Source of Funds)', 'Supporting Document (PDF)');
    if (!title || !title.trim()) return;
    var note = window.prompt('Additional note for the client (optional):', '') || '';
    try {
      var res = await origFetch(BASE + '?action=requestChatDoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tok(),
          email: em,
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
      toast('Document request sent to ' + em);
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
    var em = targetEmail || activeClientEmail();
    if (!em) {
      toast('Please select a client conversation first', true);
      return;
    }
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.html,.htm,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip';
    inp.onchange = function () {
      if (inp.files && inp.files[0]) uploadDocument(inp.files[0], em);
    };
    inp.click();
  }

  function enhanceFileBubbles() {
    var bubbles = document.querySelectorAll('#chatMsgs .cmsg, #adminChatMsgs .cmsg, #agdMsgs .cmsg, .cmsg, .chat-msg, [class*="msg"]');
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

  function mountBarBeforeInput(inp) {
    if (!inp || inp.offsetParent === null) return;
    var row = inp.parentElement;
    if (!row || !row.parentElement) return;
    if (row.parentElement.querySelector('.nc-cd-bar')) return;

    var bar = document.createElement('div');
    bar.className = 'nc-cd-bar';
    bar.innerHTML =
      '<button type="button" class="nc-cd-btn" data-cd="send">📎 Send Document (PDF, HTML…)</button>' +
      '<button type="button" class="nc-cd-btn req" data-cd="req">📋 Request Document</button>';
    row.parentElement.insertBefore(bar, row);

    bar.querySelector('[data-cd="send"]').onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      pickFileAndSend(activeClientEmail());
    };
    bar.querySelector('[data-cd="req"]').onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      createDocRequest(activeClientEmail());
    };
  }

  function renderChatUi() {
    injectCss();
    enhanceFileBubbles();

    var staff = isStaffMode();
    var target = activeClientEmail();

    if (staff) {
      /* Mount bar in BOTH Admin Modal Chat ("Reply...") and Agent Desk ("Write a message...") */
      var inputs = document.querySelectorAll('#adminChatInput, #agdInput, textarea[placeholder*="Reply"], input[placeholder*="Reply"], textarea[placeholder*="Write a message"], input[placeholder*="Write a message"]');
      inputs.forEach(mountBarBeforeInput);
      return;
    }

    /* Client Side: Show Upload Banner ONLY when Admin/Agent has an open request */
    var clientInput = document.getElementById('chatInput') || document.querySelector('#chatPanel textarea, #chatPanel input[type="text"]');
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

    existingBanner.querySelector('#ncClientUploadDocBtn').onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      pickFileAndSend(target);
    };
  }

  setInterval(renderChatUi, 900);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChatUi);
  else renderChatUi();
})();
