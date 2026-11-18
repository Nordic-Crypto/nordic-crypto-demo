/* NordicCrypto — nc-pro.js v1
   NC loyalty points, redesigned. One ledger on the server (same balance on every device), a 7-day streak you collect
   yourself (no automatic "+5 NC" pop-ups any more), missions checked against the real account, history and invites.
   Header chip with the NC coin + level, full rewards window in 8 languages, dark and light theme.
   Replaces bonus-system.js + bonus-ui.js (a small NC_BONUS shim stays for older code). */
(function () {
  'use strict';
  if (window.__ncPro) return; window.__ncPro = 1;

  /* ───────── language ───────── */
  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var K = {
    title: ['NC Rewards', 'NC-belønninger', 'NC-palkinnot', 'Recompensas NC', 'NC-belønninger', 'NC-belöningar', 'Récompenses NC', 'NC-Prämien'],
    sub: ['Loyalty points for using Nordic Crypto', 'Loyalitetspoint for at bruge Nordic Crypto', 'Kanta-asiakaspisteitä Nordic Crypton käytöstä', 'Puntos de fidelidad por usar Nordic Crypto', 'Lojalitetspoeng for å bruke Nordic Crypto', 'Lojalitetspoäng för att använda Nordic Crypto', 'Points de fidélité pour l’utilisation de Nordic Crypto', 'Treuepunkte für die Nutzung von Nordic Crypto'],
    bal: ['Your balance', 'Din saldo', 'Saldosi', 'Tu saldo', 'Din saldo', 'Ditt saldo', 'Votre solde', 'Ihr Guthaben'],
    toLvl: ['{n} NC to {l}', '{n} NC til {l}', '{n} NC tasoon {l}', '{n} NC para {l}', '{n} NC til {l}', '{n} NC till {l}', '{n} NC avant {l}', '{n} NC bis {l}'],
    topLvl: ['Highest level reached', 'Højeste niveau nået', 'Korkein taso saavutettu', 'Nivel máximo alcanzado', 'Høyeste nivå nådd', 'Högsta nivån nådd', 'Niveau maximal atteint', 'Höchste Stufe erreicht'],
    lifetime: ['{n} NC earned in total', '{n} NC optjent i alt', '{n} NC ansaittu yhteensä', '{n} NC ganados en total', '{n} NC opptjent totalt', '{n} NC intjänat totalt', '{n} NC gagnés au total', '{n} NC insgesamt verdient'],
    L0: ['Bronze', 'Bronze', 'Pronssi', 'Bronce', 'Bronse', 'Brons', 'Bronze', 'Bronze'],
    L1: ['Silver', 'Sølv', 'Hopea', 'Plata', 'Sølv', 'Silver', 'Argent', 'Silber'],
    L2: ['Gold', 'Guld', 'Kulta', 'Oro', 'Gull', 'Guld', 'Or', 'Gold'],
    L3: ['Platinum', 'Platin', 'Platina', 'Platino', 'Platina', 'Platina', 'Platine', 'Platin'],
    tDaily: ['Daily', 'Daglig', 'Päivittäin', 'Diario', 'Daglig', 'Dagligen', 'Quotidien', 'Täglich'],
    tMis: ['Missions', 'Opgaver', 'Tehtävät', 'Misiones', 'Oppdrag', 'Uppdrag', 'Missions', 'Aufgaben'],
    tHist: ['History', 'Historik', 'Historia', 'Historial', 'Historikk', 'Historik', 'Historique', 'Verlauf'],
    tInv: ['Invite', 'Inviter', 'Kutsu', 'Invitar', 'Inviter', 'Bjud in', 'Inviter', 'Einladen'],
    dailyT: ['Daily streak', 'Daglig stime', 'Päiväputki', 'Racha diaria', 'Daglig rekke', 'Daglig svit', 'Série quotidienne', 'Tägliche Serie'],
    dailyS: ['Come back every day — the reward grows up to 50 NC on day 7.', 'Kom tilbage hver dag — belønningen vokser op til 50 NC på dag 7.', 'Palaa joka päivä — palkinto kasvaa 50 NC:hen 7. päivänä.', 'Vuelve cada día: la recompensa crece hasta 50 NC el día 7.', 'Kom tilbake hver dag — belønningen vokser til 50 NC på dag 7.', 'Kom tillbaka varje dag — belöningen växer till 50 NC dag 7.', 'Revenez chaque jour : la récompense monte jusqu’à 50 NC le 7e jour.', 'Kommen Sie täglich zurück — die Prämie steigt bis 50 NC am 7. Tag.'],
    day: ['Day {n}', 'Dag {n}', 'Päivä {n}', 'Día {n}', 'Dag {n}', 'Dag {n}', 'Jour {n}', 'Tag {n}'],
    collect: ['Collect +{n} NC', 'Hent +{n} NC', 'Lunasta +{n} NC', 'Recoger +{n} NC', 'Hent +{n} NC', 'Hämta +{n} NC', 'Récupérer +{n} NC', '+{n} NC abholen'],
    nextIn: ['Next reward in {t}', 'Næste belønning om {t}', 'Seuraava palkinto {t} kuluttua', 'Próxima recompensa en {t}', 'Neste belønning om {t}', 'Nästa belöning om {t}', 'Prochaine récompense dans {t}', 'Nächste Prämie in {t}'],
    streak: ['{n}-day streak', '{n} dage i træk', '{n} päivän putki', 'Racha de {n} días', '{n} dager på rad', '{n} dagar i rad', 'Série de {n} jours', '{n} Tage in Folge'],
    broken: ['Your streak started again — collect today to keep it going.', 'Din stime startede forfra — hent i dag for at holde den kørende.', 'Putkesi alkoi alusta — lunasta tänään jatkaaksesi.', 'Tu racha volvió a empezar: recoge hoy para mantenerla.', 'Rekken din startet på nytt — hent i dag for å holde den gående.', 'Din svit började om — hämta i dag för att hålla den igång.', 'Votre série a recommencé : récupérez aujourd’hui pour la poursuivre.', 'Ihre Serie hat neu begonnen — holen Sie heute ab, um sie fortzusetzen.'],
    keep: ['Miss a day and the streak starts again.', 'Springer du en dag over, starter stimen forfra.', 'Jos väliin jää päivä, putki alkaa alusta.', 'Si te saltas un día, la racha vuelve a empezar.', 'Hopper du over en dag, starter rekken på nytt.', 'Missar du en dag börjar svitet om.', 'Si vous manquez un jour, la série recommence.', 'Wenn Sie einen Tag auslassen, beginnt die Serie neu.'],
    claim: ['Claim', 'Hent', 'Lunasta', 'Recoger', 'Hent', 'Hämta', 'Récupérer', 'Abholen'],
    go: ['Go', 'Gå', 'Siirry', 'Ir', 'Gå', 'Gå', 'Aller', 'Los'],
    done: ['Done', 'Færdig', 'Valmis', 'Hecho', 'Ferdig', 'Klart', 'Fait', 'Erledigt'],
    m_deposit: ['Make your first deposit', 'Lav din første indbetaling', 'Tee ensimmäinen talletus', 'Haz tu primer depósito', 'Gjør ditt første innskudd', 'Gör din första insättning', 'Effectuez votre premier dépôt', 'Erste Einzahlung tätigen'],
    d_deposit: ['Add money to your account', 'Sæt penge ind på din konto', 'Lisää rahaa tilillesi', 'Añade dinero a tu cuenta', 'Sett inn penger på kontoen', 'Sätt in pengar på ditt konto', 'Ajoutez de l’argent sur votre compte', 'Geld auf Ihr Konto einzahlen'],
    m_trade: ['Make your first trade', 'Lav din første handel', 'Tee ensimmäinen kauppa', 'Haz tu primera operación', 'Gjør din første handel', 'Gör din första affär', 'Effectuez votre premier échange', 'Ersten Trade ausführen'],
    d_trade: ['Buy or exchange any crypto', 'Køb eller veksl krypto', 'Osta tai vaihda kryptoa', 'Compra o cambia cualquier cripto', 'Kjøp eller veksle krypto', 'Köp eller växla krypto', 'Achetez ou échangez une crypto', 'Krypto kaufen oder tauschen'],
    m_withdraw: ['Make your first withdrawal', 'Lav din første udbetaling', 'Tee ensimmäinen nosto', 'Haz tu primer retiro', 'Gjør ditt første uttak', 'Gör ditt första uttag', 'Effectuez votre premier retrait', 'Erste Auszahlung tätigen'],
    d_withdraw: ['Send money to your bank or wallet', 'Send penge til din bank eller wallet', 'Lähetä rahaa pankkiin tai lompakkoon', 'Envía dinero a tu banco o billetera', 'Send penger til banken eller lommeboken', 'Skicka pengar till din bank eller plånbok', 'Envoyez de l’argent vers votre banque ou portefeuille', 'Geld an Bank oder Wallet senden'],
    m_twofa: ['Turn on two-factor sign-in', 'Slå totrinslogin til', 'Ota kaksivaiheinen kirjautuminen käyttöön', 'Activa el inicio de sesión en dos pasos', 'Slå på tofaktor-pålogging', 'Slå på tvåstegsinloggning', 'Activez la connexion à deux facteurs', 'Zwei-Faktor-Anmeldung aktivieren'],
    d_twofa: ['Extra protection for your account', 'Ekstra beskyttelse af din konto', 'Lisäsuoja tilillesi', 'Protección extra para tu cuenta', 'Ekstra beskyttelse av kontoen', 'Extra skydd för ditt konto', 'Une protection en plus pour votre compte', 'Zusätzlicher Schutz für Ihr Konto'],
    m_kyc: ['Verify your identity', 'Bekræft din identitet', 'Vahvista henkilöllisyytesi', 'Verifica tu identidad', 'Bekreft identiteten din', 'Verifiera din identitet', 'Vérifiez votre identité', 'Identität bestätigen'],
    d_kyc: ['Unlock every feature', 'Lås op for alle funktioner', 'Avaa kaikki ominaisuudet', 'Desbloquea todas las funciones', 'Lås opp alle funksjoner', 'Lås upp alla funktioner', 'Débloquez toutes les fonctions', 'Alle Funktionen freischalten'],
    m_avatar: ['Add a profile photo', 'Tilføj et profilbillede', 'Lisää profiilikuva', 'Añade una foto de perfil', 'Legg til et profilbilde', 'Lägg till en profilbild', 'Ajoutez une photo de profil', 'Profilfoto hinzufügen'],
    d_avatar: ['Make the account feel like yours', 'Gør kontoen til din egen', 'Tee tilistä omannäköisesi', 'Haz que la cuenta sea tuya', 'Gjør kontoen til din egen', 'Gör kontot till ditt eget', 'Personnalisez votre compte', 'Machen Sie das Konto zu Ihrem'],
    m_invite: ['Invite a friend', 'Inviter en ven', 'Kutsu ystävä', 'Invita a un amigo', 'Inviter en venn', 'Bjud in en vän', 'Invitez un ami', 'Freund einladen'],
    d_invite: ['{n} NC for every friend who joins and qualifies', '{n} NC for hver ven, der tilmelder sig og kvalificerer sig', '{n} NC jokaisesta liittyvästä ja ehdot täyttävästä ystävästä', '{n} NC por cada amigo que se une y cumple los requisitos', '{n} NC for hver venn som blir med og kvalifiserer seg', '{n} NC för varje vän som går med och kvalificerar sig', '{n} NC par ami inscrit et éligible', '{n} NC für jeden Freund, der beitritt und sich qualifiziert'],
    h_daily: ['Daily reward · day {n}', 'Daglig belønning · dag {n}', 'Päivän palkinto · päivä {n}', 'Recompensa diaria · día {n}', 'Daglig belønning · dag {n}', 'Daglig belöning · dag {n}', 'Récompense du jour · jour {n}', 'Tagesprämie · Tag {n}'],
    h_welcome: ['Welcome bonus', 'Velkomstbonus', 'Tervetuliaisbonus', 'Bono de bienvenida', 'Velkomstbonus', 'Välkomstbonus', 'Bonus de bienvenue', 'Willkommensbonus'],
    h_import: ['Points collected earlier', 'Point optjent tidligere', 'Aiemmin kerätyt pisteet', 'Puntos acumulados antes', 'Poeng samlet tidligere', 'Poäng samlade tidigare', 'Points cumulés auparavant', 'Früher gesammelte Punkte'],
    h_invite: ['Friends invited ×{n}', 'Venner inviteret ×{n}', 'Kutsutut ystävät ×{n}', 'Amigos invitados ×{n}', 'Venner invitert ×{n}', 'Inbjudna vänner ×{n}', 'Amis invités ×{n}', 'Eingeladene Freunde ×{n}'],
    noHist: ['No points yet — collect your first daily reward.', 'Ingen point endnu — hent din første daglige belønning.', 'Ei vielä pisteitä — lunasta ensimmäinen päivän palkinto.', 'Aún no hay puntos: recoge tu primera recompensa diaria.', 'Ingen poeng ennå — hent din første daglige belønning.', 'Inga poäng än — hämta din första dagliga belöning.', 'Pas encore de points : récupérez votre première récompense du jour.', 'Noch keine Punkte — holen Sie Ihre erste Tagesprämie ab.'],
    invT: ['Your invite link', 'Dit invitationslink', 'Kutsulinkkisi', 'Tu enlace de invitación', 'Invitasjonslenken din', 'Din inbjudningslänk', 'Votre lien d’invitation', 'Ihr Einladungslink'],
    invS: ['When a friend joins with your link and qualifies, you get {n} NC.', 'Når en ven tilmelder sig via dit link og kvalificerer sig, får du {n} NC.', 'Kun ystävä liittyy linkilläsi ja täyttää ehdot, saat {n} NC.', 'Cuando un amigo se une con tu enlace y cumple los requisitos, recibes {n} NC.', 'Når en venn blir med via lenken din og kvalifiserer seg, får du {n} NC.', 'När en vän går med via din länk och kvalificerar sig får du {n} NC.', 'Quand un ami s’inscrit avec votre lien et est éligible, vous recevez {n} NC.', 'Wenn ein Freund über Ihren Link beitritt und sich qualifiziert, erhalten Sie {n} NC.'],
    code: ['Code', 'Kode', 'Koodi', 'Código', 'Kode', 'Kod', 'Code', 'Code'],
    copyLink: ['Copy link', 'Kopiér link', 'Kopioi linkki', 'Copiar enlace', 'Kopier lenke', 'Kopiera länk', 'Copier le lien', 'Link kopieren'],
    share: ['Share', 'Del', 'Jaa', 'Compartir', 'Del', 'Dela', 'Partager', 'Teilen'],
    copied: ['Copied ✓', 'Kopieret ✓', 'Kopioitu ✓', 'Copiado ✓', 'Kopiert ✓', 'Kopierat ✓', 'Copié ✓', 'Kopiert ✓'],
    friends: ['Invited friends', 'Inviterede venner', 'Kutsutut ystävät', 'Amigos invitados', 'Inviterte venner', 'Inbjudna vänner', 'Amis invités', 'Eingeladene Freunde'],
    noFriends: ['No friends invited yet.', 'Ingen venner inviteret endnu.', 'Ei vielä kutsuttuja ystäviä.', 'Aún no has invitado a nadie.', 'Ingen venner invitert ennå.', 'Inga vänner inbjudna än.', 'Aucun ami invité pour l’instant.', 'Noch keine Freunde eingeladen.'],
    joined: ['Joined', 'Tilmeldt', 'Liittynyt', 'Registrado', 'Registrert', 'Registrerad', 'Inscrit', 'Beigetreten'],
    qualified: ['Qualified', 'Kvalificeret', 'Ehdot täytetty', 'Cumple requisitos', 'Kvalifisert', 'Kvalificerad', 'Éligible', 'Qualifiziert'],
    what: ['NC are loyalty points with no cash value. Collect them to reach higher levels.', 'NC er loyalitetspoint uden kontantværdi. Saml dem for at nå højere niveauer.', 'NC ovat kanta-asiakaspisteitä ilman rahallista arvoa. Kerää niitä noustaksesi tasoissa.', 'Los NC son puntos de fidelidad sin valor monetario. Acumúlalos para subir de nivel.', 'NC er lojalitetspoeng uten kontantverdi. Samle dem for å nå høyere nivåer.', 'NC är lojalitetspoäng utan kontantvärde. Samla dem för att nå högre nivåer.', 'Les NC sont des points de fidélité sans valeur monétaire. Cumulez-les pour monter de niveau.', 'NC sind Treuepunkte ohne Geldwert. Sammeln Sie sie, um höhere Stufen zu erreichen.'],
    close: ['Close', 'Luk', 'Sulje', 'Cerrar', 'Lukk', 'Stäng', 'Fermer', 'Schließen'],
    chipT: ['Your NC rewards', 'Dine NC-belønninger', 'NC-palkintosi', 'Tus recompensas NC', 'Dine NC-belønninger', 'Dina NC-belöningar', 'Vos récompenses NC', 'Ihre NC-Prämien'],
    ready: ['Ready to collect', 'Klar til at hente', 'Valmis lunastettavaksi', 'Listo para recoger', 'Klar til å hentes', 'Redo att hämtas', 'Prêt à récupérer', 'Bereit zum Abholen'],
    err: ['Could not load your rewards. Please try again.', 'Kunne ikke hente dine belønninger. Prøv igen.', 'Palkintoja ei voitu ladata. Yritä uudelleen.', 'No se pudieron cargar tus recompensas. Inténtalo de nuevo.', 'Kunne ikke laste belønningene. Prøv igjen.', 'Det gick inte att läsa in dina belöningar. Försök igen.', 'Impossible de charger vos récompenses. Réessayez.', 'Prämien konnten nicht geladen werden. Bitte erneut versuchen.'],
    retry: ['Try again', 'Prøv igen', 'Yritä uudelleen', 'Reintentar', 'Prøv igjen', 'Försök igen', 'Réessayer', 'Erneut versuchen']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k]; if (!a) return k; var s = a[LG.indexOf(lang())] || a[0]; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  var LOC = { en: 'en-GB', da: 'da-DK', fi: 'fi-FI', es: 'es-ES', no: 'nb-NO', sv: 'sv-SE', fr: 'fr-FR', de: 'de-DE' };
  function num(n) { try { return new Intl.NumberFormat(LOC[lang()]).format(n); } catch (e) { return String(n); } }
  function dt(ts) { try { return new Intl.DateTimeFormat(LOC[lang()], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)); } catch (e) { return new Date(ts).toLocaleString(); } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function isClient() { try { return !!tok() && localStorage.getItem('user_role') !== 'admin' && !window.adminViewingEmail; } catch (e) { return false; } }
  function wurl() { return window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev'; }
  function post(action, body) { return fetch(wurl() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, body || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }); }
  function localDay(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* ───────── levels ───────── */
  var LV = [{ k: 'L0', min: 0, c1: '#f0b68a', c2: '#a8653a' }, { k: 'L1', min: 500, c1: '#eef2f6', c2: '#8a96a4' }, { k: 'L2', min: 2000, c1: '#ffe39a', c2: '#c8921a' }, { k: 'L3', min: 5000, c1: '#e8fff8', c2: '#7fd8c0' }];
  function level(life) { var i = 0; for (var j = 0; j < LV.length; j++) if (life >= LV[j].min) i = j; return { i: i, cur: LV[i], next: LV[i + 1] || null }; }

  /* ───────── the NC coin ───────── */
  var cid = 0;
  function coin(size, cls) {
    var i = ++cid;
    return '<svg class="' + (cls || 'ncp-coin') + '" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true"><defs>' +
      '<linearGradient id="ncg' + i + 'a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#f3c85a"/><stop offset=".7" stop-color="#c88f1d"/><stop offset="1" stop-color="#8a5a0c"/></linearGradient>' +
      '<linearGradient id="ncg' + i + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3a33"/><stop offset="1" stop-color="#0a1714"/></linearGradient>' +
      '<linearGradient id="ncg' + i + 'c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8ffe9"/><stop offset=".5" stop-color="#62e8c2"/><stop offset="1" stop-color="#2fb48f"/></linearGradient>' +
      '<radialGradient id="ncg' + i + 'd" cx=".3" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="32" cy="34" r="29" fill="#5a3a06" opacity=".55"/>' +
      '<circle cx="32" cy="32" r="29" fill="url(#ncg' + i + 'a)"/>' +
      '<circle cx="32" cy="32" r="25.5" fill="none" stroke="#7a4f0a" stroke-opacity=".45" stroke-width="1"/>' +
      '<g fill="#fff6d6" opacity=".55">' + (function () { var s = ''; for (var k = 0; k < 24; k++) { var a = k * 15 * Math.PI / 180; s += '<circle cx="' + (32 + Math.cos(a) * 27.2).toFixed(2) + '" cy="' + (32 + Math.sin(a) * 27.2).toFixed(2) + '" r=".7"/>'; } return s; })() + '</g>' +
      '<circle cx="32" cy="32" r="22" fill="url(#ncg' + i + 'b)"/>' +
      '<circle cx="32" cy="32" r="22" fill="none" stroke="#f3c85a" stroke-opacity=".6" stroke-width="1"/>' +
      '<path d="M22.5 43V21h4.6l10.6 14.4V21h4.8v22h-4.5L27.3 28.6V43z" fill="url(#ncg' + i + 'c)"/>' +
      '<path d="M22.5 43V21h4.6l10.6 14.4V21h4.8v22h-4.5L27.3 28.6V43z" fill="none" stroke="#04241b" stroke-opacity=".35" stroke-width=".6"/>' +
      '<circle cx="32" cy="32" r="29" fill="url(#ncg' + i + 'd)"/></svg>';
  }
  window.NCCoin = coin;

  /* ───────── icons ───────── */
  var P = {
    x: '<path d="M6 6l12 12M18 6 6 18"/>', ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M12 9v11M12 9c-1.5-3-5-3.5-5-1.2C7 9 9.5 9 12 9zm0 0c1.5-3 5-3.5 5-1.2C17 9 14.5 9 12 9z"/>',
    fire: '<path d="M12 21c-3.9 0-7-2.9-7-6.6 0-2.7 1.6-4.6 3.3-6.3.4 1.6 1.3 2.6 2.5 3.1-.3-3.2 1-6 3.7-8.2.2 2.7 1.4 4.3 3 6 1.4 1.5 2.5 3.1 2.5 5.4 0 3.7-3.1 6.6-8 6.6z"/>',
    dep: '<path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14"/>', trade: '<path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3"/>', wd: '<path d="M12 20V8m0 0-5 5m5-5 5 5M5 4h14"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', id: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16.5c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14 10h4M14 13.5h3"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4"/>', inv: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3.1 3.2-4.7 6-4.7s5.1 1.6 6 4.7M17 8v6M14 11h6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', cp: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/>'
  };
  function ic(n, c) { return '<svg class="' + (c || 'ncp-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }
  var MIC = { deposit: 'dep', trade: 'trade', withdraw: 'wd', twofa: 'lock', kyc: 'id', avatar: 'user', invite: 'inv' };

  /* ───────── styles ───────── */
  function css() {
    if ($('ncpCss')) return; var s = document.createElement('style'); s.id = 'ncpCss';
    s.textContent =
/* header chip */
'#ncChip{position:relative;display:inline-flex!important;align-items:center;gap:8px;height:40px!important;padding:0 6px 0 5px;border-radius:999px;cursor:pointer;font:inherit;color:#f6e7bf;background:linear-gradient(180deg,rgba(243,200,90,.12),rgba(243,200,90,.04));border:1px solid rgba(243,200,90,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:transform .18s,border-color .18s,background .18s;flex:none;-webkit-tap-highlight-color:transparent}' +
'#ncChip:hover{transform:translateY(-1px);border-color:rgba(243,200,90,.5)}#ncChip:active{transform:scale(.97)}' +
'#ncChip .ncp-coin{width:28px;height:28px;flex:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}#ncChip b{font-weight:750;font-size:13.5px;line-height:1;font-family:inherit;letter-spacing:.01em;font-variant-numeric:tabular-nums;color:#fff3cf}#ncChip b small{font-size:10.5px;font-weight:700;color:#d9b45a;margin-left:3px;letter-spacing:.06em}' +
'#ncChip .np-lv{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:99px;font-weight:700;font-size:11.5px;line-height:1;font-family:inherit;color:#1a1204;background:linear-gradient(135deg,var(--l1),var(--l2));box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}' +
'#ncChip .np-dot{position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;background:#62e8c2;border:2px solid #0b1012;animation:ncpPing 1.8s infinite}' +
'@keyframes ncpPing{0%{box-shadow:0 0 0 0 rgba(98,232,194,.7)}70%,100%{box-shadow:0 0 0 9px rgba(98,232,194,0)}}' +
'#ncChip.bump .ncp-coin{animation:ncpFlip .9s cubic-bezier(.3,1.4,.5,1)}@keyframes ncpFlip{0%{transform:rotateY(0) scale(1)}40%{transform:rotateY(180deg) scale(1.25)}100%{transform:rotateY(360deg) scale(1)}}' +
'@media (max-width:820px){#ncChip{order:0!important;margin-left:auto!important;margin-right:2px!important}}@media (max-width:420px){#ncChip{width:40px!important;height:40px!important;padding:0!important;justify-content:center;gap:0!important}#ncChip b{display:none}#ncChip .ncp-coin{width:30px!important;height:30px!important}}@media (max-width:640px){#ncChip{height:36px!important;gap:6px;padding:0 9px 0 4px}#ncChip .np-lv{display:none}#ncChip .ncp-coin{width:26px;height:26px}#ncChip b small{display:none}}' +
'html[data-theme="light"] #ncChip{color:#6b4a06;background:linear-gradient(180deg,#fff8e4,#fff);border-color:rgba(194,140,20,.4);box-shadow:0 1px 2px rgba(15,23,42,.06)}html[data-theme="light"] #ncChip b{color:#3d2a03}html[data-theme="light"] #ncChip b small{color:#a3740f}html[data-theme="light"] #ncChip .np-dot{border-color:#fff;background:#0a9a6c}' +
/* window */
'#ncp{position:fixed;inset:0;z-index:100060;display:none}#ncp.on{display:block}' +
'#ncp .np-bd{position:absolute;inset:0;background:rgba(2,5,7,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s}#ncp.in .np-bd{opacity:1}' +
'#ncp .np-m{position:absolute;left:0;right:0;bottom:0;max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;border-radius:28px 28px 0 0;overflow:hidden;color:#eef5f2;font-family:inherit;background:linear-gradient(180deg,#191a14,#0c0f10 38%,#0a0e10);border:1px solid rgba(243,200,90,.18);border-bottom:0;box-shadow:0 -40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.08);transform:translateY(100%);transition:transform .38s cubic-bezier(.2,.9,.25,1);outline:none}' +
'#ncp.in .np-m{transform:none}' +
'#ncp .np-au{position:absolute;inset:0 0 auto 0;height:300px;pointer-events:none;overflow:hidden;-webkit-mask:linear-gradient(#000 35%,transparent);mask:linear-gradient(#000 35%,transparent)}' +
'#ncp .np-au i{position:absolute;border-radius:50%;filter:blur(46px);animation:ncpDr 11s ease-in-out infinite alternate}#ncp .np-au i:nth-child(1){width:340px;height:220px;left:-80px;top:-110px;background:#f3c85a;opacity:.26}#ncp .np-au i:nth-child(2){width:300px;height:200px;right:-90px;top:-90px;background:#62e8c2;opacity:.18;animation-delay:-5s}#ncp .np-au i:nth-child(3){width:220px;height:160px;left:40%;top:-100px;background:#ff9d4a;opacity:.12;animation-delay:-8s}' +
'@keyframes ncpDr{to{transform:translate(30px,18px) scale(1.12)}}' +
'#ncp .np-sc{position:relative;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:10px 18px calc(18px + env(safe-area-inset-bottom))}' +
'#ncp .np-grab{width:40px;height:5px;border-radius:9px;background:rgba(255,255,255,.22);margin:0 auto 12px}' +
'#ncp .np-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}#ncp .np-top h2{margin:0;font-size:19px;font-weight:760;letter-spacing:-.01em;background:linear-gradient(90deg,#ffe7a3,#f3c85a);-webkit-background-clip:text;background-clip:text;color:transparent}#ncp .np-top p{margin:2px 0 0;font-size:12.5px;color:#9aa69f}' +
'#ncp .np-x{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#c6d2ce;cursor:pointer;flex:none;padding:0}#ncp .np-x:hover{background:rgba(255,255,255,.13);color:#fff}#ncp .np-x .ncp-i{width:15px;height:15px}' +
'#ncp .ncp-i{width:18px;height:18px;flex:none}' +
/* hero */
'#ncp .np-hero{position:relative;display:flex;align-items:center;gap:16px;padding:16px;border-radius:24px;margin-bottom:14px;overflow:hidden;background:linear-gradient(135deg,rgba(243,200,90,.14),rgba(98,232,194,.06) 60%,rgba(255,255,255,.02));border:1px solid rgba(243,200,90,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}' +
'#ncp .np-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.07) 48%,transparent 60%);animation:ncpGl 7s ease-in-out infinite;pointer-events:none}@keyframes ncpGl{0%,60%{transform:translateX(-100%)}100%{transform:translateX(100%)}}' +
'#ncp .np-big{position:relative;flex:none;width:78px;height:78px;animation:ncpFloat 4s ease-in-out infinite}#ncp .np-big .ncp-coin{width:78px;height:78px;filter:drop-shadow(0 10px 18px rgba(200,143,29,.35))}@keyframes ncpFloat{50%{transform:translateY(-4px) rotate(-4deg)}}' +
'#ncp .np-hv{min-width:0;flex:1}#ncp .np-hv .np-l{font-size:11.5px;color:#a9b2ab;letter-spacing:.04em}#ncp .np-hv .np-n{display:flex;align-items:baseline;gap:6px;font-size:34px;font-weight:780;letter-spacing:-.03em;line-height:1.1;color:#fff6dc;font-variant-numeric:tabular-nums}#ncp .np-hv .np-n small{font-size:14px;font-weight:700;color:#e6bf5e;letter-spacing:.06em}' +
'#ncp .np-lvr{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}#ncp .np-lvb{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:99px;font-weight:750;font-size:11.5px;line-height:1;font-family:inherit;color:#1a1204;background:linear-gradient(135deg,var(--l1),var(--l2));box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}#ncp .np-lvb .ncp-i{width:12px;height:12px}' +
'#ncp .np-lvn{font-size:12px;color:#b3bdb6}#ncp .np-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:8px}#ncp .np-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#f3c85a,#62e8c2);transition:width .8s cubic-bezier(.2,.9,.25,1)}' +
/* tabs */
'#ncp .np-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin-bottom:14px;position:sticky;top:-10px;z-index:3;backdrop-filter:blur(10px)}' +
'#ncp .np-tab{position:relative;height:38px;border-radius:12px;border:0;background:none;color:#a7b3ae;font-weight:650;font-size:13px;line-height:1;font-family:inherit;cursor:pointer;transition:.18s;padding:0 4px;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:5px;text-align:center;min-width:0;margin:0;box-shadow:none}#ncp .np-tab:hover{color:#fff}#ncp .np-tab.np-on{background:linear-gradient(180deg,rgba(243,200,90,.22),rgba(243,200,90,.1));color:#ffe7a3;box-shadow:inset 0 0 0 1px rgba(243,200,90,.35)}' +
'#ncp .np-tab em{flex:none;min-width:17px;height:17px;padding:0 5px;border-radius:99px;background:#62e8c2;color:#03251b;font-weight:800;font-size:10px;line-height:17px;font-family:inherit;font-style:normal;text-align:center}' +
/* daily */
'#ncp .np-sec h3{margin:0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}#ncp .np-sec>p{margin:4px 0 12px;font-size:12.5px;color:#9aa69f;line-height:1.45}' +
'#ncp .np-fl{display:inline-flex;align-items:center;gap:4px;margin-left:auto;padding:4px 9px;border-radius:99px;background:rgba(255,140,60,.13);color:#ffae6b;font-size:11.5px;font-weight:700}#ncp .np-fl .ncp-i{width:13px;height:13px}' +
'#ncp .np-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:12px}' +
'#ncp .np-d{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 2px 8px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);font-size:10.5px;color:#93a09a;min-width:0}' +
'#ncp .np-d .ncp-coin{width:24px;height:24px}#ncp .np-d b{font-size:12.5px;color:#e9efe8;font-variant-numeric:tabular-nums}#ncp .np-d.np-big7 .ncp-coin{width:28px;height:28px}#ncp .np-d.np-big7{background:linear-gradient(180deg,rgba(255,140,60,.14),rgba(255,140,60,.04));border-color:rgba(255,160,80,.3)}' +
'#ncp .np-d.np-got{background:rgba(98,232,194,.08);border-color:rgba(98,232,194,.22)}#ncp .np-d.np-got .ncp-coin{opacity:.45;filter:grayscale(.4)}#ncp .np-d.np-got:after{content:"";position:absolute;top:-5px;right:-5px;width:16px;height:16px;box-shadow:0 0 0 2px #0c1012;border-radius:50%;background:#62e8c2 url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m5 12.5 4.5 4.5L19 7.5%27 fill=%27none%27 stroke=%27%2303251b%27 stroke-width=%273.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") center/10px no-repeat}' +
'#ncp .np-d.np-now{background:linear-gradient(180deg,rgba(243,200,90,.24),rgba(243,200,90,.06));border-color:#f3c85a;box-shadow:0 0 0 4px rgba(243,200,90,.12),0 10px 24px -10px rgba(243,200,90,.5);color:#ffe7a3;transform:translateY(-2px)}#ncp .np-d.np-now .ncp-coin{animation:ncpFloat 2.4s ease-in-out infinite}' +
'#ncp .np-cta{width:100%;height:54px;border-radius:17px;border:0;display:flex;align-items:center;justify-content:center;gap:9px;font-weight:750;font-size:15.5px;line-height:1;font-family:inherit;cursor:pointer;color:#2a1a02;background:linear-gradient(135deg,#ffe7a3,#f3c85a 45%,#d99a1c);box-shadow:0 14px 34px -10px rgba(243,200,90,.55),inset 0 1px 0 rgba(255,255,255,.6);transition:transform .15s,filter .15s;position:relative;overflow:hidden}' +
'#ncp .np-cta:hover{filter:brightness(1.05);transform:translateY(-1px)}#ncp .np-cta:active{transform:scale(.98)}#ncp .np-cta[disabled]{cursor:default;filter:none;transform:none;background:rgba(255,255,255,.06);color:#a7b3ae;box-shadow:none;border:1px solid rgba(255,255,255,.08)}#ncp .np-cta .ncp-coin{width:24px;height:24px}' +
'#ncp .np-cta:not([disabled]):before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.5) 48%,transparent 62%);animation:ncpGl 3s ease-in-out infinite}' +
'#ncp .np-note{display:flex;gap:9px;align-items:flex-start;font-size:12px;color:#93a09a;margin-top:12px;line-height:1.45}#ncp .np-note .ncp-i{width:15px;height:15px;margin-top:1px;color:#7d8c86}' +
/* missions */
'#ncp .np-mi{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);margin-bottom:8px}' +
'#ncp .np-mi .np-t{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex:none;background:rgba(98,232,194,.1);color:#62e8c2}#ncp .np-mi.np-ok .np-t{background:rgba(255,255,255,.05);color:#7d8c86}#ncp .np-mi.np-rd{background:linear-gradient(135deg,rgba(243,200,90,.12),rgba(243,200,90,.03));border-color:rgba(243,200,90,.3)}#ncp .np-mi.np-rd .np-t{background:rgba(243,200,90,.16);color:#f3c85a}' +
'#ncp .np-mi .np-k{flex:1;min-width:0}#ncp .np-mi .np-k b{display:block;font-size:14px;font-weight:650;line-height:1.25}#ncp .np-mi .np-k span{display:block;font-size:12px;color:#8f9c96;margin-top:2px;line-height:1.35}#ncp .np-mi.np-ok .np-k b{color:#93a09a}' +
'#ncp .np-rw{display:inline-flex;align-items:center;gap:4px;font-weight:750;font-size:12.5px;line-height:1;font-family:inherit;color:#ffd77a;white-space:nowrap;margin-top:6px}#ncp .np-rw .ncp-coin{width:16px;height:16px}' +
'#ncp .np-mb{flex:none;height:36px;min-width:72px;padding:0 13px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#e6efeb;font-weight:700;font-size:12.5px;line-height:1;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;transition:.15s}#ncp .np-mb:hover{background:rgba(255,255,255,.12)}#ncp .np-mb .ncp-i{width:14px;height:14px}' +
'#ncp .np-mb.np-c{border:0;color:#2a1a02;background:linear-gradient(135deg,#ffe7a3,#f3c85a);box-shadow:0 8px 20px -8px rgba(243,200,90,.6)}#ncp .np-mb.np-dn{background:none;border-color:transparent;color:#62e8c2;cursor:default}#ncp .np-mb[disabled]{opacity:.6;cursor:wait}' +
/* history */
'#ncp .np-hi{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.05)}#ncp .np-hi:last-child{border:0}#ncp .np-hi .np-t{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;flex:none;background:rgba(243,200,90,.1);color:#f3c85a}#ncp .np-hi .np-t .ncp-i{width:17px;height:17px}' +
'#ncp .np-hi .np-k{flex:1;min-width:0}#ncp .np-hi .np-k b{display:block;font-size:13.5px;font-weight:620;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ncp .np-hi .np-k span{font-size:11.5px;color:#86938d}#ncp .np-hi .np-a{font-weight:750;font-size:14px;line-height:1;font-family:inherit;color:#62e8c2;font-variant-numeric:tabular-nums;white-space:nowrap}' +
'#ncp .np-empty{text-align:center;padding:26px 10px;color:#8f9c96;font-size:13px}#ncp .np-empty .ncp-coin{width:54px;height:54px;opacity:.6;margin-bottom:8px}' +
/* invite */
'#ncp .np-inv{padding:16px;border-radius:20px;background:linear-gradient(135deg,#123129,#0c1a17 60%,#16130a);border:1px solid rgba(98,232,194,.2);margin-bottom:12px}#ncp .np-inv .np-cd{display:flex;align-items:center;gap:10px;margin:12px 0 10px}#ncp .np-inv .np-cd b{font:800 22px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.18em;color:#fff}' +
'#ncp .np-inv .np-lk{font:500 12px/1.4 ui-monospace,Menlo,monospace;color:#9fb6ae;word-break:break-all;padding:9px 11px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06)}#ncp .np-inv .np-bt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}' +
'#ncp .np-fr{display:flex;align-items:center;gap:10px;padding:9px 2px}#ncp .np-fr .np-av{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;font-weight:800;font-size:12px;line-height:1;font-family:inherit;color:#03251b;background:linear-gradient(140deg,#a3fbe3,#45cfa8)}#ncp .np-fr b{flex:1;font-size:13.5px;font-weight:600}#ncp .np-fr span{font-size:11.5px;font-weight:700;color:#93a09a}#ncp .np-fr span.np-q{color:#62e8c2}' +
'#ncp .np-msg{min-height:18px;text-align:center;font-size:12.5px;margin-top:8px;color:#62e8c2}#ncp .np-msg.np-bad{color:#ff8d9a}' +
'#ncp .np-what{display:flex;gap:9px;align-items:flex-start;font-size:11.5px;color:#7e8b86;line-height:1.45;margin-top:14px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.08)}#ncp .np-what .ncp-i{width:14px;height:14px;margin-top:1px}' +
'#ncp .np-skel{height:64px;border-radius:18px;margin-bottom:8px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.08),rgba(255,255,255,.04));background-size:200% 100%;animation:ncpSk 1.2s linear infinite}@keyframes ncpSk{to{background-position:-200% 0}}' +
/* flying coins */
'.ncp-fly{position:fixed;z-index:100070;width:26px;height:26px;pointer-events:none;transition:transform .85s cubic-bezier(.45,-0.2,.3,1),opacity .85s}.ncp-fly .ncp-coin{width:26px;height:26px}' +
'.ncp-plus{position:fixed;z-index:100071;pointer-events:none;font-weight:800;font-size:22px;line-height:1;font-family:inherit;color:#ffe7a3;text-shadow:0 4px 18px rgba(243,200,90,.7);animation:ncpUp 1.4s ease-out forwards}@keyframes ncpUp{0%{opacity:0;transform:translate(-50%,10px) scale(.7)}20%{opacity:1;transform:translate(-50%,0) scale(1.1)}100%{opacity:0;transform:translate(-50%,-50px) scale(1)}}' +
/* desktop */
'@media (min-width:760px){#ncp .np-m{left:50%;top:50%;bottom:auto;width:min(560px,calc(100vw - 48px));max-height:calc(100vh - 48px);border-radius:30px;border-bottom:1px solid rgba(243,200,90,.18);transform:translate(-50%,-46%) scale(.97);opacity:0;transition:transform .3s cubic-bezier(.2,.9,.25,1),opacity .25s}#ncp.in .np-m{transform:translate(-50%,-50%);opacity:1}#ncp .np-sc{padding:22px 24px 22px}#ncp .np-grab{display:none}#ncp .np-tabs{top:-22px}}' +
'@media (max-width:370px){#ncp .np-sc{padding-left:13px;padding-right:13px}#ncp .np-days{gap:4px}#ncp .np-d{padding:8px 1px 7px;border-radius:12px}#ncp .np-d .ncp-coin{width:20px;height:20px}#ncp .np-d b{font-size:11.5px}#ncp .np-tab{font-size:12px}#ncp .np-hv .np-n{font-size:28px}#ncp .np-big,#ncp .np-big .ncp-coin{width:64px;height:64px}}' +
/* light */
'html[data-theme="light"] #ncp .np-bd{background:rgba(15,23,42,.35)}html[data-theme="light"] #ncp .np-m{color:#0c111b;background:linear-gradient(180deg,#fffaf0,#fff 38%,#f7f8f4);border-color:rgba(194,140,20,.25)}' +
'html[data-theme="light"] #ncp .np-au i{opacity:.14!important}html[data-theme="light"] #ncp .np-top h2{background:linear-gradient(90deg,#a36d05,#c88f1d);-webkit-background-clip:text;background-clip:text}html[data-theme="light"] #ncp .np-top p,html[data-theme="light"] #ncp .np-sec>p,html[data-theme="light"] #ncp .np-note,html[data-theme="light"] #ncp .np-what{color:#5b6472}' +
'html[data-theme="light"] #ncp .np-x,html[data-theme="light"] #ncp .np-mb{background:#fff;border-color:rgba(15,23,42,.12);color:#1e293b}html[data-theme="light"] #ncp .np-hero{background:linear-gradient(135deg,#fff3d4,#f1fbf7 70%);border-color:rgba(194,140,20,.3)}' +
'html[data-theme="light"] #ncp .np-hv .np-n{color:#2b1d02}html[data-theme="light"] #ncp .np-hv .np-n small{color:#a3740f}html[data-theme="light"] #ncp .np-hv .np-l,html[data-theme="light"] #ncp .np-lvn{color:#5b6472}html[data-theme="light"] #ncp .np-bar{background:#ece6d6}' +
'html[data-theme="light"] #ncp .np-tabs{background:#f3f1ea;border-color:rgba(15,23,42,.07)}html[data-theme="light"] #ncp .np-tab{color:#5b6472}html[data-theme="light"] #ncp .np-tab.np-on{background:#fff;color:#8a5a00;box-shadow:0 1px 3px rgba(15,23,42,.12),inset 0 0 0 1px rgba(194,140,20,.3)}' +
'html[data-theme="light"] #ncp .np-d,html[data-theme="light"] #ncp .np-mi{background:#fff;border-color:rgba(15,23,42,.08)}html[data-theme="light"] #ncp .np-d b{color:#1e293b}html[data-theme="light"] #ncp .np-d.np-now{background:#fff6dc;border-color:#d99a1c;color:#8a5a00}html[data-theme="light"] #ncp .np-d.np-got{background:#effaf5;border-color:rgba(10,122,86,.25)}' +
'html[data-theme="light"] #ncp .np-mi.np-rd{background:#fff8e6;border-color:rgba(194,140,20,.35)}html[data-theme="light"] #ncp .np-mi .np-t{background:#e9f8f2;color:#0a7a56}html[data-theme="light"] #ncp .np-mi .np-k span,html[data-theme="light"] #ncp .np-hi .np-k span{color:#64748b}html[data-theme="light"] #ncp .np-rw{color:#9a6b07}' +
'html[data-theme="light"] #ncp .np-hi{border-color:rgba(15,23,42,.06)}html[data-theme="light"] #ncp .np-hi .np-a{color:#0a7a56}html[data-theme="light"] #ncp .np-inv{background:linear-gradient(135deg,#e9f8f1,#fdf8ea);border-color:rgba(10,122,86,.2)}html[data-theme="light"] #ncp .np-inv .np-cd b{color:#0c111b}html[data-theme="light"] #ncp .np-inv .np-lk{background:#fff;color:#475569;border-color:rgba(15,23,42,.08)}' +
'html[data-theme="light"] #ncp .np-cta[disabled]{background:#f1f2ee;color:#64748b;border-color:rgba(15,23,42,.08)}html[data-theme="light"] #ncp .np-msg{color:#0a7a56}html[data-theme="light"] #ncp .np-mb.np-dn{color:#0a7a56}html[data-theme="light"] #ncp .np-grab{background:rgba(15,23,42,.18)}' +
'@media (prefers-reduced-motion:reduce){#ncp *,#ncChip *{animation:none!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  /* ───────── data ───────── */
  var D = null, R = null, loading = null, tab = 'daily';
  function legacy() { try { var h = JSON.parse(localStorage.getItem('nc_bonus_history') || '[]'); return Array.isArray(h) ? h.map(function (e) { return { type: e.type }; }) : []; } catch (e) { return []; } }
  function load() {
    if (!isClient()) return Promise.resolve(null);
    if (loading) return loading;
    loading = post('ncState', { day: localDay(), legacy: legacy() }).then(function (r) { loading = null; if (r && r.ok) { D = r.nc; try { localStorage.removeItem('nc_bonus_history'); } catch (e) { } chip(); if (isOpen()) paint(); } return D; });
    return loading;
  }
  function loadRef() { return post('getRewards', {}).then(function (r) { if (r && r.ok) { R = r; if (isOpen() && tab === 'invite') paint(); } return R; }); }
  function readyCount() { if (!D) return 0; var n = D.daily && D.daily.ready ? 1 : 0; (D.missions || []).forEach(function (m) { if (m.ready) n++; }); return n; }

  /* ───────── header chip ───────── */
  function chip() {
    if (!isClient()) { var o = $('ncChip'); if (o) o.remove(); return; }
    var bell = $('notifBell'); if (!bell || !bell.parentNode) return;
    css();
    var old = $('ncBadge'); if (old) old.remove();
    var c = $('ncChip');
    if (!c) { c = document.createElement('div'); c.setAttribute('role', 'button'); c.tabIndex = 0; c.id = 'ncChip'; c.className = 'nc-no-i18n nc-reward-chip tbp-rw'; c.setAttribute('data-nci18n', 'off'); c.onclick = function () { open(); }; c.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }; bell.parentNode.insertBefore(c, bell); c._v = -1; }
    if (c.parentNode !== bell.parentNode || c.nextSibling !== bell) bell.parentNode.insertBefore(c, bell);
    var bal = D ? D.bal : null, lv = level(D ? D.life : 0), rc = readyCount();
    var sig = bal + '|' + lv.i + '|' + rc + '|' + lang();
    if (c._sig === sig) return; c._sig = sig;
    c.style.setProperty('--l1', lv.cur.c1); c.style.setProperty('--l2', lv.cur.c2);
    c.title = T('chipT'); c.setAttribute('aria-label', T('chipT') + (bal != null ? ': ' + bal + ' NC' : ''));
    c.innerHTML = coin(28) + '<b>' + (bal == null ? '—' : num(bal)) + '<small>NC</small></b><span class="np-lv">' + esc(T(lv.cur.k)) + '</span>' + (rc ? '<i class="np-dot" title="' + esc(T('ready')) + '"></i>' : '');
  }

  /* ───────── window ───────── */
  var el = null, lastFocus = null, tmr = null;
  function isOpen() { return !!(el && el.classList.contains('on')); }
  function root() {
    if (el) return el; css();
    el = document.createElement('div'); el.id = 'ncp'; el.className = 'nc-no-i18n'; el.setAttribute('data-nci18n', 'off');
    el.innerHTML = '<div class="np-bd" data-a="close"></div><div class="np-m" role="dialog" aria-modal="true" tabindex="-1"><div class="np-au"><i></i><i></i><i></i></div><div class="np-sc"></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    swipe(el.querySelector('.np-m'));
    return el;
  }
  function open(t) {
    if (!isClient()) return;
    root(); if (t) tab = t; lastFocus = document.activeElement;
    paint(); el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); try { el.querySelector('.np-m').focus({ preventScroll: true }); } catch (e) { } }); });
    load(); if (!R) loadRef();
    clearInterval(tmr); tmr = setInterval(function () { var c = el.querySelector('[data-cd]'); if (c) c.textContent = T('nextIn', { t: left() }); if (D && D.daily && !D.daily.ready && nextTs() <= Date.now()) load(); }, 1000);
  }
  function close() {
    if (!isOpen()) return; el.classList.remove('in'); clearInterval(tmr);
    setTimeout(function () { if (!el.classList.contains('in')) { el.classList.remove('on'); el.querySelector('.np-m').style.transform = ''; } }, 320);
    document.documentElement.style.overflow = '';
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
  }
  window.NCRewards = { open: open, close: close, refresh: load, coin: coin };
  /* older buttons that open the rewards window */
  window.__ncOpenRewards = open;

  function nextTs() { var d = new Date(); d.setHours(24, 0, 0, 0); var a = d.getTime(), b = D && D.daily ? (D.daily.dayTs || 0) + 12 * 36e5 : 0; return Math.max(a, b); }
  function left() { var ms = Math.max(0, nextTs() - Date.now()), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3); return h + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2); }

  function paint() {
    if (!el) return;
    var sc = el.querySelector('.np-sc'), y = sc.scrollTop, rc = readyCount();
    var bal = D ? D.bal : 0, life = D ? D.life : 0, lv = level(life), pct = lv.next ? Math.min(100, Math.round((life - lv.cur.min) / (lv.next.min - lv.cur.min) * 100)) : 100;
    var misReady = D ? (D.missions || []).filter(function (m) { return m.ready; }).length : 0;
    var h = '<div class="np-grab"></div><div class="np-top"><div><h2>' + esc(T('title')) + '</h2><p>' + esc(T('sub')) + '</p></div><button type="button" class="np-x" data-a="close" aria-label="' + esc(T('close')) + '">' + ic('x') + '</button></div>' +
      '<div class="np-hero" style="--l1:' + lv.cur.c1 + ';--l2:' + lv.cur.c2 + '"><div class="np-big">' + coin(78) + '</div><div class="np-hv"><div class="np-l">' + esc(T('bal')) + '</div><div class="np-n"><span data-bal>' + (D ? num(bal) : '—') + '</span><small>NC</small></div>' +
      '<div class="np-lvr"><span class="np-lvb">' + ic('star') + esc(T(lv.cur.k)) + '</span><span class="np-lvn">' + esc(lv.next ? T('toLvl', { n: num(lv.next.min - life), l: T(lv.next.k) }) : T('topLvl')) + '</span></div>' +
      '<div class="np-bar"><i style="width:' + pct + '%"></i></div></div></div>' +
      '<div class="np-tabs" role="tablist">' + [['daily', 'tDaily', D && D.daily && D.daily.ready ? 1 : 0], ['missions', 'tMis', misReady], ['history', 'tHist', 0], ['invite', 'tInv', 0]].map(function (t) { return '<button type="button" role="tab" aria-selected="' + (tab === t[0]) + '" class="np-tab' + (tab === t[0] ? ' np-on' : '') + '" data-tab="' + t[0] + '">' + esc(T(t[1])) + (t[2] ? '<em>' + t[2] + '</em>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="np-sec">' + (D ? body() : (D === false ? '<div class="np-empty">' + esc(T('err')) + '<br><br><button type="button" class="np-mb" data-a="retry">' + esc(T('retry')) + '</button></div>' : '<div class="np-skel"></div><div class="np-skel"></div><div class="np-skel"></div>')) + '</div>' +
      '<div class="np-msg" aria-live="polite"></div><div class="np-what">' + ic('info') + '<span>' + esc(T('what')) + '</span></div>';
    sc.innerHTML = h; sc.scrollTop = y;
    void rc;
  }
  function body() {
    if (tab === 'daily') {
      var d = D.daily || {}, tbl = d.table || [5, 5, 10, 10, 15, 20, 50], cur = d.ready ? d.next : d.cur || 0, ready = !!d.ready;
      var tiles = tbl.map(function (a, i) {
        var n = i + 1, cls = 'np-d' + (n === 7 ? ' np-big7' : '');
        if (ready ? n < cur : n <= cur) cls += ' np-got'; else if (ready && n === cur) cls += ' np-now';
        return '<div class="' + cls + '">' + esc(T('day', { n: n })) + coin(n === 7 ? 28 : 24) + '<b>+' + a + '</b></div>';
      }).join('');
      var streak = d.ready ? Math.max(0, (d.next || 1) - 1) : (d.cur || 0);
      return '<h3>' + ic('gift') + esc(T('dailyT')) + (streak > 0 ? '<span class="np-fl">' + ic('fire') + esc(T('streak', { n: streak })) + '</span>' : '') + '</h3><p>' + esc(d.broken && ready ? T('broken') : T('dailyS')) + '</p>' +
        '<div class="np-days">' + tiles + '</div>' +
        (ready ? '<button type="button" class="np-cta" data-a="daily">' + coin(24) + esc(T('collect', { n: tbl[(d.next || 1) - 1] })) + '</button>' : '<button type="button" class="np-cta" disabled>' + ic('clock') + '<span data-cd>' + esc(T('nextIn', { t: left() })) + '</span></button>') +
        '<div class="np-note">' + ic('fire') + '<span>' + esc(T('keep')) + '</span></div>';
    }
    if (tab === 'missions') {
      var ms = (D.missions || []).slice().sort(function (a, b) { return (b.ready - a.ready) || (a.done - b.done); });
      return ms.map(function (m) {
        var st = m.ready ? 'np-rd' : m.done ? 'np-ok' : '';
        var amt = m.id === 'invite' && m.ready && m.n > 1 ? m.a * m.n : m.a;
        var btn = m.ready ? '<button type="button" class="np-mb np-c" data-a="mission" data-id="' + m.id + '">' + esc(T('claim')) + '</button>' : m.done ? '<span class="np-mb np-dn">' + ic('ok') + esc(T('done')) + '</span>' : '<button type="button" class="np-mb" data-a="go" data-id="' + m.id + '">' + esc(T('go')) + ic('chev') + '</button>';
        return '<div class="np-mi ' + st + '"><div class="np-t">' + ic(m.done ? 'ok' : MIC[m.id]) + '</div><div class="np-k"><b>' + esc(T('m_' + m.id)) + '</b><span>' + esc(m.id === 'invite' ? T('d_invite', { n: m.a }) : T('d_' + m.id)) + '</span><span class="np-rw">' + coin(16) + '+' + num(amt) + ' NC' + (m.id === 'invite' && m.total ? ' · ' + m.total + '×' : '') + '</span></div>' + btn + '</div>';
      }).join('');
    }
    if (tab === 'history') {
      var hs = D.hist || [];
      if (!hs.length) return '<div class="np-empty">' + coin(54) + '<br>' + esc(T('noHist')) + '</div>';
      return hs.map(function (e) {
        var lab = e.type === 'daily' ? T('h_daily', { n: e.d || 1 }) : e.type === 'welcome' ? T('h_welcome') : e.type === 'import' ? T('h_import') : e.type === 'invite' ? T('h_invite', { n: e.n || 1 }) : K['m_' + e.type] ? T('m_' + e.type) : e.type;
        var icn = e.type === 'daily' ? 'fire' : e.type === 'welcome' || e.type === 'import' ? 'gift' : MIC[e.type] || 'star';
        return '<div class="np-hi"><div class="np-t">' + ic(icn) + '</div><div class="np-k"><b>' + esc(lab) + '</b><span>' + esc(dt(e.ts)) + '</span></div><div class="np-a">+' + num(e.a) + '</div></div>';
      }).join('');
    }
    if (tab === 'invite') {
      var inv = (D.missions || []).filter(function (m) { return m.id === 'invite'; })[0] || { a: 250 };
      if (!R) return '<div class="np-skel" style="height:150px"></div>';
      var link = location.origin + '/index.html?ref=' + R.code, fr = (R.referral && R.referral.invited) || [];
      return '<div class="np-inv"><h3 style="margin:0;font-size:15px">' + ic('inv') + ' ' + esc(T('invT')) + '</h3><p style="margin:6px 0 0;font-size:12.5px;color:#a9bcb5;line-height:1.45">' + esc(T('invS', { n: inv.a })) + '</p>' +
        '<div class="np-cd"><span class="lbl" style="font-size:11.5px;color:#8fa59d">' + esc(T('code')) + '</span><b>' + esc(R.code) + '</b></div><div class="np-lk">' + esc(link) + '</div>' +
        '<div class="np-bt"><button type="button" class="np-mb" data-a="copy" data-v="' + esc(link) + '">' + ic('cp') + esc(T('copyLink')) + '</button><button type="button" class="np-mb np-c" data-a="share" data-v="' + esc(link) + '">' + ic('share') + esc(T('share')) + '</button></div></div>' +
        '<h3 style="margin:14px 2px 6px;font-size:14px">' + esc(T('friends')) + (fr.length ? ' · ' + fr.length : '') + '</h3>' +
        (fr.length ? fr.map(function (f) { return '<div class="np-fr"><div class="np-av">' + esc(String(f.name || 'F').slice(0, 1).toUpperCase()) + '</div><b>' + esc(f.name) + '</b><span class="' + (f.done ? 'np-q' : '') + '">' + esc(f.done ? T('qualified') : T('joined')) + '</span></div>'; }).join('') : '<div class="np-empty" style="padding:14px">' + esc(T('noFriends')) + '</div>');
    }
    return '';
  }

  function msg(t, bad) { var m = el && el.querySelector('.np-msg'); if (!m) return; m.className = 'np-msg' + (bad ? ' np-bad' : ''); m.textContent = t; clearTimeout(m._t); m._t = setTimeout(function () { m.textContent = ''; }, 3500); }
  function copy(v) { try { if (navigator.clipboard) return navigator.clipboard.writeText(v); } catch (e) { } var ta = document.createElement('textarea'); ta.value = v; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); return Promise.resolve(); }

  /* coins fly from the button into the balance */
  function celebrate(from, amount) {
    try {
      var tgt = el.querySelector('.np-big') || $('ncChip'); if (!from || !tgt) return;
      var a = from.getBoundingClientRect(), b = tgt.getBoundingClientRect(), n = Math.min(12, 4 + Math.round(amount / 10));
      for (var i = 0; i < n; i++) (function (i) {
        var f = document.createElement('div'); f.className = 'ncp-fly'; f.innerHTML = coin(26);
        var x0 = a.left + a.width / 2 - 13 + (Math.random() - .5) * a.width * .6, y0 = a.top + a.height / 2 - 13;
        f.style.left = x0 + 'px'; f.style.top = y0 + 'px'; document.body.appendChild(f);
        setTimeout(function () { f.style.transform = 'translate(' + (b.left + b.width / 2 - 13 - x0) + 'px,' + (b.top + b.height / 2 - 13 - y0) + 'px) scale(.5) rotate(' + (Math.random() * 360) + 'deg)'; f.style.opacity = '.2'; }, 20 + i * 55);
        setTimeout(function () { f.remove(); }, 1000 + i * 55);
      })(i);
      var p = document.createElement('div'); p.className = 'ncp-plus'; p.textContent = '+' + amount + ' NC'; p.style.left = (b.left + b.width / 2) + 'px'; p.style.top = (b.top - 6) + 'px'; document.body.appendChild(p); setTimeout(function () { p.remove(); }, 1500);
      var c = $('ncChip'); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    } catch (e) { }
  }
  function countUp(from, to) {
    var s = el && el.querySelector('[data-bal]'); if (!s) return; var t0 = performance.now();
    (function f(t) { var k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); s.textContent = num(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function claim(btn, body) {
    if (btn.disabled) return; btn.disabled = true; var before = D ? D.bal : 0;
    post('ncClaim', Object.assign({ day: localDay() }, body)).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) { msg((r && r.error) || T('err'), true); return; }
      D = r.nc; var a = r.claimed ? r.claimed.a : 0;
      celebrate(btn, a); paint(); countUp(before, D.bal); chip();
      try { document.dispatchEvent(new CustomEvent('nc:bonus:granted', { detail: { amount: a, type: body.kind } })); } catch (e) { }
    });
  }
  function go(id) {
    close();
    setTimeout(function () {
      var click = function (sel) { var b = document.querySelector(sel); if (b) { b.click(); return true; } return false; };
      if (id === 'deposit') click('#btnAdd') || click('[data-act="add"]');
      else if (id === 'trade') click('#btnExchangeV2');
      else if (id === 'withdraw') click('#btnWithdrawV2');
      else if (id === 'invite') open('invite');
      else click('#settingsBtn');
    }, 340);
  }
  function onClick(e) {
    var a = e.target.closest('[data-a],[data-tab]'); if (!a || !el.contains(a)) return;
    if (a.hasAttribute('data-tab')) { tab = a.getAttribute('data-tab'); paint(); if (tab === 'invite' && !R) loadRef(); return; }
    var k = a.getAttribute('data-a');
    if (k === 'close') return close();
    if (k === 'retry') { D = null; paint(); load(); return; }
    if (k === 'daily') return claim(a, { kind: 'daily' });
    if (k === 'mission') return claim(a, { kind: 'mission', id: a.getAttribute('data-id') });
    if (k === 'go') return go(a.getAttribute('data-id'));
    if (k === 'copy') { copy(a.getAttribute('data-v')); msg(T('copied')); return; }
    if (k === 'share') { var v = a.getAttribute('data-v'); try { if (navigator.share) { navigator.share({ title: 'Nordic Crypto', url: v }).catch(function () { }); return; } } catch (x) { } copy(v); msg(T('copied')); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } }, true);
  function swipe(m) {
    var y0 = null, dy = 0;
    m.addEventListener('touchstart', function (e) { if (window.innerWidth >= 760) return; var sc = m.querySelector('.np-sc'); if (!e.target.closest('.np-grab,.np-top,.np-hero') && sc && sc.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; m.style.transition = 'none'; }, { passive: true });
    m.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) m.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    m.addEventListener('touchend', function () { if (y0 == null) return; m.style.transition = ''; if (dy > 110) close(); else m.style.transform = ''; y0 = null; });
  }
  window.addEventListener('nc-lang', function () { setTimeout(function () { var c = $('ncChip'); if (c) c._sig = ''; chip(); if (isOpen()) paint(); }, 60); });

  /* ───────── old NC system: keep its API quiet so nothing pops up any more ───────── */
  window.NC_BONUS = {
    tiers: {}, grant: function () { setTimeout(load, 1500); return null; },
    history: function () { return D ? (D.hist || []).map(function (e) { return { type: e.type, amount: e.a, ts: e.ts }; }) : []; },
    stats: function () { return { total: D ? D.bal : 0, byType: {}, count: D ? (D.hist || []).length : 0 }; },
    limits: function () { return { ok: true }; }, grantDailyLogin: function () { return false; }, checkLoyalty: function () { return false; }, checkReferral: function () { return false; },
    grantFirstDeposit: function () { setTimeout(load, 1500); }, grantFirstTrade: function () { setTimeout(load, 1500); }, grantFirstWithdrawal: function () { setTimeout(load, 1500); },
    grantKycBonus: function () { setTimeout(load, 1500); }, grantTwoFASetup: function () { setTimeout(load, 1500); }, grantProfileComplete: function () { }, grantBigDeposit: function () { }, reportBug: function () { return null; }
  };
  window.openBonusModalClient = open;
  ['nc:trade:executed', 'nc:deposit:confirmed', 'nc:withdrawal:submitted', 'nc:2fa:enabled', 'nc:kyc:approved'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(load, 2500); }); });

  /* ───────── start ───────── */
  function boot() { if (!isClient()) return; chip(); load(); }
  document.addEventListener('nc:auth:login', function () { setTimeout(boot, 600); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); }); else setTimeout(boot, 400);
  setInterval(function () { if (isClient()) { chip(); } else { var o = $('ncChip'); if (o) o.remove(); } }, 2000);
  setInterval(function () { if (isClient() && !document.hidden) load(); }, 5 * 60e3);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && isClient() && D && D.day !== localDay()) load(); });
})();
