/* NordicCrypto chat extras: photos in the chat (client + admin) and one-tap quick replies for admins */
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

  var css = '.nc-chimg,.nc-chimg-i{display:block;margin-top:6px;max-width:100%}.nc-chimg{font-size:12px;opacity:.7}.nc-chimg-i{width:230px;border-radius:12px;cursor:zoom-in;background:#fff}' +
    '#ncAttach{flex:none;width:38px;height:38px;border-radius:12px;border:0;background:rgba(255,255,255,.08);color:inherit;font-size:18px;cursor:pointer;margin-right:6px}#ncAttach[disabled]{opacity:.5}' +
    '.nc-qr{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 14px 0;border-top:1px solid rgba(255,255,255,.06)}.nc-qr select{background:#1a2233;color:#e7edf5;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:4px 6px;font-size:12px}' +
    '.nc-qr button{background:rgba(255,255,255,.07);color:#e7edf5;border:0;border-radius:999px;padding:5px 10px;font-size:12px;cursor:pointer}.nc-qr button:hover{background:rgba(139,92,246,.35)}';
  (function () { var s = document.createElement('style'); s.textContent = css; (document.head || document.documentElement).appendChild(s); })();

  /* ---------- show photos ---------- */
  var cache = {}, loading = {};
  window.__ncImg = function (m, email) {
    if (!m || !m.img) return '';
    if (cache[m.img]) return '<img class="nc-chimg-i" src="' + cache[m.img] + '" alt="photo" data-key="' + esc(m.img) + '">';
    return '<div class="nc-chimg" data-key="' + esc(m.img) + '" data-email="' + esc(email || '') + '">📷 …</div>';
  };
  window.__ncImgHydrate = function (root) {
    var list = (root || document).querySelectorAll('.nc-chimg');
    Array.prototype.forEach.call(list, function (el) {
      var key = el.getAttribute('data-key'); if (!key || loading[key]) return;
      loading[key] = 1;
      api('getChatImage', { email: el.getAttribute('data-email') || undefined, key: key }).then(function (d) {
        loading[key] = 0;
        if (!d || !d.ok) { el.textContent = '📷 (unavailable)'; return; }
        cache[key] = d.dataUrl;
        Array.prototype.forEach.call(document.querySelectorAll('.nc-chimg[data-key="' + key.replace(/"/g, '') + '"]'), function (n) { n.outerHTML = window.__ncImg({ img: key }); });
      }).catch(function () { loading[key] = 0; });
    });
  };
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.classList || !t.classList.contains('nc-chimg-i')) return;
    try {
      var p = t.src.split(','), mime = /data:([^;]+)/.exec(p[0])[1], bin = atob(p[1]), u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      window.open(URL.createObjectURL(new Blob([u8], { type: mime })), '_blank');
    } catch (x) {}
  });
  setInterval(function () { if (document.querySelector('.nc-chimg')) window.__ncImgHydrate(document); }, 1500);

  /* ---------- send a photo ---------- */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('read')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error('image')); };
        im.onload = function () {
          var max = 1280, w = im.width, h = im.height, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.82));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function sendImage(email, file, done) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { say('Please choose a photo', true); return; }
    say('Sending photo…');
    shrink(file).then(function (dataUrl) {
      return api('sendChatImage', { email: email || undefined, dataUrl: dataUrl, clientMsgId: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) });
    }).then(function (d) {
      if (d && d.ok) { say('✓ Photo sent'); if (done) done(); } else say((d && d.error) || 'Could not send', true);
    }).catch(function () { say('Could not send the photo', true); });
  }
  window.NCChatExtra = { sendImage: sendImage };

  /* client chat: add the paperclip next to the message box */
  function clientBtn() {
    var inp = $('chatInput'); if (!inp || $('ncAttach')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'ncAttach'; b.title = 'Send a photo'; b.textContent = '📎';
    var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none'; f.id = 'ncAttachFile';
    b.onclick = function () { f.click(); };
    f.onchange = function () {
      var file = f.files && f.files[0]; f.value = '';
      var who = window.adminViewingEmail || undefined;
      sendImage(who, file, function () { if (typeof window.__ncChatPoll === 'function') window.__ncChatPoll(); });
    };
    inp.parentNode.insertBefore(b, inp); inp.parentNode.appendChild(f);
  }
  setInterval(clientBtn, 1500);

  /* ---------- quick replies (admin) ---------- */
  var QR = {
    en: ['Hello! How can I help you?', 'Your deposit has been received and credited.', 'Please send a screenshot of the payment.', 'We are reviewing your request. It takes up to 24 hours.', 'Your verification has been approved.', 'Thank you for your patience. Is there anything else I can help with?'],
    da: ['Hej! Hvordan kan jeg hjælpe dig?', 'Din indbetaling er modtaget og krediteret.', 'Send venligst et skærmbillede af betalingen.', 'Vi gennemgår din anmodning. Det tager op til 24 timer.', 'Din verificering er godkendt.', 'Tak for din tålmodighed. Kan jeg hjælpe med andet?'],
    fi: ['Hei! Miten voin auttaa?', 'Talletuksesi on vastaanotettu ja hyvitetty.', 'Lähetä kuvakaappaus maksusta.', 'Tarkistamme pyyntösi. Se kestää enintään 24 tuntia.', 'Vahvistuksesi on hyväksytty.', 'Kiitos kärsivällisyydestäsi. Voinko auttaa jossain muussa?'],
    es: ['¡Hola! ¿En qué puedo ayudarte?', 'Tu depósito ha sido recibido y acreditado.', 'Por favor, envía una captura de pantalla del pago.', 'Estamos revisando tu solicitud. Tarda hasta 24 horas.', 'Tu verificación ha sido aprobada.', 'Gracias por tu paciencia. ¿Puedo ayudarte con algo más?'],
    no: ['Hei! Hvordan kan jeg hjelpe deg?', 'Innskuddet ditt er mottatt og godskrevet.', 'Send et skjermbilde av betalingen.', 'Vi vurderer forespørselen din. Det tar opptil 24 timer.', 'Verifiseringen din er godkjent.', 'Takk for tålmodigheten. Kan jeg hjelpe med noe mer?'],
    sv: ['Hej! Hur kan jag hjälpa dig?', 'Din insättning har mottagits och krediterats.', 'Skicka en skärmbild på betalningen.', 'Vi granskar din förfrågan. Det tar upp till 24 timmar.', 'Din verifiering har godkänts.', 'Tack för ditt tålamod. Kan jag hjälpa till med något mer?'],
    fr: ['Bonjour ! Comment puis-je vous aider ?', 'Votre dépôt a été reçu et crédité.', 'Merci d’envoyer une capture d’écran du paiement.', 'Nous examinons votre demande. Cela prend jusqu’à 24 heures.', 'Votre vérification a été approuvée.', 'Merci de votre patience. Puis-je vous aider pour autre chose ?'],
    de: ['Hallo! Wie kann ich Ihnen helfen?', 'Ihre Einzahlung ist eingegangen und gutgeschrieben.', 'Bitte senden Sie einen Screenshot der Zahlung.', 'Wir prüfen Ihre Anfrage. Das dauert bis zu 24 Stunden.', 'Ihre Verifizierung wurde genehmigt.', 'Danke für Ihre Geduld. Kann ich sonst noch helfen?']
  };
  var NAMES = { en: 'EN', da: 'DA', fi: 'FI', es: 'ES', no: 'NO', sv: 'SV', fr: 'FR', de: 'DE' };
  function lang() { try { return localStorage.getItem('nc_quick_lang') || 'en'; } catch (e) { return 'en'; } }
  function chips(l) { return (QR[l] || QR.en).map(function (t, i) { return '<button type="button" data-qr="' + i + '" title="' + esc(t) + '">' + esc(t.length > 26 ? t.slice(0, 24) + '…' : t) + '</button>'; }).join(''); }
  window.NCQuick = {
    html: function () {
      var l = lang();
      return '<div class="nc-qr" id="ncQr"><select id="ncQrLang" aria-label="Language">' + Object.keys(NAMES).map(function (k) { return '<option value="' + k + '"' + (k === l ? ' selected' : '') + '>' + NAMES[k] + '</option>'; }).join('') + '</select><span id="ncQrChips" style="display:contents">' + chips(l) + '</span></div>';
    },
    bind: function (modal) {
      modal.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'ncQrLang') { try { localStorage.setItem('nc_quick_lang', e.target.value); } catch (x) {} $('ncQrChips').innerHTML = chips(e.target.value); }
      });
      modal.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-qr]') : null; if (!b) return;
        var i = Number(b.getAttribute('data-qr')), t = (QR[lang()] || QR.en)[i], inp = $('adminChatInput');
        if (inp && t) { inp.value = t; inp.focus(); }
      });
    }
  };
})();
