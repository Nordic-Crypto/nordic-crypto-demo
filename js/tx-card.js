/* NordicCrypto — tx-card.js v1
   One transaction window for everything in the history: withdrawals (bank, card, crypto, from holdings), deposit requests,
   crypto deposits, trades and plain account entries. Status colour, live safety-check timer, "money path", copy buttons,
   receipt, share and help. Translated into all app languages by itself (en, da, fi, es, no, sv, fr, de).
   Replaces the old #txDetailsMask window. Load after receipt-pro.js. */
(function () {
  'use strict';
  if (window.__ncTxCard) return; window.__ncTxCard = 1;

  /* ───────── language ───────── */
  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var LOC = { en: 'en-GB', da: 'da-DK', fi: 'fi-FI', es: 'es-ES', no: 'nb-NO', sv: 'sv-SE', fr: 'fr-FR', de: 'de-DE' };
  var K = {
    tx: ['Transaction', 'Transaktion', 'Tapahtuma', 'Movimiento', 'Transaksjon', 'Transaktion', 'Opération', 'Umsatz'],
    wd: ['Withdrawal', 'Udbetaling', 'Nosto', 'Retiro', 'Uttak', 'Uttag', 'Retrait', 'Auszahlung'],
    cwd: ['Crypto withdrawal', 'Kryptoudbetaling', 'Kryptonosto', 'Retiro de cripto', 'Kryptouttak', 'Kryptouttag', 'Retrait crypto', 'Krypto-Auszahlung'],
    dep: ['Deposit', 'Indbetaling', 'Talletus', 'Depósito', 'Innskudd', 'Insättning', 'Dépôt', 'Einzahlung'],
    cdep: ['Crypto deposit', 'Kryptoindbetaling', 'Kryptotalletus', 'Depósito cripto', 'Kryptoinnskudd', 'Kryptoinsättning', 'Dépôt crypto', 'Krypto-Einzahlung'],
    bdep: ['Bank deposit', 'Bankindbetaling', 'Pankkitalletus', 'Depósito bancario', 'Bankinnskudd', 'Bankinsättning', 'Dépôt bancaire', 'Bankeinzahlung'],
    kdep: ['Card deposit', 'Kortindbetaling', 'Korttitalletus', 'Depósito con tarjeta', 'Kortinnskudd', 'Kortinsättning', 'Dépôt par carte', 'Kartenzahlung'],
    bonus: ['Bonus', 'Bonus', 'Bonus', 'Bono', 'Bonus', 'Bonus', 'Bonus', 'Bonus'],
    trade: ['Trade', 'Handel', 'Kauppa', 'Operación', 'Handel', 'Affär', 'Transaction', 'Trade'],
    exch: ['Exchange', 'Veksling', 'Vaihto', 'Cambio', 'Veksling', 'Växling', 'Échange', 'Umtausch'],
    transfer: ['Transfer', 'Overførsel', 'Siirto', 'Transferencia', 'Overføring', 'Överföring', 'Virement', 'Überweisung'],
    payment: ['Payment', 'Betaling', 'Maksu', 'Pago', 'Betaling', 'Betalning', 'Paiement', 'Zahlung'],
    credit: ['Credit', 'Indsættelse', 'Hyvitys', 'Abono', 'Kreditering', 'Kreditering', 'Crédit', 'Gutschrift'],
    correction: ['Correction', 'Korrektion', 'Korjaus', 'Corrección', 'Korrigering', 'Korrigering', 'Correction', 'Korrektur'],
    review: ['Under review', 'Under gennemgang', 'Tarkistettavana', 'En revisión', 'Under vurdering', 'Granskas', 'En vérification', 'In Prüfung'],
    completed: ['Completed', 'Gennemført', 'Valmis', 'Completado', 'Fullført', 'Slutförd', 'Terminé', 'Abgeschlossen'],
    rejected: ['Rejected', 'Afvist', 'Hylätty', 'Rechazado', 'Avvist', 'Avvisad', 'Refusé', 'Abgelehnt'],
    sending: ['On its way', 'På vej', 'Matkalla', 'En camino', 'På vei', 'På väg', 'En route', 'Unterwegs'],
    processing: ['Processing', 'Behandles', 'Käsitellään', 'Procesando', 'Behandles', 'Behandlas', 'En traitement', 'In Bearbeitung'],
    left: ['left', 'tilbage', 'jäljellä', 'restante', 'igjen', 'kvar', 'restant', 'übrig'],
    yourBal: ['Your balance', 'Din saldo', 'Saldosi', 'Tu saldo', 'Din saldo', 'Ditt saldo', 'Votre solde', 'Ihr Guthaben'],
    yourBank: ['Your bank', 'Din bank', 'Pankkisi', 'Tu banco', 'Din bank', 'Din bank', 'Votre banque', 'Ihre Bank'],
    yourCard: ['Your card', 'Dit kort', 'Korttisi', 'Tu tarjeta', 'Ditt kort', 'Ditt kort', 'Votre carte', 'Ihre Karte'],
    wallet: ['Wallet', 'Wallet', 'Lompakko', 'Billetera', 'Lommebok', 'Plånbok', 'Portefeuille', 'Wallet'],
    network: ['Network', 'Netværk', 'Verkko', 'Red', 'Nettverk', 'Nätverk', 'Réseau', 'Netzwerk'],
    bank: ['Bank', 'Bank', 'Pankki', 'Banco', 'Bank', 'Bank', 'Banque', 'Bank'],
    safety: ['Safety check', 'Sikkerhedstjek', 'Turvatarkistus', 'Control de seguridad', 'Sikkerhetssjekk', 'Säkerhetskontroll', 'Contrôle de sécurité', 'Sicherheitsprüfung'],
    check: ['Check', 'Tjek', 'Tarkistus', 'Revisión', 'Sjekk', 'Kontroll', 'Contrôle', 'Prüfung'],
    stopped: ['Stopped', 'Stoppet', 'Pysäytetty', 'Detenido', 'Stoppet', 'Stoppad', 'Arrêté', 'Gestoppt'],
    received: ['Request received', 'Anmodning modtaget', 'Pyyntö vastaanotettu', 'Solicitud recibida', 'Forespørsel mottatt', 'Begäran mottagen', 'Demande reçue', 'Antrag erhalten'],
    reserved: ['Funds reserved on your balance', 'Beløbet er reserveret på din saldo', 'Varat varattu saldoltasi', 'Fondos reservados en tu saldo', 'Beløpet er reservert på saldoen din', 'Beloppet är reserverat på ditt saldo', 'Fonds réservés sur votre solde', 'Betrag auf Ihrem Guthaben reserviert'],
    inReview: ['In review', 'Under gennemgang', 'Tarkistuksessa', 'En revisión', 'Under vurdering', 'Granskas', 'En vérification', 'In Prüfung'],
    teamChecks: ['Our team is checking it', 'Vores team tjekker den', 'Tiimimme tarkistaa sen', 'Nuestro equipo la está revisando', 'Teamet vårt sjekker den', 'Vårt team kontrollerar den', 'Notre équipe la vérifie', 'Unser Team prüft sie'],
    reviewed: ['Reviewed', 'Gennemgået', 'Tarkistettu', 'Revisado', 'Vurdert', 'Granskad', 'Vérifié', 'Geprüft'],
    sentBank: ['Sent', 'Sendt', 'Lähetetty', 'Enviado', 'Sendt', 'Skickat', 'Envoyé', 'Gesendet'],
    afterAppr: ['Right after approval', 'Lige efter godkendelse', 'Heti hyväksynnän jälkeen', 'Justo después de la aprobación', 'Rett etter godkjenning', 'Direkt efter godkännande', 'Juste après l’approbation', 'Direkt nach der Freigabe'],
    creditedS: ['Credited', 'Krediteret', 'Hyvitetty', 'Abonado', 'Kreditert', 'Krediterat', 'Crédité', 'Gutgeschrieben'],
    notAppr: ['Not approved', 'Ikke godkendt', 'Ei hyväksytty', 'No aprobado', 'Ikke godkjent', 'Ej godkänd', 'Non approuvé', 'Nicht freigegeben'],
    firstNote: ['First transfer to this account. Your money stays on your balance until it’s sent.', 'Første overførsel til denne konto. Dine penge bliver på din saldo, indtil de sendes.', 'Ensimmäinen siirto tälle tilille. Rahasi pysyvät saldollasi, kunnes ne lähetetään.', 'Primera transferencia a esta cuenta. Tu dinero sigue en tu saldo hasta que se envíe.', 'Første overføring til denne kontoen. Pengene blir på saldoen din til de sendes.', 'Första överföringen till det här kontot. Pengarna stannar på ditt saldo tills de skickas.', 'Premier virement vers ce compte. Votre argent reste sur votre solde jusqu’à l’envoi.', 'Erste Überweisung auf dieses Konto. Ihr Geld bleibt auf Ihrem Guthaben, bis es gesendet wird.'],
    queueNote: ['Your request is in the queue. You’ll get a notification as soon as it is reviewed.', 'Din anmodning er i kø. Du får besked, så snart den er gennemgået.', 'Pyyntösi on jonossa. Saat ilmoituksen heti, kun se on tarkistettu.', 'Tu solicitud está en cola. Recibirás un aviso en cuanto se revise.', 'Forespørselen din er i kø. Du får varsel så snart den er vurdert.', 'Din begäran står i kö. Du får ett meddelande så fort den har granskats.', 'Votre demande est en file d’attente. Vous serez prévenu dès qu’elle sera vérifiée.', 'Ihr Antrag ist in der Warteschlange. Sie werden benachrichtigt, sobald er geprüft ist.'],
    depNote: ['Your deposit is being checked. It will be credited as soon as it is approved.', 'Din indbetaling bliver tjekket. Den krediteres, så snart den er godkendt.', 'Talletustasi tarkistetaan. Se hyvitetään heti, kun se on hyväksytty.', 'Tu depósito se está revisando. Se abonará en cuanto se apruebe.', 'Innskuddet ditt sjekkes. Det krediteres så snart det er godkjent.', 'Din insättning kontrolleras. Den krediteras så fort den godkänts.', 'Votre dépôt est en cours de vérification. Il sera crédité dès son approbation.', 'Ihre Einzahlung wird geprüft. Sie wird gutgeschrieben, sobald sie freigegeben ist.'],
    sentNote: ['Sent to {w}. We’ll confirm here when it has arrived.', 'Sendt til {w}. Vi bekræfter her, når den er modtaget.', 'Lähetetty: {w}. Vahvistamme täällä, kun se on perillä.', 'Enviado a {w}. Te confirmaremos aquí cuando llegue.', 'Sendt til {w}. Vi bekrefter her når den har kommet frem.', 'Skickat till {w}. Vi bekräftar här när den har kommit fram.', 'Envoyé vers {w}. Nous confirmerons ici à son arrivée.', 'Gesendet an {w}. Wir bestätigen hier, sobald es angekommen ist.'],
    arrivedNote: ['The money has arrived in {w}.', 'Pengene er modtaget på {w}.', 'Rahat ovat perillä: {w}.', 'El dinero ha llegado a {w}.', 'Pengene har kommet frem til {w}.', 'Pengarna har kommit fram till {w}.', 'L’argent est arrivé sur {w}.', 'Das Geld ist auf {w} angekommen.'],
    nowAvail: ['It’s on your balance and ready to use.', 'Pengene er på din saldo og klar til brug.', 'Rahat ovat saldollasi ja käytettävissä.', 'Ya está en tu saldo y listo para usar.', 'Pengene er på saldoen din og klare til bruk.', 'Pengarna finns på ditt saldo och kan användas direkt.', 'Il est sur votre solde et prêt à l’emploi.', 'Das Geld ist auf Ihrem Guthaben und sofort verfügbar.'],
    returned: ['Funds returned to your balance', 'Beløbet er ført tilbage til din saldo', 'Varat palautettu saldollesi', 'Fondos devueltos a tu saldo', 'Beløpet er ført tilbake til saldoen', 'Beloppet har återförts till ditt saldo', 'Fonds restitués sur votre solde', 'Betrag wieder gutgeschrieben'],
    stopNote: ['Nothing was sent. You can fix the details and try again.', 'Intet blev sendt. Ret oplysningerne og prøv igen.', 'Mitään ei lähetetty. Korjaa tiedot ja yritä uudelleen.', 'No se envió nada. Corrige los datos e inténtalo de nuevo.', 'Ingenting ble sendt. Rett opplysningene og prøv igjen.', 'Inget skickades. Rätta uppgifterna och försök igen.', 'Rien n’a été envoyé. Corrigez les informations et réessayez.', 'Es wurde nichts gesendet. Korrigieren Sie die Angaben und versuchen Sie es erneut.'],
    depRej: ['This deposit was not credited. Contact us if you have questions.', 'Denne indbetaling blev ikke krediteret. Kontakt os, hvis du har spørgsmål.', 'Tätä talletusta ei hyvitetty. Ota yhteyttä, jos sinulla on kysyttävää.', 'Este depósito no se abonó. Contáctanos si tienes preguntas.', 'Dette innskuddet ble ikke kreditert. Kontakt oss hvis du har spørsmål.', 'Den här insättningen krediterades inte. Kontakta oss om du har frågor.', 'Ce dépôt n’a pas été crédité. Contactez-nous pour toute question.', 'Diese Einzahlung wurde nicht gutgeschrieben. Kontaktieren Sie uns bei Fragen.'],
    reason: ['Reason', 'Årsag', 'Syy', 'Motivo', 'Årsak', 'Orsak', 'Motif', 'Grund'],
    theyGet: ['They get', 'Modtager får', 'Saaja saa', 'Recibe', 'Mottaker får', 'Mottagaren får', 'Montant reçu', 'Empfänger erhält'],
    youGet: ['You get', 'Du får', 'Saat', 'Recibes', 'Du får', 'Du får', 'Vous recevez', 'Sie erhalten'],
    arrives: ['Arrives', 'Ankommer', 'Perillä', 'Llega', 'Ankommer', 'Framme', 'Arrivée', 'Ankunft'],
    ref: ['Ref.', 'Ref.', 'Viite', 'Ref.', 'Ref.', 'Ref.', 'Réf.', 'Ref.'],
    receipt: ['Receipt', 'Kvittering', 'Kuitti', 'Recibo', 'Kvittering', 'Kvitto', 'Reçu', 'Beleg'],
    share: ['Share', 'Del', 'Jaa', 'Compartir', 'Del', 'Dela', 'Partager', 'Teilen'],
    help: ['Help', 'Hjælp', 'Apua', 'Ayuda', 'Hjelp', 'Hjälp', 'Aide', 'Hilfe'],
    done: ['Done', 'Færdig', 'Valmis', 'Listo', 'Ferdig', 'Klar', 'Terminé', 'Fertig'],
    copied: ['Copied', 'Kopieret', 'Kopioitu', 'Copiado', 'Kopiert', 'Kopierat', 'Copié', 'Kopiert'],
    until: ['until {d}', 'indtil {d}', '{d} asti', 'hasta el {d}', 'til {d}', 'till {d}', 'jusqu’au {d}', 'bis {d}'],
    amount: ['Amount', 'Beløb', 'Summa', 'Importe', 'Beløp', 'Belopp', 'Montant', 'Betrag'],
    method: ['Method', 'Metode', 'Tapa', 'Método', 'Metode', 'Metod', 'Méthode', 'Methode'],
    date: ['Date', 'Dato', 'Päivä', 'Fecha', 'Dato', 'Datum', 'Date', 'Datum'],
    desc: ['Description', 'Beskrivelse', 'Kuvaus', 'Descripción', 'Beskrivelse', 'Beskrivning', 'Description', 'Beschreibung'],
    value: ['Value', 'Værdi', 'Arvo', 'Valor', 'Verdi', 'Värde', 'Valeur', 'Wert'],
    valueNow: ['Value now', 'Værdi nu', 'Arvo nyt', 'Valor ahora', 'Verdi nå', 'Värde nu', 'Valeur actuelle', 'Wert jetzt'],
    coin: ['Coin', 'Mønt', 'Kolikko', 'Moneda', 'Mynt', 'Mynt', 'Crypto', 'Coin'],
    address: ['Wallet address', 'Wallet-adresse', 'Lompakon osoite', 'Dirección de billetera', 'Lommebokadresse', 'Plånboksadress', 'Adresse du portefeuille', 'Wallet-Adresse'],
    explorer: ['Explorer', 'Explorer', 'Selain', 'Explorador', 'Utforsker', 'Utforskare', 'Explorateur', 'Explorer'],
    cardNo: ['Card', 'Kort', 'Kortti', 'Tarjeta', 'Kort', 'Kort', 'Carte', 'Karte'],
    paidFrom: ['Paid from', 'Betalt fra', 'Maksettu', 'Pagado desde', 'Betalt fra', 'Betalt från', 'Payé depuis', 'Bezahlt von'],
    holding: ['{c} holding', '{c}-beholdning', '{c}-omistus', 'Saldo en {c}', '{c}-beholdning', '{c}-innehav', 'Avoir en {c}', '{c}-Bestand'],
    ETA1: ['Usually within 1 business day', 'Normalt inden for 1 bankdag', 'Yleensä 1 pankkipäivän kuluessa', 'Normalmente en 1 día hábil', 'Vanligvis innen 1 virkedag', 'Vanligtvis inom 1 bankdag', 'Généralement sous 1 jour ouvré', 'Meist innerhalb von 1 Werktag'],
    ETA13: ['Usually 1–3 business days', 'Normalt 1–3 bankdage', 'Yleensä 1–3 pankkipäivää', 'Normalmente 1–3 días hábiles', 'Vanligvis 1–3 virkedager', 'Vanligtvis 1–3 bankdagar', 'Généralement 1 à 3 jours ouvrés', 'Meist 1–3 Werktage'],
    ETA12: ['Usually 1–2 business days', 'Normalt 1–2 bankdage', 'Yleensä 1–2 pankkipäivää', 'Normalmente 1–2 días hábiles', 'Vanligvis 1–2 virkedager', 'Vanligtvis 1–2 bankdagar', 'Généralement 1 à 2 jours ouvrés', 'Meist 1–2 Werktage'],
    ETAh: ['Usually within an hour', 'Normalt inden for en time', 'Yleensä tunnin kuluessa', 'Normalmente en una hora', 'Vanligvis innen en time', 'Vanligtvis inom en timme', 'Généralement sous une heure', 'Meist innerhalb einer Stunde'],
    ETAm: ['Usually within minutes', 'Normalt inden for minutter', 'Yleensä minuuteissa', 'Normalmente en minutos', 'Vanligvis innen minutter', 'Vanligtvis inom några minuter', 'Généralement en quelques minutes', 'Meist innerhalb von Minuten'],
    yourBankAcc: ['your bank account', 'din bankkonto', 'pankkitilillesi', 'tu cuenta bancaria', 'bankkontoen din', 'ditt bankkonto', 'votre compte bancaire', 'Ihr Bankkonto'],
    yourCardW: ['your card', 'dit kort', 'kortillesi', 'tu tarjeta', 'kortet ditt', 'ditt kort', 'votre carte', 'Ihre Karte'],
    yourWalletW: ['your wallet', 'din wallet', 'lompakkoosi', 'tu billetera', 'lommeboken din', 'din plånbok', 'votre portefeuille', 'Ihre Wallet'],
    shareText: ['{k}: {a} · {s} · {d}', '{k}: {a} · {s} · {d}', '{k}: {a} · {s} · {d}', '{k}: {a} · {s} · {d}', '{k}: {a} · {s} · {d}', '{k}: {a} · {s} · {d}', '{k} : {a} · {s} · {d}', '{k}: {a} · {s} · {d}'],
    hint: ['Tap a detail to copy · Esc to close', 'Tryk på en detalje for at kopiere · Esc lukker', 'Kopioi napauttamalla · Esc sulkee', 'Toca un dato para copiarlo · Esc para cerrar', 'Trykk på en detalj for å kopiere · Esc lukker', 'Tryck på en detalj för att kopiera · Esc stänger', 'Touchez un détail pour le copier · Échap pour fermer', 'Zum Kopieren antippen · Esc schließt'],
    close: ['Close', 'Luk', 'Sulje', 'Cerrar', 'Lukk', 'Stäng', 'Fermer', 'Schließen']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k]; if (!a) return k; var s = a[LG.indexOf(lang())] || a[0]; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  function dt(ts, time) { if (!ts) return ''; try { var o = { day: 'numeric', month: 'short' }; if (time) { o.hour = '2-digit'; o.minute = '2-digit'; } if (new Date(ts).getFullYear() !== new Date().getFullYear()) o.year = 'numeric'; return new Intl.DateTimeFormat(LOC[lang()], o).format(new Date(ts)); } catch (e) { return new Date(ts).toLocaleString(); } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v) { try { if (typeof window.fmtCurrency === 'function') return window.fmtCurrency(v); } catch (e) { } return '$' + Number(v || 0).toFixed(2); }
  function S() { return window.st || {}; }
  function trimNum(n, d) { return Number(n || 0).toFixed(d == null ? 8 : d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); }
  function initials(n) { n = String(n || '').trim(); if (!n) return 'NC'; var p = n.split(/\s+/); return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : (p[0][1] || ''))).toUpperCase(); }
  function flagOf(cc) { cc = String(cc || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(cc)) return ''; return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65); }
  var CN = { danmark: 'DK', denmark: 'DK', sverige: 'SE', sweden: 'SE', norge: 'NO', norway: 'NO', suomi: 'FI', finland: 'FI', deutschland: 'DE', germany: 'DE', españa: 'ES', spain: 'ES', france: 'FR', 'united kingdom': 'GB', uk: 'GB', poland: 'PL', polska: 'PL', netherlands: 'NL', nederland: 'NL', italy: 'IT', italia: 'IT', austria: 'AT', österreich: 'AT', switzerland: 'CH', schweiz: 'CH', ireland: 'IE', belgium: 'BE', portugal: 'PT', estonia: 'EE', latvia: 'LV', lithuania: 'LT', iceland: 'IS', canada: 'CA', australia: 'AU', 'united states': 'US', usa: 'US' };
  function ccOf(d) { if (!d) return ''; var i = String(d.iban || '').replace(/\s/g, ''); if (/^[A-Z]{2}\d/.test(i)) return i.slice(0, 2); var c = String(d.country || '').trim().toLowerCase(); return CN[c] || (/^[a-z]{2}$/.test(c) ? c.toUpperCase() : ''); }
  function ibanFmt(s) { s = String(s || '').replace(/\s/g, ''); return /^[A-Z]{2}\d/.test(s) ? s.replace(/(.{4})/g, '$1 ').trim() : s; }
  function shortId(id) { id = String(id || ''); return id.length > 10 ? id.slice(0, 3) + '…' + id.slice(-4) : id; }

  /* ───────── icons ───────── */
  var P = {
    x: '<path d="M6 6l12 12M18 6 6 18"/>', ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', dl: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/>',
    sh: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>', share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>',
    chat: '<path d="M5 18.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8.5z"/>', bank: '<path d="M4 10h16L12 4zM6 10v7m4-7v7m4-7v7m4-7v7M4 20h16"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 15h4"/>', wal: '<path d="M4 7a2 2 0 0 1 2-2h11v4M4 7v10a2 2 0 0 0 2 2h13V9H6a2 2 0 0 1-2-2z"/><circle cx="15.5" cy="14" r="1"/>',
    net: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="M11 7 6 15m7-8 5 8M7 17h10"/>', cp: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', stop: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>', warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3v.2"/>',
    out: '<path d="M7 17 17 7m0 0H9m8 0v8"/>', in: '<path d="M17 7 7 17m0 0h8m-8 0V9"/>', swap: '<path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3"/>', gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M12 9v11M12 9c-1.5-3-5-3.5-5-1.2C7 9 9.5 9 12 9zm0 0c1.5-3 5-3.5 5-1.2C17 9 14.5 9 12 9z"/>',
    ext: '<path d="M14 5h5v5M19 5l-8 8M10 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4"/>'
  };
  function ic(n, c) { return '<svg class="' + (c || 'nx-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }
  var COIN = {
    BTC: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f7931a"/><path fill="#fff" d="M22.4 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-2.6-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-1.9 7.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.5.6-.7 2.8 1.7.4.7-2.7 1.3.3-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 2-1 2.2-2.5zm-3.8 5.4c-.5 2.1-4 1-5.2.7l.9-3.7c1.2.3 4.9.9 4.3 3zm.5-5.4c-.5 1.9-3.4.9-4.3.7l.8-3.4c1 .2 4 .7 3.5 2.7z"/></svg>',
    ETH: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627eea"/><path d="M16 5v8.1l6.9 3.1z" fill="#fff" fill-opacity=".6"/><path d="M16 5 9.1 16.2l6.9-3.1z" fill="#fff"/><path d="M16 21.5v5.5l6.9-9.6z" fill="#fff" fill-opacity=".6"/><path d="M16 27v-5.5l-6.9-4.1z" fill="#fff"/><path d="m16 20.2 6.9-4-6.9-3.1z" fill="#fff" fill-opacity=".2"/><path d="m9.1 16.2 6.9 4v-7.1z" fill="#fff" fill-opacity=".6"/></svg>',
    USDT: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#26a17b"/><path fill="#fff" d="M17.9 17.2v0c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1v0c-3.7-.2-6.4-.8-6.4-1.6s2.7-1.4 6.4-1.6v2.5c.2 0 .9.1 1.9.1 1.2 0 1.8-.1 1.9-.1v-2.5c3.7.2 6.4.8 6.4 1.6s-2.7 1.4-6.4 1.6m0-3.4v-2.3h5.2V8H8.9v3.5h5.2v2.3c-4.2.2-7.4 1-7.4 2s3.2 1.8 7.4 2v7.2h3.8v-7.2c4.2-.2 7.3-1 7.3-2s-3.1-1.8-7.3-2"/></svg>',
    USDC: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2775ca"/><path fill="#fff" d="M20.1 18c0-2.2-1.3-2.9-3.9-3.2-1.9-.3-2.2-.7-2.2-1.6s.6-1.4 1.9-1.4c1.1 0 1.8.4 2.1 1.3.1.2.2.3.4.3h1c.2 0 .4-.2.4-.4v-.1c-.3-1.3-1.3-2.3-2.7-2.5V9c0-.2-.2-.4-.5-.4h-.9c-.2 0-.4.2-.4.5v1.4c-1.9.3-3 1.5-3 3.1 0 2.1 1.3 2.9 3.8 3.2 1.7.3 2.3.7 2.3 1.7s-.9 1.6-2.1 1.6c-1.6 0-2.2-.7-2.4-1.6-.1-.2-.2-.3-.4-.3h-1.1c-.2 0-.4.2-.4.4v.1c.3 1.5 1.2 2.5 3.1 2.8V23c0 .2.2.4.5.4h.9c.2 0 .4-.2.4-.5v-1.4c1.9-.3 3.1-1.6 3.1-3.3z"/><path fill="#fff" d="M12.8 24.4c-4.6-1.7-7-6.8-5.3-11.3.9-2.5 2.8-4.4 5.3-5.3.2-.1.4-.3.4-.6v-.8c0-.2-.1-.4-.4-.4h-.1c-5.5 1.7-8.5 7.6-6.8 13.1 1 3.2 3.5 5.7 6.8 6.8.2.1.5 0 .5-.2v-.9c0-.2-.2-.3-.4-.4zm6.5-18.3c-.2-.1-.5 0-.5.2v.8c0 .2.2.5.4.6 4.6 1.7 7 6.8 5.3 11.3-.9 2.5-2.8 4.4-5.3 5.3-.2.1-.4.3-.4.6v.8c0 .2.1.4.4.4h.1c5.5-1.7 8.5-7.6 6.8-13.1-1-3.3-3.5-5.8-6.8-6.9z"/></svg>'
  };
  function coinIc(c) { c = String(c || '').toUpperCase(); return COIN[c] || '<b>' + esc(c.slice(0, 1) || '₿') + '</b>'; }

  /* ───────── styles ───────── */
  function css() {
    if (document.getElementById('nxCss')) return; var s = document.createElement('style'); s.id = 'nxCss';
    s.textContent =
'#nx{position:fixed;inset:0;z-index:100050;display:none}#nx.on{display:block}' +
'#nx .nx-bd{position:absolute;inset:0;background:rgba(2,5,7,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s}#nx.in .nx-bd{opacity:1}' +
'#nx .nx-m{--c:#ffc24a;--cr:255,194,74;position:absolute;left:0;right:0;bottom:0;max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;border-radius:28px 28px 0 0;overflow:hidden;color:#eef5f2;font-family:inherit;' +
'background:linear-gradient(180deg,#161d1f,#0a0e10);border:1px solid rgba(255,255,255,.08);border-bottom:0;box-shadow:0 -40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.1);transform:translateY(100%);transition:transform .38s cubic-bezier(.2,.9,.25,1);outline:none}#nx .nx-m:focus,#nx .nx-m:focus-visible{outline:none!important;box-shadow:0 -40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.1)}' +
'#nx.in .nx-m{transform:none}' +
'#nx .nx-m.mint{--c:#62e8c2;--cr:98,232,194}#nx .nx-m.red{--c:#ff6b7a;--cr:255,107,122}#nx .nx-m.blue{--c:#6fb2ff;--cr:111,178,255}#nx .nx-m.vio{--c:#b49cff;--cr:180,156,255}#nx .nx-m.gray{--c:#a9b8b3;--cr:169,184,179}' +
'#nx .nx-au{position:absolute;inset:0 0 auto 0;height:240px;pointer-events:none;overflow:hidden;-webkit-mask:linear-gradient(#000 30%,transparent);mask:linear-gradient(#000 30%,transparent)}' +
'#nx .nx-au i{position:absolute;border-radius:50%;filter:blur(42px);animation:nxDr 10s ease-in-out infinite alternate}#nx .nx-au i:nth-child(1){width:320px;height:200px;left:-60px;top:-95px;background:var(--c);opacity:.3}#nx .nx-au i:nth-child(2){width:300px;height:180px;right:-80px;top:-80px;background:#62e8c2;opacity:.16;animation-delay:-4s}#nx .nx-au i:nth-child(3){width:200px;height:140px;left:42%;top:-90px;background:var(--c);opacity:.15;animation-delay:-7s}' +
'@keyframes nxDr{to{transform:translate(36px,18px) scale(1.12)}}' +
'#nx .nx-sc{position:relative;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:10px 18px calc(18px + env(safe-area-inset-bottom))}' +
'#nx .nx-grab{width:40px;height:5px;border-radius:9px;background:rgba(255,255,255,.22);margin:0 auto 12px;touch-action:none}' +
'#nx .nx-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}' +
'#nx .nx-crumb{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#b6c4bf;min-width:0}#nx .nx-crumb span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#nx .nx-crumb b{color:#eef5f2;font-weight:600}#nx .nx-crumb .nx-i{width:15px;height:15px}' +
'#nx .nx-x{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#c6d2ce;cursor:pointer;flex:none;padding:0;transition:.15s}#nx .nx-x:hover{background:rgba(255,255,255,.13);color:#fff}#nx .nx-x .nx-i{width:15px;height:15px}' +
'#nx .nx-i{width:18px;height:18px;flex:none}' +
'#nx .nx-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}#nx .nx-hero>div:first-child{min-width:0}' +
'#nx .nx-amt{font-size:clamp(28px,9vw,40px);font-weight:760;letter-spacing:-.035em;line-height:1.05;font-variant-numeric:tabular-nums;background:linear-gradient(180deg,#fff,#c9d6d1);-webkit-background-clip:text;background-clip:text;color:transparent;overflow-wrap:anywhere}' +
'#nx .nx-amt2{font-size:13px;color:#93a39e;margin-top:4px;font-weight:600}' +
'#nx .nx-sub{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}' +
'#nx .nx-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 11px 5px 9px;border-radius:99px;background:rgba(var(--cr),.13);border:1px solid rgba(var(--cr),.32);color:var(--c);font-size:12px;font-weight:650;white-space:nowrap}' +
'#nx .nx-dot{width:7px;height:7px;border-radius:50%;background:var(--c);animation:nxPl 1.8s infinite}@keyframes nxPl{0%{box-shadow:0 0 0 0 rgba(var(--cr),.65)}70%,100%{box-shadow:0 0 0 7px rgba(var(--cr),0)}}' +
'#nx .nx-when{font-size:12.5px;color:#86968f}' +
'#nx .nx-ring{width:74px;height:74px;position:relative;flex:none}#nx .nx-ring svg{width:100%;height:100%;transform:rotate(-90deg)}#nx .nx-ring .c{position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1.05}#nx .nx-ring b{font:700 15px/1 ui-monospace,Menlo,monospace;color:var(--c)}#nx .nx-ring span{display:block;font-size:9.5px;color:#86968f;letter-spacing:.05em;text-transform:uppercase;margin-top:3px}' +
'#nx .nx-badge{width:62px;height:62px;border-radius:20px;display:grid;place-items:center;flex:none;background:linear-gradient(150deg,rgba(var(--cr),.3),rgba(var(--cr),.05));border:1px solid rgba(var(--cr),.4);color:var(--c);box-shadow:0 12px 30px rgba(var(--cr),.18)}#nx .nx-badge .nx-i{width:28px;height:28px}#nx .nx-badge svg:not(.nx-i){width:40px;height:40px}' +
'#nx .nx-card{position:relative;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}' +
'#nx .nx-jr{padding:14px 14px 12px;margin-bottom:12px}' +
'#nx .nx-flow{display:grid;grid-template-columns:auto 1fr auto 1fr auto;align-items:center;gap:6px}' +
'#nx .nx-nd{display:flex;flex-direction:column;align-items:center;gap:6px;width:76px;text-align:center}#nx .nx-nd small{font-size:11px;color:#b2c0bb;line-height:1.2;min-height:26px;overflow-wrap:anywhere}' +
'#nx .nx-o{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;position:relative;font-weight:800;font-size:16px}#nx .nx-o svg:not(.nx-i){width:44px;height:44px}' +
'#nx .nx-o.ok{background:linear-gradient(140deg,#a3fbe3,#45cfa8);color:#03251b;box-shadow:0 8px 22px rgba(69,207,168,.3)}' +
'#nx .nx-o.now{background:rgba(var(--cr),.14);border:1.5px solid var(--c);color:var(--c);box-shadow:0 0 0 6px rgba(var(--cr),.08),0 0 24px rgba(var(--cr),.35)}#nx .nx-o.now:after{content:"";position:absolute;inset:-7px;border-radius:19px;border:1.5px dashed rgba(var(--cr),.5);animation:nxRot 9s linear infinite}@keyframes nxRot{to{transform:rotate(360deg)}}' +
'#nx .nx-o.off{background:#151c1e;border:1px solid rgba(255,255,255,.1);color:#8a9b95}#nx .nx-o.bad{background:rgba(255,107,122,.14);border:1.5px solid #ff6b7a;color:#ff6b7a}' +
'#nx .nx-o .fl{position:absolute;right:-6px;bottom:-6px;font-size:12px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#0c1113;line-height:1}' +
'#nx .nx-nd .now+small{color:var(--c);font-weight:600}' +
'#nx .nx-pipe{height:4px;border-radius:9px;background:rgba(255,255,255,.08);position:relative;margin-bottom:32px;min-width:16px}#nx .nx-pipe.full{background:linear-gradient(90deg,#45cfa8,#62e8c2)}#nx .nx-pipe.go{background:linear-gradient(90deg,#45cfa8,var(--c))}' +
'#nx .nx-pipe.go:after{content:"";position:absolute;top:-3px;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 12px #fff,0 0 22px var(--c);animation:nxMv 2.2s ease-in-out infinite}@keyframes nxMv{0%{left:0;opacity:0}15%,85%{opacity:1}100%{left:calc(100% - 10px);opacity:0}}' +
'#nx .nx-pipe.wait{background:repeating-linear-gradient(90deg,rgba(255,255,255,.13) 0 6px,transparent 6px 12px)}#nx .nx-pipe.cut{background:repeating-linear-gradient(90deg,rgba(255,107,122,.5) 0 6px,transparent 6px 12px)}' +
'#nx .nx-st{display:flex;gap:9px;align-items:flex-start;margin-top:12px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.08);font-size:12.5px;line-height:1.45;color:#c4d0cc}#nx .nx-st .nx-i{color:var(--c);width:16px;height:16px;margin-top:1px}' +
'#nx .nx-tl{display:none;margin-top:10px;padding-top:4px;border-top:1px dashed rgba(255,255,255,.08)}' +
'#nx .nx-row{display:flex;gap:12px;padding:9px 0;position:relative}#nx .nx-row:before{content:"";position:absolute;left:11px;top:32px;bottom:-6px;width:2px;background:rgba(255,255,255,.08)}#nx .nx-row:last-child:before{display:none}#nx .nx-row.ok:before{background:#62e8c2}#nx .nx-row.ok.nx:before{background:linear-gradient(#62e8c2,var(--c))}' +
'#nx .nx-n{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;flex:none;background:#141b1d;border:1px solid rgba(255,255,255,.1);color:#6f807a}#nx .nx-n .nx-i{width:12px;height:12px}' +
'#nx .nx-row.ok .nx-n{background:#62e8c2;color:#03251b;border:0}#nx .nx-row.on .nx-n{background:rgba(var(--cr),.15);border:1.5px solid var(--c);color:var(--c);box-shadow:0 0 0 5px rgba(var(--cr),.12)}#nx .nx-row.bad .nx-n{background:#ff6b7a;color:#fff;border:0}' +
'#nx .nx-row b{display:block;font-size:13.5px;font-weight:600}#nx .nx-row.on b{color:var(--c)}#nx .nx-row.bad b{color:#ff6b7a}#nx .nx-row span{font-size:12px;color:#86968f}#nx .nx-row .t{margin-left:auto;font-size:12px;color:#93a39d;text-align:right;white-space:nowrap;padding-left:8px}' +
'#nx .nx-bc{position:relative;border-radius:22px;padding:15px 16px;margin-bottom:12px;overflow:hidden;background:linear-gradient(135deg,#123129 0%,#0c1a17 55%,#16130a 100%);border:1px solid rgba(98,232,194,.18);box-shadow:0 18px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}' +
'#nx .nx-bc:before{content:"";position:absolute;right:-40px;top:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(98,232,194,.2),transparent 65%);pointer-events:none}' +
'#nx .nx-bc:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.06) 48%,transparent 60%);animation:nxGl 7s ease-in-out infinite;pointer-events:none}@keyframes nxGl{0%,60%{transform:translateX(-100%)}100%{transform:translateX(100%)}}' +
'#nx .nx-bh{display:flex;align-items:center;gap:11px;position:relative}#nx .nx-bh .k{min-width:0;flex:1}#nx .nx-bh b{display:block;font-size:14.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'#nx .nx-av{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-weight:800;font-size:14px;color:#03251b;background:linear-gradient(140deg,#a3fbe3,#45cfa8);flex:none;position:relative}#nx .nx-av.c{background:none}#nx .nx-av svg:not(.nx-i){width:40px;height:40px}#nx .nx-av .fl{position:absolute;right:-6px;bottom:-6px;font-size:12px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#0c1113}' +
'#nx .nx-gets{margin-left:auto;text-align:right;flex:none;max-width:48%}#nx .nx-gets b{font:650 13.5px/1.3 ui-monospace,Menlo,monospace;color:#62e8c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'#nx .nx-lbl{display:block;font-size:11.5px;color:#86968f}' +
'#nx .nx-mono{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;letter-spacing:.02em}' +
'#nx .nx-main{position:relative;display:flex;align-items:center;justify-content:space-between;margin-top:14px;gap:8px}#nx .nx-main .v{min-width:0}#nx .nx-main .v b{display:block;font:600 15px/1.35 "JetBrains Mono",ui-monospace,Menlo,monospace;letter-spacing:.04em;overflow-wrap:anywhere}' +
'#nx .nx-cp{height:34px;min-width:34px;padding:0 10px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#cbd8d3;font-weight:600;font-size:12px;line-height:1;font-family:inherit;font-family:inherit;flex:none;cursor:pointer;transition:.15s;text-decoration:none}#nx .nx-cp:hover{background:rgba(255,255,255,.14)}#nx .nx-cp .nx-i{width:14px;height:14px}' +
'#nx .nx-cp.done{background:rgba(98,232,194,.16);color:#62e8c2;border-color:rgba(98,232,194,.35)}' +
'#nx .nx-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin-top:12px;position:relative}#nx .nx-facts>div{padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);min-width:0;cursor:default}#nx .nx-facts>div[data-copy]{cursor:copy}#nx .nx-facts>div[data-copy]:hover{border-color:rgba(98,232,194,.35)}' +
'#nx .nx-facts .gt{grid-column:1/-1;background:rgba(98,232,194,.07);border-color:rgba(98,232,194,.2)}#nx .nx-facts .gt b{color:#62e8c2;font-size:14px}html[data-theme="light"] #nx .nx-facts .gt b{color:#0a7a56}#nx .nx-facts b{display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#nx .nx-facts .cpd{border-color:rgba(98,232,194,.5)!important;background:rgba(98,232,194,.08)}' +
'#nx .nx-note{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.45;color:#c4d0cc;padding:11px 13px;border-radius:16px;background:rgba(var(--cr),.07);border:1px solid rgba(var(--cr),.18);margin-bottom:12px}#nx .nx-note .nx-i{color:var(--c);width:17px;height:17px;margin-top:1px}#nx .nx-note b{display:block;color:var(--c);margin-bottom:2px}' +
'#nx .nx-note.bad{--c:#ff6b7a;--cr:255,107,122}#nx .nx-note.ok{--c:#62e8c2;--cr:98,232,194}#nx .nx-note.dk{display:none}' +
'#nx .nx-acts{display:grid;grid-template-columns:repeat(var(--n,3),1fr) 1.6fr;gap:8px}' +
'#nx .nx-q{height:54px;border-radius:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);color:#dbe5e1;font-weight:600;font-size:10.5px;line-height:1.1;font-family:inherit;font-family:inherit;text-align:center;padding:0 4px;cursor:pointer;transition:.15s;min-width:0}#nx .nx-q:hover{background:rgba(255,255,255,.11);transform:translateY(-1px)}#nx .nx-q:active{transform:scale(.97)}#nx .nx-q .nx-i{width:17px;height:17px}#nx .nx-q[disabled]{opacity:.55;cursor:wait}#nx .nx-q.ld .nx-i{animation:nxRot .8s linear infinite}' +
'#nx .nx-q span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
'#nx .nx-pri{background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;font-size:15px;font-weight:700;border:0;box-shadow:0 12px 32px rgba(69,207,168,.3),inset 0 1px 0 rgba(255,255,255,.55)}#nx .nx-pri:hover{background:linear-gradient(135deg,#b8fde9,#4fd8b1)}' +
'#nx .nx-msg{font-size:12.5px;margin-top:8px;text-align:center;min-height:0}#nx .nx-msg.ok{color:#62e8c2}#nx .nx-msg.bad{color:#ff8d9a}' +
'#nx .nx-hint{display:none;text-align:center;font-size:11.5px;color:#64746f;margin-top:12px}' +
'#nx .nx-cols{display:block}' +
/* desktop */
'@media (min-width:900px){#nx .nx-m{left:50%;right:auto;top:50%;bottom:auto;width:min(900px,calc(100vw - 48px));max-height:calc(100vh - 48px);border-radius:30px;border-bottom:1px solid rgba(255,255,255,.08);transform:translate(-50%,-46%) scale(.97);opacity:0;transition:transform .3s cubic-bezier(.2,.9,.25,1),opacity .25s}#nx.in .nx-m{transform:translate(-50%,-50%);opacity:1}' +
'#nx .nx-m.narrow{width:min(520px,calc(100vw - 48px))}' +
'#nx .nx-sc{padding:22px 26px 22px}#nx .nx-grab{display:none}#nx .nx-amt{font-size:48px}#nx .nx-ring{width:88px;height:88px}#nx .nx-ring b{font-size:17px}' +
'#nx .nx-m:not(.narrow) .nx-cols{display:grid;grid-template-columns:1.05fr 1fr;gap:16px;align-items:start}#nx .nx-m:not(.narrow) .nx-jr{margin:0}#nx .nx-m:not(.narrow) .nx-tl{display:block}#nx .nx-m:not(.narrow) .nx-st{display:none}#nx .nx-m:not(.narrow) .nx-note.dk{display:flex}#nx .nx-hint{display:block}}' +
'@media (max-width:899px){#nx .nx-m.narrow .nx-tl,#nx .nx-tl.ph{display:block}}' +
'@media (max-width:370px){#nx .nx-sc{padding-left:14px;padding-right:14px}#nx .nx-nd{width:64px}#nx .nx-q{font-size:9.5px}}' +
/* light theme */
'html[data-theme="light"] #nx .nx-bd{background:rgba(15,23,42,.35)}' +
'html[data-theme="light"] #nx .nx-m{color:#0c111b;background:linear-gradient(180deg,#ffffff,#f4f7f3);border-color:rgba(15,23,42,.1);box-shadow:0 -30px 80px rgba(15,23,42,.25)}' +
'html[data-theme="light"] #nx .nx-m{--c:#b77900;--cr:214,150,20}html[data-theme="light"] #nx .nx-m.mint{--c:#0a7a56;--cr:10,140,100}html[data-theme="light"] #nx .nx-m.red{--c:#c42a44;--cr:196,42,68}html[data-theme="light"] #nx .nx-m.blue{--c:#1f6fd1;--cr:31,111,209}html[data-theme="light"] #nx .nx-m.vio{--c:#6a4fd6;--cr:106,79,214}html[data-theme="light"] #nx .nx-m.gray{--c:#566074;--cr:86,96,116}' +
'html[data-theme="light"] #nx .nx-au i{opacity:.16!important}html[data-theme="light"] #nx .nx-amt{background:linear-gradient(180deg,#0c111b,#334155);-webkit-background-clip:text;background-clip:text}' +
'html[data-theme="light"] #nx .nx-crumb,html[data-theme="light"] #nx .nx-st,html[data-theme="light"] #nx .nx-note{color:#334155}html[data-theme="light"] #nx .nx-crumb b{color:#0c111b}html[data-theme="light"] #nx .nx-when,html[data-theme="light"] #nx .nx-lbl,html[data-theme="light"] #nx .nx-row span,html[data-theme="light"] #nx .nx-amt2,html[data-theme="light"] #nx .nx-ring span{color:#64748b}' +
'html[data-theme="light"] #nx .nx-x,html[data-theme="light"] #nx .nx-q,html[data-theme="light"] #nx .nx-cp{background:#fff;border-color:rgba(15,23,42,.12);color:#1e293b;box-shadow:0 1px 2px rgba(15,23,42,.06)}html[data-theme="light"] #nx .nx-q:hover{background:#f1f5f2}' +
'html[data-theme="light"] #nx .nx-card{background:#fff;border-color:rgba(15,23,42,.09);box-shadow:0 1px 2px rgba(15,23,42,.05),0 12px 30px -20px rgba(15,23,42,.25)}' +
'html[data-theme="light"] #nx .nx-bc{background:linear-gradient(135deg,#e9f8f1,#f7fbf8 60%,#fdf8ea);border-color:rgba(10,122,86,.2);box-shadow:0 12px 30px -18px rgba(15,23,42,.3)}html[data-theme="light"] #nx .nx-bc:after{display:none}' +
'html[data-theme="light"] #nx .nx-facts>div{background:rgba(255,255,255,.75);border-color:rgba(15,23,42,.08)}html[data-theme="light"] #nx .nx-gets b{color:#0a7a56}' +
'html[data-theme="light"] #nx .nx-o.off,html[data-theme="light"] #nx .nx-n{background:#eef2ef;border-color:rgba(15,23,42,.1);color:#64748b}html[data-theme="light"] #nx .nx-o .fl,html[data-theme="light"] #nx .nx-av .fl{background:#fff}html[data-theme="light"] #nx .nx-nd small{color:#475569}' +
'html[data-theme="light"] #nx .nx-pipe{background:#e2e8e4}html[data-theme="light"] #nx .nx-pipe.wait{background:repeating-linear-gradient(90deg,#cbd5d0 0 6px,transparent 6px 12px)}html[data-theme="light"] #nx .nx-pipe.full{background:linear-gradient(90deg,#0b8a62,#2fbf8f)}html[data-theme="light"] #nx .nx-pipe.go:after{background:#fff;box-shadow:0 0 0 2px var(--c),0 0 14px var(--c)}' +
'html[data-theme="light"] #nx .nx-o.ok,html[data-theme="light"] #nx .nx-row.ok .nx-n,html[data-theme="light"] #nx .nx-av{background:linear-gradient(140deg,#2fbf8f,#0b8a62);color:#fff}html[data-theme="light"] #nx .nx-av.c{background:none}html[data-theme="light"] #nx .nx-row:before{background:#e2e8e4}html[data-theme="light"] #nx .nx-row.ok:before{background:#0b8a62}' +
'html[data-theme="light"] #nx .nx-pri{background:linear-gradient(135deg,#14a37a,#0a7a56);color:#fff;box-shadow:0 12px 28px -10px rgba(10,122,86,.55)}html[data-theme="light"] #nx .nx-grab{background:rgba(15,23,42,.18)}html[data-theme="light"] #nx .nx-hint{color:#94a3b8}' +
'html[data-theme="light"] #nx .nx-cp.done{background:#e3f7f0;color:#0a7a56;border-color:rgba(10,122,86,.35)}html[data-theme="light"] #nx .nx-msg.ok{color:#0a7a56}' +
'@media (prefers-reduced-motion:reduce){#nx *{animation:none!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  /* ───────── what is this transaction ───────── */
  function findWd(t) {
    var list = S().withdrawals || [], id = t && (t.wdId || (t.isWithdrawal && t.id));
    if (id) { var w = list.filter(function (x) { return x.id === id; })[0]; if (w) return w; }
    if (t && t.isWithdrawal && t.ts) { var c = list.filter(function (x) { return Math.abs((x.createdAt || 0) - t.ts) < 2000; })[0]; if (c) return c; }
    return null;
  }
  function kindOf(t) {
    var ty = String(t.type || '').toLowerCase(), d = String(t.desc || '').toLowerCase(), a = Number(t.amt) || 0;
    if (t.isWithdrawal || t.wdId || /^withdraw/.test(d)) return 'wd';
    if (t.pendingDeposit || ty === 'crypto' || (/deposit/.test(d) && /btc|eth|usdt|usdc|crypto/.test(d))) return 'cdep';
    if (t.depositRequest || /deposit/.test(d) || ty === 'bank' || ty === 'card' || ty === 'deposit') return /card/.test(d) || ty === 'card' ? 'kdep' : /bank|sepa|iban/.test(d) || ty === 'bank' ? 'bdep' : 'dep';
    if (ty === 'bonus' || /bonus|reward|cashback|referral/.test(d)) return 'bonus';
    if (/convert|exchange|swap/.test(d)) return 'exch';
    if (ty === 'trade' || /bought|sold|\bbuy\b|\bsell\b|trade/.test(d)) return 'trade';
    if (/transfer/.test(d)) return 'transfer';
    if (ty === 'correction' || /correction|adjust/.test(d)) return 'correction';
    return a >= 0 ? 'credit' : 'payment';
  }
  function stOf(s) { s = String(s || '').toLowerCase(); return /reject|fail|cancel|declin/.test(s) ? 'rej' : /review|pending|wait/.test(s) ? 'rev' : /process|sending|sent/.test(s) ? 'proc' : 'ok'; }
  function etaKey(m) { m = String(m || 'iban').toLowerCase(); return { iban: 'ETA1', sepa: 'ETA1', bsb: 'ETA1', swift: 'ETA13', card: 'ETA13', crypto: 'ETAh', etransfer: 'ETAm', payid: 'ETAm', eft: 'ETA12' }[m] || 'ETA1'; }
  function arriveBy(w, m) { var k = etaKey(m), n = k === 'ETA13' ? 3 : k === 'ETA12' ? 2 : k === 'ETA1' ? 1 : 0, d = new Date(w.reviewedAt || Date.now()); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; } return dt(d.getTime()); }
  function whereW(m) { m = String(m || '').toLowerCase(); return m === 'card' ? T('yourCardW') : m === 'crypto' ? T('yourWalletW') : T('yourBankAcc'); }

  /* ───────── building blocks ───────── */
  function node(cls, inner, label, flag) { return '<div class="nx-nd"><div class="nx-o ' + cls + '">' + inner + (flag ? '<span class="fl">' + flag + '</span>' : '') + '</div><small>' + esc(label) + '</small></div>'; }
  function flowBox(nodes, pipes, note, rows) {
    return '<div class="nx-card nx-jr"><div class="nx-flow">' + nodes[0] + '<div class="nx-pipe ' + pipes[0] + '"></div>' + nodes[1] + '<div class="nx-pipe ' + pipes[1] + '"></div>' + nodes[2] + '</div>' +
      (note ? '<div class="nx-st">' + ic(note[0]) + '<span>' + esc(note[1]) + '</span></div>' : '') +
      (rows ? '<div class="nx-tl">' + rows + '</div>' : '') + '</div>';
  }
  function row(state, n, title, sub, t, nx) { return '<div class="nx-row ' + state + (nx ? ' nx' : '') + '"><div class="nx-n">' + (state === 'ok' ? ic('ok') : state === 'bad' ? ic('x') : n) + '</div><div><b>' + esc(title) + '</b><span>' + esc(sub || '') + '</span></div><div class="t">' + esc(t || '') + '</div></div>'; }
  function ring(id, txt, sub, frac) { return '<div class="nx-ring"><svg viewBox="0 0 80 80"><defs><linearGradient id="nxg' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#62e8c2"/><stop offset="1" stop-color="var(--c)"/></linearGradient></defs><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(127,140,135,.18)" stroke-width="6"/><circle class="nx-arc" cx="40" cy="40" r="34" fill="none" stroke="url(#nxg' + id + ')" stroke-width="6" stroke-linecap="round" stroke-dasharray="213.6" stroke-dashoffset="' + (213.6 * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1) + '"/></svg><div class="c"><div><b class="nx-cd">' + esc(txt) + '</b><span>' + esc(sub) + '</span></div></div></div>'; }
  function badge(inner) { return '<div class="nx-badge">' + inner + '</div>'; }
  function chip(txt, live) { return '<span class="nx-chip">' + (live ? '<i class="nx-dot"></i>' : '') + esc(txt) + '</span>'; }
  function fact(label, val, copy, mono) { if (val == null || val === '') return ''; return '<div' + (copy ? ' data-copy="' + esc(copy) + '"' : '') + '><span class="nx-lbl">' + esc(label) + '</span><b' + (mono ? ' class="nx-mono"' : '') + '>' + esc(val) + '</b></div>'; }
  function cpBtn(v) { return '<button type="button" class="nx-cp" data-copy="' + esc(v) + '" aria-label="Copy">' + ic('cp') + '</button>'; }
  function countdown(ms) { ms = Math.max(0, ms); var h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); if (h >= 24) { var d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h'; } return h + ':' + ('0' + m).slice(-2); }

  /* ───────── model ───────── */
  function model(t) {
    var k = kindOf(t), w = k === 'wd' ? findWd(t) : null, st = stOf(t.status), now = Date.now(), M = { t: t, k: k, w: w };
    var amt = Number(t.amt) || 0;
    /* crypto credit/debit kept in coins */
    var cq = null; if (t.coin && !Number(t.amt) && t.coinAmt) { var q = Number(t.coinAmt) || 0, p = Number(S()[String(t.coin).toLowerCase() + 'P']) || 0, pThen = Number(t.px) || p; cq = { q: q, then: q * pThen, now: q * p }; amt = cq.then; }
    M.amt = amt; M.cq = cq;
    if (w) {
      var ws = w.status, hold = ws === 'pending' && w.holdUntil && w.holdUntil > now, d = w.details || {}, m = String(w.method || 'iban').toLowerCase();
      M.st = ws === 'rejected' ? 'rej' : ws === 'pending' ? 'rev' : (ws === 'approved' && !w.creditedAt) ? 'proc' : 'ok';
      M.hold = hold; M.m = m; M.d = d;
      M.amt = -(Number(w.amount) || Math.abs(amt));
      if (w.asset && w.assetAmount) M.coinLine = '−' + trimNum(w.assetAmount) + ' ' + w.asset;
      M.ts = w.createdAt || t.ts;
    } else { M.st = st; M.ts = t.ts; }
    M.color = M.st === 'rej' ? 'red' : M.st === 'rev' ? '' : M.st === 'proc' ? 'blue' : (k === 'trade' || k === 'exch') ? 'vio' : 'mint';
    return M;
  }

  /* ───────── render ───────── */
  var cur = null, uid = 0;
  function crumbFor(M) {
    var k = M.k, kind = k === 'wd' ? (M.m === 'crypto' ? T('cwd') : T('wd')) : T(k);
    var sub = '';
    if (k === 'wd') sub = M.m === 'crypto' ? (M.d.network || M.d.coin || 'Crypto') : M.m.toUpperCase();
    else if (k === 'cdep') sub = String(M.t.symbol || M.t.coin || '').toUpperCase();
    return { icon: k === 'wd' ? (M.m === 'crypto' ? 'wal' : M.m === 'card' ? 'card' : 'bank') : k === 'cdep' ? 'net' : (k === 'bdep' || k === 'dep') ? 'bank' : k === 'kdep' ? 'card' : k === 'bonus' ? 'gift' : (k === 'trade' || k === 'exch') ? 'swap' : /card payment|card purchase/i.test(M.t.desc || '') ? 'card' : (M.amt >= 0 ? 'in' : 'out'), kind: kind, sub: sub };
  }
  function statusTxt(M) { return M.st === 'rej' ? T('rejected') : M.st === 'rev' ? T('review') : M.st === 'proc' ? (M.k === 'wd' ? T('sending') : T('processing')) : T('completed'); }
  function amountTxt(M) {
    if (M.cq) return (M.cq.q > 0 ? '+' : '−') + trimNum(Math.abs(M.cq.q)) + ' ' + String(M.t.coin).toUpperCase();
    var a = M.amt; return (a > 0 ? '+' : a < 0 ? '−' : '') + money(Math.abs(a));
  }

  function heroRight(M) {
    if (M.k === 'wd' && M.hold) { var tot = Math.max(1, M.w.holdUntil - (M.w.createdAt || M.w.holdUntil - 864e5)), left = M.w.holdUntil - Date.now(); return ring(++uid, countdown(left), T('left'), left / tot); }
    var ic2 = M.st === 'rej' ? ic('stop') : M.st === 'rev' ? ic('clock') : M.st === 'proc' ? ic('net') : M.k === 'cdep' ? coinIc(M.t.symbol || M.t.coin) : (M.k === 'trade' || M.k === 'exch') ? ic('swap') : ic('ok');
    return badge(ic2);
  }

  function wdView(M) {
    var w = M.w, d = M.d, m = M.m, s = M.st, crypto = m === 'crypto', card = m === 'card';
    var cc = ccOf(d), flag = flagOf(cc);
    var destName = crypto ? T('wallet') : card ? T('yourCard') : (d.bank || T('bank'));
    var destIc = crypto ? (d.coin && COIN[String(d.coin).toUpperCase()] ? coinIc(d.coin) : ic('wal')) : card ? ic('card') : ic('bank');
    var n1 = node('ok', 'N', T('yourBal'));
    var n2, n3, p1, p2;
    if (s === 'rev') { n2 = node('now', ic('sh'), T('check')); n3 = node('off', destIc, destName, flag); p1 = 'go'; p2 = 'wait'; }
    else if (s === 'proc') { n2 = node('ok', ic('sh'), T('check')); n3 = node('now', destIc, destName, flag); p1 = 'full'; p2 = 'go'; }
    else if (s === 'rej') { n2 = node('bad', ic('stop'), T('stopped')); n3 = node('off', destIc, destName, flag); p1 = 'full'; p2 = 'cut'; }
    else { n2 = node('ok', ic('sh'), T('check')); n3 = node('ok', destIc, destName, flag); p1 = 'full'; p2 = 'full'; }
    var eta = T(etaKey(m));
    var note = s === 'rev' ? (M.hold ? ['sh', T('firstNote')] : ['clock', T('queueNote')]) : s === 'proc' ? ['clock', T('sentNote', { w: whereW(m) }) + ' ' + eta + '.'] : s === 'rej' ? ['ok', T('returned') + '. ' + T('stopNote')] : ['ok', T('arrivedNote', { w: whereW(m) })];
    var rows = row('ok', 1, T('received'), T('reserved'), dt(w.createdAt, 1), s === 'rev');
    if (s === 'rev') rows += row('on', 2, M.hold ? T('safety') : T('inReview'), M.hold ? T('firstNote').split('.')[0] : T('teamChecks'), M.hold ? T('until', { d: dt(w.holdUntil, 1) }) : '') + row('', 3, T('sentBank'), T('afterAppr'), '') + row('', 4, T('creditedS'), eta, '');
    else if (s === 'rej') rows += row('bad', 2, T('notAppr'), w.reason || T('stopNote'), dt(w.reviewedAt, 1)) + row('ok', 3, T('returned'), T('stopNote'), dt(w.reviewedAt, 1));
    else rows += row('ok', 2, T('reviewed'), '', dt(w.reviewedAt, 1)) + row('ok', 3, T('sentBank'), '', dt(w.reviewedAt, 1), s === 'proc') + (s === 'proc' ? row('on', 4, T('creditedS'), eta, '') : row('ok', 4, T('creditedS'), '', dt(w.creditedAt, 1)));
    var left = flowBox([n1, n2, n3], [p1, p2], note, rows);

    /* recipient card */
    var name = crypto ? '' : (d.name || d.cardName || ''), main = '', mainLbl = '';
    if (crypto) { main = d.address || ''; mainLbl = T('address'); }
    else if (d.iban) { main = ibanFmt(d.iban); mainLbl = 'IBAN'; }
    else if (d.dest) { main = d.dest; mainLbl = String(d.rail || '').toUpperCase(); }
    else if (d.cardNumber) { main = d.cardNumber; mainLbl = T('cardNo'); }
    var gets = '';
    if (crypto && d.coinAmount) gets = '≈ ' + trimNum(d.coinAmount) + ' ' + (d.coin || '');
    else if (d.payAmount && d.payCurrency) gets = '≈ ' + d.payAmount + ' ' + d.payCurrency;
    var av = crypto ? '<div class="nx-av c">' + (COIN[String(d.coin || '').toUpperCase()] || '<div class="nx-av">' + ic('wal') + '</div>') + '</div>' : '<div class="nx-av">' + esc(initials(name || d.bank)) + (flag ? '<span class="fl">' + flag + '</span>' : '') + '</div>';
    var title = crypto ? ((d.coin ? String(d.coin).toUpperCase() + ' · ' : '') + (d.network || T('wallet'))) : (name || d.bank || T('bank'));
    var subT = crypto ? T('address') : (d.bank && name ? d.bank : (d.country || ''));
    var facts = '';
    if (crypto) facts = fact(T('network'), d.network, d.network) + fact(T('coin'), d.coin) + fact(T('ref'), shortId(w.id), w.id, 1);
    else facts = fact('SWIFT / BIC', d.swift, d.swift, 1) + fact(s === 'ok' ? T('creditedS') : T('arrives'), s === 'ok' ? dt(w.creditedAt) : s === 'proc' ? arriveBy(w, m) : '') + fact(T('ref'), shortId(w.id), w.id, 1);
    if (M.coinLine) facts = fact(T('paidFrom'), T('holding', { c: w.asset })) + facts;
    if (card && d.expiry) facts += fact('Exp.', d.expiry);
    if (d.memo) facts += fact('Memo', d.memo, d.memo);
    if (gets) facts = '<div class="gt"><span class="nx-lbl">' + esc(crypto ? T('youGet') : T('theyGet')) + '</span><b class="nx-mono">' + esc(gets) + '</b></div>' + facts;
    var rc = '<div class="nx-bc"><div class="nx-bh">' + av + '<div class="k"><b>' + esc(title) + '</b><span class="nx-lbl">' + esc(subT) + '</span></div></div>' +
      (main ? '<div class="nx-main"><div class="v"><span class="nx-lbl">' + esc(mainLbl) + '</span><b>' + esc(main) + '</b></div>' + cpBtn(String(main).replace(/\s/g, '')) + '</div>' : '') +
      '<div class="nx-facts">' + facts + '</div></div>';
    var extra = '';
    if (s === 'rej') extra = '<div class="nx-note bad">' + ic('warn') + '<span><b>' + esc(T('reason')) + '</b>' + esc(w.reason || T('stopNote')) + '</span></div>';
    else extra = '<div class="nx-note dk">' + ic(note[0]) + '<span>' + esc(note[1]) + '</span></div>';
    return { left: left, right: (s === 'rej' ? extra + rc : rc + extra), wide: true };
  }

  function depView(M) {
    var t = M.t, s = M.st, k = M.k, crypto = k === 'cdep', sym = String(t.symbol || t.coin || '').toUpperCase();
    var srcIc = crypto ? (COIN[sym] ? coinIc(sym) : ic('net')) : k === 'kdep' ? ic('card') : ic('bank');
    var srcN = crypto ? T('network') : k === 'kdep' ? T('yourCard') : T('yourBank');
    var n1, n2, n3, p1, p2;
    if (s === 'rev') { n1 = node('ok', srcIc, srcN); n2 = node('now', ic('sh'), T('check')); n3 = node('off', 'N', T('yourBal')); p1 = 'go'; p2 = 'wait'; }
    else if (s === 'rej') { n1 = node('ok', srcIc, srcN); n2 = node('bad', ic('stop'), T('stopped')); n3 = node('off', 'N', T('yourBal')); p1 = 'full'; p2 = 'cut'; }
    else { n1 = node('ok', srcIc, srcN); n2 = node('ok', ic('sh'), T('check')); n3 = node('ok', 'N', T('yourBal')); p1 = 'full'; p2 = 'full'; }
    var note = s === 'rev' ? ['clock', T('depNote')] : s === 'rej' ? ['warn', T('depRej')] : ['ok', T('nowAvail')];
    var rows = row('ok', 1, T('received'), t.desc || '', dt(t.ts, 1), s === 'rev') + (s === 'rev' ? row('on', 2, T('inReview'), T('teamChecks'), '') + row('', 3, T('creditedS'), '', '') : s === 'rej' ? row('bad', 2, T('notAppr'), t.reason || '', '') : row('ok', 2, T('creditedS'), T('nowAvail'), dt(t.ts, 1)));
    var left = flowBox([n1, n2, n3], [p1, p2], note, rows);
    var hash = t.hash ? String(t.hash) : '', exp = hash ? (sym === 'BTC' ? 'https://mempool.space/tx/' + hash : sym === 'ETH' || sym === 'USDT' || sym === 'USDC' ? 'https://etherscan.io/tx/' + hash : '') : '';
    var facts = fact(T('amount'), money(Math.abs(M.amt))) + (crypto && t.crypto ? fact(T('coin'), trimNum(t.crypto) + ' ' + sym) : fact(T('method'), (String(t.desc || '').match(/via (.+)$/i) || [])[1] || ''));
    var rc = '<div class="nx-bc"><div class="nx-bh"><div class="nx-av' + (crypto && COIN[sym] ? ' c' : '') + '">' + (crypto && COIN[sym] ? coinIc(sym) : ic(k === 'kdep' ? 'card' : 'bank')) + '</div><div class="k"><b>' + esc(t.desc || T(k)) + '</b><span class="nx-lbl">' + esc(T(k)) + '</span></div></div>' +
      (hash ? '<div class="nx-main"><div class="v"><span class="nx-lbl">Tx hash</span><b style="font-size:13px">' + esc(hash.slice(0, 14) + '…' + hash.slice(-10)) + '</b></div><span style="display:flex;gap:6px">' + (exp ? '<a class="nx-cp" href="' + esc(exp) + '" target="_blank" rel="noopener" aria-label="' + esc(T('explorer')) + '">' + ic('ext') + '</a>' : '') + cpBtn(hash) + '</span></div>' : '') +
      '<div class="nx-facts">' + facts + '</div></div>';
    var extra = s === 'rej' ? '<div class="nx-note bad">' + ic('warn') + '<span><b>' + esc(T('reason')) + '</b>' + esc(t.reason || T('depRej')) + '</span></div>' : '<div class="nx-note dk">' + ic(note[0]) + '<span>' + esc(note[1]) + '</span></div>';
    return { left: left, right: (s === 'rej' ? extra + rc : rc + extra), wide: true };
  }

  function plainView(M) {
    var t = M.t, facts = fact(T('amount'), M.cq ? money(M.cq.then) : money(Math.abs(M.amt)));
    if (M.cq && Math.abs(M.cq.now - M.cq.then) > 0.005 * Math.max(1, M.cq.then)) facts += fact(T('valueNow'), money(M.cq.now));
    if (t.symbol && t.crypto) facts += fact(T('coin'), trimNum(t.crypto) + ' ' + t.symbol);
    if (t.to) facts += fact(T('address'), t.to, t.to, 1);
    var hash = t.hash ? String(t.hash) : '';
    var body = '<div class="nx-bc"><div class="nx-bh"><div class="nx-av' + (M.cq && COIN[String(t.coin).toUpperCase()] ? ' c' : '') + '">' + (M.cq && COIN[String(t.coin).toUpperCase()] ? coinIc(t.coin) : ic(crumbFor(M).icon)) + '</div><div class="k"><b>' + esc(t.desc || T(M.k)) + '</b><span class="nx-lbl">' + esc(T(M.k)) + '</span></div></div>' +
      (hash ? '<div class="nx-main"><div class="v"><span class="nx-lbl">Tx hash</span><b style="font-size:13px">' + esc(hash.slice(0, 14) + '…' + hash.slice(-10)) + '</b></div>' + cpBtn(hash) + '</div>' : '') +
      '<div class="nx-facts">' + facts + '</div></div>';
    if (M.st === 'rej' && t.reason) body = '<div class="nx-note bad">' + ic('warn') + '<span><b>' + esc(T('reason')) + '</b>' + esc(t.reason) + '</span></div>' + body;
    if (M.st === 'rev') body += '<div class="nx-note">' + ic('clock') + '<span>' + esc(T('teamChecks')) + '</span></div>';
    return { left: '', right: body, wide: false };
  }

  function canReceipt(M) { return !!(M.w || (M.t.ts && M.st !== 'rev')); }
  function render(t) {
    var M = model(t), c = crumbFor(M), v = M.k === 'wd' && M.w ? wdView(M) : (M.k === 'dep' || M.k === 'bdep' || M.k === 'kdep' || M.k === 'cdep') ? depView(M) : plainView(M);
    cur = { t: t, M: M, sig: sig(t) };
    var sub2 = M.cq ? '≈ ' + money(M.cq.then) : M.coinLine ? M.coinLine : '';
    var acts = [];
    if (canReceipt(M)) acts.push('<button type="button" class="nx-q" data-act="receipt">' + ic('dl') + '<span>' + esc(T('receipt')) + '</span></button>');
    acts.push('<button type="button" class="nx-q" data-act="share">' + ic('share') + '<span>' + esc(T('share')) + '</span></button>');
    acts.push('<button type="button" class="nx-q" data-act="help">' + ic('chat') + '<span>' + esc(T('help')) + '</span></button>');
    var html = '<div class="nx-au"><i></i><i></i><i></i></div><div class="nx-sc"><div class="nx-grab"></div>' +
      '<div class="nx-top"><div class="nx-crumb">' + ic(c.icon) + '<span>' + esc(c.kind) + (c.sub ? ' · <b>' + esc(c.sub) + '</b>' : '') + '</span></div><button type="button" class="nx-x" data-act="close" aria-label="' + esc(T('close')) + '">' + ic('x') + '</button></div>' +
      '<div class="nx-hero"><div><div class="nx-amt">' + esc(amountTxt(M)) + '</div>' + (sub2 ? '<div class="nx-amt2">' + esc(sub2) + '</div>' : '') + '<div class="nx-sub">' + chip(statusTxt(M), M.st === 'rev' || M.st === 'proc') + '<span class="nx-when">' + esc(dt(M.ts, 1)) + '</span></div></div>' + heroRight(M) + '</div>' +
      (v.wide ? '<div class="nx-cols">' + v.left + '<div>' + v.right + actsHtml(acts) + '</div></div>' : v.right + actsHtml(acts)) +
      '<div class="nx-hint">' + esc(T('hint')) + '</div></div>';
    var box = root().querySelector('.nx-m');
    box.className = 'nx-m ' + M.color + (v.wide ? '' : ' narrow');
    box.setAttribute('aria-label', c.kind + ' ' + amountTxt(M));
    box.innerHTML = html;
  }
  function actsHtml(a) { return '<div class="nx-acts" style="--n:' + a.length + '">' + a.join('') + '<button type="button" class="nx-q nx-pri" data-act="close">' + esc(T('done')) + '</button></div><div class="nx-msg" aria-live="polite"></div>'; }
  function sig(t) { var w = findWd(t); return JSON.stringify([t.status, w && [w.status, w.reviewedAt, w.creditedAt, w.holdUntil, w.reason]]); }

  /* ───────── shell ───────── */
  var el = null, tick = null, lastFocus = null;
  function root() {
    if (el) return el; css();
    el = document.createElement('div'); el.id = 'nx'; el.className = 'nc-no-i18n'; el.setAttribute('data-nci18n', 'off');
    el.innerHTML = '<div class="nx-bd" data-act="close"></div><div class="nx-m" role="dialog" aria-modal="true" tabindex="-1"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    swipe(el.querySelector('.nx-m'));
    return el;
  }
  function open(t) {
    if (!t) return; root(); lastFocus = document.activeElement;
    render(t); el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); try { el.querySelector('.nx-m').focus({ preventScroll: true }); } catch (e) { } }); });
    clearInterval(tick); tick = setInterval(live, 1000);
  }
  function close() {
    if (!el || !el.classList.contains('on')) return; el.classList.remove('in'); clearInterval(tick); cur = null;
    setTimeout(function () { if (!el.classList.contains('in')) { el.classList.remove('on'); var m = el.querySelector('.nx-m'); m.style.transform = ''; } }, 320);
    document.documentElement.style.overflow = '';
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
  }
  window.NCTxCard = { open: open, close: close };
  function live() {
    if (!cur) return;
    try {
      if (sig(cur.t) !== cur.sig) { var sc = el.querySelector('.nx-sc'), y = sc ? sc.scrollTop : 0; render(cur.t); var s2 = el.querySelector('.nx-sc'); if (s2) s2.scrollTop = y; return; }
      var w = cur.M.w; if (w && cur.M.hold) {
        var left = w.holdUntil - Date.now(); if (left <= 0) { render(cur.t); return; }
        var cd = el.querySelector('.nx-cd'); if (cd) cd.textContent = countdown(left);
        var tot = Math.max(1, w.holdUntil - (w.createdAt || w.holdUntil - 864e5)), arc = el.querySelector('.nx-arc'); if (arc) arc.setAttribute('stroke-dashoffset', (213.6 * (1 - left / tot)).toFixed(1));
      }
    } catch (e) { }
  }
  function msg(txt, bad) { var m = el.querySelector('.nx-msg'); if (!m) return; m.className = 'nx-msg ' + (bad ? 'bad' : 'ok'); m.textContent = txt; clearTimeout(m._t); m._t = setTimeout(function () { m.textContent = ''; }, 4000); }
  function copy(v, node) {
    var done = function () { if (node) { node.classList.add(node.classList.contains('nx-cp') ? 'done' : 'cpd'); var o = node.innerHTML; if (node.classList.contains('nx-cp')) node.innerHTML = ic('ok'); setTimeout(function () { node.classList.remove('done', 'cpd'); if (node.classList.contains('nx-cp')) node.innerHTML = o; }, 1600); } msg(T('copied') + ' ✓'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(v).then(done, function () { legacy(v); done(); }); return; } } catch (e) { }
    legacy(v); done();
  }
  function legacy(v) { try { var ta = document.createElement('textarea'); ta.value = v; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) { } }
  function onClick(e) {
    var a = e.target.closest('[data-act],[data-copy]'); if (!a || !el.contains(a)) return;
    if (a.hasAttribute('data-copy') && !a.hasAttribute('data-act')) { e.preventDefault(); copy(a.getAttribute('data-copy'), a); return; }
    var act = a.getAttribute('data-act');
    if (act === 'close') return close();
    if (!cur) return;
    var M = cur.M;
    if (act === 'help') { close(); setTimeout(function () { try { var p = document.getElementById('chatPanel'); if (!(p && p.classList.contains('open')) && typeof window.toggleChat === 'function') window.toggleChat(); } catch (e2) { } }, 340); return; }
    if (act === 'share') {
      var txt = T('shareText', { k: crumbFor(M).kind, a: amountTxt(M), s: statusTxt(M), d: dt(M.ts, 1) }) + (M.w ? ' · ' + T('ref') + ' ' + M.w.id : '');
      try { if (navigator.share) { navigator.share({ title: 'NordicCrypto', text: txt }).catch(function () { }); return; } } catch (e3) { }
      copy(txt, a); return;
    }
    if (act === 'receipt') {
      var R = window.NCReceipt; if (!R || !R.issue) { msg('Receipt is not available right now.', true); return; }
      var req = M.w ? { kind: 'wd', id: M.w.id } : { kind: 'tx', ts: M.t.ts, desc: M.t.desc };
      if (a.disabled) return; a.disabled = true; a.classList.add('ld');
      R.issue(req).then(function (r) { a.disabled = false; a.classList.remove('ld'); msg(r.ok ? T('receipt') + ' ✓' : (r.error || 'Could not create the receipt.'), !r.ok); });
    }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el && el.classList.contains('on')) { e.stopPropagation(); close(); } }, true);
  function swipe(m) {
    var y0 = null, dy = 0;
    m.addEventListener('touchstart', function (e) { if (window.innerWidth >= 900) return; var sc = m.querySelector('.nx-sc'); var onGrab = e.target.closest('.nx-grab,.nx-top,.nx-hero'); if (!onGrab && sc && sc.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; m.style.transition = 'none'; }, { passive: true });
    m.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) m.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    m.addEventListener('touchend', function () { if (y0 == null) return; m.style.transition = ''; if (dy > 110) close(); else m.style.transform = ''; y0 = null; });
  }
  window.addEventListener('nc-lang', function () { if (cur) setTimeout(function () { if (cur) render(cur.t); }, 60); });

  /* ───────── history list (Transactions page) ───────── */
  (function listCss() {
    if (document.getElementById('nxListCss')) return; var s = document.createElement('style'); s.id = 'nxListCss';
    s.textContent =
'#tx .tbl{background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important;padding:0!important}#tx .tbl table{display:block;width:100%;border-collapse:separate}#tx .tbl thead{display:none}#tx .tbl tbody{display:block;width:100%}' +
'#tx .tbl tbody tr.nxr{--c:#62e8c2;--cr:98,232,194;display:grid;grid-template-columns:46px auto minmax(0,1fr) auto;grid-template-areas:"ic desc desc amt" "ic typ date st";align-items:center;column-gap:12px;row-gap:3px;padding:12px 16px 12px 12px;margin:0 0 8px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.06);transition:transform .18s,border-color .18s,background .18s;outline:none}' +
'#tx .tbl tbody tr.nxr:hover,#tx .tbl tbody tr.nxr:focus-visible{transform:translateY(-1px);border-color:rgba(var(--cr),.35);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025))}' +
'#tx .tbl tbody tr.nxr.pp-hide{display:none}' +
'#tx .tbl tbody tr.nxr:before{content:"";grid-area:ic;width:44px;height:44px;border-radius:14px;background:rgba(var(--cr),.13);box-shadow:inset 0 0 0 1px rgba(var(--cr),.18)}' +
'#tx .tbl tbody tr.nxr:after{content:"";grid-area:ic;justify-self:center;width:20px;height:20px;background:var(--c);-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center}' +
'#tx .tbl tbody tr.nxr-in:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M17%207%207%2017m0%200h8m-8%200V9%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M17%207%207%2017m0%200h8m-8%200V9%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-out:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M7%2017%2017%207m0%200H9m8%200v8%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M7%2017%2017%207m0%200H9m8%200v8%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-swap:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M7%204v14m0%200-3-3m3%203%203-3M17%2020V6m0%200-3%203m3-3%203%203%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M7%204v14m0%200-3-3m3%203%203-3M17%2020V6m0%200-3%203m3-3%203%203%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-gift:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%224%22%20y%3D%229%22%20width%3D%2216%22%20height%3D%2211%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M4%2013h16M12%209v11M12%209c-1.5-3-5-3.5-5-1.2C7%209%209.5%209%2012%209zm0%200c1.5-3%205-3.5%205-1.2C17%209%2014.5%209%2012%209z%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%224%22%20y%3D%229%22%20width%3D%2216%22%20height%3D%2211%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M4%2013h16M12%209v11M12%209c-1.5-3-5-3.5-5-1.2C7%209%209.5%209%2012%209zm0%200c1.5-3%205-3.5%205-1.2C17%209%2014.5%209%2012%209z%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-card:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%223%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2213%22%20rx%3D%223%22%2F%3E%3Cpath%20d%3D%22M3%2010.5h18M7%2015h4%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%223%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2213%22%20rx%3D%223%22%2F%3E%3Cpath%20d%3D%22M3%2010.5h18M7%2015h4%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-coin:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%228.5%22%2F%3E%3Cpath%20d%3D%22M10%208.5h3a1.8%201.8%200%200%201%200%203.5h-3zm0%203.5h3.5a1.9%201.9%200%200%201%200%203.8H10zM10%208.5v7.3%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%228.5%22%2F%3E%3Cpath%20d%3D%22M10%208.5h3a1.8%201.8%200%200%201%200%203.5h-3zm0%203.5h3.5a1.9%201.9%200%200%201%200%203.8H10zM10%208.5v7.3%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-fix:after{-webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M14.7%206.3a4%204%200%200%200-5.4%205.2L4%2016.8V20h3.2l5.3-5.3a4%204%200%200%200%205.2-5.4l-2.5%202.5-2.6-.6-.6-2.6z%22%2F%3E%3C%2Fsvg%3E\");mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M14.7%206.3a4%204%200%200%200-5.4%205.2L4%2016.8V20h3.2l5.3-5.3a4%204%200%200%200%205.2-5.4l-2.5%202.5-2.6-.6-.6-2.6z%22%2F%3E%3C%2Fsvg%3E\")}' +
'#tx .tbl tbody tr.nxr-out,#tx .tbl tbody tr.nxr-card{--c:#c9d6d1;--cr:201,214,209}#tx .tbl tbody tr.nxr-swap{--c:#b49cff;--cr:180,156,255}#tx .tbl tbody tr.nxr-gift{--c:#ffc24a;--cr:255,194,74}#tx .tbl tbody tr.nxr-coin{--c:#7da2ff;--cr:125,162,255}' +
'#tx .tbl tbody tr.nxs-rev{--c:#ffc24a!important;--cr:255,194,74!important}#tx .tbl tbody tr.nxs-rej{--c:#ff6b7a!important;--cr:255,107,122!important}#tx .tbl tbody tr.nxs-proc{--c:#6fb2ff!important;--cr:111,178,255!important}' +
'#tx .tbl tbody tr.nxr>td{display:block;padding:0!important;border:0!important;min-width:0;width:auto;background:none!important}' +
'#tx .tbl tbody tr.nxr>td:nth-child(1){grid-area:date;font-size:12px;color:var(--mut,#86968f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'#tx .tbl tbody tr.nxr>td:nth-child(2){grid-area:typ;line-height:1}#tx .tbl tbody tr.nxr>td:nth-child(2) .pp-kd,#tx .tbl tbody tr.nxr>td:nth-child(2) .nc-type-chip{font-size:9.5px;padding:3px 7px;border-radius:6px}' +
'#tx .tbl tbody tr.nxr>td:nth-child(3){grid-area:desc;font-weight:620;font-size:14.5px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'#tx .tbl tbody tr.nxr>td:nth-child(4){grid-area:amt;text-align:right;font-weight:700;font-size:15px;white-space:nowrap;font-variant-numeric:tabular-nums}' +
'#tx .tbl tbody tr.nxr>td:nth-child(5){grid-area:st;text-align:right;white-space:nowrap}' +
'#tx .tbl tbody tr.nxr>td:nth-child(5) .badge{background:none!important;border:0!important;padding:0!important;font-size:11.5px;font-weight:650;color:#62e8c2}#tx .tbl tbody tr.nxs-rev>td:nth-child(5) .badge{color:#ffc24a}#tx .tbl tbody tr.nxs-rej>td:nth-child(5) .badge{color:#ff6b7a}#tx .tbl tbody tr.nxs-proc>td:nth-child(5) .badge{color:#6fb2ff}' +
'#tx .tbl tbody tr.nxs-rev>td:nth-child(5) .badge:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;vertical-align:1px;animation:nxPl2 1.8s infinite}@keyframes nxPl2{0%{box-shadow:0 0 0 0 rgba(255,194,74,.6)}70%,100%{box-shadow:0 0 0 6px rgba(255,194,74,0)}}' +
'#tx .tbl tr.pp-day{display:block;margin:16px 4px 8px}#tx .tbl tr.pp-day:first-child{margin-top:4px}#tx .tbl tr.pp-day>td{display:block;padding:0!important;background:none!important;border:0!important;font-size:11.5px!important;letter-spacing:.08em}' +
'@media (min-width:900px){#tx .tbl tbody tr.nxr{grid-template-columns:46px minmax(0,1.3fr) minmax(0,.8fr) 140px 130px;grid-template-areas:"ic desc typ amt st" "ic date typ amt st";padding:12px 20px 12px 12px}#tx .tbl tbody tr.nxr>td:nth-child(5){text-align:right}#tx .tbl tbody tr.nxr>td:nth-child(2){align-self:center}}' +
'@media (max-width:420px){#tx .tbl tbody tr.nxr{grid-template-columns:42px auto minmax(0,1fr) auto;column-gap:10px;padding:11px 12px 11px 10px}#tx .tbl tbody tr.nxr:before{width:40px;height:40px;border-radius:13px}#tx .tbl tbody tr.nxr>td:nth-child(3){font-size:14px}#tx .tbl tbody tr.nxr>td:nth-child(4){font-size:14px}}' +
'html[data-theme="light"] #tx .tbl tbody tr.nxr{background:#fff;border-color:rgba(15,23,42,.08);box-shadow:0 1px 2px rgba(15,23,42,.04)}html[data-theme="light"] #tx .tbl tbody tr.nxr:hover{background:#fbfcfb}' +
'html[data-theme="light"] #tx .tbl tbody tr.nxr{--c:#0a7a56;--cr:10,122,86}html[data-theme="light"] #tx .tbl tbody tr.nxr-out,html[data-theme="light"] #tx .tbl tbody tr.nxr-card{--c:#475569;--cr:71,85,105}html[data-theme="light"] #tx .tbl tbody tr.nxr-swap{--c:#6a4fd6;--cr:106,79,214}html[data-theme="light"] #tx .tbl tbody tr.nxr-gift{--c:#b77900;--cr:183,121,0}html[data-theme="light"] #tx .tbl tbody tr.nxr-coin{--c:#1f6fd1;--cr:31,111,209}' +
'html[data-theme="light"] #tx .tbl tbody tr.nxs-rev{--c:#b77900!important;--cr:183,121,0!important}html[data-theme="light"] #tx .tbl tbody tr.nxs-rej{--c:#c42a44!important;--cr:196,42,68!important}html[data-theme="light"] #tx .tbl tbody tr.nxs-proc{--c:#1f6fd1!important;--cr:31,111,209!important}' +
'html[data-theme="light"] #tx .tbl tbody tr.nxr>td:nth-child(5) .badge{color:#0a7a56}html[data-theme="light"] #tx .tbl tbody tr.nxs-rev>td:nth-child(5) .badge{color:#b77900}html[data-theme="light"] #tx .tbl tbody tr.nxs-rej>td:nth-child(5) .badge{color:#c42a44}html[data-theme="light"] #tx .tbl tbody tr.nxs-proc>td:nth-child(5) .badge{color:#1f6fd1}' +
'@media (max-width:700px){#tx .pp-sum{grid-template-columns:1fr 1fr!important;gap:8px!important;margin-bottom:12px!important}#tx .pp-sum>div{padding:11px 13px!important;border-radius:16px!important}#tx .pp-sum>div:nth-child(3){grid-column:1/-1;display:flex;align-items:center;justify-content:space-between}#tx .pp-sum b{font-size:1.05rem!important;margin-top:3px!important}#tx .pp-sum>div:nth-child(3) b{margin:0!important}#tx .pp-sum small{font-size:.62rem!important}' +
'#tx .pp-tools{gap:8px!important}#tx .pp-chips{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;width:100%;padding-bottom:2px;-webkit-mask:linear-gradient(90deg,#000 90%,transparent);mask:linear-gradient(90deg,#000 90%,transparent)}#tx .pp-chips::-webkit-scrollbar{display:none}#tx .pp-chip{flex:none;padding:7px 13px!important}#tx .pp-q{flex:1 1 0!important;min-width:0!important}#tx #ppCsv{flex:none}}' +
'@media (prefers-reduced-motion:reduce){#tx .tbl tbody tr.nxr{transition:none}#tx .tbl tbody tr.nxs-rev>td:nth-child(5) .badge:before{animation:none}}';
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ───────── take over the transaction window ───────── */
  function install() {
    window.openTxDetails = function (t) { try { open(t); } catch (e) { console.error('[tx-card]', e); } };
  }
  install();
  /* some scripts wrap openTxDetails later; keep ours on top */
  var tries = 0, keep = setInterval(function () { tries++; if (window.openTxDetails && !window.openTxDetails.__nx) { var f = function (t) { try { open(t); } catch (e) { console.error('[tx-card]', e); } }; f.__nx = 1; window.openTxDetails = f; } if (tries > 20) clearInterval(keep); }, 500);
  window.openTxDetails.__nx = 1;
})();
