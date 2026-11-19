/* NordicCrypto — deposit-v5.js v1
   "Add money" in the new design: choose method + amount → details (your Nordic IBAN with reference, card form,
   or crypto address with QR) → "waiting" screen with the money path. 8 languages, phone sheet / desktop window,
   dark + light. Bank and card requests go to the same server action as before (requestDeposit); crypto still uses
   the original #mask logic underneath (address, blockchain watcher, detection pop-ups), so nothing in the
   deposit pipeline changes. "Transfer" mode of #mask is untouched. Load after deposit-pro.js and client-pro.js. */
(function () {
  'use strict';
  if (window.__ncDepV5) return; window.__ncDepV5 = 1;
  var WORKER = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';

  /* ───────── language ───────── */
  var LG = ['en', 'da', 'fi', 'es', 'no', 'sv', 'fr', 'de'];
  var LOC = { en: 'en-US', da: 'da-DK', fi: 'fi-FI', es: 'es-ES', no: 'nb-NO', sv: 'sv-SE', fr: 'fr-FR', de: 'de-DE' };
  var K = {
    title: ['Add money', 'Indsæt penge', 'Lisää rahaa', 'Añadir dinero', 'Sett inn penger', 'Sätt in pengar', 'Ajouter de l’argent', 'Geld einzahlen'],
    how: ['How do you want to add money?', 'Hvordan vil du indsætte penge?', 'Miten haluat lisätä rahaa?', '¿Cómo quieres añadir dinero?', 'Hvordan vil du sette inn penger?', 'Hur vill du sätta in pengar?', 'Comment voulez-vous ajouter de l’argent ?', 'Wie möchten Sie Geld einzahlen?'],
    secured: ['Secured · 256-bit encryption', 'Beskyttet · 256-bit kryptering', 'Suojattu · 256-bittinen salaus', 'Protegido · cifrado de 256 bits', 'Beskyttet · 256-bit kryptering', 'Skyddat · 256-bitars kryptering', 'Sécurisé · chiffrement 256 bits', 'Gesichert · 256-Bit-Verschlüsselung'],
    bank: ['Bank transfer', 'Bankoverførsel', 'Pankkisiirto', 'Transferencia bancaria', 'Bankoverføring', 'Banköverföring', 'Virement bancaire', 'Banküberweisung'],
    bankS: ['SEPA · 1–2 business days', 'SEPA · 1–2 bankdage', 'SEPA · 1–2 pankkipäivää', 'SEPA · 1–2 días hábiles', 'SEPA · 1–2 virkedager', 'SEPA · 1–2 bankdagar', 'SEPA · 1 à 2 jours ouvrés', 'SEPA · 1–2 Werktage'],
    swift: ['International transfer', 'International overførsel', 'Kansainvälinen siirto', 'Transferencia internacional', 'Internasjonal overføring', 'Internationell överföring', 'Virement international', 'Auslandsüberweisung'],
    swiftS: ['SWIFT · 1–3 business days', 'SWIFT · 1–3 bankdage', 'SWIFT · 1–3 pankkipäivää', 'SWIFT · 1–3 días hábiles', 'SWIFT · 1–3 virkedager', 'SWIFT · 1–3 bankdagar', 'SWIFT · 1 à 3 jours ouvrés', 'SWIFT · 1–3 Werktage'],
    card: ['Debit or credit card', 'Betalingskort', 'Pankki- tai luottokortti', 'Tarjeta de débito o crédito', 'Bank- eller kredittkort', 'Betal- eller kreditkort', 'Carte bancaire', 'Debit- oder Kreditkarte'],
    cardS: ['Visa, Mastercard · checked by our team', 'Visa, Mastercard · tjekkes af vores team', 'Visa, Mastercard · tiimimme tarkistama', 'Visa, Mastercard · revisado por nuestro equipo', 'Visa, Mastercard · sjekkes av teamet vårt', 'Visa, Mastercard · kontrolleras av vårt team', 'Visa, Mastercard · vérifié par notre équipe', 'Visa, Mastercard · von unserem Team geprüft'],
    crypto: ['Crypto', 'Krypto', 'Krypto', 'Cripto', 'Krypto', 'Krypto', 'Crypto', 'Krypto'],
    cryptoS: ['Bitcoin, Ethereum · after network confirmations', 'Bitcoin, Ethereum · efter netværksbekræftelser', 'Bitcoin, Ethereum · verkon vahvistusten jälkeen', 'Bitcoin, Ethereum · tras las confirmaciones de red', 'Bitcoin, Ethereum · etter nettverksbekreftelser', 'Bitcoin, Ethereum · efter nätverksbekräftelser', 'Bitcoin, Ethereum · après confirmations réseau', 'Bitcoin, Ethereum · nach Netzwerkbestätigungen'],
    popular: ['Popular', 'Populær', 'Suosittu', 'Popular', 'Populær', 'Populär', 'Populaire', 'Beliebt'],
    amount: ['Amount', 'Beløb', 'Summa', 'Importe', 'Beløp', 'Belopp', 'Montant', 'Betrag'],
    optional: ['optional', 'valgfrit', 'valinnainen', 'opcional', 'valgfritt', 'valfritt', 'facultatif', 'optional'],
    cont: ['Continue', 'Fortsæt', 'Jatka', 'Continuar', 'Fortsett', 'Fortsätt', 'Continuer', 'Weiter'],
    enterAmt: ['Enter an amount', 'Indtast et beløb', 'Syötä summa', 'Introduce un importe', 'Skriv inn et beløp', 'Ange ett belopp', 'Saisissez un montant', 'Betrag eingeben'],
    sendExact: ['Send exactly this amount', 'Send præcis dette beløb', 'Lähetä tarkalleen tämä summa', 'Envía exactamente este importe', 'Send nøyaktig dette beløpet', 'Skicka exakt detta belopp', 'Envoyez exactement ce montant', 'Überweisen Sie genau diesen Betrag'],
    yourAcc: ['Your Nordic account', 'Din Nordic-konto', 'Nordic-tilisi', 'Tu cuenta Nordic', 'Din Nordic-konto', 'Ditt Nordic-konto', 'Votre compte Nordic', 'Ihr Nordic-Konto'],
    benef: ['Beneficiary', 'Modtager', 'Saaja', 'Beneficiario', 'Mottaker', 'Mottagare', 'Bénéficiaire', 'Empfänger'],
    bankN: ['Bank', 'Bank', 'Pankki', 'Banco', 'Bank', 'Bank', 'Banque', 'Bank'],
    country: ['Country', 'Land', 'Maa', 'País', 'Land', 'Land', 'Pays', 'Land'],
    ref: ['Reference — add it to the transfer', 'Reference — tilføj den til overførslen', 'Viite — lisää se siirtoon', 'Referencia: añádela a la transferencia', 'Referanse — legg den til overføringen', 'Referens — lägg till den i överföringen', 'Référence — à ajouter au virement', 'Verwendungszweck — bitte angeben'],
    refWarn: ['Without the reference we can’t match your payment.', 'Uden referencen kan vi ikke finde din betaling.', 'Ilman viitettä emme voi yhdistää maksuasi.', 'Sin la referencia no podemos identificar tu pago.', 'Uten referansen kan vi ikke finne betalingen din.', 'Utan referensen kan vi inte matcha din betalning.', 'Sans la référence, nous ne pouvons pas identifier votre paiement.', 'Ohne Verwendungszweck können wir Ihre Zahlung nicht zuordnen.'],
    ownName: ['Send from a bank account in your own name.', 'Send fra en bankkonto i dit eget navn.', 'Lähetä omissa nimissäsi olevalta pankkitililtä.', 'Envía desde una cuenta bancaria a tu nombre.', 'Send fra en bankkonto i ditt eget navn.', 'Skicka från ett bankkonto i ditt eget namn.', 'Envoyez depuis un compte bancaire à votre nom.', 'Senden Sie von einem Bankkonto auf Ihren Namen.'],
    sepaEur: ['SEPA transfers are made in euro.', 'SEPA-overførsler sker i euro.', 'SEPA-siirrot tehdään euroina.', 'Las transferencias SEPA se hacen en euros.', 'SEPA-overføringer gjøres i euro.', 'SEPA-överföringar görs i euro.', 'Les virements SEPA se font en euros.', 'SEPA-Überweisungen erfolgen in Euro.'],
    swiftFee: ['Your bank may charge its own fee for international transfers.', 'Din bank kan opkræve sit eget gebyr for internationale overførsler.', 'Pankkisi voi periä oman maksunsa kansainvälisistä siirroista.', 'Tu banco puede cobrar su propia comisión por transferencias internacionales.', 'Banken din kan ta sitt eget gebyr for internasjonale overføringer.', 'Din bank kan ta ut en egen avgift för internationella överföringar.', 'Votre banque peut facturer ses propres frais pour les virements internationaux.', 'Ihre Bank kann für Auslandsüberweisungen eigene Gebühren berechnen.'],
    copyAll: ['Copy all', 'Kopiér alt', 'Kopioi kaikki', 'Copiar todo', 'Kopier alt', 'Kopiera allt', 'Tout copier', 'Alles kopieren'],
    iSent: ['I’ve sent the money', 'Jeg har sendt pengene', 'Olen lähettänyt rahat', 'Ya he enviado el dinero', 'Jeg har sendt pengene', 'Jag har skickat pengarna', 'J’ai envoyé l’argent', 'Ich habe das Geld gesendet'],
    noIban: ['Your account details are being prepared', 'Dine kontooplysninger bliver klargjort', 'Tilitietojasi valmistellaan', 'Estamos preparando los datos de tu cuenta', 'Kontoopplysningene dine klargjøres', 'Dina kontouppgifter förbereds', 'Vos coordonnées bancaires sont en préparation', 'Ihre Kontodaten werden vorbereitet'],
    noIbanS: ['Our team is issuing your IBAN. It usually appears here soon — write to us in the chat if it takes longer.', 'Vores team udsteder dit IBAN. Det dukker normalt snart op her — skriv til os i chatten, hvis det tager længere tid.', 'Tiimimme luo IBANisi. Se näkyy tässä yleensä pian — kirjoita meille chatissa, jos se kestää.', 'Nuestro equipo está emitiendo tu IBAN. Suele aparecer aquí pronto; escríbenos por el chat si tarda más.', 'Teamet vårt utsteder IBAN-en din. Den dukker vanligvis opp her snart — skriv til oss i chatten hvis det tar lengre tid.', 'Vårt team utfärdar ditt IBAN. Det brukar dyka upp här snart — skriv till oss i chatten om det dröjer.', 'Notre équipe émet votre IBAN. Il apparaît généralement ici rapidement — écrivez-nous dans le chat si cela prend plus de temps.', 'Unser Team stellt Ihre IBAN aus. Sie erscheint meist bald hier — schreiben Sie uns im Chat, wenn es länger dauert.'],
    chat: ['Chat with us', 'Chat med os', 'Keskustele kanssamme', 'Chatea con nosotros', 'Chat med oss', 'Chatta med oss', 'Discuter avec nous', 'Mit uns chatten'],
    cardNo: ['Card number', 'Kortnummer', 'Kortin numero', 'Número de tarjeta', 'Kortnummer', 'Kortnummer', 'Numéro de carte', 'Kartennummer'],
    holder: ['Card holder', 'Kortholder', 'Kortin haltija', 'Titular', 'Kortinnehaver', 'Kortinnehavare', 'Titulaire', 'Karteninhaber'],
    holderPh: ['As printed on the card', 'Som trykt på kortet', 'Kuten kortissa', 'Como aparece en la tarjeta', 'Som trykket på kortet', 'Som det står på kortet', 'Comme sur la carte', 'Wie auf der Karte'],
    expiry: ['Expiry', 'Udløb', 'Voimassa', 'Caducidad', 'Utløp', 'Utgång', 'Expiration', 'Ablauf'],
    yourName: ['YOUR NAME', 'DIT NAVN', 'NIMESI', 'TU NOMBRE', 'DITT NAVN', 'DITT NAMN', 'VOTRE NOM', 'IHR NAME'],
    cardSafe: ['We never ask for your CVV and never keep the full card number — only the brand, last 4 digits, holder and expiry are sent. Our team checks the request before your balance is credited.', 'Vi beder aldrig om din CVV og gemmer aldrig hele kortnummeret — kun mærke, sidste 4 cifre, kortholder og udløb sendes. Vores team tjekker anmodningen, før din saldo krediteres.', 'Emme koskaan kysy CVV-koodia emmekä tallenna koko kortin numeroa — vain merkki, 4 viimeistä numeroa, haltija ja voimassaolo lähetetään. Tiimimme tarkistaa pyynnön ennen saldon hyvitystä.', 'Nunca pedimos el CVV ni guardamos el número completo: solo se envían la marca, los 4 últimos dígitos, el titular y la caducidad. Nuestro equipo revisa la solicitud antes de abonar el saldo.', 'Vi ber aldri om CVV og lagrer aldri hele kortnummeret — bare merke, siste 4 sifre, innehaver og utløp sendes. Teamet vårt sjekker forespørselen før saldoen krediteres.', 'Vi frågar aldrig efter CVV och sparar aldrig hela kortnumret — bara märke, sista 4 siffrorna, innehavare och utgång skickas. Vårt team kontrollerar begäran innan saldot krediteras.', 'Nous ne demandons jamais le CVV et ne conservons jamais le numéro complet : seuls la marque, les 4 derniers chiffres, le titulaire et l’expiration sont envoyés. Notre équipe vérifie la demande avant de créditer votre solde.', 'Wir fragen nie nach der CVV und speichern nie die vollständige Kartennummer — nur Marke, letzte 4 Ziffern, Inhaber und Ablauf werden gesendet. Unser Team prüft den Antrag vor der Gutschrift.'],
    reqCard: ['Request card deposit', 'Anmod om kortindbetaling', 'Pyydä korttitalletusta', 'Solicitar depósito con tarjeta', 'Be om kortinnskudd', 'Begär kortinsättning', 'Demander un dépôt par carte', 'Kartenzahlung beantragen'],
    badCard: ['Check the card number', 'Tjek kortnummeret', 'Tarkista kortin numero', 'Revisa el número de tarjeta', 'Sjekk kortnummeret', 'Kontrollera kortnumret', 'Vérifiez le numéro de carte', 'Kartennummer prüfen'],
    badHolder: ['Enter the card holder', 'Indtast kortholder', 'Syötä kortin haltija', 'Introduce el titular', 'Skriv inn kortinnehaver', 'Ange kortinnehavare', 'Saisissez le titulaire', 'Karteninhaber eingeben'],
    badExp: ['Check the expiry date', 'Tjek udløbsdatoen', 'Tarkista voimassaolo', 'Revisa la fecha de caducidad', 'Sjekk utløpsdatoen', 'Kontrollera utgångsdatum', 'Vérifiez la date d’expiration', 'Ablaufdatum prüfen'],
    sendOnly: ['Send only {c} on the {n} network', 'Send kun {c} på {n}-netværket', 'Lähetä vain {c}:ta {n}-verkossa', 'Envía solo {c} por la red {n}', 'Send kun {c} på {n}-nettverket', 'Skicka endast {c} på {n}-nätverket', 'Envoyez uniquement des {c} sur le réseau {n}', 'Senden Sie nur {c} über das {n}-Netzwerk'],
    otherLost: ['Other coins or networks sent here can’t be recovered.', 'Andre mønter eller netværk sendt hertil kan ikke gendannes.', 'Muita kolikoita tai verkkoja ei voi palauttaa.', 'Otras monedas o redes enviadas aquí no se pueden recuperar.', 'Andre mynter eller nettverk sendt hit kan ikke gjenopprettes.', 'Andra mynt eller nätverk som skickas hit kan inte återställas.', 'Les autres cryptos ou réseaux envoyés ici seront perdus.', 'Andere Coins oder Netzwerke gehen hier verloren.'],
    depAddr: ['Your {c} deposit address', 'Din {c}-indbetalingsadresse', '{c}-talletusosoitteesi', 'Tu dirección de depósito {c}', 'Din {c}-innskuddsadresse', 'Din {c}-insättningsadress', 'Votre adresse de dépôt {c}', 'Ihre {c}-Einzahlungsadresse'],
    confNote: ['Credited automatically after network confirmations — usually within 10–30 minutes.', 'Krediteres automatisk efter netværksbekræftelser — normalt inden for 10–30 minutter.', 'Hyvitetään automaattisesti verkon vahvistusten jälkeen — yleensä 10–30 minuutissa.', 'Se abona automáticamente tras las confirmaciones de red, normalmente en 10–30 minutos.', 'Krediteres automatisk etter nettverksbekreftelser — vanligvis innen 10–30 minutter.', 'Krediteras automatiskt efter nätverksbekräftelser — vanligtvis inom 10–30 minuter.', 'Crédité automatiquement après confirmations réseau — généralement en 10 à 30 minutes.', 'Automatische Gutschrift nach Netzwerkbestätigungen — meist innerhalb von 10–30 Minuten.'],
    noAddr: ['Your {c} address is being prepared', 'Din {c}-adresse bliver klargjort', '{c}-osoitettasi valmistellaan', 'Estamos preparando tu dirección {c}', '{c}-adressen din klargjøres', 'Din {c}-adress förbereds', 'Votre adresse {c} est en préparation', 'Ihre {c}-Adresse wird vorbereitet'],
    noAddrS: ['Our team assigns a personal address to every client. Write to us in the chat and we’ll set it up.', 'Vores team tildeler hver kunde en personlig adresse. Skriv til os i chatten, så sætter vi den op.', 'Tiimimme antaa jokaiselle asiakkaalle oman osoitteen. Kirjoita meille chatissa, niin järjestämme sen.', 'Nuestro equipo asigna una dirección personal a cada cliente. Escríbenos por el chat y la configuramos.', 'Teamet vårt gir hver kunde en personlig adresse. Skriv til oss i chatten, så setter vi den opp.', 'Vårt team tilldelar varje kund en personlig adress. Skriv till oss i chatten så ordnar vi det.', 'Notre équipe attribue une adresse personnelle à chaque client. Écrivez-nous dans le chat et nous la configurerons.', 'Unser Team vergibt jedem Kunden eine persönliche Adresse. Schreiben Sie uns im Chat, wir richten sie ein.'],
    copy: ['Copy', 'Kopiér', 'Kopioi', 'Copiar', 'Kopier', 'Kopiera', 'Copier', 'Kopieren'],
    copied: ['Copied ✓', 'Kopieret ✓', 'Kopioitu ✓', 'Copiado ✓', 'Kopiert ✓', 'Kopierat ✓', 'Copié ✓', 'Kopiert ✓'],
    share: ['Share', 'Del', 'Jaa', 'Compartir', 'Del', 'Dela', 'Partager', 'Teilen'],
    sentIt: ['I’ve sent it', 'Jeg har sendt det', 'Olen lähettänyt', 'Ya lo he enviado', 'Jeg har sendt det', 'Jag har skickat', 'C’est envoyé', 'Gesendet'],
    payWallet: ['Pay from my wallet', 'Betal fra min wallet', 'Maksa lompakostani', 'Pagar desde mi monedero', 'Betal fra lommeboken min', 'Betala från min plånbok', 'Payer depuis mon portefeuille', 'Aus meiner Wallet zahlen'],
    paySub: ['Send {e} ETH from MetaMask, Trust…', 'Send {e} ETH fra MetaMask, Trust…', 'Lähetä {e} ETH MetaMaskista, Trustista…', 'Envía {e} ETH desde MetaMask, Trust…', 'Send {e} ETH fra MetaMask, Trust…', 'Skicka {e} ETH från MetaMask, Trust…', 'Envoyez {e} ETH depuis MetaMask, Trust…', 'Sende {e} ETH aus MetaMask, Trust…'],
    payConfirm: ['Confirm the transaction in your wallet…', 'Bekræft transaktionen i din wallet…', 'Vahvista tapahtuma lompakossasi…', 'Confirma la transacción en tu monedero…', 'Bekreft transaksjonen i lommeboken…', 'Bekräfta transaktionen i din plånbok…', 'Confirmez la transaction dans votre portefeuille…', 'Bestätige die Transaktion in deiner Wallet…'],
    payNeedAmt: ['Enter an amount first', 'Indtast et beløb først', 'Anna ensin summa', 'Introduce un importe primero', 'Skriv inn et beløp først', 'Ange ett belopp först', 'Saisissez d’abord un montant', 'Zuerst einen Betrag eingeben'],
    paySent: ['Transaction sent — confirming on the network', 'Transaktion sendt — bekræfter på netværket', 'Tapahtuma lähetetty — vahvistetaan verkossa', 'Transacción enviada: confirmando en la red', 'Transaksjon sendt — bekrefter på nettverket', 'Transaktion skickad — bekräftar i nätverket', 'Transaction envoyée — confirmation sur le réseau', 'Transaktion gesendet — wird im Netzwerk bestätigt'],
    payRejected: ['Transaction cancelled in the wallet', 'Transaktion annulleret i walletten', 'Tapahtuma peruttu lompakossa', 'Transacción cancelada en el monedero', 'Transaksjon avbrutt i lommeboken', 'Transaktion avbröts i plånboken', 'Transaction annulée dans le portefeuille', 'Transaktion in der Wallet abgebrochen'],
    waitBank: ['We’re waiting for your transfer', 'Vi venter på din overførsel', 'Odotamme siirtoasi', 'Esperamos tu transferencia', 'Vi venter på overføringen din', 'Vi väntar på din överföring', 'Nous attendons votre virement', 'Wir warten auf Ihre Überweisung'],
    waitCard: ['Card deposit received', 'Kortindbetaling modtaget', 'Korttitalletus vastaanotettu', 'Depósito con tarjeta recibido', 'Kortinnskudd mottatt', 'Kortinsättning mottagen', 'Dépôt par carte reçu', 'Kartenzahlung erhalten'],
    waitCry: ['We’re watching the network', 'Vi holder øje med netværket', 'Seuraamme verkkoa', 'Estamos vigilando la red', 'Vi følger med på nettverket', 'Vi bevakar nätverket', 'Nous surveillons le réseau', 'Wir beobachten das Netzwerk'],
    waitS: ['We’ll notify you as soon as it arrives. You can close this window.', 'Vi giver besked, så snart den er modtaget. Du kan lukke vinduet.', 'Ilmoitamme heti, kun se saapuu. Voit sulkea ikkunan.', 'Te avisaremos en cuanto llegue. Puedes cerrar esta ventana.', 'Vi varsler deg så snart den kommer. Du kan lukke vinduet.', 'Vi meddelar dig så fort den kommer. Du kan stänga fönstret.', 'Nous vous préviendrons dès sa réception. Vous pouvez fermer cette fenêtre.', 'Wir benachrichtigen Sie, sobald sie eingeht. Sie können dieses Fenster schließen.'],
    cardWaitS: ['Our team is checking it. Your balance is credited as soon as it is approved.', 'Vores team tjekker den. Din saldo krediteres, så snart den er godkendt.', 'Tiimimme tarkistaa sen. Saldosi hyvitetään heti hyväksynnän jälkeen.', 'Nuestro equipo la está revisando. Tu saldo se abona en cuanto se apruebe.', 'Teamet vårt sjekker den. Saldoen krediteres så snart den er godkjent.', 'Vårt team kontrollerar den. Ditt saldo krediteras så fort den godkänts.', 'Notre équipe la vérifie. Votre solde est crédité dès l’approbation.', 'Unser Team prüft sie. Die Gutschrift erfolgt nach der Freigabe.'],
    yourBank: ['Your bank', 'Din bank', 'Pankkisi', 'Tu banco', 'Din bank', 'Din bank', 'Votre banque', 'Ihre Bank'],
    yourCard: ['Your card', 'Dit kort', 'Korttisi', 'Tu tarjeta', 'Ditt kort', 'Ditt kort', 'Votre carte', 'Ihre Karte'],
    network: ['Network', 'Netværk', 'Verkko', 'Red', 'Nettverk', 'Nätverk', 'Réseau', 'Netzwerk'],
    check: ['Check', 'Tjek', 'Tarkistus', 'Revisión', 'Sjekk', 'Kontroll', 'Contrôle', 'Prüfung'],
    yourBal: ['Your balance', 'Din saldo', 'Saldosi', 'Tu saldo', 'Din saldo', 'Ditt saldo', 'Votre solde', 'Ihr Guthaben'],
    refShort: ['Ref.', 'Ref.', 'Viite', 'Ref.', 'Ref.', 'Ref.', 'Réf.', 'Ref.'],
    method: ['Method', 'Metode', 'Tapa', 'Método', 'Metode', 'Metod', 'Méthode', 'Methode'],
    status: ['Status', 'Status', 'Tila', 'Estado', 'Status', 'Status', 'Statut', 'Status'],
    review: ['Under review', 'Under gennemgang', 'Tarkistettavana', 'En revisión', 'Under vurdering', 'Granskas', 'En vérification', 'In Prüfung'],
    details: ['View details', 'Se detaljer', 'Näytä tiedot', 'Ver detalles', 'Se detaljer', 'Visa detaljer', 'Voir les détails', 'Details ansehen'],
    done: ['Done', 'Færdig', 'Valmis', 'Listo', 'Ferdig', 'Klar', 'Terminé', 'Fertig'],
    back: ['Back', 'Tilbage', 'Takaisin', 'Atrás', 'Tilbake', 'Tillbaka', 'Retour', 'Zurück'],
    close: ['Close', 'Luk', 'Sulje', 'Cerrar', 'Lukk', 'Stäng', 'Fermer', 'Schließen'],
    conn: ['Connection error. Please try again.', 'Forbindelsesfejl. Prøv igen.', 'Yhteysvirhe. Yritä uudelleen.', 'Error de conexión. Inténtalo de nuevo.', 'Tilkoblingsfeil. Prøv igjen.', 'Anslutningsfel. Försök igen.', 'Erreur de connexion. Réessayez.', 'Verbindungsfehler. Bitte erneut versuchen.'],
    admin: ['Not available for admin accounts', 'Ikke tilgængelig for administratorkonti', 'Ei käytettävissä ylläpitäjätileille', 'No disponible para cuentas de administrador', 'Ikke tilgjengelig for administratorkontoer', 'Inte tillgängligt för administratörskonton', 'Indisponible pour les comptes administrateur', 'Für Admin-Konten nicht verfügbar']
  };
  function lang() { try { var l = window.NCI18N && window.NCI18N.lang; return LG.indexOf(l) > -1 ? l : 'en'; } catch (e) { return 'en'; } }
  function T(k, v) { var a = K[k]; if (!a) return k; var s = a[LG.indexOf(lang())] || a[0]; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  function usd(n, d) { try { return new Intl.NumberFormat(LOC[lang()], { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }).format(n); } catch (e) { return '$' + Number(n).toFixed(2); } }
  function num0(n) { try { return new Intl.NumberFormat(LOC[lang()]).format(n); } catch (e) { return String(n); } }
  function dt(ts) { try { return new Intl.DateTimeFormat(LOC[lang()], { day: 'numeric', month: 'short' }).format(new Date(ts)); } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function digits(x) { return String(x || '').replace(/\D/g, ''); }
  function modeAdd() { try { return typeof mode !== 'undefined' && mode === 'add'; } catch (e) { return false; } }

  /* ───────── data ───────── */
  function refCode() { var dr = S().user && S().user.depositRef; if (dr) return String(dr); var e = (localStorage.getItem('user_email') || '').toLowerCase(), h = 5381; for (var i = 0; i < e.length; i++) h = ((h << 5) + h + e.charCodeAt(i)) >>> 0; var A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', o = ''; for (var k = 0; k < 6; k++) { o += A[h % A.length]; h = Math.floor(h / A.length) + 7 * (k + 1); } return 'NC-' + o; }
  var CN = { SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', GB: 'United Kingdom', US: 'United States', CA: 'Canada', AU: 'Australia', IE: 'Ireland', PL: 'Poland', LT: 'Lithuania', EE: 'Estonia', LV: 'Latvia' };
  function holderName() { var u = S().user || {}, c = S().card || {}; return u.name || localStorage.getItem('user_name') || c.name || c.holder || ''; }
  function groupIban(x) { return String(x || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(); }
  function wallet(c) { try { return (typeof window.getDepositWallet === 'function' && window.getDepositWallet(c)) || ''; } catch (e) { return ''; } }
  function flag(cc) { cc = String(cc || '').toUpperCase(); return /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65) : ''; }
  function brandOf(n) { return /^4/.test(n) ? 'visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'mastercard' : /^3[47]/.test(n) ? 'amex' : 'card'; }
  var BR = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', card: '' };
  function luhn(n) { var s = 0, d = false; for (var i = n.length - 1; i >= 0; i--) { var x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return n.length >= 13 && s % 10 === 0; }
  function expOk(v) { var m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false; var mm = +m[1], yy = 2000 + +m[2], now = new Date(); return mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1)) && yy < now.getFullYear() + 20; }

  /* ───────── icons ───────── */
  var P = { x: '<path d="M6 6l12 12M18 6 6 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', chev: '<path d="m9 6 6 6-6 6"/>', ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', bank: '<path d="M4 10h16L12 4zM6 10v7m4-7v7m4-7v7m4-7v7M4 20h16"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18"/>', card: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 15h4"/>', coin: '<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5h3a1.8 1.8 0 0 1 0 3.5h-3zm0 3.5h3.5a1.9 1.9 0 0 1 0 3.8H10zM10 8.5v7.3"/>', cp: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>', warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3v.2"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', sh: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>', net: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="M11 7 6 15m7-8 5 8M7 17h10"/>', chat: '<path d="M5 18.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8.5z"/>', in: '<path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14"/>', wallet: '<path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13" r="1.1" fill="currentColor" stroke="none"/>' };
  function ic(n, c) { return '<svg class="' + (c || 'dv-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }
  var COIN = {
    BTC: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f7931a"/><path fill="#fff" d="M22.4 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-2.6-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-1.9 7.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.5.6-.7 2.8 1.7.4.7-2.7 1.3.3-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 2-1 2.2-2.5zm-3.8 5.4c-.5 2.1-4 1-5.2.7l.9-3.7c1.2.3 4.9.9 4.3 3zm.5-5.4c-.5 1.9-3.4.9-4.3.7l.8-3.4c1 .2 4 .7 3.5 2.7z"/></svg>',
    ETH: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627eea"/><path d="M16 5v8.1l6.9 3.1z" fill="#fff" fill-opacity=".6"/><path d="M16 5 9.1 16.2l6.9-3.1z" fill="#fff"/><path d="M16 21.5v5.5l6.9-9.6z" fill="#fff" fill-opacity=".6"/><path d="M16 27v-5.5l-6.9-4.1z" fill="#fff"/><path d="m16 20.2 6.9-4-6.9-3.1z" fill="#fff" fill-opacity=".2"/><path d="m9.1 16.2 6.9 4v-7.1z" fill="#fff" fill-opacity=".6"/></svg>'
  };
  var NETN = { BTC: 'Bitcoin', ETH: 'Ethereum (ERC-20)' };
  var MLEG = { sepa: 'Bank Transfer (SEPA)', swift: 'Bank Transfer (SWIFT)', card: 'Credit Card', BTC: 'Bitcoin (BTC)', ETH: 'Ethereum (ETH)' };

  /* ───────── styles ───────── */
  function css() {
    if ($('dvCss')) return; var s = document.createElement('style'); s.id = 'dvCss';
    s.textContent =
'#mask.dv-hide{opacity:0!important;pointer-events:none!important}' +
'#dv{position:fixed;inset:0;z-index:100052;display:none}#dv.on{display:block}' +
'#dv .dv-bd{position:absolute;inset:0;background:rgba(2,5,7,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s}#dv.in .dv-bd{opacity:1}' +
'#dv .dv-m{--c:#62e8c2;--cr:98,232,194;position:absolute;left:0;right:0;bottom:0;max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;border-radius:28px 28px 0 0;overflow:hidden;color:#eef5f2;font-family:inherit;background:linear-gradient(180deg,#161d1f,#0a0e10);border:1px solid rgba(255,255,255,.08);border-bottom:0;box-shadow:0 -40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.1);transform:translateY(100%);transition:transform .38s cubic-bezier(.2,.9,.25,1);outline:none}' +
'#dv.in .dv-m{transform:none}#dv .dv-m.blue{--c:#6fb2ff;--cr:111,178,255}#dv .dv-m.amb{--c:#ffc24a;--cr:255,194,74}' +
'#dv .dv-au{position:absolute;inset:0 0 auto 0;height:240px;pointer-events:none;overflow:hidden;-webkit-mask:linear-gradient(#000 30%,transparent);mask:linear-gradient(#000 30%,transparent)}#dv .dv-au i{position:absolute;border-radius:50%;filter:blur(44px);animation:dvDr 10s ease-in-out infinite alternate}#dv .dv-au i:nth-child(1){width:320px;height:200px;left:-60px;top:-100px;background:var(--c);opacity:.26}#dv .dv-au i:nth-child(2){width:280px;height:180px;right:-80px;top:-90px;background:#62e8c2;opacity:.14;animation-delay:-5s}@keyframes dvDr{to{transform:translate(30px,16px) scale(1.1)}}' +
'#dv .dv-sc{position:relative;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:10px 18px calc(18px + env(safe-area-inset-bottom))}' +
'#dv .dv-grab{width:40px;height:5px;border-radius:9px;background:rgba(255,255,255,.22);margin:0 auto 12px}' +
'#dv .dv-hd{display:flex;align-items:center;gap:10px;margin-bottom:16px}#dv .dv-hd .t{flex:1;min-width:0;font-size:13px;color:#b6c4bf;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dv .dv-hd .t b{color:#eef5f2;font-weight:620}' +
'#dv .dv-ib{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#c6d2ce;cursor:pointer;flex:none;padding:0}#dv .dv-ib:hover{background:rgba(255,255,255,.13);color:#fff}#dv .dv-ib .dv-i{width:15px;height:15px}' +
'#dv .dv-steps{display:flex;gap:5px;flex:none}#dv .dv-steps i{width:22px;height:4px;border-radius:9px;background:rgba(255,255,255,.12)}#dv .dv-steps i.on{background:var(--c)}' +
'#dv .dv-i{width:18px;height:18px;flex:none}' +
'#dv h2{margin:0 0 4px;font-size:22px;font-weight:740;letter-spacing:-.02em;line-height:1.2}#dv .dv-p{margin:0 0 16px;font-size:12.5px;color:#93a39e;display:flex;align-items:center;gap:6px}#dv .dv-p .dv-i{width:14px;height:14px;color:#62e8c2}' +
'#dv .dv-mt{display:flex;align-items:center;gap:13px;width:100%;padding:13px 14px;border-radius:20px;margin-bottom:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:inherit;font:inherit;text-align:left;cursor:pointer;transition:transform .15s,border-color .15s,background .15s}#dv .dv-mt:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.18)}' +
'#dv .dv-mt.on{background:linear-gradient(135deg,rgba(98,232,194,.13),rgba(98,232,194,.03));border:1.5px solid rgba(98,232,194,.6);box-shadow:0 10px 30px -12px rgba(69,207,168,.4)}' +
'#dv .dv-mt .mi{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:rgba(255,255,255,.06);color:#d6e2de;flex:none}#dv .dv-mt.on .mi{background:linear-gradient(140deg,#a3fbe3,#45cfa8);color:#03251b}#dv .dv-mt .mi .dv-i{width:22px;height:22px}' +
'#dv .dv-mt .k{flex:1;min-width:0}#dv .dv-mt b{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:650}#dv .dv-mt small{display:block;font-size:12px;color:#86968f;margin-top:2px}' +
'#dv .dv-tag{font-size:10px;font-weight:750;color:#03251b;background:#62e8c2;padding:2px 7px;border-radius:99px}' +
'#dv .dv-r{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.2);flex:none;transition:border .15s}#dv .dv-mt.on .dv-r{border:6px solid #62e8c2}' +
'#dv .dv-coins{display:flex;gap:-6px;margin-left:auto;flex:none}#dv .dv-coins svg{width:24px;height:24px;margin-left:-6px;border-radius:50%;box-shadow:0 0 0 2px #121819}' +
'#dv .dv-amt{text-align:center;padding:16px 12px 14px;border-radius:24px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);margin:6px 0 14px;transition:border-color .15s}#dv .dv-amt:focus-within{border-color:rgba(98,232,194,.5);box-shadow:0 0 0 4px rgba(98,232,194,.08)}' +
'#dv .dv-amt label{display:block;font-size:11.5px;color:#86968f}#dv .dv-amt .row{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px}#dv .dv-amt .cur{font-size:36px;font-weight:700;color:#6d7d78}' +
'#dv .dv-amt input{width:100%;max-width:240px;background:none;border:0;outline:none;color:#fff;font:760 42px/1.15 inherit;font-family:inherit;font-weight:760;font-size:42px;letter-spacing:-.03em;text-align:center;padding:0;-moz-appearance:textfield;font-variant-numeric:tabular-nums}#dv .dv-amt input::placeholder{color:#3d4a46}#dv .dv-amt input::-webkit-outer-spin-button,#dv .dv-amt input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}' +
'#dv .dv-pills{display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap}#dv .dv-pill{padding:7px 13px;border-radius:99px;font:600 12.5px/1 inherit;font-family:inherit;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#cbd7d3;cursor:pointer}#dv .dv-pill:hover{border-color:rgba(98,232,194,.4)}#dv .dv-pill.on{background:rgba(98,232,194,.14);border-color:rgba(98,232,194,.45);color:#62e8c2}' +
'#dv .dv-btn{height:54px;border-radius:17px;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:700;font-size:15px;cursor:pointer;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.06);color:#dbe5e1;padding:0 14px;transition:transform .15s,filter .15s;min-width:0}#dv .dv-btn:hover{transform:translateY(-1px)}#dv .dv-btn:active{transform:scale(.98)}' +
'#dv .dv-btn.pri{background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b;border:0;box-shadow:0 12px 32px -8px rgba(69,207,168,.45),inset 0 1px 0 rgba(255,255,255,.55)}#dv .dv-btn[disabled]{opacity:.55;cursor:default;transform:none}#dv .dv-btn.full{width:100%}#dv .dv-btn .dv-i{width:18px;height:18px}' +
'#dv .dv-pay{width:100%;justify-content:flex-start;gap:12px;text-align:left;margin-bottom:10px;height:auto;padding:13px 16px}#dv .dv-pay>svg{width:22px;height:22px;flex:none}#dv .dv-pay .dv-pt{display:flex;flex-direction:column;line-height:1.25;min-width:0}#dv .dv-pay .dv-pt b{font-size:14.5px;font-weight:680}#dv .dv-pay .dv-pt em{font-style:normal;font-size:11.5px;opacity:.82;font-weight:500;margin-top:1px}',
'#dv .dv-acts{display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:4px}#dv .dv-btn{white-space:nowrap}#dv .dv-btn span{overflow:hidden;text-overflow:ellipsis}@media (max-width:420px){#dv .dv-steps{display:none}#dv .dv-acts .dv-btn:not(.pri){font-size:13.5px;padding:0 10px}}' +
'#dv .dv-big{text-align:center;margin:2px 0 14px}#dv .dv-big small{font-size:12px;color:#93a39e}#dv .dv-big b{display:block;font-size:36px;font-weight:770;letter-spacing:-.03em;margin-top:4px;background:linear-gradient(180deg,#fff,#c9d6d1);-webkit-background-clip:text;background-clip:text;color:transparent}' +
'#dv .dv-bc{position:relative;border-radius:22px;padding:15px 16px;margin-bottom:12px;overflow:hidden;background:linear-gradient(135deg,#123129,#0c1a17 55%,#16130a);border:1px solid rgba(98,232,194,.18);box-shadow:0 18px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}#dv .dv-bc:before{content:"";position:absolute;right:-40px;top:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(98,232,194,.2),transparent 65%);pointer-events:none}' +
'#dv .dv-bh{display:flex;align-items:center;gap:11px;position:relative;margin-bottom:6px}#dv .dv-av{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-weight:800;font-size:14px;color:#03251b;background:linear-gradient(140deg,#a3fbe3,#45cfa8);flex:none}#dv .dv-bh .k{flex:1;min-width:0}#dv .dv-bh b{display:block;font-size:14.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dv .dv-lbl{display:block;font-size:11.5px;color:#86968f}' +
'#dv .dv-tg{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:99px;background:rgba(98,232,194,.14);color:#62e8c2;white-space:nowrap}' +
'#dv .dv-row{position:relative;display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.07)}#dv .dv-row .v{flex:1;min-width:0}#dv .dv-row .v b{display:block;font-size:14px;font-weight:600;overflow-wrap:anywhere;margin-top:1px}#dv .dv-row .v b.m{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;letter-spacing:.04em;font-size:14.5px}' +
'#dv .dv-cp{height:34px;min-width:34px;padding:0 10px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#cbd8d3;font-family:inherit;font-weight:600;font-size:12px;flex:none;cursor:pointer;transition:.15s}#dv .dv-cp:hover{background:rgba(255,255,255,.14)}#dv .dv-cp .dv-i{width:14px;height:14px}#dv .dv-cp.done{background:rgba(98,232,194,.16);color:#62e8c2;border-color:rgba(98,232,194,.35)}' +
'#dv .dv-note{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.45;color:#c4d0cc;padding:11px 13px;border-radius:16px;background:rgba(var(--nr,98,232,194),.07);border:1px solid rgba(var(--nr,98,232,194),.18);margin-bottom:12px}#dv .dv-note .dv-i{color:rgb(var(--nr,98,232,194));width:17px;height:17px;margin-top:1px}#dv .dv-note b.h{display:block;color:rgb(var(--nr,98,232,194));margin-bottom:4px}#dv .dv-note.w{--nr:255,194,74}' +
'#dv .dv-refv{display:flex;align-items:center;gap:10px;margin:2px 0 6px}#dv .dv-refv b{font:800 20px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.1em;color:#fff}' +
'#dv .dv-tips{margin:0 0 14px;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}#dv .dv-tips li{display:flex;gap:9px;font-size:12px;line-height:1.4;color:#9fb0aa}#dv .dv-tips li:before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:#62e8c2;margin-top:5px}' +
'#dv .dv-wait{display:flex;gap:14px;align-items:center;padding:16px;border-radius:18px;border:1px dashed rgba(255,255,255,.18);margin-bottom:12px}#dv .dv-wait .sp{flex:none;width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:#62e8c2;animation:dvSp .9s linear infinite}@keyframes dvSp{to{transform:rotate(360deg)}}#dv .dv-wait b{display:block;font-size:14px}#dv .dv-wait span{font-size:12px;color:#93a39e;line-height:1.45}' +
/* card */
'#dv .dv-card{position:relative;height:178px;border-radius:20px;padding:18px 20px;color:#fff;background:linear-gradient(135deg,#1e293b,#0f172a 60%,#13332b);box-shadow:0 22px 44px -18px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08) inset;overflow:hidden;transition:background .5s;margin-bottom:14px}' +
'#dv .dv-card[data-b="visa"]{background:linear-gradient(135deg,#1a237e,#283593 55%,#3949ab)}#dv .dv-card[data-b="mastercard"]{background:linear-gradient(135deg,#2a1a12,#7f1d1d 50%,#c2410c)}#dv .dv-card[data-b="amex"]{background:linear-gradient(135deg,#065f46,#0e7490)}' +
'#dv .dv-card:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.1) 48%,transparent 60%);animation:dvGl 6s ease-in-out infinite}@keyframes dvGl{0%,60%{transform:translateX(-100%)}100%{transform:translateX(100%)}}' +
'#dv .dv-chip{width:40px;height:30px;border-radius:7px;background:linear-gradient(135deg,#f3dd9a,#b8902f)}#dv .dv-brand{position:absolute;right:20px;top:18px;font-weight:800;font-style:italic;font-size:20px}#dv .dv-cn{margin-top:26px;font:600 19px ui-monospace,Menlo,monospace;letter-spacing:.12em}#dv .dv-cf{position:absolute;left:20px;right:20px;bottom:16px;display:flex;justify-content:space-between}#dv .dv-cf small{display:block;font-size:8.5px;letter-spacing:.1em;opacity:.6}#dv .dv-cf b{font-size:13px;text-transform:uppercase;letter-spacing:.04em}' +
'#dv .dv-f{position:relative;margin-bottom:10px}#dv .dv-f label{display:block;font-size:11.5px;color:#86968f;margin:0 0 5px 2px}#dv .dv-f input{width:100%;height:50px;border-radius:15px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font:inherit;font-size:15px;padding:0 42px 0 14px;outline:none;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}#dv .dv-f input:focus{border-color:rgba(98,232,194,.55);box-shadow:0 0 0 4px rgba(98,232,194,.08)}#dv .dv-f input.bad{border-color:#ff6b7a}#dv .dv-f .ok{position:absolute;right:14px;bottom:15px;color:#62e8c2;opacity:0;transform:scale(.4);transition:.2s}#dv .dv-f.good .ok{opacity:1;transform:none}' +
'#dv .dv-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
/* crypto */
'#dv .dv-coinsel{display:flex;gap:8px;margin-bottom:12px}#dv .dv-coinsel button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:15px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:#dbe5e1;font:inherit;font-weight:650;font-size:14px;cursor:pointer}#dv .dv-coinsel button svg{width:24px;height:24px}#dv .dv-coinsel button.on{border:1.5px solid rgba(98,232,194,.6);background:rgba(98,232,194,.1);color:#fff}' +
'#dv .dv-qrw{display:flex;gap:14px;align-items:center;padding:14px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin-bottom:12px}#dv .dv-qr{position:relative;width:132px;height:132px;border-radius:16px;background:#fff;padding:8px;flex:none;display:grid;place-items:center}#dv .dv-qr canvas,#dv .dv-qr img{width:116px!important;height:116px!important;image-rendering:pixelated}#dv .dv-qr .lg{position:absolute;left:50%;top:50%;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:#fff;padding:3px}#dv .dv-qr .lg svg{width:24px;height:24px}' +
'#dv .dv-addr{font:600 13px/1.5 "JetBrains Mono",ui-monospace,monospace;word-break:break-all;margin:6px 0 10px}#dv .dv-addr span{color:#7d8d88}' +
/* waiting */
'#dv .dv-flow{display:grid;grid-template-columns:auto 1fr auto 1fr auto;align-items:center;gap:6px;padding:14px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin-bottom:12px}' +
'#dv .dv-nd{display:flex;flex-direction:column;align-items:center;gap:6px;width:74px;text-align:center}#dv .dv-nd small{font-size:11px;color:#b2c0bb;line-height:1.2;min-height:26px}#dv .dv-o{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;position:relative;font-weight:800}#dv .dv-o svg:not(.dv-i){width:44px;height:44px}' +
'#dv .dv-o.ok{background:linear-gradient(140deg,#a3fbe3,#45cfa8);color:#03251b}#dv .dv-o.now{background:rgba(var(--cr),.14);border:1.5px solid var(--c);color:var(--c);box-shadow:0 0 0 6px rgba(var(--cr),.08),0 0 24px rgba(var(--cr),.35)}#dv .dv-o.now:after{content:"";position:absolute;inset:-7px;border-radius:19px;border:1.5px dashed rgba(var(--cr),.5);animation:dvSp 9s linear infinite}#dv .dv-o.off{background:#151c1e;border:1px solid rgba(255,255,255,.1);color:#8a9b95}' +
'#dv .dv-nd .now+small{color:var(--c);font-weight:600}#dv .dv-pipe{height:4px;border-radius:9px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.13) 0 6px,transparent 6px 12px);margin-bottom:32px;position:relative}#dv .dv-pipe.go{background:linear-gradient(90deg,#45cfa8,var(--c))}#dv .dv-pipe.go:after{content:"";position:absolute;top:-3px;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 12px #fff,0 0 22px var(--c);animation:dvMv 2.2s ease-in-out infinite}@keyframes dvMv{0%{left:0;opacity:0}15%,85%{opacity:1}100%{left:calc(100% - 10px);opacity:0}}' +
'#dv .dv-ws{text-align:center;padding:16px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin-bottom:12px}#dv .dv-ws h3{margin:0 0 4px;font-size:17px;font-weight:700}#dv .dv-ws p{margin:0;font-size:12.5px;color:#93a39e;line-height:1.45}' +
'#dv .dv-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-top:12px;text-align:left}#dv .dv-facts>div{padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);min-width:0}#dv .dv-facts b{display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'#dv .dv-msg{min-height:18px;text-align:center;font-size:12.5px;margin-top:8px;color:#62e8c2}#dv .dv-msg.bad{color:#ff8d9a}' +
'#dv .dv-pane{animation:dvIn .3s ease both}@keyframes dvIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
'@media (min-width:760px){#dv .dv-m{left:50%;top:50%;bottom:auto;width:min(500px,calc(100vw - 48px));max-height:calc(100vh - 48px);border-radius:30px;border-bottom:1px solid rgba(255,255,255,.08);transform:translate(-50%,-46%) scale(.97);opacity:0;transition:transform .3s cubic-bezier(.2,.9,.25,1),opacity .25s}#dv.in .dv-m{transform:translate(-50%,-50%);opacity:1}#dv .dv-sc{padding:22px 24px}#dv .dv-grab{display:none}}' +
'@media (max-width:370px){#dv .dv-sc{padding-left:14px;padding-right:14px}#dv .dv-qr{width:112px;height:112px}#dv .dv-qr canvas{width:98px!important;height:98px!important}#dv .dv-nd{width:64px}#dv .dv-amt input{font-size:36px}}' +
/* light */
'html[data-theme="light"] #dv .dv-bd{background:rgba(15,23,42,.35)}html[data-theme="light"] #dv .dv-m{color:#0c111b;background:linear-gradient(180deg,#fff,#f4f7f3);border-color:rgba(15,23,42,.1)}html[data-theme="light"] #dv .dv-m{--c:#0a7a56;--cr:10,140,100}html[data-theme="light"] #dv .dv-m.blue{--c:#1f6fd1;--cr:31,111,209}html[data-theme="light"] #dv .dv-au i{opacity:.14!important}' +
'html[data-theme="light"] #dv .dv-hd .t,html[data-theme="light"] #dv .dv-p,html[data-theme="light"] #dv .dv-note,html[data-theme="light"] #dv .dv-ws p,html[data-theme="light"] #dv .dv-tips li{color:#475569}html[data-theme="light"] #dv .dv-hd .t b{color:#0c111b}html[data-theme="light"] #dv .dv-lbl,html[data-theme="light"] #dv .dv-mt small,html[data-theme="light"] #dv .dv-amt label,html[data-theme="light"] #dv .dv-f label{color:#64748b}' +
'html[data-theme="light"] #dv .dv-ib,html[data-theme="light"] #dv .dv-btn:not(.pri),html[data-theme="light"] #dv .dv-cp,html[data-theme="light"] #dv .dv-pill,html[data-theme="light"] #dv .dv-coinsel button{background:#fff;border-color:rgba(15,23,42,.12);color:#1e293b}' +
'html[data-theme="light"] #dv .dv-mt,html[data-theme="light"] #dv .dv-amt,html[data-theme="light"] #dv .dv-qrw,html[data-theme="light"] #dv .dv-flow,html[data-theme="light"] #dv .dv-ws{background:#fff;border-color:rgba(15,23,42,.09)}html[data-theme="light"] #dv .dv-mt.on{background:#effaf5;border-color:#0a9a6c}html[data-theme="light"] #dv .dv-mt.on .dv-r{border-color:#0a9a6c}' +
'html[data-theme="light"] #dv .dv-amt input{color:#0c111b}html[data-theme="light"] #dv .dv-amt input::placeholder{color:#c3cbd2}html[data-theme="light"] #dv .dv-pill.on{background:#e3f7f0;color:#0a7a56;border-color:rgba(10,122,86,.35)}' +
'html[data-theme="light"] #dv .dv-bc{background:linear-gradient(135deg,#e9f8f1,#f7fbf8 60%,#fdf8ea);border-color:rgba(10,122,86,.2);box-shadow:0 12px 30px -18px rgba(15,23,42,.3)}html[data-theme="light"] #dv .dv-row{border-color:rgba(15,23,42,.07)}html[data-theme="light"] #dv .dv-refv b{color:#0c111b}' +
'html[data-theme="light"] #dv .dv-big b{background:linear-gradient(180deg,#0c111b,#334155);-webkit-background-clip:text;background-clip:text}html[data-theme="light"] #dv .dv-f input{background:#fff;border-color:rgba(15,23,42,.14);color:#0c111b}html[data-theme="light"] #dv .dv-facts>div{background:#f6f8f5;border-color:rgba(15,23,42,.07)}' +
'html[data-theme="light"] #dv .dv-btn.pri{background:linear-gradient(135deg,#14a37a,#0a7a56);color:#fff}html[data-theme="light"] #dv .dv-mt.on .mi,html[data-theme="light"] #dv .dv-av,html[data-theme="light"] #dv .dv-o.ok{background:linear-gradient(140deg,#2fbf8f,#0b8a62);color:#fff}html[data-theme="light"] #dv .dv-o.off{background:#eef2ef;color:#64748b;border-color:rgba(15,23,42,.1)}html[data-theme="light"] #dv .dv-nd small{color:#475569}html[data-theme="light"] #dv .dv-grab{background:rgba(15,23,42,.18)}html[data-theme="light"] #dv .dv-msg{color:#0a7a56}html[data-theme="light"] #dv .dv-coins svg{box-shadow:0 0 0 2px #fff}' +
'@media (prefers-reduced-motion:reduce){#dv *{animation:none!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  /* ───────── state ───────── */
  var el = null, step = 1, method = 'sepa', coin = 'BTC', amount = '', card = { n: '', h: '', x: '' }, sent = null, busy = false, lastFocus = null;
  function root() {
    if (el) return el; css();
    el = document.createElement('div'); el.id = 'dv'; el.className = 'nc-no-i18n'; el.setAttribute('data-nci18n', 'off');
    el.innerHTML = '<div class="dv-bd" data-a="close"></div><div class="dv-m" role="dialog" aria-modal="true" tabindex="-1"><div class="dv-au"><i></i><i></i></div><div class="dv-sc"></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', onClick); el.addEventListener('input', onInput);
    swipe(el.querySelector('.dv-m'));
    return el;
  }
  function isOpen() { return !!(el && el.classList.contains('on')); }
  function open() {
    try { console.log('[NordicCrypto] Add money UI v5 active'); } catch (e) {}
    root(); lastFocus = document.activeElement; step = 1; sent = null; amount = ''; busy = false;
    var st0 = S(); if (!(st0.user && st0.user.iban) && (wallet('BTC') || wallet('ETH'))) method = 'crypto';
    paint(); el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); try { el.querySelector('.dv-m').focus({ preventScroll: true }); } catch (e) { } }); });
  }
  function close(fromMask) {
    if (!isOpen()) return; el.classList.remove('in');
    setTimeout(function () { if (!el.classList.contains('in')) { el.classList.remove('on'); el.querySelector('.dv-m').style.transform = ''; } }, 320);
    document.documentElement.style.overflow = '';
    var m = $('mask'); if (m) m.classList.remove('dv-hide');
    if (!fromMask && m && m.classList.contains('on') && typeof window.closeModal === 'function') { try { window.closeModal(); } catch (e) { } }
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
  }
  window.NCDeposit = { open: function () { if (typeof window.openModal === 'function') window.openModal('add'); else open(); }, close: close };

  /* open the new window in the same moment as openModal('add') — the old one must never flash first */
  (function hook() {
    var f = window.openModal;
    if (typeof f === 'function' && !f.__dv) {
      var w = function (m) {
        var mk = $('mask'), take = m === 'add';
        if (take && mk) mk.classList.add('dv-hide');
        var r = f.apply(this, arguments);
        if (take) { if (mk) mk.classList.add('dv-hide'); if (!isOpen()) open(); }
        return r;
      };
      w.__dv = 1; for (var k in f) { try { w[k] = f[k]; } catch (e) { } } window.openModal = w;
    }
    setTimeout(hook, 800);
  })();
  /* hidden from the very first paint while the new window is in charge */
  (function () { var st = document.createElement('style'); st.textContent = '#mask.dv-hide,#mask.dv-hide *{transition:none!important;animation:none!important}'; document.head.appendChild(st); })();
  /* take over the "add" mode of #mask; "transfer" mode stays the old window */
  setInterval(function () {
    var m = $('mask'); if (!m) return;
    var on = m.classList.contains('on') && modeAdd();
    if (on) { if (!m.classList.contains('dv-hide')) m.classList.add('dv-hide'); if (!isOpen()) open(); }
    else if (!m.classList.contains('on')) { /* keep it hidden between openings so a later openModal('add') never shows the old box */ }
    else { if (m.classList.contains('dv-hide')) m.classList.remove('dv-hide'); if (isOpen() && step !== 3) close(true); }
  }, 120);

  /* ───────── render ───────── */
  function hdr(back, steps) {
    var t = method === 'sepa' ? T('bank') : method === 'swift' ? T('swift') : method === 'card' ? T('card') : T('crypto');
    return '<div class="dv-grab"></div><div class="dv-hd">' + (back ? '<button type="button" class="dv-ib" data-a="back" aria-label="' + esc(T('back')) + '">' + ic('back') + '</button>' : '') +
      '<div class="t">' + ic('in') + '<span>' + esc(T('title')) + (step > 1 ? ' · <b>' + esc(t) + '</b>' : '') + '</span></div>' +
      (steps ? '<div class="dv-steps"><i class="on"></i><i' + (step >= 2 ? ' class="on"' : '') + '></i><i' + (step >= 3 ? ' class="on"' : '') + '></i></div>' : '') +
      '<button type="button" class="dv-ib" data-a="close" aria-label="' + esc(T('close')) + '">' + ic('x') + '</button></div>';
  }
  function paint() {
    var sc = el.querySelector('.dv-sc'), m = el.querySelector('.dv-m');
    m.className = 'dv-m' + (step === 3 ? (method === 'crypto' ? ' blue' : ' amb') : '');
    var h = step === 1 ? s1() : step === 2 ? s2() : s3();
    sc.innerHTML = h; sc.scrollTop = 0;
    if (step === 2 && method === 'crypto') drawQr();
    if (step === 1) { var a = el.querySelector('#dvAmt'); if (a && window.innerWidth >= 760) setTimeout(function () { try { a.focus(); } catch (e) { } }, 60); }
  }
  function tile(id, icon, title, sub, extra) {
    return '<button type="button" class="dv-mt' + (method === id ? ' on' : '') + '" data-m="' + id + '"><span class="mi">' + ic(icon) + '</span><span class="k"><b>' + esc(title) + (extra || '') + '</b><small>' + esc(sub) + '</small></span>' + (id === 'crypto' ? '<span class="dv-coins">' + COIN.BTC + COIN.ETH + '</span>' : '') + '<span class="dv-r"></span></button>';
  }
  function s1() {
    var cry = method === 'crypto';
    return '<div class="dv-pane">' + hdr(false, true) + '<h2>' + esc(T('how')) + '</h2><div class="dv-p">' + ic('lock') + esc(T('secured')) + '</div>' +
      tile('sepa', 'bank', T('bank'), T('bankS'), ' <span class="dv-tag">' + esc(T('popular')) + '</span>') + tile('swift', 'globe', T('swift'), T('swiftS')) + tile('card', 'card', T('card'), T('cardS')) + tile('crypto', 'coin', T('crypto'), T('cryptoS')) +
      '<div class="dv-amt"><label for="dvAmt">' + esc(T('amount')) + ' (USD)' + (cry ? ' · ' + esc(T('optional')) : '') + '</label><div class="row"><span class="cur">$</span><input id="dvAmt" type="number" inputmode="decimal" min="1" step="any" placeholder="0" value="' + esc(amount) + '" aria-label="' + esc(T('amount')) + '"></div>' +
      '<div class="dv-pills">' + [100, 500, 1000, 5000].map(function (v) { return '<button type="button" class="dv-pill' + (Number(amount) === v ? ' on' : '') + '" data-q="' + v + '">' + esc(usd(v, 0)) + '</button>'; }).join('') + '</div></div>' +
      '<button type="button" class="dv-btn pri full" data-a="next">' + esc(T('cont')) + ic('chev') + '</button><div class="dv-msg" aria-live="polite"></div></div>';
  }
  function s2() {
    var a = Number(amount) || 0;
    if (method === 'sepa' || method === 'swift') {
      var u = S().user || {};
      if (!u.iban) return '<div class="dv-pane">' + hdr(true, true) + '<div class="dv-wait"><div class="sp"></div><div><b>' + esc(T('noIban')) + '</b><span>' + esc(T('noIbanS')) + '</span></div></div><button type="button" class="dv-btn full" data-a="chat">' + ic('chat') + esc(T('chat')) + '</button></div>';
      var ref = refCode(), name = holderName() || '—', cc = String(u.country || '').toUpperCase(), ctry = CN[cc] || cc;
      var all = [T('benef') + ': ' + name, 'IBAN: ' + groupIban(u.iban), u.swift ? 'BIC/SWIFT: ' + u.swift : '', u.bank ? T('bankN') + ': ' + u.bank : '', ctry ? T('country') + ': ' + ctry : '', T('refShort') + ': ' + ref].filter(Boolean).join('\n');
      var row = function (lab, val, mono, cp) { return '<div class="dv-row"><div class="v"><span class="dv-lbl">' + esc(lab) + '</span><b' + (mono ? ' class="m"' : '') + '>' + esc(val) + '</b></div>' + (cp ? '<button type="button" class="dv-cp" data-cp="' + esc(cp) + '" aria-label="' + esc(T('copy')) + '">' + ic('cp') + '</button>' : '') + '</div>'; };
      return '<div class="dv-pane">' + hdr(true, true) + '<div class="dv-big"><small>' + esc(T('sendExact')) + '</small><b>' + esc(usd(a)) + '</b></div>' +
        '<div class="dv-bc"><div class="dv-bh"><div class="dv-av">' + ic('bank') + '</div><div class="k"><b>' + esc(T('yourAcc')) + '</b><span class="dv-lbl">' + esc(u.bank || '') + (cc ? ' ' + flag(cc) : '') + '</span></div><span class="dv-tg">' + (method === 'sepa' ? 'SEPA · EUR' : 'SWIFT') + '</span></div>' +
        row(T('benef'), name, false, name) + row('IBAN', groupIban(u.iban), true, String(u.iban).replace(/\s/g, '')) + (u.swift ? row('BIC / SWIFT', u.swift, true, u.swift) : '') + (ctry ? row(T('country'), ctry, false, '') : '') + '</div>' +
        '<div class="dv-note w">' + ic('warn') + '<div style="flex:1;min-width:0"><b class="h">' + esc(T('ref')) + '</b><div class="dv-refv"><b>' + esc(ref) + '</b><button type="button" class="dv-cp" data-cp="' + esc(ref) + '">' + ic('cp') + '</button></div>' + esc(T('refWarn')) + '</div></div>' +
        '<ul class="dv-tips"><li>' + esc(T('ownName')) + '</li><li>' + esc(method === 'sepa' ? T('sepaEur') : T('swiftFee')) + '</li></ul>' +
        '<div class="dv-acts"><button type="button" class="dv-btn" data-cp="' + esc(all) + '">' + ic('cp') + esc(T('copyAll')) + '</button><button type="button" class="dv-btn pri" data-a="send">' + esc(T('iSent')) + '</button></div><div class="dv-msg" aria-live="polite"></div></div>';
    }
    if (method === 'card') {
      var b = brandOf(digits(card.n)), shown = (digits(card.n) + '••••••••••••••••').slice(0, b === 'amex' ? 15 : 16).replace(/(.{4})/g, '$1 ').trim();
      return '<div class="dv-pane">' + hdr(true, true) + '<div class="dv-big"><small>' + esc(T('amount')) + '</small><b>' + esc(usd(a)) + '</b></div>' +
        '<div class="dv-card" id="dvCard" data-b="' + b + '"><div class="dv-chip"></div><div class="dv-brand" id="dvBr">' + BR[b] + '</div><div class="dv-cn" id="dvCn">' + esc(shown) + '</div><div class="dv-cf"><div><small>' + esc(T('holder').toUpperCase()) + '</small><b id="dvHn">' + esc((card.h || holderName() || T('yourName')).toUpperCase().slice(0, 26)) + '</b></div><div><small>' + esc(T('expiry').toUpperCase()) + '</small><b id="dvEx">' + esc(card.x || 'MM/YY') + '</b></div></div></div>' +
        '<div class="dv-f' + (luhn(digits(card.n)) ? ' good' : '') + '" id="dvFn"><label for="dvN">' + esc(T('cardNo')) + '</label><input id="dvN" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="1234 5678 9012 3456" value="' + esc(card.n) + '"><span class="ok">' + ic('ok') + '</span></div>' +
        '<div class="dv-f"><label for="dvH">' + esc(T('holder')) + '</label><input id="dvH" autocomplete="cc-name" maxlength="40" placeholder="' + esc(T('holderPh')) + '" value="' + esc(card.h || holderName()) + '"></div>' +
        '<div class="dv-two"><div class="dv-f' + (expOk(card.x) ? ' good' : '') + '" id="dvFe"><label for="dvE">' + esc(T('expiry')) + '</label><input id="dvE" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/YY" value="' + esc(card.x) + '"><span class="ok">' + ic('ok') + '</span></div><div></div></div>' +
        '<div class="dv-note">' + ic('lock') + '<span>' + esc(T('cardSafe')) + '</span></div>' +
        '<button type="button" class="dv-btn pri full" data-a="send">' + ic('lock') + esc(T('reqCard')) + '</button><div class="dv-msg" aria-live="polite"></div></div>';
    }
    /* crypto */
    var addr = wallet(coin);
    var body = addr ? '<div class="dv-qrw"><div class="dv-qr" id="dvQr"><div class="lg">' + COIN[coin] + '</div></div><div style="min-width:0;flex:1"><span class="dv-lbl">' + esc(T('depAddr', { c: coin })) + '</span><div class="dv-addr">' + esc(addr.slice(0, 6)) + '<span>' + esc(addr.slice(6, -6)) + '</span>' + esc(addr.slice(-6)) + '</div><button type="button" class="dv-cp" data-cp="' + esc(addr) + '">' + ic('cp') + esc(T('copy')) + '</button></div></div>' +
      '<div class="dv-note w">' + ic('warn') + '<span><b class="h">' + esc(T('sendOnly', { c: coin, n: NETN[coin] })) + '</b>' + esc(T('otherLost')) + '</span></div><div class="dv-note">' + ic('clock') + '<span>' + esc(T('confNote')) + '</span></div>' +
      (coin === 'ETH' && window.NCWalletPay && window.NCWalletPay.available() ? walletPayBtn() : '') +
      '<div class="dv-acts"><button type="button" class="dv-btn" data-a="share" data-v="' + esc(addr) + '">' + ic('share') + esc(T('share')) + '</button><button type="button" class="dv-btn pri" data-a="send">' + esc(T('sentIt')) + '</button></div>'
      : '<div class="dv-wait"><div class="sp"></div><div><b>' + esc(T('noAddr', { c: coin })) + '</b><span>' + esc(T('noAddrS')) + '</span></div></div><button type="button" class="dv-btn full" data-a="chat">' + ic('chat') + esc(T('chat')) + '</button>';
    return '<div class="dv-pane">' + hdr(true, true) + '<div class="dv-coinsel">' + ['BTC', 'ETH'].map(function (c) { return '<button type="button" data-c="' + c + '" class="' + (coin === c ? 'on' : '') + '">' + COIN[c] + c + '</button>'; }).join('') + '</div>' + body + '<div class="dv-msg" aria-live="polite"></div></div>';
  }
  function s3() {
    var cry = method === 'crypto', cardM = method === 'card', a = Number(amount) || 0;
    var n1 = cry ? '<div class="dv-nd"><div class="dv-o ok">' + COIN[coin] + '</div><small>' + esc(T('network')) + '</small></div>' : '<div class="dv-nd"><div class="dv-o now">' + ic(cardM ? 'card' : 'bank') + '</div><small>' + esc(cardM ? T('yourCard') : T('yourBank')) + '</small></div>';
    var n2 = cry || cardM ? '<div class="dv-nd"><div class="dv-o now">' + ic(cry ? 'net' : 'sh') + '</div><small>' + esc(cry ? T('network') : T('check')) + '</small></div>' : '<div class="dv-nd"><div class="dv-o off">' + ic('sh') + '</div><small>' + esc(T('check')) + '</small></div>';
    if (cry) n2 = '<div class="dv-nd"><div class="dv-o now">' + ic('sh') + '</div><small>' + esc(T('check')) + '</small></div>';
    var n3 = '<div class="dv-nd"><div class="dv-o off">N</div><small>' + esc(T('yourBal')) + '</small></div>';
    var p1 = cry || cardM ? 'go' : '', ttl = cry ? T('waitCry') : cardM ? T('waitCard') : T('waitBank'), sub = cardM ? T('cardWaitS') : T('waitS');
    var facts = (a > 0 ? '<div><span class="dv-lbl">' + esc(T('amount')) + '</span><b>' + esc(usd(a)) + '</b></div>' : '') +
      (sent && sent.meta && sent.meta.ref ? '<div><span class="dv-lbl">' + esc(T('refShort')) + '</span><b>' + esc(sent.meta.ref) + '</b></div>' : '') +
      (sent && sent.meta && sent.meta.last4 ? '<div><span class="dv-lbl">' + esc(T('cardNo')) + '</span><b>•••• ' + esc(sent.meta.last4) + '</b></div>' : '') +
      (cry ? '<div><span class="dv-lbl">' + esc(T('network')) + '</span><b>' + esc(NETN[coin]) + '</b></div>' : '<div><span class="dv-lbl">' + esc(T('status')) + '</span><b>' + esc(T('review')) + '</b></div>');
    return '<div class="dv-pane">' + hdr(false, true) + '<div class="dv-flow">' + n1 + '<div class="dv-pipe ' + p1 + '"></div>' + n2 + '<div class="dv-pipe"></div>' + n3 + '</div>' +
      '<div class="dv-ws"><h3>' + esc(ttl) + '</h3><p>' + esc(sub) + '</p><div class="dv-facts">' + facts + '</div></div>' +
      '<div class="dv-acts">' + (sent && !cry ? '<button type="button" class="dv-btn" data-a="details">' + esc(T('details')) + '</button>' : '<button type="button" class="dv-btn" data-a="chat">' + ic('chat') + esc(T('chat')) + '</button>') + '<button type="button" class="dv-btn pri" data-a="close">' + esc(T('done')) + '</button></div></div>';
  }
  function drawQr() {
    var q = el.querySelector('#dvQr'), addr = wallet(coin); if (!q || !addr) return;
    try { if (typeof window.QRious === 'function') { var cv = document.createElement('canvas'); new window.QRious({ element: cv, value: addr, size: 232, level: 'H', padding: 0 }); q.insertBefore(cv, q.firstChild); return; } } catch (e) { }
    var old = document.querySelector('#mQrCode canvas'); if (old) { var c2 = document.createElement('img'); c2.src = old.toDataURL(); q.insertBefore(c2, q.firstChild); return; }
    q.style.display = 'none';            /* no QR library: show the address on its own */
  }

  /* ───────── actions ───────── */
  function msg(t, bad) { var m = el.querySelector('.dv-msg'); if (!m) return; m.className = 'dv-msg' + (bad ? ' bad' : ''); m.textContent = t; clearTimeout(m._t); m._t = setTimeout(function () { m.textContent = ''; }, 4000); }
  function copy(v, b) {
    var done = function () { if (b) { var o = b.innerHTML, wide = b.classList.contains('dv-btn'); b.classList.add('done'); b.innerHTML = ic('ok') + (wide ? esc(T('copied')) : ''); setTimeout(function () { b.classList.remove('done'); b.innerHTML = o; }, 1500); } msg(T('copied')); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(v).then(done, function () { fb(); done(); }); return; } } catch (e) { }
    fb(); done();
    function fb() { var t = document.createElement('textarea'); t.value = v; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { } t.remove(); }
  }
  function onInput(e) {
    var t = e.target;
    if (t.id === 'dvAmt') { amount = t.value; [].forEach.call(el.querySelectorAll('.dv-pill'), function (p) { p.classList.toggle('on', Number(p.getAttribute('data-q')) === Number(amount)); }); return; }
    if (t.id === 'dvN') { var d = digits(t.value).slice(0, 19), b = brandOf(d); t.value = b === 'amex' ? d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, function (_, a, c, x) { return [a, c, x].filter(Boolean).join(' '); }) : d.replace(/(.{4})/g, '$1 ').trim(); card.n = t.value; $('dvCn').textContent = (d + '••••••••••••••••').slice(0, b === 'amex' ? 15 : 16).replace(/(.{4})/g, '$1 ').trim(); $('dvCard').setAttribute('data-b', b); $('dvBr').textContent = BR[b]; $('dvFn').classList.toggle('good', luhn(d)); t.classList.remove('bad'); }
    if (t.id === 'dvH') { card.h = t.value; $('dvHn').textContent = (t.value || T('yourName')).toUpperCase().slice(0, 26); t.classList.remove('bad'); }
    if (t.id === 'dvE') { var x = digits(t.value).slice(0, 4); if (x.length >= 3) x = x.slice(0, 2) + '/' + x.slice(2); t.value = x; card.x = x; $('dvEx').textContent = x || 'MM/YY'; $('dvFe').classList.toggle('good', expOk(x)); t.classList.remove('bad'); }
  }
  function bad(id, text) { var i = $(id); if (i) { i.classList.add('bad'); try { i.focus(); } catch (e) { } } msg(text, true); }
  function legacySet() { try { var m = $('mMethod'), a = $('mAmount'); if (m) { m.value = MLEG[method === 'crypto' ? coin : method]; try { if (typeof window.refreshDest === 'function') window.refreshDest(); } catch (e) { } } if (a) a.value = String(Number(amount) > 0 ? Number(amount) : 1); } catch (e) { } }
  function ethEst() { var usd = Number(amount) || 0; var ep = (window.st && Number(window.st.ethP)) || 0; return (usd > 0 && ep > 0) ? usd / ep : 0; }
  function walletPayBtn() {
    var e = ethEst();
    var sub = e > 0 ? T('paySub', { e: e.toLocaleString(undefined, { maximumFractionDigits: 5 }) }) : T('payNeedAmt');
    return '<button type="button" class="dv-btn pri dv-pay" data-a="walletpay">' + ic('wallet') + '<span class="dv-pt"><b>' + esc(T('payWallet')) + '</b><em>' + esc(sub) + '</em></span></button>';
  }
  function walletPay() {
    if (busy) return;
    if (window.adminViewingEmail || localStorage.getItem('user_role') === 'admin') return msg(T('admin'), true);
    if (!window.NCWalletPay || !window.NCWalletPay.available()) return;
    var addr = wallet('ETH'); if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return;
    var e = ethEst();
    if (!(e > 0)) return msg(T('payNeedAmt'), true);
    busy = true; msg(T('payConfirm'));
    window.NCWalletPay.sendETH({ to: addr, amountEth: e }).then(function (r) {
      var tk = typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token');
      var usd = Number(amount) || 0;
      return fetch(WORKER + '?action=requestDeposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk, amount: usd, method: MLEG['ETH'], meta: { via: 'wallet', coin: 'ETH', txHash: r.txHash, from: r.from } }) }).then(function (x) { return x.json(); }).then(function (resp) {
        busy = false;
        try { if (window.NCSound) window.NCSound.notify(); } catch (x) {}
        try { if (typeof window.addNotification === 'function') window.addNotification('Deposit sent from wallet: ' + e.toFixed(5) + ' ETH — confirming on network', '⏳'); } catch (x) {}
        if (resp && resp.ok && resp.request) { var w = window.st; if (w) { if (!Array.isArray(w.depositRequests)) w.depositRequests = []; w.depositRequests.unshift(resp.request); } sent = resp.request; }
        try { if (typeof window.renderTx === 'function') window.renderTx(); if (typeof window.renderRecentTx === 'function') window.renderRecentTx(); } catch (x) {}
        step = 3; paint();
      });
    }).catch(function (err) {
      busy = false;
      var m = (err && err.message) || '';
      if ((err && err.code === 4001) || /reject|cancel|denied|4001/i.test(m)) msg(T('payRejected'), true);
      else msg(T('conn'), true);
    });
  }
  function submit(btn) {
    if (busy) return;
    if (window.adminViewingEmail || localStorage.getItem('user_role') === 'admin') return msg(T('admin'), true);
    var a = Number(amount) || 0;
    if (method === 'crypto') {
      if (!wallet(coin)) return;
      legacySet(); var ok = $('mOk'); if (ok) ok.click();          // original crypto flow: blockchain watcher + "watching" pill + detection pop-ups
      step = 3; paint(); return;
    }
    if (!(a > 0)) return msg(T('enterAmt'), true);
    var meta = {};
    if (method === 'card') {
      var n = digits(card.n), h = String(card.h || holderName() || '').trim(), x = card.x;
      if (!luhn(n)) return bad('dvN', T('badCard')); if (h.length < 2) return bad('dvH', T('badHolder')); if (!expOk(x)) return bad('dvE', T('badExp'));
      meta = { brand: BR[brandOf(n)] || 'Card', last4: n.slice(-4), holder: h, exp: x };
    } else meta = { ref: refCode() };
    var tk = typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token');
    busy = true; btn.disabled = true;
    fetch(WORKER + '?action=requestDeposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk, amount: a, method: MLEG[method], meta: meta }) }).then(function (r) { return r.json(); }).then(function (r) {
      busy = false; btn.disabled = false;
      if (!r || !r.ok) return msg((r && r.error) || T('conn'), true);
      var w = window.st; if (w) { if (!Array.isArray(w.depositRequests)) w.depositRequests = []; w.depositRequests.unshift(r.request); }
      try { if (typeof window.addNotification === 'function') window.addNotification('Deposit submitted via ' + MLEG[method] + ': $' + a.toFixed(2) + ' — under review', '⏳'); } catch (e) { }
      try { if (window.NCSound) window.NCSound.notify(); } catch (e) { }
      try { if (typeof window.renderTx === 'function') window.renderTx(); if (typeof window.renderRecentTx === 'function') window.renderRecentTx(); } catch (e) { }
      sent = r.request; step = 3; paint();
    }).catch(function () { busy = false; btn.disabled = false; msg(T('conn'), true); });
  }
  function onClick(e) {
    var b = e.target.closest('[data-a],[data-m],[data-q],[data-c],[data-cp]'); if (!b || !el.contains(b)) return;
    if (b.hasAttribute('data-m')) { method = b.getAttribute('data-m'); [].forEach.call(el.querySelectorAll('.dv-mt'), function (x) { x.classList.toggle('on', x === b); }); var lb = el.querySelector('.dv-amt label'); if (lb) lb.textContent = T('amount') + ' (USD)' + (method === 'crypto' ? ' · ' + T('optional') : ''); return; }
    if (b.hasAttribute('data-q')) { amount = b.getAttribute('data-q'); var ai = $('dvAmt'); if (ai) ai.value = amount; [].forEach.call(el.querySelectorAll('.dv-pill'), function (p) { p.classList.toggle('on', p === b); }); return; }
    if (b.hasAttribute('data-c')) { coin = b.getAttribute('data-c'); legacySet(); paint(); return; }
    if (b.hasAttribute('data-cp')) { copy(b.getAttribute('data-cp'), b); return; }
    var a = b.getAttribute('data-a');
    if (a === 'close') return close();
    if (a === 'back') { step = 1; paint(); return; }
    if (a === 'next') { if (method !== 'crypto' && !(Number(amount) > 0)) { var ai2 = $('dvAmt'); if (ai2) { ai2.focus(); } msg(T('enterAmt'), true); return; } step = 2; legacySet(); paint(); return; }
    if (a === 'walletpay') return walletPay();
    if (a === 'send') return submit(b);
    if (a === 'share') { var v = b.getAttribute('data-v'); try { if (navigator.share) { navigator.share({ text: v }).catch(function () { }); return; } } catch (x) { } copy(v, b); return; }
    if (a === 'chat') { close(); setTimeout(function () { try { if (typeof window.toggleChat === 'function') window.toggleChat(); } catch (x) { } }, 340); return; }
    if (a === 'details') { var rq = sent; close(); setTimeout(function () { try { if (rq && window.NCTxCard) window.NCTxCard.open({ ts: rq.createdAt, desc: 'Deposit via ' + rq.method, amt: rq.amount, status: 'Under Review', depositRequest: true, type: /card/i.test(rq.method) ? 'card' : 'bank' }); } catch (x) { } }, 340); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } if (e.key === 'Enter' && isOpen() && step === 1 && e.target && e.target.id === 'dvAmt') { var n = el.querySelector('[data-a="next"]'); if (n) n.click(); } }, true);
  function swipe(m) {
    var y0 = null, dy = 0;
    m.addEventListener('touchstart', function (e) { if (window.innerWidth >= 760) return; var sc = m.querySelector('.dv-sc'); if (!e.target.closest('.dv-grab,.dv-hd') && sc && sc.scrollTop > 0) return; if (e.target.closest('input')) return; y0 = e.touches[0].clientY; dy = 0; m.style.transition = 'none'; }, { passive: true });
    m.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) m.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    m.addEventListener('touchend', function () { if (y0 == null) return; m.style.transition = ''; if (dy > 110) close(); else m.style.transform = ''; y0 = null; });
  }
  window.addEventListener('nc-lang', function () { if (isOpen()) setTimeout(paint, 60); });
})();
