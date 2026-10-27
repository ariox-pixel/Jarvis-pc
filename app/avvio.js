/* ====================================================================
   AVVIO E ATMOSFERA.

   Due cose che non servono a niente e cambiano tutto:

   1. L'INTRO. Ogni volta che apri Jarvis, centonovanta particelle
      convergono a formare il nucleo, sei sistemi si accendono uno per
      uno fino al cento per cento, e il nome si compone con lo sdoppiamento
      cromatico di un ologramma instabile. Quattro secondi e mezzo, poi
      sparisce. Il suono e sintetizzato nota per nota: nessun file audio.

   2. LA MUSICA DI SOTTOFONDO. Scegli i tuoi brani o una cartella intera.
      Quando Jarvis parla la musica si abbassa da sola e poi risale:
      e il dettaglio che fa la differenza fra "musica accesa" e
      "musica che ti accompagna".
   ==================================================================== */
(function () {
  if (!window.M) return;
  const M = window.M;
  const PC = window.jarvisPC || null;

  const CIANO = [73, 226, 255];
  const CALDO = [255, 214, 120];

  /* ================================================== IL SUONO */

  const Audio2 = {
    ctx: null,
    apri() {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { }
      return this.ctx;
    },

    /** La salita dei sistemi: una frequenza che cresce, poi tre note luminose. */
    avvio() {
      const c = this.apri(); if (!c) return;
      const t = c.currentTime;
      // la salita
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 1.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(5000, t + 1.6);
      o.connect(f); f.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 1.9);
      // le tre note
      [[880, 1.9], [1174.7, 2.12], [1760, 2.34]].forEach(([fr, q]) => this.nota(fr, t + q - 1.9 + 1.9, 0.5, 0.12));
    },

    nota(freq, inizio, durata, vol) {
      const c = this.apri(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, inizio);
      g.gain.linearRampToValueAtTime(vol, inizio + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, inizio + durata);
      o.connect(g); g.connect(c.destination);
      o.start(inizio); o.stop(inizio + durata + 0.05);
    }
  };

  /* ================================================== L'INTRO */

  const Intro = {
    DURATA: 4600,

    saluto() {
      const h = new Date().getHours();
      const s = h >= 5 && h <= 12 ? 'Buongiorno' : h <= 17 ? 'Buon pomeriggio' : h <= 22 ? 'Buonasera' : 'Bentornato';
      const n = M.get('nome', 'signore') || 'signore';
      return s + ' ' + n + '. Tutti i sistemi sono ora online e gli agenti sono alle loro postazioni. Iniziamo a lavorare, ' + n + '.';
    },

    mostra() {
      if (document.getElementById('jintro')) return;
      const d = document.createElement('div');
      d.id = 'jintro';
      d.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#02080e;cursor:pointer';
      const c = document.createElement('canvas');
      c.style.cssText = 'width:100%;height:100%;display:block';
      d.appendChild(c);
      document.body.appendChild(d);
      // si puo saltare: la prima volta e uno spettacolo, la centesima no
      d.onclick = () => this.chiudi(d);

      const g = c.getContext('2d');
      const particelle = [];
      for (let i = 0; i < 190; i++) {
        const th = Math.random() * 6.2832, ph = (Math.random() - 0.5) * 3.1416;
        particelle.push({
          x: Math.cos(th) * Math.cos(ph), y: Math.sin(ph), z: Math.sin(th) * Math.cos(ph),
          v: 0.55 + Math.random() * 0.9, r: 1.4 + Math.random() * 2.6
        });
      }
      const sistemi = ['NUCLEO COGNITIVO', 'SENSORI', 'RETE NEURALE', 'MEMORIA', 'VOCE', 'CONTROLLO AMBIENTE'];
      const inizio = performance.now();
      Audio2.avvio();

      const disegna = () => {
        if (!document.getElementById('jintro')) return;
        if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight; }
        const w = c.width, h = c.height, cx = w / 2, cy = h / 2;
        const s = Math.min(w, h);
        const t = Math.min(1, (performance.now() - inizio) / this.DURATA);

        g.fillStyle = '#02080e';
        g.fillRect(0, 0, w, h);

        // --- le particelle convergono verso il nucleo
        const conv = Math.min(1, Math.max(0, (t - 0.06) / 0.5));
        for (const p of particelle) {
          const raggio = s * (0.62 - 0.44 * conv * p.v);
          const rot = t * 2.2 * p.v;
          const x = cx + (p.x * Math.cos(rot) - p.z * Math.sin(rot)) * raggio;
          const y = cy + p.y * raggio * 0.75;
          const prof = (p.x * Math.sin(rot) + p.z * Math.cos(rot) + 1.4) / 2.4;
          const a = Math.min(1, conv * 1.6) * prof;
          g.fillStyle = 'rgba(' + CIANO[0] + ',' + CIANO[1] + ',' + CIANO[2] + ',' + (a * 0.85).toFixed(3) + ')';
          g.beginPath(); g.arc(x, y, p.r * prof, 0, 6.3); g.fill();
        }

        // --- il nucleo che pulsa
        const nucleo = Math.max(0, (t - 0.18) / 0.3);
        if (nucleo > 0) {
          const rr = s * 0.07 * Math.min(1, nucleo) * (1 + 0.05 * Math.sin(t * 40));
          const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 3);
          grad.addColorStop(0, 'rgba(226,250,255,' + Math.min(1, nucleo) + ')');
          grad.addColorStop(0.35, 'rgba(' + CIANO.join(',') + ',' + (0.5 * Math.min(1, nucleo)) + ')');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grad;
          g.beginPath(); g.arc(cx, cy, rr * 3, 0, 6.3); g.fill();
        }

        // --- i sette frammenti che diventano anelli
        for (let i = 0; i < 7; i++) {
          const rit = i * 0.045;
          const a = Math.min(1, Math.max(0, (t - 0.22 - rit) / 0.3));
          if (a <= 0) continue;
          g.strokeStyle = 'rgba(' + CIANO.join(',') + ',' + (a * 0.5).toFixed(3) + ')';
          g.lineWidth = 1.4;
          g.beginPath();
          g.ellipse(cx, cy, s * (0.12 + i * 0.045) * a, s * (0.12 + i * 0.045) * a * 0.34,
            (i * 0.9 + t * 1.6), 0, 6.3);
          g.stroke();
        }

        // --- i sistemi che si accendono, uno per uno
        const ax = w * 0.08;
        g.font = Math.round(s * 0.021) + 'px monospace';
        g.textAlign = 'left';
        for (let i = 0; i < sistemi.length; i++) {
          const a = Math.min(1, Math.max(0, (t - 0.30 - i * 0.055) / 0.22));
          if (a <= 0) continue;
          const y = h * 0.60 + i * s * 0.042;
          const perc = Math.round(Math.min(100, a * 118));
          g.fillStyle = 'rgba(' + CIANO.join(',') + ',' + (a * 0.9).toFixed(3) + ')';
          g.fillText(sistemi[i], ax, y);
          g.fillStyle = perc >= 99 ? 'rgba(' + CALDO.join(',') + ',0.95)' : 'rgba(' + CIANO.join(',') + ',0.7)';
          g.textAlign = 'right';
          g.fillText(perc >= 99 ? 'OK' : perc + '%', w * 0.92, y);
          g.textAlign = 'left';
          // la barra
          g.strokeStyle = 'rgba(' + CIANO.join(',') + ',0.25)';
          g.lineWidth = 1;
          g.beginPath(); g.moveTo(ax, y + s * 0.011); g.lineTo(w * 0.86, y + s * 0.011); g.stroke();
          g.strokeStyle = 'rgba(' + CIANO.join(',') + ',0.8)';
          g.lineWidth = 2;
          g.beginPath(); g.moveTo(ax, y + s * 0.011);
          g.lineTo(ax + (w * 0.86 - ax) * Math.min(1, a * 1.18), y + s * 0.011); g.stroke();
        }

        // --- il nome, con lo sdoppiamento di un ologramma instabile
        const an = Math.min(1, Math.max(0, (t - 0.52) / 0.3));
        if (an > 0) {
          const sc = s * 0.13;
          g.textAlign = 'center';
          g.font = '600 ' + Math.round(sc) + 'px system-ui, sans-serif';
          const sg = (1 - an) * s * 0.012 + Math.sin(t * 50) * s * 0.0012;
          g.fillStyle = 'rgba(255,60,90,' + (an * 0.5).toFixed(3) + ')';
          g.fillText('JARVIS', cx - sg, cy * 0.72);
          g.fillStyle = 'rgba(60,200,255,' + (an * 0.5).toFixed(3) + ')';
          g.fillText('JARVIS', cx + sg, cy * 0.72);
          g.fillStyle = 'rgba(226,250,255,' + an.toFixed(3) + ')';
          g.fillText('JARVIS', cx, cy * 0.72);
          g.font = Math.round(sc * 0.17) + 'px system-ui, sans-serif';
          g.fillStyle = 'rgba(' + CIANO.join(',') + ',' + (an * 0.85).toFixed(3) + ')';
          g.fillText('BY ARIOSTO PRUDENZIANO', cx, cy * 0.72 + sc * 0.26);
          g.textAlign = 'left';
        }

        // --- le righe di scansione, sempre
        g.fillStyle = 'rgba(0,0,0,0.16)';
        for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);

        // --- l'ultimo mezzo secondo: dissolvenza
        if (t > 0.9) {
          g.fillStyle = 'rgba(2,8,14,' + ((t - 0.9) / 0.1).toFixed(3) + ')';
          g.fillRect(0, 0, w, h);
        }
        if (t >= 1) { this.chiudi(d); return; }
        requestAnimationFrame(disegna);
      };
      requestAnimationFrame(disegna);

      // il saluto parte verso la fine, cosi non si sovrappone al suono di avvio
      setTimeout(() => {
        if (!M.getB('saluto', true)) return;
        const s = this.saluto();
        try { window.scrivi('jarvis', s); } catch (e) { }
        try { window.Voce.parla(s); } catch (e) { }
      }, 3400);
    },

    chiudi(d) {
      if (d && d.parentNode) d.remove();
    }
  };

  /* ================================================== LA MUSICA */

  const Musica = {
    lista: [], indice: 0, el: null, volume: 0.25, accesa: false,

    elemento() {
      if (!this.el) {
        this.el = document.createElement('audio');
        this.el.style.display = 'none';
        this.el.onended = () => this.prossimo();
        document.body.appendChild(this.el);
      }
      return this.el;
    },

    ricorda() { try { M.set('musica', JSON.stringify(this.lista)); } catch (e) { } },

    async scegli(cartella) {
      if (!PC) return 'La scelta dei file funziona solo nel programma Windows.';
      try {
        const r = await PC.lento(cartella ? 'musica-cartella' : 'musica-scegli');
        const l = JSON.parse(r || '[]');
        if (!l.length) return 'Non hai scelto niente.';
        this.lista = l;
        this.indice = 0;
        this.ricorda();
        this.suona();
        return 'Ho caricato ' + l.length + (l.length === 1 ? ' brano' : ' brani') + '. Parto con ' + l[0].nome + '.';
      } catch (e) {
        return 'Non sono riuscito a leggere i file.';
      }
    },

    suona() {
      if (!this.lista.length) return 'Non hai ancora scelto la musica. Di\' "scegli la musica".';
      const a = this.elemento();
      const b = this.lista[this.indice % this.lista.length];
      a.src = b.url;
      a.volume = this.volume;
      a.play().catch(() => { });
      this.accesa = true;
      return 'Metto ' + b.nome + '.';
    },

    ferma() {
      if (this.el) { this.el.pause(); }
      this.accesa = false;
      return 'Musica fermata.';
    },

    prossimo() {
      if (!this.lista.length) return 'Non hai brani caricati.';
      this.indice = (this.indice + 1) % this.lista.length;
      return this.suona();
    },

    piuForte() {
      this.volume = Math.min(1, this.volume + 0.12);
      if (this.el) this.el.volume = this.volume;
      return 'Volume della musica al ' + Math.round(this.volume * 100) + ' per cento.';
    },

    piuPiano() {
      this.volume = Math.max(0.02, this.volume - 0.12);
      if (this.el) this.el.volume = this.volume;
      return 'Volume della musica al ' + Math.round(this.volume * 100) + ' per cento.';
    },

    /**
     * Si abbassa da sola mentre Jarvis parla, e risale quando ha finito.
     * E' il dettaglio che fa la differenza fra "musica accesa" e
     * "musica che ti accompagna".
     */
    abbassa(giu) {
      if (!this.el || !this.accesa) return;
      const meta = giu ? this.volume * 0.25 : this.volume;
      const da = this.el.volume;
      const inizio = performance.now();
      const passo = () => {
        const q = Math.min(1, (performance.now() - inizio) / 320);
        if (this.el) this.el.volume = da + (meta - da) * q;
        if (q < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    },

    stato() {
      if (!this.lista.length) return 'Non hai musica caricata.';
      const b = this.lista[this.indice % this.lista.length];
      return (this.accesa ? 'Sto suonando ' + b.nome : 'Musica ferma, in lista ' + b.nome) +
        '. Hai ' + this.lista.length + ' brani, volume al ' + Math.round(this.volume * 100) + ' per cento.';
    }
  };

  // --- la musica si abbassa quando Jarvis parla
  try {
    const parlaVera = window.Voce.parla;
    window.Voce.parla = function (testo) {
      Musica.abbassa(true);
      const r = parlaVera.apply(window.Voce, arguments);
      // la durata del parlato non e nota in anticipo: si stima sulle parole
      const ms = 1200 + String(testo || '').length * 55;
      setTimeout(() => Musica.abbassa(false), ms);
      return r;
    };
  } catch (e) { }

  /* ================================================ I COMANDI */

  function comando(frase) {
    const t = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return null;

    if (/^(scegli|carica|imposta).{0,8}(la )?musica( di sottofondo)?$/.test(t)) {
      Musica.scegli(false).then(r => { try { window.scrivi('jarvis', r); window.Voce.parla(r); } catch (e) { } });
      return 'Apro la finestra per scegliere i brani...';
    }
    if (/^(scegli|carica).{0,12}cartella.{0,12}musica|^musica da (una )?cartella$/.test(t)) {
      Musica.scegli(true).then(r => { try { window.scrivi('jarvis', r); window.Voce.parla(r); } catch (e) { } });
      return 'Apro la finestra per scegliere la cartella...';
    }
    if (/^(metti|accendi|avvia|fai partire)( la)? musica$/.test(t)) return Musica.suona();
    if (/^(ferma|spegni|stoppa|basta)( la)? musica$/.test(t)) return Musica.ferma();
    if (/^(cambia|prossim[ao]|salta|avanti)( brano| canzone| musica)?$/.test(t) && Musica.lista.length) return Musica.prossimo();
    if (/^musica (piu )?(forte|alta)$|^alza la musica$/.test(t)) return Musica.piuForte();
    if (/^musica (piu )?(piano|bassa)$|^abbassa la musica$/.test(t)) return Musica.piuPiano();
    if (/^(che musica|cosa stai suonando|stato della musica)/.test(t)) return Musica.stato();
    if (/^(rivedi|rifai|mostra)( l)?.?intro$/.test(t)) { Intro.mostra(); return 'Eccola.'; }
    if (/^(niente|salta|togli) intro$/.test(t)) { M.setB('intro', false); return 'Non mostrero piu l\'intro all\'avvio.'; }
    if (/^(rimetti|riattiva)( l)?.?intro$/.test(t)) { M.setB('intro', true); return 'Intro riattivata.'; }
    return null;
  }

  const originale = window.istantaneo;
  window.istantaneo = function (frase) {
    try { const r = comando(frase); if (r !== null && r !== undefined) return r; } catch (e) { }
    return originale ? originale(frase) : null;
  };

  window.Intro = Intro;
  window.Musica = Musica;

  /* ================================================== PARTENZA */

  try { Musica.lista = JSON.parse(M.get('musica', '[]')); } catch (e) { }

  // l'intro parte subito, prima che la pagina finisca di sistemarsi
  if (M.getB('intro', true)) {
    if (document.body) Intro.mostra();
    else document.addEventListener('DOMContentLoaded', () => Intro.mostra());
  }
})();
