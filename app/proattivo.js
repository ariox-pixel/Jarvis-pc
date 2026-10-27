/* ====================================================================
   JARVIS PROATTIVO - la versione Windows.

   Quattro cose che fanno la differenza fra un assistente che risponde
   e uno che si fa vivo:

   1. SENTINELLA. Ogni 45 minuti guarda lo stato del computer e dei tuoi
      dati, e ti avvisa PRIMA che il problema diventi tuo. Tutti i controlli
      sono locali: non consumano quota.

   2. PROMEMORIA E SVEGLIE. "Ricordami fra dieci minuti di...",
      "svegliami alle 7:30". Suonano anche se la finestra e ridotta a icona.

   3. ROUTINE. "Ogni giorno alle 8 dimmi che tempo fa": Jarvis esegue il
      comando da solo, all'ora giusta.

   4. LA CHIAMATA. Per le cose che non puoi perderti Jarvis non manda una
      notifica: SQUILLA. Porta la finestra in primo piano, suona, e aspetta
      che tu risponda. La suoneria e generata dal programma, nota per nota:
      nessun file audio da scaricare.

   La chiamata e fastidiosa per definizione, quindi e riservata a quello
   che la merita davvero. Il resto resta una notifica.
   ==================================================================== */
(function () {
  if (!window.M) return;
  const M = window.M;
  const PC = window.jarvisPC || null;

  const ora = () => Date.now();
  const due = (n) => String(n).padStart(2, '0');

  function dillo(testo, tipo) {
    try { window.scrivi(tipo || 'jarvis', testo); } catch (e) { }
  }
  function parla(testo) {
    try { window.Voce.parla(String(testo).split('\n').slice(0, 3).join('. ')); } catch (e) { }
  }

  /* ================================================== LA SUONERIA */

  /**
   * Suoneria sintetizzata: due toni alternati, come un telefono vero.
   * Generarla invece di caricarla evita un file audio nel pacchetto e
   * funziona anche senza altoparlanti di sistema configurati.
   */
  const Suono = {
    ctx: null, timer: null, attiva: false,

    nota(f, inizio, durata, volume) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, inizio);
      g.gain.linearRampToValueAtTime(volume, inizio + 0.02);
      g.gain.setValueAtTime(volume, inizio + durata - 0.03);
      g.gain.linearRampToValueAtTime(0, inizio + durata);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(inizio); o.stop(inizio + durata + 0.02);
    },

    squillo() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // due toni sovrapposti, due volte: il suono classico della chiamata
      for (const r of [0, 0.42]) {
        this.nota(466, t + r, 0.34, 0.16);
        this.nota(622, t + r, 0.34, 0.12);
      }
    },

    avvia() {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.attiva = true;
        this.squillo();
        this.timer = setInterval(() => { if (this.attiva) this.squillo(); }, 2400);
      } catch (e) { }
    },

    ferma() {
      this.attiva = false;
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }
  };

  /* ================================================== LA CHIAMATA */

  const Chiamata = {
    inCorso: false,
    scadenza: null,

    notte() {
      const h = new Date().getHours();
      return h >= 22 || h < 7;
    },

    /**
     * Fa squillare Jarvis.
     * @param urgenza 5 passa anche di notte, sotto no.
     */
    squilla(motivo, testo, urgenza) {
      if (this.inCorso) return false;
      if (!M.getB('chiamate', true)) return false;
      if (this.notte() && (urgenza || 4) < 5) return false;
      this.inCorso = true;

      try { if (PC) PC.subito('in-primo-piano'); } catch (e) { }
      try { if (PC) PC.subito('notifica', motivo); } catch (e) { }

      this.mostra(motivo, testo);
      Suono.avvia();
      // dopo quarantacinque secondi si arrende e lascia la traccia
      this.scadenza = setTimeout(() => this.chiudi(motivo, testo, true), 45000);
      return true;
    },

    mostra(motivo, testo) {
      const d = document.createElement('div');
      d.id = 'jarvis-chiamata';
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(4,14,22,.97);' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
        'font-family:inherit;text-align:center;padding:32px;';
      d.innerHTML =
        '<div style="font-size:46px;letter-spacing:6px;color:#49E2FF;font-weight:600">JARVIS</div>' +
        '<div style="font-size:15px;color:#7FA8BD;letter-spacing:2px">chiamata in arrivo</div>' +
        '<div id="jc-motivo" style="font-size:24px;color:#fff;max-width:640px;line-height:1.4;margin-top:18px"></div>' +
        '<div style="display:flex;gap:20px;margin-top:40px">' +
        '<button id="jc-si" style="padding:20px 46px;font-size:19px;border:0;border-radius:10px;' +
        'background:#1FA85C;color:#fff;cursor:pointer;letter-spacing:1px">RISPONDI</button>' +
        '<button id="jc-no" style="padding:20px 40px;font-size:17px;border:0;border-radius:10px;' +
        'background:#7A2230;color:#fff;cursor:pointer;letter-spacing:1px">NON ORA</button>' +
        '</div>';
      document.body.appendChild(d);
      d.querySelector('#jc-motivo').textContent = motivo;
      d.querySelector('#jc-si').onclick = () => this.rispondi(motivo, testo);
      d.querySelector('#jc-no').onclick = () => this.chiudi(motivo, testo, true);
    },

    rispondi(motivo, testo) {
      this.chiudi(motivo, testo, false);
      dillo(testo);
      parla(testo);
    },

    chiudi(motivo, testo, persa) {
      this.inCorso = false;
      Suono.ferma();
      if (this.scadenza) { clearTimeout(this.scadenza); this.scadenza = null; }
      const d = document.getElementById('jarvis-chiamata');
      if (d) d.remove();
      if (persa) dillo('Chiamata persa: ' + motivo + '. ' + testo, 'sys');
    }
  };

  /* ============================================ PROMEMORIA E SVEGLIE */

  const Promemoria = {
    tutti() { try { return JSON.parse(M.get('promemoria', '[]')); } catch (e) { return []; } },
    salva(a) { try { M.set('promemoria', JSON.stringify(a)); } catch (e) { } },

    aggiungi(quando, testo, sveglia) {
      const a = this.tutti();
      a.push({ q: quando, t: testo, s: !!sveglia, id: ora() + Math.random() });
      this.salva(a);
      const d = new Date(quando);
      const oggi = d.toDateString() === new Date().toDateString();
      return (sveglia ? 'Sveglia' : 'Promemoria') + ' impostato per ' +
        (oggi ? 'oggi' : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })) +
        ' alle ' + due(d.getHours()) + ':' + due(d.getMinutes()) + '.';
    },

    elenco() {
      const a = this.tutti().filter(x => x.q > ora()).sort((x, y) => x.q - y.q);
      if (!a.length) return 'Non hai promemoria in programma.';
      return 'Hai ' + a.length + (a.length === 1 ? ' promemoria:' : ' promemoria:') + '\n' +
        a.map(x => {
          const d = new Date(x.q);
          return '- ' + due(d.getHours()) + ':' + due(d.getMinutes()) + ' ' +
            d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' - ' + x.t;
        }).join('\n');
    },

    cancella() {
      const n = this.tutti().filter(x => x.q > ora()).length;
      this.salva([]);
      return n ? 'Ho cancellato ' + n + ' promemoria.' : 'Non c\'era niente da cancellare.';
    },

    controlla() {
      const a = this.tutti();
      const adesso = ora();
      const scaduti = a.filter(x => x.q <= adesso);
      if (!scaduti.length) return;
      this.salva(a.filter(x => x.q > adesso));
      for (const x of scaduti) {
        // le sveglie squillano, i promemoria normali parlano e basta
        if (x.s) Chiamata.squilla('Sveglia: ' + x.t, 'Sono le ' + due(new Date().getHours()) + ' e ' + due(new Date().getMinutes()) + '. ' + x.t, 5);
        else {
          try { if (PC) PC.subito('notifica', x.t); } catch (e) { }
          dillo('Promemoria: ' + x.t);
          parla('Promemoria: ' + x.t);
        }
      }
    }
  };

  /* ====================================================== ROUTINE */

  const Routine = {
    tutte() { try { return JSON.parse(M.get('routine', '[]')); } catch (e) { return []; } },
    salva(a) { try { M.set('routine', JSON.stringify(a)); } catch (e) { } },

    aggiungi(h, m, comando) {
      const a = this.tutte();
      a.push({ h: h, m: m, c: comando, ultimo: '' });
      this.salva(a);
      return 'Ogni giorno alle ' + due(h) + ':' + due(m) + ' faro: ' + comando;
    },

    elenco() {
      const a = this.tutte();
      if (!a.length) return 'Non hai routine impostate.';
      return 'Routine attive:\n' + a.map(x => '- alle ' + due(x.h) + ':' + due(x.m) + ' - ' + x.c).join('\n');
    },

    cancella() {
      const n = this.tutte().length;
      this.salva([]);
      return n ? 'Ho cancellato ' + n + ' routine.' : 'Non avevi routine.';
    },

    controlla() {
      const d = new Date();
      const oggi = d.toDateString();
      const a = this.tutte();
      let cambiato = false;
      for (const x of a) {
        if (x.ultimo === oggi) continue;
        // si attiva all'ora giusta, con dieci minuti di tolleranza se il PC era spento
        const minutiOra = d.getHours() * 60 + d.getMinutes();
        const minutiSuoi = x.h * 60 + x.m;
        if (minutiOra < minutiSuoi || minutiOra > minutiSuoi + 10) continue;
        x.ultimo = oggi; cambiato = true;
        this.esegui(x.c);
      }
      if (cambiato) this.salva(a);
    },

    async esegui(comando) {
      dillo('(routine) ' + comando, 'sys');
      try {
        const r = await window.Cervello.chiedi(comando);
        dillo(r); parla(r);
      } catch (e) { }
    }
  };

  /* ==================================================== SENTINELLA */

  const Sentinella = {
    OGNI: 45 * 60 * 1000,

    silenzio(chiave, ore) {
      const k = 'sent_' + chiave;
      const ultimo = parseInt(M.get(k, '0'), 10) || 0;
      if (ora() - ultimo < ore * 3600000) return true;
      M.set(k, String(ora()));
      return false;
    },

    /** Tutti i controlli. Ognuno guarda un dato vero del computer. */
    async analizza() {
      const out = [];
      const h = new Date().getHours();

      if (PC) {
        try {
          const b = await PC.lento('batteria');
          const m = /(\d+) per cento/.exec(b || '');
          if (m) {
            const liv = parseInt(m[1], 10);
            const staccato = /a batteria/.test(b);
            if (liv <= 15 && staccato)
              out.push({ k: 'batteria_critica', u: 4, ore: 2, t: 'Batteria al ' + liv + ' per cento e non sei collegato alla corrente. Conviene attaccarlo adesso.' });
            else if (liv <= 30 && staccato && h >= 8 && h <= 22)
              out.push({ k: 'batteria_bassa', u: 2, ore: 6, t: 'Batteria al ' + liv + ' per cento. Se devi lavorare, collegalo.' });
          }
        } catch (e) { }

        try {
          const d = await PC.lento('dischi');
          const righe = String(d || '').split('\n');
          for (const r of righe) {
            const m = /^(\w:)\s+([\d.,]+)\s*GB liberi/.exec(r.trim());
            if (!m) continue;
            const gb = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
            if (gb < 5)
              out.push({ k: 'disco_' + m[1], u: 4, ore: 12, t: 'Spazio quasi esaurito sul disco ' + m[1] + ': restano ' + m[2] + ' GB. Windows rallenta e i programmi possono non salvare.' });
            else if (gb < 20)
              out.push({ k: 'disco_basso_' + m[1], u: 2, ore: 48, t: 'Sul disco ' + m[1] + ' restano ' + m[2] + ' GB: conviene fare pulizia prima che diventi un problema.' });
          }
        } catch (e) { }

        try {
          const s = PC.subito('sistema') || '';
          const m = /Acceso da (\d+) ore/.exec(s);
          if (m && parseInt(m[1], 10) >= 72)
            out.push({ k: 'acceso_troppo', u: 2, ore: 48, t: 'Il computer e acceso da ' + m[1] + ' ore senza riavvio. Un riavvio gli farebbe bene.' });
          const r = /Memoria: ([\d.,]+) di ([\d.,]+) GB/.exec(s);
          if (r) {
            const uso = parseFloat(r[1].replace(',', '.')), tot = parseFloat(r[2].replace(',', '.'));
            if (tot > 0 && uso / tot > 0.9)
              out.push({ k: 'ram_piena', u: 3, ore: 6, t: 'La memoria e piena al ' + Math.round(uso / tot * 100) + ' per cento. Chiudere qualche programma aiuterebbe.' });
          }
        } catch (e) { }
      }

      // --- cose da fare ferme da troppo
      try {
        const cose = window.Quaderno ? window.Quaderno.leggi('cose').filter(x => !x.fatta) : [];
        if (cose.length >= 5 && h >= 9 && h <= 20)
          out.push({ k: 'troppe_cose', u: 2, ore: 24, t: 'Hai ' + cose.length + ' attivita ancora aperte. La prima e: ' + cose[0].t + '.' });
      } catch (e) { }

      // --- conti del mese in rosso
      try {
        if (window.Quaderno) {
          const mese = new Date().getMonth();
          const mov = window.Quaderno.leggi('conti').filter(x => new Date(x.q).getMonth() === mese);
          let e = 0, u = 0;
          for (const x of mov) { if (x.i < 0) u += -x.i; else e += x.i; }
          if (e > 0 && u > e * 1.1 && h >= 9 && h <= 21)
            out.push({ k: 'conti_rosso', u: 3, ore: 96, t: 'Questo mese hai speso piu di quanto sia entrato: ' + u.toFixed(0) + ' euro contro ' + e.toFixed(0) + '. Vale la pena guardarci.' });
        }
      } catch (e) { }

      // --- promemoria dimenticati
      try {
        const p = Promemoria.tutti().filter(x => x.q > ora() && x.q - ora() < 3600000);
        if (p.length) {
          const x = p[0]; const d = new Date(x.q);
          out.push({ k: 'prom_' + x.id, u: 3, ore: 1, t: 'Fra poco, alle ' + due(d.getHours()) + ':' + due(d.getMinutes()) + ': ' + x.t });
        }
      } catch (e) { }

      // --- un'abitudine scoperta: la segnalazione piu preziosa
      try {
        if (window.Abitudini) {
          const g = window.Abitudini.gruppi();
          if (g.length && h >= 9 && h <= 21)
            out.push({
              k: 'abitudine_' + g[0].firma.replace(/\s/g, '_'), u: 1, ore: 48,
              t: 'Ho notato una cosa: verso le ' + due(g[0].ora) + ':' + due(g[0].minuto) +
                ' mi chiedi "' + g[0].esempio + '". E successo ' + g[0].volte + ' volte.'
            });
        }
      } catch (e) { }

      return out;
    },

    /** Un avviso alla volta, il piu urgente. Gli altri aspettano il giro dopo. */
    async controlla(forzato) {
      if (!M.getB('sentinella', true) && !forzato) return 'La sentinella e spenta.';
      let trovati = [];
      try { trovati = await this.analizza(); } catch (e) { return 'Non sono riuscito a controllare.'; }

      if (forzato) {
        if (!trovati.length) return 'Ho controllato tutto: e in ordine. Batteria, spazio, memoria, attivita e conti non segnalano niente.';
        return 'Ecco cosa ho trovato:\n' + trovati.sort((a, b) => b.u - a.u).slice(0, 5).map(x => '- ' + x.t).join('\n');
      }

      const h = new Date().getHours();
      const notte = h >= 22 || h < 7;
      const daDire = trovati
        .filter(x => !this.silenzio(x.k, x.ore))
        .filter(x => !notte || x.u >= 4)
        .sort((a, b) => b.u - a.u);
      if (!daDire.length) return '';

      const primo = daDire[0];
      // le cose urgenti meritano uno squillo, non una notifica che puoi non vedere
      if (primo.u >= 4 && !notte && Chiamata.squilla(this.titolo(primo), primo.t, primo.u)) return primo.t;

      dillo(primo.t);
      try { if (PC) PC.subito('notifica', primo.t); } catch (e) { }
      if (primo.u >= 3 && !notte) parla(primo.t);
      return primo.t;
    },

    titolo(a) {
      if (a.k.indexOf('batteria') === 0) return 'Batteria quasi scarica';
      if (a.k.indexOf('disco') === 0) return 'Spazio esaurito';
      if (a.k.indexOf('ram') === 0) return 'Memoria piena';
      if (a.k.indexOf('conti') === 0) return 'Attenzione ai conti';
      if (a.k.indexOf('prom') === 0) return 'Promemoria fra poco';
      return a.t.slice(0, 50);
    }
  };

  /* ============================================ I COMANDI A VOCE */

  function quandoDaTesto(t) {
    let m;
    // "fra 10 minuti" / "tra un'ora"
    m = t.match(/\b(?:fra|tra)\s+(?:(\d+)|un[a']?)\s*(minut|or|second)/);
    if (m) {
      const n = m[1] ? parseInt(m[1], 10) : 1;
      const u = m[2].indexOf('or') === 0 ? 3600000 : (m[2].indexOf('second') === 0 ? 1000 : 60000);
      return ora() + n * u;
    }
    // "alle 15:30" / "alle 7"
    m = t.match(/\bALLE\s+(\d{1,2})(?:[:.](\d{2}))?/i);
    if (m) {
      const d = new Date();
      d.setHours(parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : 0, 0, 0);
      if (d.getTime() <= ora()) d.setDate(d.getDate() + 1);
      return d.getTime();
    }
    return null;
  }

  function comando(frase) {
    const t = String(frase || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    let m;

    // --- routine: "ogni giorno alle 8 dimmi il meteo"
    m = t.match(/^ogni giorno alle (\d{1,2})(?:[:.](\d{2}))?\s+(.+)$/);
    if (m) return Routine.aggiungi(parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : 0, m[3]);
    if (/^(elenca|quali|mostra).{0,12}routine/.test(t)) return Routine.elenco();
    if (/^(cancella|annulla|togli).{0,12}(tutte le )?routine/.test(t)) return Routine.cancella();

    // --- sveglie
    m = t.match(/^(?:svegliami|mettimi la sveglia|sveglia)\s+(.+)$/);
    if (m) {
      const q = quandoDaTesto(m[1]) || quandoDaTesto(t);
      if (q) return Promemoria.aggiungi(q, 'sveglia', true);
      return 'Non ho capito a che ora. Dimmi per esempio "svegliami alle 7 e 30".';
    }

    // --- promemoria
    m = t.match(/^(?:ricordami|promemoria|avvisami)\s+(.+)$/);
    if (m) {
      const q = quandoDaTesto(m[1]);
      if (!q) return 'Non ho capito quando. Dimmi per esempio "ricordami fra dieci minuti di chiamare Marco".';
      const cosa = m[1]
        .replace(/\b(?:fra|tra)\s+(?:\d+|un[a']?)\s*(?:minut\w*|or\w*|second\w*)\b/, '')
        .replace(/\balle \d{1,2}(?:[:.]\d{2})?\b/, '')
        .replace(/^\s*(?:di|che|a)\s+/, '').trim();
      return Promemoria.aggiungi(q, cosa || 'promemoria', false);
    }
    if (/^(elenca|quali|mostra|che).{0,16}promemoria/.test(t)) return Promemoria.elenco();
    if (/^(cancella|annulla|togli).{0,16}promemoria/.test(t)) return Promemoria.cancella();

    // --- la sentinella su richiesta
    if (/^(controlla tutto|come va|c e qualcosa che devo sapere|fai un controllo)/.test(t)) {
      Sentinella.controlla(true).then(r => { dillo(r); parla(r); });
      return 'Controllo tutto...';
    }

    // --- prova della chiamata
    if (/^(prova la chiamata|chiamata di prova|fammi una chiamata)/.test(t)) {
      const ok = Chiamata.squilla('Chiamata di prova',
        'Sono Jarvis. Questa e una chiamata di prova: funziona tutto. Da ora in poi ti chiamo quando succede qualcosa che devi sapere.', 5);
      return ok ? 'Sto squillando...' : 'Le chiamate sono spente, oppure ce n\'e gia una in corso.';
    }
    if (/^(spegni le chiamate|niente chiamate)/.test(t)) { M.setB('chiamate', false); return 'Non ti chiamero piu, solo notifiche.'; }
    if (/^(accendi le chiamate|riattiva le chiamate)/.test(t)) { M.setB('chiamate', true); return 'Chiamate riattivate.'; }
    if (/^(spegni la sentinella)/.test(t)) { M.setB('sentinella', false); return 'Sentinella spenta.'; }
    if (/^(accendi la sentinella)/.test(t)) { M.setB('sentinella', true); return 'Sentinella accesa.'; }

    return null;
  }

  /* =================================================== IL MOTORE */

  // ogni venti secondi: promemoria e routine. Leggero, tutto in locale.
  setInterval(() => {
    try { Promemoria.controlla(); } catch (e) { }
    try { Routine.controlla(); } catch (e) { }
  }, 20000);

  // la sentinella gira piu rada, e non appena il programma si apre
  setInterval(() => { try { Sentinella.controlla(false); } catch (e) { } }, Sentinella.OGNI);
  setTimeout(() => { try { Sentinella.controlla(false); } catch (e) { } }, 90000);

  /* ====================================================== INNESTO */

  const originale = window.istantaneo;
  window.istantaneo = function (frase) {
    try {
      const r = comando(frase);
      if (r !== null && r !== undefined) return r;
    } catch (e) { }
    return originale ? originale(frase) : null;
  };

  window.Proattivo = { Promemoria: Promemoria, Routine: Routine, Sentinella: Sentinella, Chiamata: Chiamata };

  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        const p = Promemoria.tutti().filter(x => x.q > ora()).length;
        const r = Routine.tutte().length;
        window.scrivi('sys', 'Jarvis proattivo attivo: sentinella ogni 45 minuti, ' +
          p + ' promemoria, ' + r + ' routine. Di\' "prova la chiamata" per sentirlo squillare.');
      } catch (e) { }
    }, 1800);
  });
})();
