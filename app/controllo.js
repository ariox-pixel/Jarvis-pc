/* ====================================================================
   CONTROLLO TOTALE DEL COMPUTER.

   Fin qui Jarvis apriva programmi e leggeva lo stato. Da adesso ha anche
   le mani: tastiera, mouse, finestre, file, e automazioni che mettono in
   fila piu comandi sotto un nome tuo.

   DUE CONFINI, scritti apposta e non aggirabili:

   - SUI FILE, Jarvis scrive, rinomina, copia e cestina SOLO dentro le tue
     cartelle personali. Fuori di li (Windows, Programmi, altri utenti) non
     tocca niente, nemmeno se glielo chiedi.

   - NON CANCELLA MAI DAVVERO: manda nel cestino. Un ripensamento deve
     restare possibile, soprattutto quando a decidere e stata una macchina.
   ==================================================================== */
(function () {
  if (!window.M) return;
  const M = window.M;
  const PC = window.jarvisPC || null;

  function dillo(t, tipo) { try { window.scrivi(tipo || 'jarvis', t); } catch (e) { } }
  function parla(t) { try { window.Voce.parla(String(t).split('\n').slice(0, 3).join('. ')); } catch (e) { } }

  function piuTardi(promessa) {
    promessa.then(r => { if (r) { dillo(r); parla(r); } }).catch(() => { });
  }

  /* =================================================== AUTOMAZIONI */

  /**
   * Una automazione e una fila di comandi sotto un nome.
   * I comandi sono quelli che diresti a voce: vengono eseguiti uno per uno
   * dal cervello completo, quindi dentro un'automazione puoi usare tutto,
   * agenti compresi.
   */
  const Macro = {
    tutte() { try { return JSON.parse(M.get('macro', '{}')); } catch (e) { return {}; } },
    salva(m) { try { M.set('macro', JSON.stringify(m)); } catch (e) { } },

    crea(nome, passi) {
      const m = this.tutte();
      m[nome] = passi;
      this.salva(m);
      return 'Automazione "' + nome + '" creata con ' + passi.length +
        (passi.length === 1 ? ' passo.' : ' passi.') + ' Di\' "esegui ' + nome + '" quando vuoi.';
    },

    elenco() {
      const m = this.tutte();
      const nomi = Object.keys(m);
      if (!nomi.length) return 'Non hai automazioni. Creane una cosi: "crea automazione mattina: apri chrome, dimmi che tempo fa".';
      return 'Le tue automazioni:\n' + nomi.map(n => '- ' + n + ' (' + m[n].length + ' passi): ' + m[n].join(', ')).join('\n');
    },

    cancella(nome) {
      const m = this.tutte();
      if (!m[nome]) return 'Non ho un\'automazione che si chiama "' + nome + '".';
      delete m[nome];
      this.salva(m);
      return 'Automazione "' + nome + '" cancellata.';
    },

    async esegui(nome) {
      const m = this.tutte();
      const passi = m[nome];
      if (!passi) return 'Non ho un\'automazione che si chiama "' + nome + '".';
      dillo('(automazione ' + nome + ': ' + passi.length + ' passi)', 'sys');
      for (let i = 0; i < passi.length; i++) {
        const p = passi[i];
        dillo('(' + (i + 1) + '/' + passi.length + ') ' + p, 'sys');
        try {
          // ogni passo passa dai comandi istantanei e, se non bastano, dal cervello
          const subito = window.istantaneoBase ? window.istantaneoBase(p) : null;
          if (subito !== null && subito !== undefined) dillo(subito);
          else {
            const r = await window.Cervello.chiedi(p);
            dillo(r);
          }
        } catch (e) {
          dillo('Il passo "' + p + '" non e riuscito.', 'sys');
        }
        await new Promise(r => setTimeout(r, 600));
      }
      return 'Automazione "' + nome + '" completata.';
    }
  };

  /* ================================================ COMANDI A VOCE */

  function comando(frase) {
    const grezzo = String(frase || '').trim();
    const t = grezzo.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    if (!PC) return null;
    let m;

    /* --- automazioni */
    m = grezzo.match(/^crea(?:mi)?\s+(?:un[a']?\s+)?automazione\s+([\w àèéìòù'-]+?)\s*:\s*(.+)$/i);
    if (m) {
      const passi = m[2].split(/\s*(?:,|;|\be poi\b|\bpoi\b)\s*/i).map(x => x.trim()).filter(Boolean);
      if (!passi.length) return 'Non ho capito i passi. Separali con la virgola.';
      return Macro.crea(m[1].trim().toLowerCase(), passi);
    }
    if (/^(elenca|quali|mostra).{0,14}automazion/.test(t)) return Macro.elenco();
    m = t.match(/^(?:cancella|elimina|togli)\s+(?:l[ao']?\s+)?automazione\s+(.+)$/);
    if (m) return Macro.cancella(m[1].trim());
    m = t.match(/^(?:esegui|avvia|lancia|fai)\s+(?:l[ao']?\s+)?(?:automazione\s+)?(.+)$/);
    if (m && Macro.tutte()[m[1].trim()]) {
      piuTardi(Macro.esegui(m[1].trim()));
      return 'Eseguo l\'automazione ' + m[1].trim() + '...';
    }

    /* --- tastiera */
    m = grezzo.match(/^(?:scrivi|digita|batti)\s+(.+)$/i);
    if (m && !/^(?:a |in |su |nel )/i.test(m[1])) {
      piuTardi(PC.lento('digita', m[1]));
      return 'Scrivo...';
    }
    m = t.match(/^(?:premi|schiaccia)\s+(?:il tasto\s+)?(.+)$/);
    if (m) { piuTardi(PC.lento('tasto', m[1])); return 'Premo ' + m[1] + '.'; }
    if (/^(copia(?: tutto)?$|copia negli appunti$)/.test(t)) { piuTardi(PC.lento('tasto', 'ctrl+c')); return 'Copio.'; }
    if (/^incolla$/.test(t)) { piuTardi(PC.lento('tasto', 'ctrl+v')); return 'Incollo.'; }
    if (/^(seleziona tutto)$/.test(t)) { piuTardi(PC.lento('tasto', 'ctrl+a')); return 'Seleziono tutto.'; }
    if (/^(salva(?: il file)?)$/.test(t)) { piuTardi(PC.lento('tasto', 'ctrl+s')); return 'Salvo.'; }
    if (/^(annulla|torna indietro)$/.test(t)) { piuTardi(PC.lento('tasto', 'ctrl+z')); return 'Annullo l\'ultima cosa.'; }

    /* --- mouse */
    m = t.match(/^(?:muovi|sposta) (?:il )?(?:mouse|puntatore) (?:a |in |su )?(-?\d+)[\s,;]+(-?\d+)/);
    if (m) { piuTardi(PC.lento('mouse-muovi', m[1] + ',' + m[2])); return 'Sposto il puntatore.'; }
    if (/^(?:fai |)(?:un |)doppio clic$/.test(t)) { piuTardi(PC.lento('mouse-clic', 'doppio')); return 'Doppio clic.'; }
    if (/^(?:fai |)(?:un |)clic destro$|^tasto destro$/.test(t)) { piuTardi(PC.lento('mouse-clic', 'destro')); return 'Clic destro.'; }
    if (/^(?:fai |)(?:un |)clic$|^clicca$/.test(t)) { piuTardi(PC.lento('mouse-clic', 'sinistro')); return 'Clic.'; }
    m = t.match(/^scorri (?:in )?(giu|basso|su|alto)(?: di (\d+))?/);
    if (m) {
      const n = parseInt(m[2] || '3', 10);
      piuTardi(PC.lento('mouse-scorri', String(/su|alto/.test(m[1]) ? -n : n)));
      return 'Scorro.';
    }
    if (/^(quanto e grande lo schermo|dimensioni dello schermo|risoluzione)/.test(t)) {
      piuTardi(PC.lento('schermo')); return 'Guardo lo schermo...';
    }

    /* --- finestre */
    if (/^(che finestre|quali finestre|finestre aperte|cosa ho aperto)/.test(t)) {
      piuTardi(PC.lento('finestre')); return 'Guardo le finestre aperte...';
    }
    m = t.match(/^(?:porta davanti|vai (?:su|a)|passa a|mostrami la finestra)\s+(.+)$/);
    if (m) { piuTardi(PC.lento('finestra-davanti', m[1])); return 'Cerco la finestra...'; }

    /* --- file */
    m = t.match(/^(?:cosa c e|elenca|mostrami|fammi vedere)(?: dentro| in| nella)?\s+(?:la cartella\s+)?(documenti|desktop|scrivania|download|immagini|foto|musica|video)\b/);
    if (m) { piuTardi(PC.lento('elenca-cartella', m[1])); return 'Guardo nella cartella...'; }

    m = grezzo.match(/^(?:crea|scrivi|salva)\s+(?:un\s+)?file\s+([\w .àèéìòù'-]+?)\s+(?:in|dentro|nella?)\s+([\w]+)\s+(?:con|che dica|con scritto)\s+(.+)$/i);
    if (m) {
      piuTardi(PC.lento('scrivi-file', JSON.stringify({ percorso: m[2] + '/' + m[1].trim(), contenuto: m[3] })));
      return 'Creo il file...';
    }
    m = t.match(/^crea (?:la |una )?cartella\s+(.+)$/);
    if (m) { piuTardi(PC.lento('crea-cartella', m[1])); return 'Creo la cartella...'; }
    m = t.match(/^(?:cestina|butta|metti nel cestino)\s+(?:il file\s+)?(.+)$/);
    if (m) { piuTardi(PC.lento('cestina', m[1])); return 'Metto nel cestino...'; }

    return null;
  }

  /* ====================================================== INNESTO */

  const originale = window.istantaneo;
  window.istantaneoBase = originale;   // serve alle automazioni
  window.istantaneo = function (frase) {
    try {
      const r = comando(frase);
      if (r !== null && r !== undefined) return r;
    } catch (e) { }
    return originale ? originale(frase) : null;
  };

  window.Macro = Macro;

  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        const n = Object.keys(Macro.tutte()).length;
        window.scrivi('sys', 'Controllo totale attivo: tastiera, mouse, finestre e file. ' +
          (n ? n + ' automazioni salvate.' : 'Crea la prima con "crea automazione mattina: apri chrome, dimmi che tempo fa".'));
      } catch (e) { }
    }, 2100);
  });
})();
