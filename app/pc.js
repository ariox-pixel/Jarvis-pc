/* ====================================================================
   I COMANDI DEL COMPUTER.

   Questo file si innesta sulla pagina di Jarvis senza modificarla: avvolge
   la funzione dei comandi istantanei e, prima di tutto il resto, prova a
   capire se stai chiedendo qualcosa AL COMPUTER.

   Le azioni veloci rispondono subito. Quelle che richiedono qualche secondo
   (una schermata, una ricerca fra i file) rispondono subito con una frase di
   cortesia e poi, quando hanno finito, scrivono il risultato da sole.
   ==================================================================== */
(function () {
  if (!window.jarvisPC) return;   // non siamo dentro il programma Windows

  const PC = window.jarvisPC;

  function pulisci(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  /** Risponde piu tardi, quando l'azione lenta ha finito. */
  function piuTardi(promessa) {
    promessa.then(function (r) {
      if (!r) return;
      try { window.scrivi('jarvis', r); } catch (e) { }
      try { window.Voce.parla(String(r).split('\n').slice(0, 3).join('. ')); } catch (e) { }
    }).catch(function () { });
  }

  /**
   * Prova a riconoscere un comando per il computer.
   * Restituisce la frase da dire, oppure null se non e roba nostra.
   */
  function comandoPC(frase) {
    const t = pulisci(frase);
    if (!t) return null;
    // se stai CHIEDENDO come si fa, non devo farlo io
    if (/^(come|perche|cosa|spiegam|secondo te)\b/.test(t)) return null;

    let m;

    /* --- aprire programmi, siti e cartelle */
    m = t.match(/^(?:apri|avvia|lancia|vai su|portami su|mostrami)\s+(?:il |lo |la |le |i |gli |l )?(.+)$/);
    if (m) {
      const cosa = m[1].replace(/^(programma|app|applicazione|sito|cartella)\s+/, '').trim();
      if (/^(impostazioni|opzioni)$/.test(cosa)) return PC.subito('apri', 'impostazioni');
      return PC.subito('apri', cosa);
    }

    /* --- cercare sul web */
    m = t.match(/^(?:cerca(?:mi)?|trova(?:mi)?)\s+(?:su\s+(?:internet|google|web)\s+)?(.+)$/);
    if (m && !/\bfile\b|\bdocument/.test(m[1])) {
      // "cerca file X" va alla ricerca fra i file, non sul web
      return PC.subito('cerca-web', m[1]);
    }

    /* --- cercare fra i file del computer */
    m = t.match(/^(?:cerca|trova)\s+(?:il\s+|un\s+|i\s+)?(?:file|documento|documenti)\s+(.+)$/);
    if (m) {
      piuTardi(PC.lento('cerca-file', m[1]));
      return 'Cerco fra i tuoi file...';
    }

    /* --- volume */
    if (/\b(alza|aumenta|su).{0,12}volume\b|\bvolume\s*(su|piu alto|alto)\b/.test(t)) return PC.subito('volume-su');
    if (/\b(abbassa|diminuisci|giu).{0,12}volume\b|\bvolume\s*(giu|piu basso|basso)\b/.test(t)) return PC.subito('volume-giu');
    if (/\b(muto|silenzia|togli l audio|zitto il computer)\b/.test(t)) return PC.subito('muto');

    /* --- schermo e sessione */
    if (/\b(blocca|chiudi la sessione)\b.*\b(computer|schermo|pc)\b|^blocca$/.test(t)) return PC.subito('blocca');
    if (/\b(schermata|screenshot|cattura (lo )?schermo|foto allo schermo)\b/.test(t)) {
      piuTardi(PC.lento('schermata'));
      return 'Faccio la schermata...';
    }

    /* --- spegnimento, con rete di sicurezza */
    if (/\bannulla\b.*\b(spegnimento|riavvio)\b|\bnon spegnere\b/.test(t)) return PC.subito('annulla-spegnimento');
    if (/\b(spegni|spegnere)\b.*\b(computer|pc)\b|^spegni il computer$/.test(t)) {
      piuTardi(PC.lento('spegni'));
      return 'Avvio lo spegnimento...';
    }
    if (/\b(riavvia|riavviare)\b.*\b(computer|pc)\b/.test(t)) {
      piuTardi(PC.lento('riavvia'));
      return 'Avvio il riavvio...';
    }

    /* --- stato della macchina */
    if (/\b(che (computer|pc) (e|ho)|informazioni (sul )?(sistema|computer)|stato del (computer|pc)|sistema)\b/.test(t))
      return PC.subito('sistema');
    if (/\b(batteria|quanta carica|quanto dura)\b/.test(t)) {
      piuTardi(PC.lento('batteria'));
      return 'Controllo la batteria...';
    }
    if (/\b(spazio|disco|dischi|quanto spazio|memoria libera)\b/.test(t)) {
      piuTardi(PC.lento('dischi'));
      return 'Controllo i dischi...';
    }
    if (/\b(processi|programmi aperti|cosa sta girando|cosa consuma)\b/.test(t)) {
      piuTardi(PC.lento('processi'));
      return 'Guardo cosa sta girando...';
    }
    if (/\b(che rete|a che rete|wifi|wi-fi|connessione)\b/.test(t)) {
      piuTardi(PC.lento('rete'));
      return 'Controllo la rete...';
    }

    /* --- chiudere un programma */
    m = t.match(/^(?:chiudi|termina|killa)\s+(?:il |lo |la |l )?(.+)$/);
    if (m && !/\bjarvis\b|\bsessione\b/.test(m[1])) {
      piuTardi(PC.lento('chiudi-programma', m[1]));
      return 'Chiudo ' + m[1] + '...';
    }

    /* --- appunti */
    if (/\b(cosa c e negli appunti|leggi gli appunti|appunti)\b/.test(t) && !/copia/.test(t))
      return PC.subito('appunti-leggi');
    m = t.match(/^copia (?:negli appunti\s+)?(.+)$/);
    if (m) return PC.subito('appunti-scrivi', m[1]);

    /* --- il programma stesso */
    if (/\b(minimizzati|nasconditi|fatti da parte)\b/.test(t)) return PC.subito('minimizza');
    if (/\b(chiudi jarvis|esci|spegniti|arrivederci jarvis)\b/.test(t)) return PC.subito('chiudi-jarvis');
    if (/\bavviati con windows\b|\bparti con windows\b/.test(t)) return PC.subito('avvio-automatico', 'si');
    if (/\bnon avviarti con windows\b|\bnon partire con windows\b/.test(t)) return PC.subito('avvio-automatico', 'no');

    return null;
  }

  /* --- si innesta davanti ai comandi istantanei gia esistenti */
  const originale = window.istantaneo;
  window.istantaneo = function (frase) {
    try {
      const r = comandoPC(frase);
      if (r !== null && r !== undefined) return r;
    } catch (e) { }
    return originale ? originale(frase) : null;
  };

  /* --- e lo dice, cosi si sa che il computer e comandabile */
  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        window.scrivi('sys', 'Comandi del computer attivi: apri programmi, volume, schermate, ' +
          'spegnimento, ricerca file, stato del sistema.');
      } catch (e) { }
    }, 1200);
  });
})();
