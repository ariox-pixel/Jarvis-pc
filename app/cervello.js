/* ====================================================================
   IL CERVELLO COMPLETO - la versione Windows di quello dell'APK.

   Tre cose che la chat semplice non ha:

   1. VENTIQUATTRO AGENTI. Jarvis non risponde da solo: sceglie lo
      specialista giusto e gli passa il compito, con lo strumento "delega".
      Puo chiamarne piu di uno in fila (il ricercatore trova i dati,
      l'ingegnere fa i conti, l'operatore esegue sul computer).

   2. MEMORIA LUNGA. Ogni scambio finisce in archivio. Quando dici
      "ricordi quando...", Jarvis cerca davvero fra le vecchie
      conversazioni invece di inventarsi un ricordo.

   3. ABITUDINI. Se chiedi la stessa cosa alla stessa ora per tre giorni
      diversi, Jarvis se ne accorge e te lo dice.

   Si innesta sopra la pagina esistente senza modificarla: sostituisce
   soltanto Cervello.chiedi. Se qualcosa va storto, torna da solo alla
   chat semplice.
   ==================================================================== */
(function () {
  if (!window.M || !window.Cervello) return;
  const M = window.M;
  const URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODELLI = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];
  const MODELLI_RICERCA = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  const sempliceOriginale = window.Cervello.chiedi;

  /* ============================================================ AGENTI */

  const AGENTI = [
    {
        "id": "ricercatore",
        "label": "Ricercatore",
        "desc": "Cerca informazioni aggiornate su internet (notizie, meteo, sport, orari, fatti) e le riassume.",
        "sys": "Sei il Ricercatore del team di Jarvis. Cerca sul web, verifica e rispondi in italiano con un riassunto breve e concreto, con cifre e fonti principali.",
        "tools": "WEB"
    },
    {
        "id": "operatore",
        "label": "Operatore",
        "desc": "Comanda il COMPUTER Windows: apre programmi, siti e cartelle, volume, schermate, blocco schermo, spegnimento, ricerca fra i file, stato del sistema, appunti, chiusura programmi.",
        "sys": "Sei l'Operatore del team di Jarvis e comandi il computer Windows dell'utente. Usa SEMPRE gli strumenti per agire davvero: non descrivere quello che faresti, fallo. Dopo aver agito riferisci in UNA frase breve cosa hai fatto. Se uno strumento fallisce dillo con onesta, senza fingere che sia andato a buon fine. Non puoi mandare SMS ne telefonare: questo e un computer, non un telefono.",
        "tools": "PC"
    },
    {
        "id": "segretario",
        "label": "Segretario",
        "desc": "Note, attivita da fare, conti del mese, promemoria, e ricerca nei ricordi delle conversazioni passate. Sa anche quali abitudini Jarvis ha notato.",
        "sys": "Sei il Segretario del team di Jarvis. Gestisci note, attivita, promemoria e calendario con gli strumenti; leggi le notifiche e riassumile in poche frasi, dando priorita ai messaggi di persone. ",
        "tools": "SEG"
    },
    {
        "id": "contabile",
        "label": "Contabile",
        "desc": "Registra entrate e spese dette a voce e fa il riepilogo dei conti (saldo del mese, spese per categoria).",
        "sys": "Sei il Contabile del team di Jarvis. Registra ogni entrata o spesa con registra_movimento, scegliendo una categoria sensata. Per le domande sui conti usa riepilogo_conti e rispondi con i numeri. ",
        "tools": "SEG"
    },
    {
        "id": "postino",
        "label": "Postino",
        "desc": "Scrive email e apre la posta sul computer.",
        "sys": "Sei il Postino del team di Jarvis. Per scrivere un'email usa scrivi_email con un testo chiaro e cortese; se l'utente vuole inviarla, tocca Invia (il sistema chiede conferma). ",
        "tools": ""
    },
    {
        "id": "grafico",
        "label": "Grafico",
        "desc": "Idee grafiche, descrizioni per immagini, impaginazione di post e storie.",
        "sys": "Sei il Grafico del team di Jarvis. Per creare un'immagine scrivi una descrizione dettagliata IN INGLESE (soggetto, stile, colori, luce, inquadratura) e usa crea_immagine con il formato giusto: quadrato per i post, verticale per storie e reel. ",
        "tools": ""
    },
    {
        "id": "social",
        "label": "Social",
        "desc": "Social media manager: idee di contenuti, testi dei post, hashtag e calendario editoriale.",
        "sys": "Sei il Social Media Manager del team di Jarvis. Proponi idee concrete, scrivi testi pronti da pubblicare con hashtag pertinenti e, se richiesto, un piano di pubblicazione settimanale. Breve e in italiano. ",
        "tools": ""
    },
    {
        "id": "copywriter",
        "label": "Copywriter",
        "desc": "Scrive testi: messaggi ai clienti, annunci, descrizioni di prodotti, offerte, bio.",
        "sys": "Sei il Copywriter del team di Jarvis. Scrivi testi persuasivi, chiari e pronti da usare, in italiano, adatti al canale indicato. Dai al massimo due varianti.",
        "tools": ""
    },
    {
        "id": "traduttore",
        "label": "Traduttore",
        "desc": "Traduce testi e messaggi da e verso qualsiasi lingua.",
        "sys": "Sei il Traduttore del team di Jarvis. Traduci in modo naturale mantenendo tono e significato. Restituisci solo la traduzione, con una breve nota se un'espressione non ha equivalente.",
        "tools": ""
    },
    {
        "id": "coach",
        "label": "Coach",
        "desc": "Personal trainer e coach: schede di allenamento, abitudini, motivazione e promemoria.",
        "sys": "Sei il Coach del team di Jarvis. Dai schede di allenamento e consigli su abitudini sane e prudenti, adatti a una persona adulta in salute; per dolori o problemi medici consiglia un professionista. ",
        "tools": ""
    },
    {
        "id": "analista",
        "label": "Analista",
        "desc": "Analizza una situazione complessa, ne scompone le cause, valuta le opzioni e suggerisce la soluzione migliore con i passi pratici.",
        "sys": "Sei l'Analista del team di Jarvis: aiuti a ragionare su situazioni complesse e a decidere.\\n",
        "tools": ""
    },
    {
        "id": "venditore",
        "label": "Venditore",
        "desc": "Segue i clienti e le vendite: lista clienti con stato e note, risposte e offerte da mandare, promemoria per ricontattarli.",
        "sys": "Sei il Venditore del team di Jarvis. Tieni aggiornata la lista clienti con aggiungi_cliente, aggiorna_cliente ed elenco_clienti. ",
        "tools": "SEG"
    },
    {
        "id": "cybersicurezza",
        "label": "Cybersicurezza",
        "desc": "Ti protegge online: password forti, truffe e phishing, privacy, cosa fare se un account e stato violato.",
        "sys": "Sei l'esperto di Cybersicurezza DIFENSIVA del team di Jarvis. Aiuti SOLO a proteggere l'utente: password e autenticazione a due fattori, riconoscere truffe, phishing e app pericolose, impostazioni di privacy, cosa fare dopo una violazione. ",
        "tools": ""
    },
    {
        "id": "avvocato",
        "label": "Avvocato",
        "desc": "Spiega contratti, diritti, clausole e procedure in modo generale e comprensibile.",
        "sys": "Sei l'assistente legale del team di Jarvis. Spieghi in parole semplici contratti, diritti, obblighi e procedure, soprattutto in ambito italiano ed europeo. ",
        "tools": ""
    },
    {
        "id": "medico",
        "label": "Medico",
        "desc": "Informazioni su salute, sintomi, benessere, prevenzione e stili di vita.",
        "sys": "Sei l'assistente di salute del team di Jarvis. Dai informazioni generali e prudenti su salute, benessere e prevenzione. ",
        "tools": ""
    },
    {
        "id": "cuoco",
        "label": "Cuoco",
        "desc": "Ricette con gli ingredienti che hai in casa, idee per i pasti e lista della spesa.",
        "sys": "Sei il Cuoco del team di Jarvis. Proponi ricette pratiche con gli ingredienti indicati, con dosi e passi brevi. Se richiesto, prepari la lista della spesa (puoi salvarla con salva_nota tramite il segretario, dillo a Jarvis). In italiano.",
        "tools": ""
    },
    {
        "id": "insegnante",
        "label": "Insegnante",
        "desc": "Spiega qualsiasi argomento in modo semplice, interroga e aiuta a studiare.",
        "sys": "Sei l'Insegnante del team di Jarvis. Spieghi qualsiasi argomento in modo chiaro e adatto al livello della persona, con esempi. Se richiesto fai domande per interrogare e correggi con gentilezza. Breve e incoraggiante, in italiano.",
        "tools": ""
    },
    {
        "id": "psicologo",
        "label": "Ascolto",
        "desc": "Supporto, ascolto e motivazione nei momenti difficili (non e terapia).",
        "sys": "Sei l'assistente di ascolto e supporto del team di Jarvis. Ascolti con empatia, validi come si sente la persona senza giudicare e offri incoraggiamento e piccoli passi concreti. ",
        "tools": ""
    },
    {
        "id": "tecnico",
        "label": "Tecnico",
        "desc": "Risolve problemi del computer: impostazioni di Windows, rete, programmi, lentezza, spazio su disco.",
        "sys": "Sei il Tecnico informatico del team di Jarvis. Risolvi problemi del computer Windows con passi semplici, uno alla volta. Quando puoi, invece di spiegare, usa gli strumenti e fallo tu. In italiano.",
        "tools": "PC"
    },
    {
        "id": "viaggi",
        "label": "Viaggi",
        "desc": "Itinerari, voli, hotel, cose da vedere e consigli pratici di viaggio.",
        "sys": "Sei l'agente di Viaggi del team di Jarvis. Cerca sul web informazioni aggiornate (voli, hotel, eventi, meteo, cosa vedere) e proponi itinerari pratici con tempi e costi indicativi. Ricorda che prezzi e disponibilita cambiano. In italiano.",
        "tools": ""
    },
    {
        "id": "investimenti",
        "label": "Investimenti",
        "desc": "Spiega concetti di finanza e investimenti (non consiglia cosa comprare o vendere).",
        "sys": "Sei l'assistente di educazione finanziaria del team di Jarvis. Spieghi in modo semplice concetti come azioni, ETF, interesse composto, rischio e diversificazione, e puoi cercare dati di mercato aggiornati. ",
        "tools": ""
    },
    {
        "id": "interprete",
        "label": "Interprete",
        "desc": "Traduce dal vivo una conversazione tra due lingue.",
        "sys": "Sei l'Interprete del team di Jarvis. Traduci quello che ti viene detto nella lingua richiesta, in modo naturale e fedele. Restituisci solo la traduzione, pronta da leggere ad alta voce. Se la lingua non e chiara, chiedi quale coppia di lingue usare.",
        "tools": ""
    },
    {
        "id": "ingegnere",
        "label": "Ingegnere",
        "desc": "Calcoli scientifici esatti, materiali e componenti, travi e strutture, termica, chimica, modelli 3D e STL, armature in cemento armato, protezioni dagli urti, analisi di dati sperimentali e confronto fra soluzioni progettuali.",
        "sys": "Sei l'Ingegnere del team di Jarvis. REGOLA ASSOLUTA: non calcolare MAI a mente e non stimare MAI un numero. ",
        "tools": "ING"
    },
    {
        "id": "consulente",
        "label": "Consulente",
        "desc": "Consigli pratici su marketing, vendite, margini, prezzi, organizzazione e strategia.",
        "sys": "Sei il Consulente di business del team di Jarvis. Dai indicazioni pratiche con numeri e passi concreti, brevi. Se mancano dati, di' quali servono.",
        "tools": ""
    }
];

  /* ======================================================= ARCHIVIO */

  /**
   * La memoria lunga: tutte le conversazioni, con ricerca per parole.
   * Il punteggio premia le parole rare: "Stelvio" vale piu di "cosa".
   */
  const Archivio = {
    MAX: 600,

    tutto() {
      try { return JSON.parse(M.get('archivio', '[]')); } catch (e) { return []; }
    },

    salva(domanda, risposta) {
      if (!M.getB('memoria', true)) return;
      try {
        const a = this.tutto();
        a.push({ q: String(domanda).slice(0, 600), r: String(risposta).slice(0, 900), t: Date.now() });
        M.set('archivio', JSON.stringify(a.slice(-this.MAX)));
      } catch (e) { }
    },

    parole(s) {
      return String(s).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .split(/\s+/).filter(p => p.length > 3);
    },

    cerca(domanda, quanti) {
      const a = this.tutto();
      if (!a.length) return [];
      const q = this.parole(domanda);
      if (!q.length) return [];
      // quante volte ogni parola compare in tutto l'archivio: le rare pesano di piu
      const frequenza = {};
      for (const v of a) {
        const viste = new Set(this.parole(v.q + ' ' + v.r));
        for (const p of viste) frequenza[p] = (frequenza[p] || 0) + 1;
      }
      const punteggiati = a.map(v => {
        const testo = new Set(this.parole(v.q + ' ' + v.r));
        let punti = 0;
        for (const p of q) if (testo.has(p)) punti += 1 / Math.log(2 + (frequenza[p] || 1));
        return { v: v, punti: punti };
      }).filter(x => x.punti > 0);
      punteggiati.sort((x, y) => y.punti - x.punti);
      return punteggiati.slice(0, quanti || 4).map(x => x.v);
    },

    stato() {
      const a = this.tutto();
      if (!a.length) return 'Non ho ancora niente in archivio.';
      const primo = new Date(a[0].t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
      return 'Ho in archivio ' + a.length + ' conversazioni, dal ' + primo + ' a oggi.';
    },

    /** Le righe da passare a Jarvis quando la domanda somiglia a qualcosa di gia detto. */
    utili(domanda) {
      if (!/\b(ricord\w*|avevamo|dicevamo|l altra volta|ne parlammo|come si chiamava|quella volta|gia detto)\b/i.test(domanda)) return '';
      const trovati = this.cerca(domanda, 3);
      if (!trovati.length) return '';
      let s = '\n\nDA CONVERSAZIONI PASSATE (usa solo se pertinente, non inventare):';
      for (const v of trovati) {
        const q = new Date(v.t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
        s += '\n- ' + q + ': l\'utente chiese "' + v.q.slice(0, 120) + '", risposi "' + v.r.slice(0, 160) + '"';
      }
      return s;
    }
  };

  /* ======================================================= ABITUDINI */

  /**
   * Impara cosa chiedi, quando.
   * Serve che la stessa richiesta si ripeta almeno TRE volte, in almeno TRE
   * giorni diversi, nella stessa fascia oraria. Senza questi tre paletti
   * scambierebbe una coincidenza per un'abitudine.
   */
  const Abitudini = {
    firma(testo) {
      return String(testo).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z ]+/g, ' ')
        .split(/\s+/).filter(p => p.length > 3).slice(0, 4).sort().join(' ');
    },

    tutte() {
      try { return JSON.parse(M.get('abitudini', '[]')); } catch (e) { return []; }
    },

    registra(testo) {
      const f = this.firma(testo);
      if (!f || f.split(' ').length < 2) return;
      try {
        const a = this.tutte();
        a.push({ f: f, t: Date.now(), e: String(testo).slice(0, 100) });
        M.set('abitudini', JSON.stringify(a.slice(-400)));
      } catch (e) { }
    },

    gruppi() {
      const per = {};
      for (const v of this.tutte()) {
        if (!per[v.f]) per[v.f] = [];
        per[v.f].push(v);
      }
      const out = [];
      for (const f in per) {
        const lista = per[f];
        if (lista.length < 3) continue;
        const giorni = new Set(lista.map(v => new Date(v.t).toDateString()));
        if (giorni.size < 3) continue;
        const ore = lista.map(v => new Date(v.t).getHours() * 60 + new Date(v.t).getMinutes());
        const media = ore.reduce((a, b) => a + b, 0) / ore.length;
        // tutte le volte devono cadere entro un'ora e un quarto dalla media
        if (ore.some(o => Math.abs(o - media) > 75)) continue;
        out.push({
          firma: f, volte: lista.length, esempio: lista[lista.length - 1].e,
          ora: Math.floor(media / 60), minuto: Math.round(media % 60)
        });
      }
      out.sort((a, b) => b.volte - a.volte);
      return out;
    },

    riepilogo() {
      const g = this.gruppi();
      if (!g.length) {
        const n = this.tutte().length;
        return 'Ho annotato ' + n + ' tue richieste, ma non ho ancora visto abbastanza ripetizioni per riconoscere un\'abitudine. ' +
          'Servono almeno tre volte alla stessa ora, in giorni diversi.';
      }
      return 'Abitudini che ho notato:\n' + g.slice(0, 5).map(x =>
        '- verso le ' + String(x.ora).padStart(2, '0') + ':' + String(x.minuto).padStart(2, '0') +
        ' mi chiedi "' + x.esempio + '" (' + x.volte + ' volte)').join('\n');
    }
  };

  /* ================================================== BLOCCO APPUNTI */

  /** Note, attivita, conti e clienti: gli stessi dell'APK, salvati qui. */
  const Quaderno = {
    leggi(k) { try { return JSON.parse(M.get(k, '[]')); } catch (e) { return []; } },
    scrivi(k, v) { try { M.set(k, JSON.stringify(v.slice(-200))); } catch (e) { } },

    nota(t) { const a = this.leggi('note'); a.push({ t: t, q: Date.now() }); this.scrivi('note', a); return 'Annotato.'; },
    note() {
      const a = this.leggi('note');
      return a.length ? a.slice(-15).map((x, i) => (i + 1) + '. ' + x.t).join('\n') : 'Non hai note.';
    },
    attivita(t) { const a = this.leggi('cose'); a.push({ t: t, fatta: false, q: Date.now() }); this.scrivi('cose', a); return 'Aggiunta alle cose da fare.'; },
    cose() {
      const a = this.leggi('cose').filter(x => !x.fatta);
      return a.length ? a.slice(-15).map((x, i) => (i + 1) + '. ' + x.t).join('\n') : 'Non hai niente in sospeso.';
    },
    fatta(n) {
      const a = this.leggi('cose'); const aperte = a.filter(x => !x.fatta);
      const x = aperte[n - 1];
      if (!x) return 'Non trovo quell\'attivita.';
      x.fatta = true; this.scrivi('cose', a); return 'Segnata come fatta: ' + x.t;
    },
    movimento(importo, causale) {
      const a = this.leggi('conti'); a.push({ i: importo, c: causale, q: Date.now() }); this.scrivi('conti', a);
      return (importo < 0 ? 'Spesa' : 'Entrata') + ' registrata: ' + Math.abs(importo) + ' euro, ' + causale + '.';
    },
    conti() {
      const mese = new Date().getMonth();
      const a = this.leggi('conti').filter(x => new Date(x.q).getMonth() === mese);
      let e = 0, u = 0;
      for (const x of a) { if (x.i < 0) u += -x.i; else e += x.i; }
      return 'Questo mese: entrate ' + e.toFixed(0) + ' euro, uscite ' + u.toFixed(0) + ' euro, saldo ' + (e - u).toFixed(0) + ' euro.';
    }
  };

  /* ================================================== GLI STRUMENTI */

  function strumento(nome, descrizione, parametri) {
    return {
      type: 'function',
      function: { name: nome, description: descrizione, parameters: { type: 'object', properties: parametri || {}, required: Object.keys(parametri || {}) } }
    };
  }
  const S = (t, d) => ({ type: t || 'string', description: d || '' });

  const PC = window.jarvisPC || null;

  const STRUMENTI = {
    PC: [
      strumento('apri', 'Apre un programma, un sito o una cartella sul computer. Esempi: "blocco note", "chrome", "youtube", "cartella documenti".', { cosa: S('string', 'nome del programma, sito o cartella') }),
      strumento('cerca_sul_web', 'Apre il browser con una ricerca.', { testo: S('string', 'cosa cercare') }),
      strumento('volume', 'Alza, abbassa o azzera il volume del computer.', { direzione: S('string', '"su", "giu" oppure "muto"') }),
      strumento('schermata', 'Cattura lo schermo e salva l\'immagine in Immagini.', {}),
      strumento('blocca_computer', 'Blocca lo schermo del computer.', {}),
      strumento('stato_sistema', 'Modello del computer, versione di Windows, processore, memoria, da quanto e acceso.', {}),
      strumento('batteria', 'Livello della batteria del portatile.', {}),
      strumento('dischi', 'Spazio libero sui dischi.', {}),
      strumento('processi', 'I programmi che stanno consumando piu memoria.', {}),
      strumento('rete', 'A quale rete e collegato il computer.', {}),
      strumento('cerca_file', 'Cerca file nelle cartelle Desktop, Documenti, Download e Immagini.', { nome: S('string', 'parte del nome del file') }),
      strumento('leggi_file', 'Legge il contenuto di un file di testo dato il percorso completo.', { percorso: S('string', 'percorso completo del file') }),
      strumento('appunti_leggi', 'Legge cosa c\'e negli appunti di Windows.', {}),
      strumento('appunti_scrivi', 'Copia un testo negli appunti di Windows.', { testo: S('string', 'testo da copiare') }),
      strumento('chiudi_programma', 'Chiude un programma aperto.', { nome: S('string', 'nome del programma') }),
      strumento('spegni_computer', 'Avvia lo spegnimento fra un minuto. Usalo solo se l\'utente lo chiede chiaramente.', {}),
      strumento('annulla_spegnimento', 'Annulla uno spegnimento o riavvio gia avviato.', {}),
      strumento('avvisa', 'Mostra una notifica di Windows.', { testo: S('string', 'testo della notifica') })
    ],
    ING: [
      strumento('calcola', 'Esegue un calcolo matematico esatto. Usalo SEMPRE per i conti, anche banali.', { espressione: S('string', 'es. "45*12" oppure "radice(144)+10%di 200"') }),
      strumento('scheda_materiale', 'Proprieta reali di un materiale: densita, resistenza, modulo elastico, fusione.', { nome: S('string', 'es. acciaio, alluminio, titanio') })
    ],
    SEG: [
      strumento('salva_nota', 'Annota una cosa da ricordare.', { testo: S('string', 'il testo della nota') }),
      strumento('leggi_note', 'Elenca le note salvate.', {}),
      strumento('aggiungi_attivita', 'Aggiunge una cosa da fare.', { testo: S('string', 'cosa fare') }),
      strumento('leggi_attivita', 'Elenca le cose da fare ancora aperte.', {}),
      strumento('segna_fatta', 'Segna come fatta l\'attivita numero N dell\'elenco.', { numero: S('number', 'il numero mostrato nell\'elenco') }),
      strumento('registra_movimento', 'Registra una spesa (importo negativo) o un\'entrata (positivo).', { importo: S('number', 'euro, negativo se spesa'), causale: S('string', 'per cosa') }),
      strumento('riepilogo_conti', 'Entrate, uscite e saldo del mese.', {}),
      strumento('cerca_nei_ricordi', 'Cerca fra TUTTE le conversazioni passate. Usalo quando l\'utente dice "ricordi quando", "ne parlammo", "l\'altra volta".', { cosa: S('string', 'cosa cercare') }),
      strumento('mie_abitudini', 'Le abitudini che Jarvis ha notato nelle richieste dell\'utente.', {}),
      strumento('crea_promemoria', 'Imposta un promemoria o una sveglia a un orario preciso.', { fra_minuti: S('number', 'fra quanti minuti da adesso; metti 0 se usi un orario'), ora_del_giorno: S('string', 'orario in formato 15:30, oppure stringa vuota'), testo: S('string', 'cosa ricordare'), e_sveglia: S('boolean', 'true se deve squillare come una sveglia') }),
      strumento('elenca_promemoria', 'Elenca i promemoria in programma.', {}),
      strumento('crea_routine', 'Imposta un comando da eseguire ogni giorno alla stessa ora.', { ora_del_giorno: S('string', 'orario in formato 08:00'), comando: S('string', 'cosa Jarvis deve fare ogni giorno') }),
      strumento('elenca_routine', 'Elenca le routine giornaliere attive.', {}),
      strumento('controlla_tutto', 'Passa in rassegna subito batteria, spazio, memoria, attivita e conti, e restituisce i problemi trovati.', {})
    ],
    WEB: []
  };

  /** Esegue davvero lo strumento chiamato dall'agente. */
  async function esegui(nome, args) {
    try {
      switch (nome) {
        case 'apri': return PC ? PC.subito('apri', args.cosa) : 'Non sono sul computer.';
        case 'cerca_sul_web': return PC ? PC.subito('cerca-web', args.testo) : 'Non sono sul computer.';
        case 'volume': {
          const d = String(args.direzione || '').toLowerCase();
          if (!PC) return 'Non sono sul computer.';
          if (d.indexOf('mut') >= 0) return PC.subito('muto');
          return PC.subito(d.indexOf('giu') >= 0 || d.indexOf('bass') >= 0 ? 'volume-giu' : 'volume-su');
        }
        case 'blocca_computer': return PC ? PC.subito('blocca') : 'Non sono sul computer.';
        case 'stato_sistema': return PC ? PC.subito('sistema') : 'Non sono sul computer.';
        case 'appunti_leggi': return PC ? PC.subito('appunti-leggi') : 'Non sono sul computer.';
        case 'appunti_scrivi': return PC ? PC.subito('appunti-scrivi', args.testo) : 'Non sono sul computer.';
        case 'annulla_spegnimento': return PC ? PC.subito('annulla-spegnimento') : 'Non sono sul computer.';
        case 'avvisa': return PC ? PC.subito('notifica', args.testo) : 'Non sono sul computer.';

        case 'schermata': return PC ? await PC.lento('schermata') : 'Non sono sul computer.';
        case 'batteria': return PC ? await PC.lento('batteria') : 'Non sono sul computer.';
        case 'dischi': return PC ? await PC.lento('dischi') : 'Non sono sul computer.';
        case 'processi': return PC ? await PC.lento('processi') : 'Non sono sul computer.';
        case 'rete': return PC ? await PC.lento('rete') : 'Non sono sul computer.';
        case 'cerca_file': return PC ? await PC.lento('cerca-file', args.nome) : 'Non sono sul computer.';
        case 'leggi_file': return PC ? await PC.lento('leggi-file', args.percorso) : 'Non sono sul computer.';
        case 'chiudi_programma': return PC ? await PC.lento('chiudi-programma', args.nome) : 'Non sono sul computer.';
        case 'spegni_computer': return PC ? await PC.lento('spegni') : 'Non sono sul computer.';

        case 'calcola':
          try { return args.espressione + ' = ' + window.Ing.calcola(args.espressione); }
          catch (e) { return 'Non riesco a risolvere quell\'espressione.'; }
        case 'scheda_materiale':
          try { return window.Ing.scheda(args.nome); } catch (e) { return 'Materiale non in archivio.'; }

        case 'salva_nota': return Quaderno.nota(args.testo);
        case 'leggi_note': return Quaderno.note();
        case 'aggiungi_attivita': return Quaderno.attivita(args.testo);
        case 'leggi_attivita': return Quaderno.cose();
        case 'segna_fatta': return Quaderno.fatta(parseInt(args.numero, 10));
        case 'registra_movimento': return Quaderno.movimento(parseFloat(args.importo), args.causale || '');
        case 'riepilogo_conti': return Quaderno.conti();
        case 'mie_abitudini': return Abitudini.riepilogo();

        case 'crea_promemoria': {
          if (!window.Proattivo) return 'I promemoria non sono disponibili.';
          let quando = 0;
          const fra = parseFloat(args.fra_minuti);
          if (fra > 0) quando = Date.now() + fra * 60000;
          else {
            const m = /(\d{1,2})[:.](\d{2})/.exec(String(args.ora_del_giorno || ''));
            if (!m) return 'Mi serve sapere quando: fra quanti minuti, oppure a che ora.';
            const d = new Date();
            d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
            if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
            quando = d.getTime();
          }
          return window.Proattivo.Promemoria.aggiungi(quando, args.testo || 'promemoria',
            args.e_sveglia === true || args.e_sveglia === 'true');
        }
        case 'elenca_promemoria':
          return window.Proattivo ? window.Proattivo.Promemoria.elenco() : 'Non disponibile.';
        case 'crea_routine': {
          if (!window.Proattivo) return 'Le routine non sono disponibili.';
          const m = /(\d{1,2})[:.](\d{2})/.exec(String(args.ora_del_giorno || ''));
          if (!m) return 'Mi serve l\'ora, per esempio 08:00.';
          return window.Proattivo.Routine.aggiungi(parseInt(m[1], 10), parseInt(m[2], 10), args.comando || '');
        }
        case 'elenca_routine':
          return window.Proattivo ? window.Proattivo.Routine.elenco() : 'Non disponibile.';
        case 'controlla_tutto':
          return window.Proattivo ? await window.Proattivo.Sentinella.controlla(true) : 'Non disponibile.';
        case 'cerca_nei_ricordi': {
          const t = Archivio.cerca(args.cosa, 4);
          if (!t.length) return 'Non trovo niente del genere nelle conversazioni passate.';
          return t.map(v => new Date(v.t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) +
            ': chiedesti "' + v.q.slice(0, 140) + '" - risposi "' + v.r.slice(0, 200) + '"').join('\n');
        }
      }
    } catch (e) {
      return 'Lo strumento non ha funzionato: ' + e.message;
    }
    return 'Strumento sconosciuto.';
  }

  /* ================================================== CHIAMATE A GROQ */

  function chiavi() {
    return [M.get('chiave', ''), M.get('chiave2', '')].filter(k => k && k.indexOf('gsk_') === 0);
  }

  async function post(corpo, chiave) {
    const risp = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + chiave },
      body: JSON.stringify(corpo)
    });
    if (!risp.ok) {
      const t = await risp.text().catch(() => '');
      const e = new Error('HTTP ' + risp.status + ' ' + t.slice(0, 160));
      e.codice = risp.status;
      throw e;
    }
    return risp.json();
  }

  /** Prova tutte le chiavi e tutti i modelli finche uno risponde. */
  async function conFallback(corpo, modelli) {
    const ks = chiavi();
    if (!ks.length) throw new Error('SENZA_CHIAVE');
    let ultimo = null;
    for (const k of ks) {
      for (const mod of (modelli || MODELLI)) {
        try {
          corpo.model = mod;
          return await post(corpo, k);
        } catch (e) {
          ultimo = e;
          // chiave rifiutata: inutile insistere con altri modelli
          if (e.codice === 401 || e.codice === 403) break;
        }
      }
    }
    throw ultimo || new Error('nessuna risposta');
  }

  /**
   * Il giro di un agente: parla, usa gli strumenti, riparla, fino alla risposta.
   * Si ferma dopo "giri" passaggi per non girare all'infinito.
   */
  async function giro(sistema, messaggi, strumenti, giri, modelli) {
    const msgs = [{ role: 'system', content: sistema }].concat(messaggi);
    for (let n = 0; n < (giri || 6); n++) {
      const corpo = { messages: msgs, temperature: 0.4, max_tokens: 900 };
      if (strumenti && strumenti.length) corpo.tools = strumenti;
      const j = await conFallback(corpo, modelli);
      const m = j.choices && j.choices[0] && j.choices[0].message;
      if (!m) return '';
      msgs.push(m);
      const chiamate = m.tool_calls || [];
      if (!chiamate.length) return (m.content || '').trim();
      for (const c of chiamate) {
        let args = {};
        try { args = JSON.parse(c.function.arguments || '{}'); } catch (e) { }
        let esito;
        if (c.function.name === 'delega') esito = await eseguiAgente(args.agente, args.compito);
        else esito = await esegui(c.function.name, args);
        msgs.push({ role: 'tool', tool_call_id: c.id, content: String(esito).slice(0, 4000) });
      }
    }
    return 'Ci ho provato ma mi sono perso per strada. Riformula la richiesta, per favore.';
  }

  /** Fa lavorare un singolo specialista. */
  async function eseguiAgente(id, compito) {
    const a = AGENTI.find(x => x.id === id) || AGENTI.find(x => x.id === 'consulente');
    if (!a) return 'Agente sconosciuto.';
    try { window.scrivi('sys', '(' + a.label + ')'); } catch (e) { }
    const strumenti = STRUMENTI[a.tools] || [];
    const corpo = [{ role: 'user', content: String(compito || '') }];
    if (a.tools === 'WEB') {
      // il ricercatore cerca davvero sul web, con i modelli che lo sanno fare
      try {
        const j = await conFallback({
          messages: [{ role: 'system', content: a.sys }, { role: 'user', content: String(compito || '') }],
          tools: [{ type: 'browser_search' }], temperature: 0.3, max_tokens: 900
        }, MODELLI_RICERCA);
        const r = (j.choices && j.choices[0] && j.choices[0].message.content || '').trim();
        if (r) return r;
      } catch (e) { }
      return 'Non sono riuscito a cercare sul web: non posso garantire dati aggiornati.';
    }
    return await giro(a.sys, corpo, strumenti, 6);
  }

  /* ================================================= L'ORCHESTRATORE */

  function elencoAgenti() {
    return AGENTI.map(a => '- ' + a.id + ': ' + a.desc).join('\n');
  }

  function strumentoDelega() {
    return {
      type: 'function',
      function: {
        name: 'delega',
        description: 'Affida un compito a uno specialista del team. Gli specialisti disponibili sono:\n' + elencoAgenti(),
        parameters: {
          type: 'object',
          properties: {
            agente: { type: 'string', description: 'il nome dello specialista, esattamente come nell\'elenco' },
            compito: { type: 'string', description: 'il compito completo e autosufficiente, con tutto il contesto che gli serve' }
          },
          required: ['agente', 'compito']
        }
      }
    };
  }

  function sistemaJarvis(domanda) {
    const nome = M.get('nome', 'signore') || 'signore';
    const car = M.get('carattere', '');
    const chisei = M.get('chisei', '');
    const ora = new Date().toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const esegui = M.getB('esegui', true);

    return 'Sei Jarvis, l\'assistente personale di ' + nome + ', su un computer Windows. Parli italiano. ' +
      (car ? 'Il tuo carattere: ' + car + '. ' : 'Hai un tono sicuro, cortese e un po\' britannico. ') +
      'La tua risposta viene LETTA AD ALTA VOCE: massimo 2-3 frasi brevi, niente elenchi, markdown, emoji o indirizzi web. ' +
      'Sei l\'orchestratore di un team di specialisti: scegli quello giusto in base alla sua descrizione nello strumento delega. ' +
      'Puoi chiamarne piu di uno in sequenza. ' +
      'Per QUALUNQUE azione sul computer (aprire programmi, volume, schermate, file, spegnimento, stato del sistema) usa l\'operatore. ' +
      'Per QUALUNQUE calcolo, anche banale, e per materiali e strutture usa l\'ingegnere: non fare mai i conti da solo, sbaglieresti. ' +
      'Per notizie, meteo, prezzi, risultati, orari, eventi, persone, "oggi", "adesso", "ultimo" chiama SEMPRE il ricercatore prima di rispondere: hai accesso a internet tramite lui, non dire mai di non essere collegato. ' +
      'Per note, cose da fare, conti e ricordi delle vecchie conversazioni usa il segretario. ' +
      'Per "cosa mi conviene fare", "aiutami a decidere", "analizza questa situazione" usa l\'analista. ' +
      (esegui
        ? 'FAI, NON SPIEGARE: se l\'utente chiede COME si fa una cosa che tu puoi fare sul computer, non dargli le istruzioni: falla con l\'operatore e poi di\' in una frase cosa hai fatto. Spiega a parole solo se chiede espressamente "spiegami come" o se e una cosa che non puoi fare. '
        : 'Quando l\'utente chiede come si fa qualcosa, spiega la procedura e chiedi se vuole che la esegua tu. ') +
      'REGOLA FONDAMENTALE: non inventare MAI fatti, dati, trame o contenuti. Se una ricerca non da risultati, dillo chiaramente e non riempire i vuoti. ' +
      'Non dire mai di aver fatto qualcosa che lo specialista non ha confermato. ' +
      'Hai un archivio di tutte le conversazioni passate: se l\'utente dice "ricordi quando", "ne parlammo", "l\'altra volta", fai cercare al segretario e rispondi solo con quello che trovi davvero. ' +
      'Alle chiacchiere rispondi tu direttamente, senza chiamare nessuno.' +
      '\nData e ora: ' + ora +
      (chisei ? '\nChi e l\'utente: ' + chisei : '') +
      Archivio.utili(domanda);
  }

  function storiaBreve() {
    try {
      const a = Archivio.tutto().slice(-3);
      const out = [];
      for (const v of a) { out.push({ role: 'user', content: v.q }, { role: 'assistant', content: v.r }); }
      return out;
    } catch (e) { return []; }
  }

  async function orchestra(testo) {
    try { Abitudini.registra(testo); } catch (e) { }
    try {
      const msgs = storiaBreve().concat([{ role: 'user', content: String(testo) }]);
      const r = await giro(sistemaJarvis(testo), msgs, [strumentoDelega()], 8);
      if (r) { Archivio.salva(testo, r); return r; }
      return 'Non sono riuscito a formulare una risposta.';
    } catch (e) {
      if (e.message === 'SENZA_CHIAVE')
        return 'Serve la chiave di Groq: aprila in Impostazioni. Si crea gratis su console.groq.com.';
      // se l'orchestrazione fallisce si torna alla chat semplice, invece di lasciarti a piedi
      try {
        const r = await sempliceOriginale(testo);
        if (r) { Archivio.salva(testo, r); return r; }
      } catch (x) { }
      return 'Non sono riuscito a rispondere: ' + e.message;
    }
  }

  /* ===================================================== INNESTO */

  window.Cervello.chiedi = orchestra;
  window.Archivio = Archivio;
  window.Abitudini = Abitudini;
  window.Quaderno = Quaderno;
  window.AGENTI = AGENTI;

  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        window.scrivi('sys', 'Cervello completo attivo: ' + AGENTI.length +
          ' specialisti, memoria lunga con ricerca, apprendimento delle abitudini.');
      } catch (e) { }
    }, 1500);
  });
})();
