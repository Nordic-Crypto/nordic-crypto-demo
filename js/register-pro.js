/* NordicCrypto — register-pro.js v2 (Reliable Submit + 502 Auto-Retry + Loading State) */
(function () {
  'use strict';
  if (window.__ncReg) return; window.__ncReg = 1;

  /* Auto-retry register/login on transient 502/503/504 edge errors */
  (function () {
    var origFetch = window.fetch;
    if (!origFetch || origFetch.__ncRegRetry) return;
    window.fetch = function (url, opts) {
      var u = String(url || '');
      if (u.indexOf('action=register') < 0 && u.indexOf('action=login') < 0) {
        return origFetch.apply(this, arguments);
      }
      var args = arguments;
      return origFetch.apply(this, args).then(function (res) {
        if (res && (res.status === 502 || res.status === 503 || res.status === 504)) {
          return new Promise(function (r) { setTimeout(r, 450); }).then(function () {
            return origFetch.apply(null, args);
          });
        }
        return res;
      }).catch(function (err) {
        return new Promise(function (r) { setTimeout(r, 450); }).then(function () {
          return origFetch.apply(null, args);
        });
      });
    };
    window.fetch.__ncRegRetry = true;
  })();

  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    s1: ['Choose your account', 'Vælg din konto', 'Valitse tilisi', 'Elige tu cuenta', 'Velg kontoen din', 'Välj ditt konto', 'Choisissez votre compte', 'Wähle dein Konto'],
    s1s: ['Pick what fits you — you can change it later.', 'Vælg det, der passer dig — du kan ændre det senere.', 'Valitse sinulle sopiva — voit muuttaa myöhemmin.', 'Elige lo que te convenga: puedes cambiarlo después.', 'Velg det som passer deg — du kan endre det senere.', 'Välj det som passar dig — du kan ändra det senare.', 'Choisissez ce qui vous convient — modifiable plus tard.', 'Wähle, was passt — später änderbar.'],
    s2: ['Your details', 'Dine oplysninger', 'Tietosi', 'Tus datos', 'Dine opplysninger', 'Dina uppgifter', 'Vos informations', 'Deine Angaben'],
    s2s: ['Just a name, email and password.', 'Kun navn, e-mail og adgangskode.', 'Vain nimi, sähköposti ja salasana.', 'Solo nombre, correo y contraseña.', 'Bare navn, e-post og passord.', 'Bara namn, e-post och lösenord.', 'Juste un nom, un e-mail et un mot de passe.', 'Nur Name, E-Mail und Passwort.'],
    bank_t: ['Banking', 'Bank', 'Pankki', 'Banca', 'Bank', 'Bank', 'Banque', 'Banking'],
    bank_d: ['Card, IBAN and exchange — everyday money plus crypto.', 'Kort, IBAN og veksling — hverdagspenge plus krypto.', 'Kortti, IBAN ja vaihto — arkiraha ja krypto.', 'Tarjeta, IBAN y cambio: dinero diario y cripto.', 'Kort, IBAN og veksling — hverdagspenger og krypto.', 'Kort, IBAN och växling — vardagspengar och krypto.', 'Carte, IBAN et échange — argent du quotidien et crypto.', 'Karte, IBAN und Tausch — Alltagsgeld plus Krypto.'],
    exch_t: ['Exchange', 'Exchange', 'Pörssi', 'Exchange', 'Exchange', 'Exchange', 'Exchange', 'Exchange'],
    exch_d: ['Crypto trading only — fast buys, sells and swaps.', 'Kun kryptohandel — hurtige køb, salg og swaps.', 'Vain kryptokauppa — nopeat ostot, myynnit ja vaihdot.', 'Solo trading cripto: compras, ventas y swaps rápidos.', 'Kun kryptohandel — raske kjøp, salg og swaps.', 'Endast kryptohandel — snabba köp, sälj och swaps.', 'Trading crypto uniquement — achats, ventes et swaps rapides.', 'Nur Krypto-Handel — schnelles Kaufen, Verkaufen, Tauschen.'],
    note: ['Your choice is a preference — our team confirms the final type after verification.', 'Dit valg er en præference — vores team bekræfter den endelige type efter verificering.', 'Valintasi on toive — tiimimme vahvistaa lopullisen tyypin tarkistuksen jälkeen.', 'Tu elección es una preferencia: nuestro equipo confirma el tipo final tras la verificación.', 'Valget ditt er en preferanse — teamet vårt bekrefter endelig type etter verifisering.', 'Ditt val är en preferens — vårt team bekräftar slutlig typ efter verifiering.', 'Votre choix est une préférence — notre équipe confirme le type final après vérification.', 'Deine Wahl ist eine Präferenz — unser Team bestätigt den endgültigen Typ nach der Prüfung.'],
    name_ph: ['Full name', 'Fulde navn', 'Koko nimi', 'Nombre completo', 'Fullt navn', 'Fullständigt namn', 'Nom complet', 'Vollständiger Name'],
    email_ph: ['Email', 'E-mail', 'Sähköposti', 'Correo', 'E-post', 'E-post', 'E-mail', 'E-Mail'],
    pass_ph: ['Password', 'Adgangskode', 'Salasana', 'Contraseña', 'Passord', 'Lösenord', 'Mot de passe', 'Passwort'],
    pass2_ph: ['Confirm password', 'Bekræft adgangskode', 'Vahvista salasana', 'Confirmar contraseña', 'Bekreft passord', 'Bekräfta lösenord', 'Confirmer le mot de passe', 'Passwort bestätigen'],
    ref: ['Have a referral code?', 'Har du en henvisningskode?', 'Onko sinulla suosittelukoodi?', '¿Tienes un código de referido?', 'Har du en vervekode?', 'Har du en värvningskod?', 'Vous avez un code de parrainage ?', 'Hast du einen Empfehlungscode?'],
    ref_ph: ['Referral code', 'Henvisningskode', 'Suosittelukoodi', 'Código de referido', 'Vervekode', 'Värvningskod', 'Code de parrainage', 'Empfehlungscode'],
    cont: ['Continue', 'Fortsæt', 'Jatka', 'Continuar', 'Fortsett', 'Fortsätt', 'Continuer', 'Weiter'],
    back: ['Back', 'Tilbage', 'Takaisin', 'Atrás', 'Tilbake', 'Tillbaka', 'Retour', 'Zurück'],
    create: ['Create account', 'Opret konto', 'Luo tili', 'Crear cuenta', 'Opprett konto', 'Skapa konto', 'Créer le compte', 'Konto erstellen'],
    creating: ['Creating...', 'Opretter...', 'Luodaan...', 'Creando...', 'Oppretter...', 'Skapar...', 'Création...', 'Wird erstellt...'],
    have: ['Already have an account?', 'Har du allerede en konto?', 'Onko sinulla jo tili?', '¿Ya tienes una cuenta?', 'Har du allerede en konto?', 'Har du redan ett konto?', 'Vous avez déjà un compte ?', 'Schon ein Konto?'],
    signin: ['Sign in', 'Log ind', 'Kirjaudu', 'Inicia sesión', 'Logg inn', 'Logga in', 'Se connecter', 'Anmelden'],
    show: ['Show', 'Vis', 'Näytä', 'Mostrar', 'Vis', 'Visa', 'Afficher', 'Zeigen'],
    hide: ['Hide', 'Skjul', 'Piilota', 'Ocultar', 'Skjul', 'Dölj', 'Masquer', 'Verbergen'],
    str0: ['Too short', 'For kort', 'Liian lyhyt', 'Muy corta', 'For kort', 'För kort', 'Trop court', 'Zu kurz'],
    str1: ['Weak', 'Svag', 'Heikko', 'Débil', 'Svak', 'Svag', 'Faible', 'Schwach'],
    str2: ['Fair', 'Nogenlunde', 'Kohtalainen', 'Aceptable', 'Grei', 'Okej', 'Moyen', 'Mittel'],
    str3: ['Good', 'God', 'Hyvä', 'Buena', 'God', 'Bra', 'Bon', 'Gut'],
    str4: ['Strong', 'Stærk', 'Vahva', 'Fuerte', 'Sterk', 'Stark', 'Fort', 'Stark'],
    e_name: ['Enter your name', 'Indtast dit navn', 'Anna nimesi', 'Escribe tu nombre', 'Skriv inn navnet ditt', 'Ange ditt namn', 'Saisissez votre nom', 'Gib deinen Namen ein'],
    e_email: ['Enter a valid email', 'Indtast en gyldig e-mail', 'Anna kelvollinen sähköposti', 'Introduce un correo válido', 'Skriv inn en gyldig e-post', 'Ange en giltig e-post', 'Saisissez un e-mail valide', 'Gültige E-Mail eingeben'],
    e_short: ['At least 8 characters', 'Mindst 8 tegn', 'Vähintään 8 merkkiä', 'Al menos 8 caracteres', 'Minst 8 tegn', 'Minst 8 tecken', 'Au moins 8 caractères', 'Mindestens 8 Zeichen'],
    e_match: ['Passwords do not match', 'Adgangskoderne matcher ikke', 'Salasanat eivät täsmää', 'Las contraseñas no coinciden', 'Passordene er ikke like', 'Lösenorden matchar inte', 'Les mots de passe ne correspondent pas', 'Passwörter stimmen nicht überein'],
    step: ['Step', 'Trin', 'Vaihe', 'Paso', 'Trinn', 'Steg', 'Étape', 'Schritt']
  };
  function lang() { try { var l = localStorage.getItem('nc_lang'); return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k) { var a = K[k]; return a ? (a[LG.indexOf(lang())] || a[0]) : k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function vis(e) { return e && getComputedStyle(e).display !== 'none'; }

  function signupMode() { var m = $('mask'); return m && getComputedStyle(m).display !== 'none' && vis($('fTypes')); }

  function css() {
    if ($('rgzCss')) return; var s = document.createElement('style'); s.id = 'rgzCss';
    s.textContent = [
      '.modal.rgz-on > *:not(.x):not(#rgz){display:none!important}',
      '#rgz{animation:rgzIn .25s ease}@keyframes rgzIn{from{opacity:0;transform:translateY(6px)}to{opacity:1}}',
      '#rgz .rgz-pg{display:flex;align-items:center;gap:8px;margin:2px 0 16px}',
      '#rgz .rgz-pg i{height:4px;flex:1;border-radius:99px;background:var(--line2,rgba(255,255,255,.12));transition:.25s}#rgz .rgz-pg i.on{background:linear-gradient(90deg,#a6fbe2,#45cfa8)}',
      '#rgz .rgz-st{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#62c9a8;margin-bottom:6px}',
      '#rgz h3{margin:0 0 4px;font-size:1.5rem;font-weight:760;letter-spacing:-.02em}',
      '#rgz .rgz-sub{margin:0 0 18px;color:var(--mut,#93a79f);font-size:.92rem}',
      '#rgz .rgz-types{display:flex;flex-direction:column;gap:11px;margin-bottom:14px}',
      '#rgz .rgz-type{display:flex;align-items:flex-start;gap:13px;text-align:left;width:100%;padding:16px;border-radius:18px;border:1.5px solid var(--line2,rgba(255,255,255,.12));background:var(--bg,rgba(255,255,255,.02));cursor:pointer;font:inherit;color:inherit;transition:.15s}',
      '#rgz .rgz-type:hover{border-color:rgba(98,232,194,.45)}',
      '#rgz .rgz-type.on{border-color:#45cfa8;background:rgba(98,232,194,.08);box-shadow:0 0 0 3px rgba(98,232,194,.12)}',
      '#rgz .rgz-type .rgz-ti{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(98,232,194,.12);color:#62e8c2}#rgz .rgz-type.on .rgz-ti{background:linear-gradient(140deg,#a6fbe2,#45cfa8);color:#03251b}#rgz .rgz-type .rgz-ti svg{width:22px;height:22px}',
      '#rgz .rgz-type b{display:block;font-size:1rem;font-weight:680;margin-bottom:2px}#rgz .rgz-type small{display:block;font-size:.82rem;color:var(--mut,#93a79f);line-height:1.4}',
      '#rgz .rgz-type .rgz-rd{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid var(--line2,rgba(255,255,255,.2));margin-left:auto;margin-top:3px;display:grid;place-items:center;transition:.15s}#rgz .rgz-type.on .rgz-rd{border-color:#45cfa8}#rgz .rgz-type.on .rgz-rd:after{content:"";width:10px;height:10px;border-radius:50%;background:#45cfa8}',
      '#rgz .rgz-note{font-size:.78rem;color:var(--mut,#8aa39b);line-height:1.5;margin-bottom:16px;display:flex;gap:7px}#rgz .rgz-note svg{width:15px;height:15px;flex:none;margin-top:1px;color:#62c9a8}',
      '#rgz .rgz-f{position:relative;margin-bottom:11px}',
      '#rgz .rgz-f input{width:100%;height:52px;padding:0 18px;border-radius:16px;border:1.5px solid var(--line2,rgba(255,255,255,.12));background:var(--bg,rgba(255,255,255,.02));color:var(--tx,#eef5f2);font:500 .98rem Inter,sans-serif;outline:0;transition:.15s;box-sizing:border-box}',
      '#rgz .rgz-f input:focus{border-color:rgba(98,232,194,.6);box-shadow:0 0 0 4px rgba(98,232,194,.1)}',
      '#rgz .rgz-f input.bad{border-color:#ff6b7a}#rgz .rgz-f input.bad:focus{box-shadow:0 0 0 4px rgba(255,107,122,.12)}',
      '#rgz .rgz-f.pw input{padding-right:62px}',
      '#rgz .rgz-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:var(--mut,#93a79f);font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;padding:6px 8px;border-radius:8px}#rgz .rgz-eye:hover{color:#62e8c2}',
      '#rgz .rgz-hint{font-size:.76rem;margin:-4px 2px 10px;min-height:14px;color:#ff8d9a}#rgz .rgz-hint.ok{color:#62c9a8}',
      '#rgz .rgz-str{display:flex;align-items:center;gap:8px;margin:-4px 2px 11px}',
      '#rgz .rgz-str .rgz-bars{display:flex;gap:4px;flex:1}#rgz .rgz-str .rgz-bars i{height:4px;flex:1;border-radius:99px;background:var(--line2,rgba(255,255,255,.14))}',
      '#rgz .rgz-str .rgz-bars i.s1{background:#ff6b7a}#rgz .rgz-str .rgz-bars i.s2{background:#ffb020}#rgz .rgz-str .rgz-bars i.s3{background:#7dd3a8}#rgz .rgz-str .rgz-bars i.s4{background:#45cfa8}',
      '#rgz .rgz-str span{font-size:.74rem;font-weight:700;color:var(--mut,#93a79f);min-width:52px;text-align:right}',
      '#rgz .rgz-refbtn{background:transparent;border:0;color:#62c9a8;font:inherit;font-weight:650;font-size:.84rem;cursor:pointer;padding:4px 0;margin-bottom:8px}#rgz .rgz-refbtn:hover{text-decoration:underline}',
      '#rgz .rgz-refwrap{display:none}#rgz .rgz-refwrap.on{display:block}',
      '#rgz .rgz-act{display:flex;gap:10px;margin-top:6px}',
      '#rgz .rgz-btn{height:54px;border-radius:16px;border:0;cursor:pointer;font:inherit;font-weight:720;font-size:1rem;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;box-shadow:0 10px 24px rgba(98,232,194,.26);transition:transform .14s,opacity .15s}',
      '#rgz .rgz-btn:hover:not(:disabled){transform:translateY(-1px)}#rgz .rgz-btn:disabled{opacity:.65;cursor:not-allowed}#rgz .rgz-btn svg{width:17px;height:17px}',
      '#rgz .rgz-btn.ghost{flex:0 0 auto;padding:0 20px;background:transparent;color:var(--tx,#cfe);border:1.5px solid var(--line2,rgba(255,255,255,.14));box-shadow:none}',
      '#rgz .rgz-err{display:none;background:rgba(255,107,122,.1);border:1px solid rgba(255,107,122,.25);color:#ff8d9a;border-radius:12px;padding:10px 13px;font-size:.84rem;margin-bottom:12px}#rgz .rgz-err.on{display:block}',
      '#rgz .rgz-sw{text-align:center;margin-top:16px;font-size:.88rem;color:var(--mut,#93a79f)}#rgz .rgz-sw button{background:transparent;border:0;color:#45cfa8;font:inherit;font-weight:700;cursor:pointer}#rgz .rgz-sw button:hover{text-decoration:underline}'
    ].join('');
    document.head.appendChild(s);
  }

  var IC = {
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18"/></svg>',
    exch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h13m0 0l-4-4m4 4l-4 4"/><path d="M17 17H4m0 0l4-4m-4 4l4 4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m0 0-6-6m6 6-6 6"/></svg>'
  };

  var step = 1, acct = 'banking', showPw = false, el = null, busy = false, resetTimer = null;

  function orig(id) { return $(id); }
  function setRadio(v) { try { var r = document.querySelector('input[name="at"][value="' + v + '"]'); if (r) { r.checked = true; } } catch (e) {} }
  function mirror() {
    var n = $('rgzName'), e = $('rgzEmail'), p = $('rgzPass'), p2 = $('rgzPass2'), rf = $('rgzRef');
    if (orig('fName') && n) orig('fName').value = n.value;
    if (orig('fEmail') && e) orig('fEmail').value = e.value;
    if (orig('fPass') && p) orig('fPass').value = p.value;
    if (orig('fPass2') && p2) orig('fPass2').value = p2.value;
    if (orig('fRef') && rf) orig('fRef').value = rf.value;
    setRadio(acct);
  }

  function setBusy(on) {
    busy = !!on;
    clearTimeout(resetTimer);
    var sb = el && el.querySelector('[data-rgz="submit"]');
    if (sb) {
      sb.disabled = busy;
      sb.innerHTML = busy ? esc(T('creating')) : (esc(T('create')) + IC.arrow);
    }
    if (busy) {
      resetTimer = setTimeout(function () { setBusy(false); }, 10000);
    }
  }

  function strength(pw) { var s = 0; if (pw.length >= 8) s++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++; if (pw.length < 8) s = Math.min(s, 1); return s; }
  function updStrength() {
    var p = $('rgzPass'); if (!p) return; var sc = strength(p.value); var bars = el.querySelectorAll('.rgz-bars i'); var lbl = el.querySelector('.rgz-str span');
    for (var i = 0; i < bars.length; i++) { bars[i].className = i < sc ? 's' + sc : ''; }
    if (lbl) lbl.textContent = p.value ? T(p.value.length < 8 ? 'str0' : 'str' + Math.max(1, sc)) : '';
  }

  function valid(showErr) {
    var n = $('rgzName'), e = $('rgzEmail'), p = $('rgzPass'), p2 = $('rgzPass2');
    var hints = { name: '', email: '', pass: '', pass2: '' }; var ok = true;
    if (!n.value.trim()) { hints.name = T('e_name'); ok = false; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.value.trim())) { hints.email = T('e_email'); ok = false; }
    if (p.value.length < 8) { hints.pass = T('e_short'); ok = false; }
    if (p2.value !== p.value || !p2.value) { hints.pass2 = T('e_match'); ok = false; }
    if (showErr) {
      [['rgzName', 'hName', hints.name], ['rgzEmail', 'hEmail', hints.email], ['rgzPass', 'hPass', hints.pass], ['rgzPass2', 'hPass2', hints.pass2]].forEach(function (x) {
        var inp = $(x[0]), h = $(x[1]); if (inp) inp.classList.toggle('bad', !!x[2]); if (h) h.textContent = x[2] || '';
      });
    }
    return ok;
  }

  function render() {
    if (!el) return;
    el.innerHTML =
      '<div class="rgz-pg"><i class="on"></i><i' + (step === 2 ? ' class="on"' : '') + '></i></div>' +
      '<div class="rgz-st">' + esc(T('step')) + ' ' + step + '/2</div>' +
      (step === 1 ? step1() : step2());
  }
  function step1() {
    function card(id, t, d) {
      return '<button type="button" class="rgz-type' + (acct === id ? ' on' : '') + '" data-rgz-type="' + id + '">' +
        '<span class="rgz-ti">' + (id === 'banking' ? IC.bank : IC.exch) + '</span>' +
        '<span style="flex:1"><b>' + esc(t) + '</b><small>' + esc(d) + '</small></span><span class="rgz-rd"></span></button>';
    }
    return '<h3>' + esc(T('s1')) + '</h3><p class="rgz-sub">' + esc(T('s1s')) + '</p>' +
      '<div class="rgz-types">' + card('banking', T('bank_t'), T('bank_d')) + card('exchange', T('exch_t'), T('exch_d')) + '</div>' +
      '<div class="rgz-note">' + IC.info + '<span>' + esc(T('note')) + '</span></div>' +
      '<div class="rgz-act"><button type="button" class="rgz-btn" data-rgz="next">' + esc(T('cont')) + IC.arrow + '</button></div>' +
      sw();
  }
  function step2() {
    var refVal = (orig('fRef') && orig('fRef').value) || '';
    return '<h3>' + esc(T('s2')) + '</h3><p class="rgz-sub">' + esc(T('s2s')) + '</p>' +
      '<div class="rgz-err" id="rgzErr"></div>' +
      '<div class="rgz-f"><input id="rgzName" autocomplete="name" placeholder="' + esc(T('name_ph')) + '" value="' + esc(orig('fName') ? orig('fName').value : '') + '"></div><div class="rgz-hint" id="hName"></div>' +
      '<div class="rgz-f"><input id="rgzEmail" type="email" autocomplete="email" placeholder="' + esc(T('email_ph')) + '" value="' + esc(orig('fEmail') ? orig('fEmail').value : '') + '"></div><div class="rgz-hint" id="hEmail"></div>' +
      '<div class="rgz-f pw"><input id="rgzPass" type="' + (showPw ? 'text' : 'password') + '" autocomplete="new-password" placeholder="' + esc(T('pass_ph')) + '"><button type="button" class="rgz-eye" data-rgz="eye">' + esc(showPw ? T('hide') : T('show')) + '</button></div>' +
      '<div class="rgz-str"><div class="rgz-bars"><i></i><i></i><i></i><i></i></div><span></span></div><div class="rgz-hint" id="hPass"></div>' +
      '<div class="rgz-f pw"><input id="rgzPass2" type="' + (showPw ? 'text' : 'password') + '" autocomplete="new-password" placeholder="' + esc(T('pass2_ph')) + '"></div><div class="rgz-hint" id="hPass2"></div>' +
      '<button type="button" class="rgz-refbtn" data-rgz="reftog">' + esc(T('ref')) + '</button>' +
      '<div class="rgz-refwrap' + (refVal ? ' on' : '') + '" id="rgzRefWrap"><div class="rgz-f"><input id="rgzRef" autocomplete="off" maxlength="12" placeholder="' + esc(T('ref_ph')) + '" value="' + esc(refVal) + '" style="text-transform:uppercase"></div></div>' +
      '<div class="rgz-act"><button type="button" class="rgz-btn ghost" data-rgz="back">' + esc(T('back')) + '</button><button type="button" class="rgz-btn" data-rgz="submit">' + esc(T('create')) + IC.arrow + '</button></div>' +
      sw();
  }
  function sw() { return '<div class="rgz-sw">' + esc(T('have')) + ' <button type="button" data-rgz="signin">' + esc(T('signin')) + '</button></div>'; }

  function onClick(e) {
    var tcard = e.target.closest && e.target.closest('[data-rgz-type]');
    if (tcard) { acct = tcard.getAttribute('data-rgz-type'); setRadio(acct); render(); return; }
    var b = e.target.closest && e.target.closest('[data-rgz]'); if (!b) return;
    var k = b.getAttribute('data-rgz');
    if (k === 'next') { step = 2; render(); setTimeout(function () { var n = $('rgzName'); if (n && !n.value) n.focus(); }, 30); return; }
    if (k === 'back') { setBusy(false); mirror(); step = 1; render(); return; }
    if (k === 'eye') { mirror(); showPw = !showPw; render(); return; }
    if (k === 'reftog') { var w = $('rgzRefWrap'); if (w) { w.classList.toggle('on'); var i = $('rgzRef'); if (i && w.classList.contains('on')) i.focus(); } return; }
    if (k === 'signin') { setBusy(false); mirror(); var swBtn = $('mSwBtn'); if (swBtn) swBtn.click(); return; }
    if (k === 'submit') {
      if (busy) return;
      mirror();
      showErr('');
      if (!valid(true)) { var first = el.querySelector('.rgz-f input.bad'); if (first) first.focus(); return; }
      setBusy(true);
      var f = $('mForm');
      if (f && f.requestSubmit) f.requestSubmit();
      else { var ms = $('mSubmit'); if (ms) ms.click(); }
    }
  }
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === 'rgzPass') updStrength();
    if (id && /^rgz(Name|Email|Pass|Pass2|Ref)$/.test(id)) { mirror(); e.target.classList.remove('bad'); var map = { rgzName: 'hName', rgzEmail: 'hEmail', rgzPass: 'hPass', rgzPass2: 'hPass2' }; if (map[id]) { var h = $(map[id]); if (h) h.textContent = ''; } }
  }

  function showErr(msg) {
    setBusy(false);
    var e = $('rgzErr');
    if (e) { e.textContent = msg; e.classList.toggle('on', !!msg); }
  }

  function activate() {
    var modal = document.querySelector('#mask .modal'); if (!modal) return;
    css();
    if (!el) {
      el = document.createElement('div');
      el.id = 'rgz';
      el.addEventListener('click', onClick);
      el.addEventListener('input', onInput);
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && step === 2) {
          ev.preventDefault();
          var sb = el.querySelector('[data-rgz="submit"]');
          if (sb) sb.click();
        }
      });
    }
    if (el.parentNode !== modal) modal.appendChild(el);
    modal.classList.add('rgz-on');
    setBusy(false);
    render();
    updStrength();
  }
  function deactivate() { setBusy(false); var modal = document.querySelector('#mask .modal'); if (modal) modal.classList.remove('rgz-on'); }

  function watchErr() {
    var me = $('mErr'); if (!me) return;
    new MutationObserver(function () {
      if (!document.querySelector('.modal.rgz-on')) return;
      var shown = getComputedStyle(me).display !== 'none' && me.textContent.trim();
      if (shown) {
        if (step !== 2) { step = 2; render(); }
        showErr(me.textContent.trim());
      }
    }).observe(me, { childList: true, attributes: true, subtree: true, characterData: true });
  }

  function tick() {
    var su = signupMode();
    if (su && !document.querySelector('.modal.rgz-on')) { step = 1; activate(); }
    else if (!su && document.querySelector('.modal.rgz-on')) deactivate();
  }

  function boot() { watchErr(); setInterval(tick, 300); tick(); window.addEventListener('nc-lang', function () { if (document.querySelector('.modal.rgz-on')) render(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
