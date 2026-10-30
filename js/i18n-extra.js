/* i18n-extra.js v1.0 — translations for the newer screens (profile photo, crypto withdrawal).
   Adds phrases to NCI18N only AFTER the main dictionary of the active language has loaded (add() would otherwise mark it as loaded). */
(function () {
  'use strict';
  var K = ['Profile photo', 'Upload photo', 'Remove photo', 'Close', 'Could not upload photo', 'Choose an image (JPG, PNG, WebP)', 'Photo updated', 'Change photo',
    'Amount in', 'Max', 'You will receive ≈', 'Enter amount to see conversion', 'Processing withdrawal', 'Converting USD to {c}', 'Checking address {a}', 'Sending to compliance review',
    'Withdrawal failed', 'Back', 'Request submitted', 'Your withdrawal is under review. We will notify you once it is sent.', 'Debited', 'You receive', 'Network', 'To', 'Status', 'Under review', 'Done',
    'Minimum withdrawal is $1.00', 'Amount exceeds available balance', 'Session expired. Please sign in again.'];
  var D = {
    da: ['Profilbillede', 'Upload billede', 'Fjern billede', 'Luk', 'Billedet kunne ikke uploades', 'Vælg et billede (JPG, PNG, WebP)', 'Billedet er opdateret', 'Skift billede',
      'Beløb i', 'Maks', 'Du modtager ca.', 'Indtast beløb for at se omregningen', 'Behandler udbetaling', 'Konverterer USD til {c}', 'Kontrollerer adresse {a}', 'Sender til compliance-gennemgang',
      'Udbetaling mislykkedes', 'Tilbage', 'Anmodning sendt', 'Din udbetaling er under gennemgang. Vi giver dig besked, når den er sendt.', 'Trukket', 'Du modtager', 'Netværk', 'Til', 'Status', 'Under gennemgang', 'Færdig',
      'Minimumsudbetaling er $1,00', 'Beløbet overstiger den disponible saldo', 'Sessionen er udløbet. Log ind igen.'],
    fi: ['Profiilikuva', 'Lataa kuva', 'Poista kuva', 'Sulje', 'Kuvan lataus epäonnistui', 'Valitse kuva (JPG, PNG, WebP)', 'Kuva päivitetty', 'Vaihda kuva',
      'Summa valuutassa', 'Maks.', 'Saat noin', 'Syötä summa nähdäksesi muunnoksen', 'Käsitellään nostoa', 'Muunnetaan USD → {c}', 'Tarkistetaan osoite {a}', 'Lähetetään vaatimustenmukaisuuden tarkistukseen',
      'Nosto epäonnistui', 'Takaisin', 'Pyyntö lähetetty', 'Nostosi on tarkistettavana. Ilmoitamme, kun se on lähetetty.', 'Veloitettu', 'Saat', 'Verkko', 'Vastaanottaja', 'Tila', 'Tarkistettavana', 'Valmis',
      'Vähimmäisnosto on 1,00 $', 'Summa ylittää käytettävissä olevan saldon', 'Istunto on vanhentunut. Kirjaudu uudelleen.'],
    es: ['Foto de perfil', 'Subir foto', 'Eliminar foto', 'Cerrar', 'No se pudo subir la foto', 'Elige una imagen (JPG, PNG, WebP)', 'Foto actualizada', 'Cambiar foto',
      'Importe en', 'Máx.', 'Recibirás aprox.', 'Introduce un importe para ver la conversión', 'Procesando retiro', 'Convirtiendo USD a {c}', 'Comprobando la dirección {a}', 'Enviando a revisión de cumplimiento',
      'El retiro ha fallado', 'Atrás', 'Solicitud enviada', 'Tu retiro está en revisión. Te avisaremos cuando se envíe.', 'Cargado', 'Recibes', 'Red', 'Para', 'Estado', 'En revisión', 'Hecho',
      'El retiro mínimo es de 1,00 $', 'El importe supera el saldo disponible', 'La sesión ha caducado. Inicia sesión de nuevo.'],
    no: ['Profilbilde', 'Last opp bilde', 'Fjern bilde', 'Lukk', 'Kunne ikke laste opp bildet', 'Velg et bilde (JPG, PNG, WebP)', 'Bildet er oppdatert', 'Bytt bilde',
      'Beløp i', 'Maks', 'Du mottar ca.', 'Skriv inn beløp for å se omregningen', 'Behandler uttak', 'Konverterer USD til {c}', 'Kontrollerer adresse {a}', 'Sender til compliance-gjennomgang',
      'Uttaket mislyktes', 'Tilbake', 'Forespørsel sendt', 'Uttaket ditt er under gjennomgang. Vi varsler deg når det er sendt.', 'Belastet', 'Du mottar', 'Nettverk', 'Til', 'Status', 'Under gjennomgang', 'Ferdig',
      'Minste uttak er $1,00', 'Beløpet overstiger tilgjengelig saldo', 'Økten har utløpt. Logg inn på nytt.'],
    sv: ['Profilbild', 'Ladda upp bild', 'Ta bort bild', 'Stäng', 'Det gick inte att ladda upp bilden', 'Välj en bild (JPG, PNG, WebP)', 'Bilden är uppdaterad', 'Byt bild',
      'Belopp i', 'Max', 'Du får ca', 'Ange belopp för att se omräkningen', 'Behandlar uttag', 'Konverterar USD till {c}', 'Kontrollerar adress {a}', 'Skickar till granskning',
      'Uttaget misslyckades', 'Tillbaka', 'Begäran skickad', 'Ditt uttag granskas. Vi meddelar dig när det är skickat.', 'Debiterat', 'Du får', 'Nätverk', 'Till', 'Status', 'Granskas', 'Klar',
      'Minsta uttag är 1,00 $', 'Beloppet överstiger tillgängligt saldo', 'Sessionen har gått ut. Logga in igen.'],
    fr: ['Photo de profil', 'Téléverser une photo', 'Supprimer la photo', 'Fermer', 'Impossible de téléverser la photo', 'Choisissez une image (JPG, PNG, WebP)', 'Photo mise à jour', 'Changer la photo',
      'Montant en', 'Max', 'Vous recevrez env.', 'Saisissez un montant pour voir la conversion', 'Traitement du retrait', 'Conversion de USD en {c}', 'Vérification de l’adresse {a}', 'Envoi à l’examen de conformité',
      'Échec du retrait', 'Retour', 'Demande envoyée', 'Votre retrait est en cours d’examen. Nous vous préviendrons dès son envoi.', 'Débité', 'Vous recevez', 'Réseau', 'Vers', 'Statut', 'En cours d’examen', 'Terminé',
      'Le retrait minimum est de 1,00 $', 'Le montant dépasse le solde disponible', 'Session expirée. Veuillez vous reconnecter.'],
    de: ['Profilfoto', 'Foto hochladen', 'Foto entfernen', 'Schließen', 'Foto konnte nicht hochgeladen werden', 'Wählen Sie ein Bild (JPG, PNG, WebP)', 'Foto aktualisiert', 'Foto ändern',
      'Betrag in', 'Max', 'Sie erhalten ca.', 'Betrag eingeben, um die Umrechnung zu sehen', 'Auszahlung wird bearbeitet', 'USD wird in {c} umgerechnet', 'Adresse {a} wird geprüft', 'Wird zur Compliance-Prüfung gesendet',
      'Auszahlung fehlgeschlagen', 'Zurück', 'Anfrage gesendet', 'Ihre Auszahlung wird geprüft. Wir benachrichtigen Sie, sobald sie gesendet wurde.', 'Abgebucht', 'Sie erhalten', 'Netzwerk', 'An', 'Status', 'In Prüfung', 'Fertig',
      'Die Mindestauszahlung beträgt 1,00 $', 'Der Betrag übersteigt das verfügbare Guthaben', 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.']
  };
  var done = {}, PROBES = ['Settings', 'Cancel', 'Dashboard', 'Transactions', 'Log out'];
  function ready(l) { var N = window.NCI18N; if (!N) return false; for (var i = 0; i < PROBES.length; i++) { if (N.t(PROBES[i]) !== PROBES[i]) return true; } return false; }
  function apply() {
    var N = window.NCI18N; if (!N) return;
    var l = N.lang; if (l === 'en' || done[l] || !D[l]) return;
    if (!ready(l)) return;
    var map = {}; K.forEach(function (k, i) { map[k] = D[l][i]; });
    done[l] = 1; N.add(l, map);
  }
  var tries = 0, iv = setInterval(function () { apply(); if (++tries > 60) clearInterval(iv); }, 500);
  window.addEventListener('nc-lang', function () { tries = 0; clearInterval(iv); iv = setInterval(function () { apply(); if (++tries > 60) clearInterval(iv); }, 500); });
})();
