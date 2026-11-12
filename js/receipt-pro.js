/* receipt-pro.js v1 — "Download receipt (PDF)" in every transaction and withdrawal window.
   The receipt number is issued by the server and carries a QR code: scanning it opens a public page that confirms the receipt is real
   (amount, date, status and the holder's initials only). The PDF is written in the browser with the same generator as the statement. Load after statement-pro.js and wd-status.js. */
(function () {
  'use strict';
  if (window.__ncReceipt) return; window.__ncReceipt = 1;
  var BASE = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { try { return typeof getSessionToken === 'function' ? getSessionToken() : localStorage.getItem('session_token'); } catch (e) { return null; } }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, window.adminViewingEmail ? { email: window.adminViewingEmail } : {}, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error. Please check your internet and try again.' }; });
  }
  function toast(m, w) { try { if (typeof window.toast === 'function') window.toast(m, w); } catch (e) { } }
  function fmtDT(ts) { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function money(v) { return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  var css = document.createElement('style');
  css.textContent =
    '.rcp{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}.rcp-b{flex:1 1 220px;display:flex;align-items:center;justify-content:center;gap:9px;min-height:48px;padding:12px 16px;border-radius:14px;border:1px solid rgba(200,255,77,.4);background:rgba(200,255,77,.1);color:#d6ff5c;font:800 14px inherit;font-family:inherit;cursor:pointer;transition:.18s}' +
    '.rcp-b:hover{background:rgba(200,255,77,.18);transform:translateY(-1px)}.rcp-b:active{transform:scale(.98)}.rcp-b svg{width:18px;height:18px;flex:none}.rcp-b[disabled]{opacity:.6;cursor:wait}.rcp-b.ld svg{animation:rcpSp .8s linear infinite}@keyframes rcpSp{to{transform:rotate(360deg)}}' +
    'html[data-theme="light"] .rcp-b{background:#eef7d8;border-color:rgba(63,114,0,.45);color:#2f5a00}html[data-theme="light"] .rcp-b:hover{background:#e3f1c4}';
  document.head.appendChild(css);
  var DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>';


  /* built-in PDF writer: used when the statement module is missing or outdated, so a receipt can always be downloaded */
  var PW0 = 595.28, PH0 = 841.89;
  function lat(str) { var o = ''; str = String(str == null ? '' : str).replace(/[–—]/g, '-').replace(/•/g, '\x95').replace(/€/g, '\x80'); for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); o += (c === 0x95 || c === 0x80 || (c >= 32 && c < 127) || (c >= 160 && c < 256)) ? str.charAt(i) : (c < 32 ? ' ' : '?'); } return o; }
  function esc2(t) { return t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function tw0(s, size, bold) { s = lat(s); var w = 0; for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); w += /[A-Z0-9$&%#]/.test(ch) ? 0.66 : /[ilj.,:;'|!\u0095 ]/.test(ch) ? 0.28 : /[mw]/.test(ch) ? 0.8 : /[a-z]/.test(ch) ? 0.53 : 0.6; } return w * size * (bold ? 1.06 : 1); }
  function n2(x) { return (Math.round(x * 100) / 100).toString(); }
  function rg(c) { return n2(c[0] / 255) + ' ' + n2(c[1] / 255) + ' ' + n2(c[2] / 255); }
  function MiniDoc() { this.cur = []; }
  MiniDoc.prototype.text = function (x, top, str, o) { o = o || {}; var size = o.size || 10, s = lat(str), w = tw0(s, size, o.bold); if (o.align === 'right') x -= w; else if (o.align === 'center') x -= w / 2; this.cur.push('BT /F' + (o.bold ? 2 : 1) + ' ' + n2(size) + ' Tf ' + rg(o.color || [17, 17, 17]) + ' rg ' + n2(x) + ' ' + n2(PH0 - top) + ' Td (' + esc2(s) + ') Tj ET'); return w; };
  MiniDoc.prototype.rect = function (x, top, w, h, o) { this.cur.push(rg((o || {}).fill || [255, 255, 255]) + ' rg ' + n2(x) + ' ' + n2(PH0 - top - h) + ' ' + n2(w) + ' ' + n2(h) + ' re f'); };
  MiniDoc.prototype.line = function (x1, y1, x2, y2, o) { o = o || {}; this.cur.push(rg(o.color || [229, 231, 235]) + ' RG ' + n2(o.lw || 0.6) + ' w ' + n2(x1) + ' ' + n2(PH0 - y1) + ' m ' + n2(x2) + ' ' + n2(PH0 - y2) + ' l S'); };
  MiniDoc.prototype.wrap = function (str, width, size, bold) { var words = lat(str).split(' '), lines = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (tw0(t, size, bold) <= width) cur = t; else { if (cur) lines.push(cur); cur = w; } }); if (cur) lines.push(cur); return lines.length ? lines : ['']; };
  MiniDoc.prototype.build = function (title) {
    var stream = this.cur.join('\n'), out = '%PDF-1.4\n', offs = [];
    function obj(id, body) { offs[id] = out.length; out += id + ' 0 obj\n' + body + '\nendobj\n'; }
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [6 0 R] /Count 1 >>');
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    obj(5, '<< /Title (' + esc2(lat(title)) + ') /Producer (NordicCrypto) >>');
    obj(6, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW0 + ' ' + PH0 + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 7 0 R >>'); obj(7, '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
    var xref = out.length; out += 'xref\n0 8\n0000000000 65535 f \n'; for (var i = 1; i < 8; i++) out += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size 8 /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var u = new Uint8Array(out.length); for (var k = 0; k < out.length; k++) u[k] = out.charCodeAt(k) & 255; return new Blob([u], { type: 'application/pdf' });
  };
  function saveBlob(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function getKit() { var k = window.NCStatement && window.NCStatement._kit; return k || { Doc: MiniDoc, save: saveBlob, PW: PW0, PH: PH0, tw: tw0 }; }

  /* ───── PDF ───── */
  var INK = [17, 17, 17], MUT = [107, 114, 128], LINE = [229, 231, 235], BG = [246, 246, 242], LIME = [200, 255, 77];
  function qrRects(doc, url, x, top, size) {
    if (typeof window.QRious !== 'function') return false;
    try {
      var N = 96, q = new window.QRious({ value: url, size: N, level: 'M', padding: 0 }), cv = q.canvas, ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, N, N).data, k = size / N;
      for (var y = 0; y < N; y++) {
        var run = -1;
        for (var xx = 0; xx <= N; xx++) {
          var dark = xx < N && d[(y * N + xx) * 4] < 128;
          if (dark && run < 0) run = xx;
          if (!dark && run >= 0) { doc.rect(x + run * k, top + y * k, (xx - run) * k + 0.15, k + 0.35, { fill: INK }); run = -1; }
        }
      }
      return true;
    } catch (e) { return false; }
  }
  function build(r, kit) {
    var Doc = kit.Doc, PW = kit.PW, PH = kit.PH, doc = new Doc(), M = 40, R = PW - M;
    var out = r.type === 'Withdrawal' || r.direction === 'out', url = location.origin + '/verify.html?no=' + encodeURIComponent(r.no);
    doc.rect(M, 34, 22, 22, { fill: LIME }); doc.text(M + 11, 50, 'N', { size: 13, bold: true, align: 'center' });
    doc.text(M + 32, 50, 'NordicCrypto', { size: 14, bold: true }); doc.text(R, 48, 'Payment receipt', { size: 9, align: 'right', color: MUT });
    doc.text(M, 118, 'Receipt', { size: 26, bold: true });
    doc.text(M, 138, 'No. ' + r.no, { size: 11, color: MUT });
    var st = String(r.status), good = /completed|sent|done|success/i.test(st), bad = /reject|fail|cancel/i.test(st);
    var pc = bad ? [255, 226, 230] : good ? [226, 247, 190] : [255, 238, 200], tc = bad ? [170, 30, 55] : good ? [47, 90, 0] : [138, 90, 0], pw = kit.tw(st.toUpperCase(), 8, true) + 22;
    doc.rect(R - pw, 100, pw, 22, { fill: pc }); doc.text(R - pw / 2, 114.5, st.toUpperCase(), { size: 8, bold: true, align: 'center', color: tc });
    doc.rect(M, 168, R - M, 92, { fill: BG });
    doc.text(M + 20, 192, (out ? 'AMOUNT SENT' : 'AMOUNT RECEIVED'), { size: 7.5, bold: true, color: MUT });
    doc.text(M + 20, 232, (out ? '-' : '+') + money(r.amount), { size: 34, bold: true });
    if (r.payAmount && r.payCur) doc.text(R - 20, 232, 'Paid out: ' + Number(r.payAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ' + r.payCur, { size: 10, align: 'right', color: MUT });
    var y = 296, col2 = M + 270;
    function kv(x, y0, k, v, bold) { doc.text(x, y0, k.toUpperCase(), { size: 7, bold: true, color: MUT }); var ls = doc.wrap(String(v || '-'), 240, 10.5, !!bold); doc.text(x, y0 + 14, ls[0], { size: 10.5, bold: !!bold }); if (ls[1]) doc.text(x, y0 + 27, ls[1], { size: 10.5, bold: !!bold }); }
    kv(M, y, 'Date and time', fmtDT(r.at)); kv(col2, y, 'Type', r.type);
    kv(M, y + 46, 'Description', r.desc); kv(col2, y + 46, 'Method', r.method || '-');
    var yy = y + 92;
    if (r.dest) { kv(M, yy, out ? 'Destination' : 'Source', r.dest); kv(col2, yy, 'Reference', r.ref); yy += 46; } else { kv(M, yy, 'Reference', r.ref); yy += 46; }
    kv(M, yy, 'Account holder', r.holder, true); kv(col2, yy, 'E-mail', r.email); yy += 46;
    if (r.sentAt) { kv(M, yy, 'Sent', fmtDT(r.sentAt)); if (r.creditedAt) kv(col2, yy, 'Credited', fmtDT(r.creditedAt)); yy += 46; }
    doc.line(M, yy + 6, R, yy + 6, { color: LINE }); yy += 30;
    var qrOk = qrRects(doc, url, M, yy, 92);
    if (!qrOk) { doc.rect(M, yy, 92, 92, { fill: BG }); doc.text(M + 46, yy + 50, 'QR', { size: 12, bold: true, align: 'center', color: MUT }); }
    doc.text(M + 112, yy + 14, 'Verify this receipt', { size: 12, bold: true });
    var tl = doc.wrap('Scan the code to open a public page that confirms this receipt was issued by NordicCrypto. It shows the number, amount, date, status and the holder\'s initials only.', 330, 9.5);
    tl.forEach(function (l, i) { doc.text(M + 112, yy + 32 + i * 13, l, { size: 9.5, color: MUT }); });
    doc.text(M + 112, yy + 32 + tl.length * 13 + 8, 'Receipt no. ' + r.no, { size: 8, color: MUT });
    doc.text(M, PH - 50, 'Issued ' + fmtDT(r.issuedAt) + ' by NordicCrypto. This receipt confirms that the operation was recorded on your account.', { size: 7.5, color: MUT });
    doc.text(M, PH - 38, 'It is not a bank statement. Questions? Contact support from your dashboard.', { size: 7.5, color: MUT });
    return doc.build('NordicCrypto receipt ' + r.no);
  }

  /* message right under the button (the toast can sit behind the transaction window) */
  function say(btn, msg, bad) { var d = btn.parentNode, m = d.querySelector('.rcp-m'); if (!m) { m = document.createElement('div'); m.className = 'rcp-m'; m.style.cssText = 'flex:1 1 100%;font-size:13px;margin-top:2px'; d.appendChild(m); } m.style.color = bad ? '#ff8d8d' : '#9be26a'; m.textContent = msg; if (!bad) setTimeout(function () { if (m.parentNode) m.remove(); }, 4000); }
  function download(req, btn) {
    var kit = getKit();
    if (btn.disabled) return; btn.disabled = true; btn.classList.add('ld');
    post('issueReceipt', req).then(function (r) {
      btn.disabled = false; btn.classList.remove('ld');
      if (!r || !r.ok) { say(btn, (r && r.error) || 'Could not create the receipt.', true); return; }
      try { kit.save(build(r.receipt, kit), 'NordicCrypto-receipt-' + r.receipt.no + '.pdf'); say(btn, 'Receipt downloaded ✓', false); } catch (e) { console.error(e); try { saveBlob(build(r.receipt, { Doc: MiniDoc, save: saveBlob, PW: PW0, PH: PH0, tw: tw0 }), 'NordicCrypto-receipt-' + r.receipt.no + '.pdf'); say(btn, 'Receipt downloaded ✓', false); } catch (e2) { say(btn, 'Could not create the PDF. Please try again.', true); } }
    });
  }

  /* ───── button inside the transaction window ───── */
  var _open = window.openTxDetails;
  if (typeof _open !== 'function') return;
  window.openTxDetails = function (t) {
    _open.apply(this, arguments);
    try {
      var body = document.getElementById('txdBody'); if (!body || !t) return;
      var old = body.querySelector('.rcp'); if (old) old.remove();
      var w = typeof window.NCWdFind === 'function' && (t.isWithdrawal || t.wdId || /withdraw/i.test(String(t.desc || ''))) ? window.NCWdFind(t) : null;
      var req = w ? { kind: 'wd', id: w.id } : (t.ts ? { kind: 'tx', ts: t.ts, desc: t.desc } : null); if (!req) return;
      if (!w && /^pending|processing|waiting/i.test(String(t.status || ''))) return;
      var d = document.createElement('div'); d.className = 'rcp'; d.innerHTML = '<button type="button" class="rcp-b">' + DL + '<span>Download receipt (PDF)</span></button>';
      d.firstChild.addEventListener('click', function () { download(req, this); }); body.appendChild(d);
    } catch (e) { }
  };
})();
