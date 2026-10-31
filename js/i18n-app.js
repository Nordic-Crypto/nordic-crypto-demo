/* NordicCrypto — i18n-app.js
   Языки кабинета: en, da, fi, es, no, sv, fr, de. Выбор общий с лендингом (localStorage nc_lang).
   Тексты подменяются на лету (DOM + toast/alert/confirm), словарь грузится отдельным файлом js/i18n/<lang>.js.
   Ключ словаря — английская фраза; фразы с {x} — шаблоны для динамических сообщений. */
(function () {
  'use strict';
  if (window.NCI18N) return;

  var LANGS = [['en', '🇬🇧', 'English'], ['da', '🇩🇰', 'Dansk'], ['fi', '🇫🇮', 'Suomi'], ['es', '🇪🇸', 'Español'], ['no', '🇳🇴', 'Norsk'], ['sv', '🇸🇪', 'Svenska'], ['fr', '🇫🇷', 'Français'], ['de', '🇩🇪', 'Deutsch']];
  var CODES = LANGS.map(function (l) { return l[0]; });
  var MONTHS = {
    en: 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '),
    da: 'jan feb mar apr maj jun jul aug sep okt nov dec'.split(' '),
    fi: 'tammi helmi maalis huhti touko kesä heinä elo syys loka marras joulu'.split(' '),
    es: 'ene feb mar abr may jun jul ago sep oct nov dic'.split(' '),
    no: 'jan feb mar apr mai jun jul aug sep okt nov des'.split(' '),
    sv: 'jan feb mar apr maj jun jul aug sep okt nov dec'.split(' '),
    fr: 'janv. févr. mars avr. mai juin juil. août sept. oct. nov. déc.'.split(' '),
    de: 'Jan Feb Mär Apr Mai Jun Jul Aug Sep Okt Nov Dez'.split(' ')
  };
  var MON_EN = MONTHS.en;

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function detect() {
    var s = safeGet('nc_lang'); if (s && CODES.indexOf(s) >= 0) return s;
    var l = (navigator.languages && navigator.languages[0] || navigator.language || 'en').toLowerCase().slice(0, 2);
    if (l === 'nb' || l === 'nn') l = 'no';
    return CODES.indexOf(l) >= 0 ? l : 'en';
  }

  var lang = detect();
  var EXACT = {}, TPL = {}, loaded = {}, cache = {}, missing = {};
  var VER = '20261115';

  /* ---------- словарь ---------- */
  function esc(s) { return s.replace(/[.*+?^$()|[\]\\]/g, '\\$&'); }
  function add(l, map) {
    var ex = EXACT[l] = EXACT[l] || {}, tp = TPL[l] = TPL[l] || [];
    Object.keys(map).forEach(function (k) {
      var v = map[k];
      if (k.indexOf('{') >= 0) {
        var names = [];
        var re = esc(k).replace(/\{(\w+)\}/g, function (m, n) { names.push(n); return '([\\s\\S]+?)'; });
        try { tp.push({ re: new RegExp('^' + re + '$'), names: names, out: v, len: k.length }); } catch (e) {}
      } else ex[k] = v;
    });
    tp.sort(function (a, b) { return b.len - a.len; });
    cache = {};
    loaded[l] = 2;
    if (l === lang) { refreshAll(); try { window.dispatchEvent(new CustomEvent('nc-dict', { detail: l })); } catch (e) {} }
  }

  function loadLang(l) {
    if (l === 'en' || loaded[l]) return;
    loaded[l] = 1;
    fetchDict(l, 0);
  }
  /* загрузка словаря с повторами: сеть, 404, кэш или ошибка внутри файла не должны оставлять язык «мёртвым» */
  function fetchDict(l, n) {
    var s = document.createElement('script'), done = false;
    s.src = 'js/i18n-' + l + '.js?v=' + VER + (n ? '&r=' + Date.now() : ''); s.async = true;
    function retry() { if (done) return; done = true; if (n < 3) setTimeout(function () { fetchDict(l, n + 1); }, 900 * (n + 1)); else { loaded[l] = 0; try { console.warn('[i18n] dictionary "' + l + '" failed to load'); } catch (e) {} } }
    s.onerror = retry;
    s.onload = function () { done = true; };
    document.head.appendChild(s);
  }

  /* ---------- перевод одной строки ---------- */
  function dateLoc(core) {
    if (lang === 'en') return null;
    var m = /^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)( \d{4})?((?:,? \d{1,2}:\d{2})?)$/.exec(core);
    if (!m) return null;
    var mon = MONTHS[lang][MON_EN.indexOf(m[2])];
    var d = lang === 'de' || lang === 'da' || lang === 'no' || lang === 'fi' ? m[1] + '. ' : m[1] + ' ';
    if (lang === 'fr' || lang === 'es' || lang === 'sv') d = m[1] + ' ';
    return d + mon + (m[3] || '') + (m[4] || '');
  }

  function lookup(core) {
    var ex = EXACT[lang];
    if (ex && Object.prototype.hasOwnProperty.call(ex, core)) return ex[core];
    var d = dateLoc(core); if (d) return d;
    var rg = /^(.+?) ([–-]) (.+)$/.exec(core);            // «01 Oct 2026 – 28 Oct 2026»
    if (rg) { var d1 = dateLoc(rg[1]), d2 = dateLoc(rg[3]); if (d1 && d2) return d1 + ' ' + rg[2] + ' ' + d2; }
    var tp = TPL[lang];
    if (tp && core.length < 260) {
      for (var i = 0; i < tp.length; i++) {
        var m = tp[i].re.exec(core);
        if (m) {
          var out = tp[i].out;
          for (var j = 0; j < tp[i].names.length; j++) {
            var cap = m[j + 1], tc = (ex && ex[cap]) || cap;
            out = out.split('{' + tp[i].names[j] + '}').join(tc);
          }
          return out;
        }
      }
    }
    return null;
  }

  function translate(s) {
    if (lang === 'en' || s == null || loaded[lang] !== 2) return null;     // словарь ещё грузится
    if (cache[s] !== undefined) return cache[s];
    var res = null;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (core && /[A-Za-zÀ-ÿ]{2}/.test(core)) {
      var r = lookup(core);
      if (r == null) {
        // убираем ведущие значки/эмодзи и хвостовые знаки: «💰 Deposit», «Continue →», «Loading…»
        var lead = /^[^A-Za-zÀ-ÿ0-9]+/.exec(core), trail = /[\s→…:.!?(]+$/.exec(core);
        var c2 = core.slice(lead ? lead[0].length : 0, trail ? core.length - trail[0].length : core.length);
        if (c2 && (lead || trail)) {
          var r2 = lookup(c2);
          if (r2 != null) r = (lead ? lead[0] : '') + r2 + (trail ? trail[0] : '');
        }
      }
      if (r != null) res = m[1] + r + m[3];
      else if (core.length < 200) missing[core] = 1;
    }
    if (Object.keys(cache).length > 6000) cache = {};
    cache[s] = res;
    return res;
  }

  /* ---------- DOM ---------- */
  var ORIG = new WeakMap();         // text node -> {en, out}
  var ATTR = new WeakMap();         // element -> {attr: {en, out}}
  var SKIP = 'script,style,textarea,noscript,code,pre,#adminPanel,[id^="admin"],.chat-bubble,[data-nci18n="off"],.nc-no-i18n';
  var ATTRS = ['placeholder', 'title', 'aria-label'];

  function skipped(el) { try { return !!(el && el.closest && el.closest(SKIP)); } catch (e) { return false; } }

  function doText(n) {
    var p = n.parentElement; if (!p || skipped(p)) return;
    var val = n.nodeValue, rec = ORIG.get(n);
    if (rec && val === rec.out) { if (lang === 'en' && rec.en !== val) { n.nodeValue = rec.en; rec.out = rec.en; } else if (lang !== 'en') { var t0 = translate(rec.en); var o0 = t0 == null ? rec.en : t0; if (o0 !== val) { n.nodeValue = o0; rec.out = o0; } } return; }
    rec = { en: val, out: val };
    var t = translate(val);
    if (t != null && t !== val) { n.nodeValue = t; rec.out = t; }
    if (t != null || ORIG.has(n)) ORIG.set(n, rec); else ORIG.set(n, rec);
  }

  function doAttrs(el) {
    if (!el || el.nodeType !== 1 || skipped(el)) return;
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var v = el.getAttribute(a), m = ATTR.get(el); if (!m) { m = {}; ATTR.set(el, m); }
      var r = m[a];
      if (r && r.out === v) { if (lang === 'en') { if (r.en !== v) { el.setAttribute(a, r.en); r.out = r.en; } } else { var t1 = translate(r.en); var o1 = t1 == null ? r.en : t1; if (o1 !== v) { el.setAttribute(a, o1); r.out = o1; } } return; }
      r = m[a] = { en: v, out: v };
      var t = translate(v); if (t != null && t !== v) { el.setAttribute(a, t); r.out = t; }
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skipped(root)) return; doAttrs(root); }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    while ((n = w.nextNode())) { try { if (n.nodeType === 3) doText(n); else doAttrs(n); } catch (e) {} }
  }

  function refreshAll() { try { walk(document.body); } catch (e) {} updateUi(); }

  var queue = new Set(), scheduled = false;
  function flush() {
    scheduled = false;
    var items = Array.from(queue); queue.clear();
    items.forEach(function (n) { try { if (n.isConnected !== false) walk(n); } catch (e) {} });
  }
  function enqueue(n) { queue.add(n); if (!scheduled) { scheduled = true; (window.requestAnimationFrame || setTimeout)(flush); } }

  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === 'characterData') enqueue(r.target);
      else if (r.type === 'attributes') enqueue(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) enqueue(r.addedNodes[j]);
    }
  });

  /* ---------- alert / confirm / prompt ---------- */
  function tmsg(m) {
    if (lang === 'en' || typeof m !== 'string') return m;
    var whole = translate(m); if (whole != null) return whole;
    return m.split('\n').map(function (l) { var t = translate(l); return t == null ? l : t; }).join('\n');
  }
  ['alert', 'confirm', 'prompt'].forEach(function (k) {
    var o = window[k]; if (typeof o !== 'function') return;
    window[k] = function (m) { var a = Array.prototype.slice.call(arguments); a[0] = tmsg(m); return o.apply(window, a); };
  });

  /* ---------- переключатель ---------- */
  function flagOf(l) { return LANGS.filter(function (x) { return x[0] === l; })[0]; }

  function buildUi() {
    if (document.getElementById('ncLang')) return;
    var host = document.querySelector('.top > div:last-child') || document.querySelector('.top');
    if (!host) return;
    var cur = flagOf(lang);
    var w = document.createElement('div'); w.className = 'nc-lang'; w.id = 'ncLang'; w.setAttribute('data-nci18n', 'off');
    w.innerHTML = '<button type="button" class="nc-lang-btn" id="ncLangBtn" aria-haspopup="listbox" title="Language"><span id="ncLangFlag">' + cur[1] + '</span><span id="ncLangCode">' + lang.toUpperCase() + '</span><svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="nc-lang-menu" id="ncLangMenu" role="listbox">' + LANGS.map(function (l) { return '<div class="nc-lang-opt' + (l[0] === lang ? ' on' : '') + '" role="option" data-l="' + l[0] + '"><span>' + l[1] + '&nbsp; ' + l[2] + '</span><span class="nc-lang-rate">' + l[0].toUpperCase() + '</span></div>'; }).join('') + '</div>';
    var cs = document.getElementById('currSwitch');
    w.addEventListener('click', function (e) { e.stopPropagation(); });
    if (cs && cs.parentNode === host) host.insertBefore(w, cs); else host.insertBefore(w, host.firstChild);
    w.querySelector('#ncLangBtn').onclick = function (e) { e.stopPropagation(); document.getElementById('ncLangMenu').classList.toggle('on'); };
    w.querySelector('#ncLangMenu').onclick = function (e) { var o = e.target.closest('[data-l]'); if (!o) return; e.stopPropagation(); setLang(o.getAttribute('data-l')); document.getElementById('ncLangMenu').classList.remove('on'); };
    document.addEventListener('click', function () { var m = document.getElementById('ncLangMenu'); if (m) m.classList.remove('on'); });
    buildSettingsRow();
  }

  /* строка выбора языка в окне Settings */
  function buildSettingsRow() {
    var box = document.querySelector('#settingsMask .modal, #settingsMask > div'); if (!box || document.getElementById('ncLangRow')) return;
    var h = document.createElement('div'); h.id = 'ncLangRow'; h.className = 'nc-no-i18n'; h.setAttribute('data-nci18n', 'off');
    h.style.cssText = 'margin:0 0 18px';
    var lab = document.createElement('div'); lab.id = 'ncLangRowLabel'; lab.style.cssText = 'font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin-bottom:8px'; lab.textContent = 'Language';
    var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
    LANGS.forEach(function (l) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-l', l[0]); b.className = 'nc-lang-chip'; b.textContent = l[1] + ' ' + l[0].toUpperCase(); b.title = l[2]; row.appendChild(b); });
    h.appendChild(lab); h.appendChild(row);
    row.onclick = function (e) { var b = e.target.closest('[data-l]'); if (b) setLang(b.getAttribute('data-l')); };
    var anchor = box.querySelector('.d, p');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(h, anchor.nextSibling); else box.insertBefore(h, box.firstChild);
    updateUi();
  }

  function updateUi() {
    var c = flagOf(lang), f = document.getElementById('ncLangFlag'), cd = document.getElementById('ncLangCode');
    if (f && c) f.textContent = c[1]; if (cd) cd.textContent = lang.toUpperCase();
    Array.prototype.forEach.call(document.querySelectorAll('#ncLangMenu [data-l]'), function (o) { o.classList.toggle('on', o.getAttribute('data-l') === lang); });
    Array.prototype.forEach.call(document.querySelectorAll('#ncLangRow [data-l]'), function (o) { o.classList.toggle('on', o.getAttribute('data-l') === lang); });
    var lb = document.getElementById('ncLangRowLabel'); if (lb) lb.textContent = ({ en: 'Language', da: 'Sprog', fi: 'Kieli', es: 'Idioma', no: 'Språk', sv: 'Språk', fr: 'Langue', de: 'Sprache' })[lang];
    var bt = document.getElementById('ncLangBtn'); if (bt) bt.title = lb ? lb.textContent : 'Language';
    document.documentElement.lang = lang;
  }

  function setLang(l, silent) {
    if (CODES.indexOf(l) < 0) l = 'en';
    lang = l; cache = {};
    if (!silent) safeSet('nc_lang', l);
    if (l !== 'en' && !loaded[l]) loadLang(l);
    refreshAll();
    try { window.dispatchEvent(new CustomEvent('nc-lang', { detail: l })); } catch (e) {}
    // страховка: догоняем всё, что отрисовалось позже (словарь, ленивые экраны)
    [350, 1400, 3500].forEach(function (ms) { setTimeout(function () { if (lang === l) refreshAll(); }, ms); });
    // сообщаем серверу не нужно: язык хранится в браузере
  }

  /* ---------- API ---------- */
  window.NCI18N = {
    LANGS: LANGS,
    get lang() { return lang; },
    set: setLang,
    add: add,
    t: function (s) { var r = translate(s); return r == null ? s : r; },
    missing: function () { return Object.keys(missing); },
    refresh: refreshAll,
    status: function () { return { lang: lang, loaded: loaded[lang] || 0, ready: loaded[lang] === 2 }; }
  };

  var css = document.createElement('style');
  css.textContent = '.nc-lang{position:relative;display:inline-block}' +
    '.nc-lang-btn{display:flex;align-items:center;gap:7px;padding:7px 12px;background:rgba(255,255,255,.04);border:1px solid var(--bd2,rgba(255,255,255,.14));border-radius:999px;color:var(--txt,#f8fafc);cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:600}' +
    '.nc-lang-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:190px;background:linear-gradient(180deg,var(--pan2,#1a1f2e),#0f151e);border:1px solid var(--bd2,rgba(255,255,255,.14));border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.45);padding:6px;display:none;z-index:99999}' +
    '.nc-lang-menu.on{display:block}' +
    '.nc-lang-opt{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:.88rem;color:var(--txt,#f8fafc)}' +
    '.nc-lang-opt span:first-child{font-weight:600;flex:1}.nc-lang-opt:hover{background:rgba(255,255,255,.06)}' +
    '.nc-lang-opt.on{background:rgba(200,255,61,.12);color:var(--pri,#c8ff3d)}.nc-lang-rate{font-size:.7rem;opacity:.6}' +
    'html[data-theme="light"] .nc-lang-menu{background:#fff}html[data-theme="light"] .nc-lang-btn{background:rgba(0,0,0,.04)}' +
    '.nc-lang-chip{border:1px solid var(--bd2,rgba(255,255,255,.14));background:rgba(255,255,255,.04);color:inherit;border-radius:999px;padding:6px 11px;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer}' +
    '.nc-lang-chip.on{border-color:var(--pri,#c8ff3d);color:var(--pri,#c8ff3d)}' +
    '@media(max-width:640px){#ncLangCode{display:none}.nc-lang-btn{padding:7px 9px}.nc-lang-btn svg{display:none}.top{height:auto!important;min-height:64px;padding-top:8px!important;padding-bottom:8px!important}.top>div:last-child{gap:6px!important;flex-wrap:wrap;justify-content:flex-end;flex:1;min-width:0}.top .st{display:none!important}}@media(max-width:430px){#btnRefreshBalance{display:none!important}.top .top-icon,.top .settings-btn,.top .notif-bell{width:36px!important;height:36px!important}.nc-lang-menu{left:0;right:auto}}';
  document.head.appendChild(css);

  function start() {
    buildUi();
    if (lang !== 'en') loadLang(lang);
    document.documentElement.lang = lang;
    refreshAll();
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // шапка и окно Settings могут появиться позже
    var tries = 0, iv = setInterval(function () { buildUi(); buildSettingsRow(); if (++tries > 20 || (document.getElementById('ncLang') && document.getElementById('ncLangRow'))) clearInterval(iv); }, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
