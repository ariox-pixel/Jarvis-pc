/* ====================================================================
   IL VOLTO OLOGRAFICO.

   Due modi, e si passa dall'uno all'altro quando vuoi:

   1. VOLTO SINTETICO. Una testa di filo costruita a fette orizzontali e
      meridiani, come i modelli a reticolo. Ruota piano, gli occhi
      sbattono, e la bocca si apre davvero mentre Jarvis parla.

   2. LA TUA FOTO. Scegli un'immagine e viene trattata da ologramma:
      ridotta a due toni di ciano, i contorni estratti e ridisegnati come
      filo luminoso, righe di scansione, sdoppiamento cromatico e qualche
      scatto di interferenza. Non e un filtro colorato sopra: la foto viene
      smontata e ricostruita in luce.

   Si disegna sopra la scena esistente, senza toccarla.
   ==================================================================== */
(function () {
  if (!window.M) return;
  const M = window.M;
  const PC = window.jarvisPC || null;

  const Volto = {
    tela: null, g: null, vivo: false,
    modo: M.get('faccia', 'nessuno'),     // nessuno | sintetico | foto
    foto: null, fotoUrl: M.get('fattoUrl', ''),
    datiFoto: null, bordi: null,
    parlando: 0, ultimoBlink: 0, chiuso: 0, t: 0,

    /* ------------------------------------------------- impianto */

    accendi(modo) {
      const scena = document.getElementById('scena');
      if (!scena) return 'Non trovo la scena.';
      if (!this.tela) {
        const c = document.createElement('canvas');
        c.id = 'jfaccia';
        c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
        scena.appendChild(c);
        this.tela = c;
        this.g = c.getContext('2d');
      }
      this.modo = modo;
      M.set('faccia', modo);
      this.tela.style.display = modo === 'nessuno' ? 'none' : 'block';
      if (modo !== 'nessuno' && !this.vivo) { this.vivo = true; this.giro(); }
      if (modo === 'nessuno') this.vivo = false;
      return modo === 'nessuno' ? 'Volto spento.'
        : modo === 'foto' ? 'Volto olografico dalla foto.' : 'Volto olografico sintetico.';
    },

    async scegliFoto() {
      if (!PC) return 'La scelta della foto funziona solo nel programma Windows.';
      const url = await PC.lento('foto-scegli');
      if (!url) return 'Non hai scelto nessuna foto.';
      return await this.caricaFoto(url);
    },

    caricaFoto(url) {
      return new Promise(risolvi => {
        const img = new Image();
        img.onload = () => {
          this.foto = img;
          this.fotoUrl = url;
          M.set('fattoUrl', url);
          this.preparaFoto(img);
          risolvi(this.accendi('foto'));
        };
        img.onerror = () => risolvi('Non riesco ad aprire quell\'immagine.');
        img.src = url;
      });
    },

    /**
     * Smonta la foto: la riduce a luminosita, ne estrae i contorni e la
     * ricostruisce in due toni di ciano. Si fa una volta sola al caricamento,
     * non a ogni fotogramma: sarebbe uno spreco di processore.
     */
    preparaFoto(img) {
      const L = 420;
      const h = Math.round(L * img.height / img.width);
      const o = document.createElement('canvas');
      o.width = L; o.height = h;
      const og = o.getContext('2d');
      og.drawImage(img, 0, 0, L, h);
      const d = og.getImageData(0, 0, L, h);
      const p = d.data;

      // luminosita
      const lum = new Float32Array(L * h);
      for (let i = 0; i < L * h; i++) {
        lum[i] = (p[i * 4] * 0.299 + p[i * 4 + 1] * 0.587 + p[i * 4 + 2] * 0.114) / 255;
      }

      // due toni di ciano: l'ombra tende al blu profondo, la luce al bianco
      for (let i = 0; i < L * h; i++) {
        const v = Math.pow(lum[i], 0.85);
        p[i * 4] = Math.round(20 + v * 206);
        p[i * 4 + 1] = Math.round(70 + v * 180);
        p[i * 4 + 2] = Math.round(100 + v * 155);
        p[i * 4 + 3] = Math.round(40 + v * 190);
      }
      og.putImageData(d, 0, 0);
      this.datiFoto = o;

      // i contorni, con Sobel: diventeranno il filo luminoso
      const b = document.createElement('canvas');
      b.width = L; b.height = h;
      const bg = b.getContext('2d');
      const bd = bg.createImageData(L, h);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < L - 1; x++) {
          const i = y * L + x;
          const gx = -lum[i - L - 1] - 2 * lum[i - 1] - lum[i + L - 1] + lum[i - L + 1] + 2 * lum[i + 1] + lum[i + L + 1];
          const gy = -lum[i - L - 1] - 2 * lum[i - L] - lum[i - L + 1] + lum[i + L - 1] + 2 * lum[i + L] + lum[i + L + 1];
          const m = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 0.8);
          const a = m > 0.28 ? Math.round(m * 255) : 0;
          bd.data[i * 4] = 170; bd.data[i * 4 + 1] = 245; bd.data[i * 4 + 2] = 255; bd.data[i * 4 + 3] = a;
        }
      }
      bg.putImageData(bd, 0, 0);
      this.bordi = b;
    },

    /* --------------------------------------------------- disegno */

    giro() {
      if (!this.vivo) return;
      this.t += 0.016;
      if (this.parlando > 0) this.parlando -= 0.016;
      try { this.disegna(); } catch (e) { }
      requestAnimationFrame(() => this.giro());
    },

    disegna() {
      const c = this.tela, g = this.g;
      if (!c || !g) return;
      if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight; }
      const w = c.width, h = c.height;
      g.clearRect(0, 0, w, h);
      if (this.modo === 'foto') this.disegnaFoto(g, w, h);
      else this.disegnaSintetico(g, w, h);
      this.scansione(g, w, h);
    },

    scansione(g, w, h) {
      g.globalAlpha = 0.16;
      g.fillStyle = '#000';
      for (let y = (this.t * 60) % 4; y < h; y += 4) g.fillRect(0, y, w, 1);
      g.globalAlpha = 1;
    },

    /** La foto, ricostruita in luce. */
    disegnaFoto(g, w, h) {
      if (!this.datiFoto) return;
      const img = this.datiFoto;
      const sc = Math.min(w / img.width, h / img.height) * 0.62;
      const lw = img.width * sc, lh = img.height * sc;
      const x = (w - lw) / 2;
      // respiro lento e, quando parla, un battito piu marcato
      const resp = Math.sin(this.t * 1.1) * 4 + (this.parlando > 0 ? Math.sin(this.t * 22) * 5 : 0);
      const y = (h - lh) / 2 + resp;

      // alone dietro
      g.save();
      g.filter = 'blur(26px)';
      g.globalAlpha = 0.5 + (this.parlando > 0 ? 0.2 : 0);
      g.drawImage(img, x, y, lw, lh);
      g.restore();

      // sdoppiamento cromatico: l'immagine "sgancia" come un ologramma instabile
      const sg = 2 + Math.sin(this.t * 3.3) * 1.6;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.34;
      g.drawImage(img, x - sg, y, lw, lh);
      g.globalAlpha = 0.28;
      g.drawImage(img, x + sg, y, lw, lh);
      g.globalAlpha = 0.95;
      g.drawImage(img, x, y, lw, lh);

      // il filo dei contorni
      if (this.bordi) {
        g.globalAlpha = 0.75 + (this.parlando > 0 ? 0.25 : 0);
        g.drawImage(this.bordi, x, y, lw, lh);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // scatti di interferenza: due o tre fette che scivolano di lato
      if (Math.random() < 0.035) {
        for (let k = 0; k < 3; k++) {
          const fy = y + Math.random() * lh;
          const fh = 4 + Math.random() * 14;
          const dx = (Math.random() - 0.5) * 26;
          g.drawImage(img,
            0, (fy - y) / sc, img.width, fh / sc,
            x + dx, fy, lw, fh);
        }
      }
    },

    /** La testa di filo: fette orizzontali, meridiani, occhi e bocca. */
    disegnaSintetico(g, w, h) {
      const cx = w / 2, cy = h / 2;
      const s = Math.min(w, h) * 0.30;
      const rot = Math.sin(this.t * 0.35) * 0.45;     // guarda piano a destra e a sinistra
      const su = Math.sin(this.t * 0.8) * 0.04;

      const prof = (x, y, z) => {
        const xr = x * Math.cos(rot) - z * Math.sin(rot);
        const zr = x * Math.sin(rot) + z * Math.cos(rot);
        const k = 1 / (1 + zr * 0.28);
        return { x: cx + xr * s * k, y: cy + (y + su) * s * k, k: k, z: zr };
      };

      // il profilo della testa: quanto e larga a ogni altezza
      const raggio = v => {
        const a = Math.max(0, 1 - v * v * 1.04);
        return Math.sqrt(a) * (v > 0.35 ? 0.82 : 1) * (v < -0.55 ? 0.72 + (v + 0.55) * 0.5 : 1);
      };

      g.lineWidth = 1.2;
      g.shadowColor = 'rgba(73,226,255,0.85)';
      g.shadowBlur = 12;

      // --- fette orizzontali
      for (let i = -9; i <= 9; i++) {
        const v = i / 9.5;
        const r = raggio(v);
        if (r <= 0.02) continue;
        g.strokeStyle = 'rgba(73,226,255,' + (0.14 + 0.3 * r).toFixed(3) + ')';
        g.beginPath();
        for (let a = 0; a <= 32; a++) {
          const th = a / 32 * Math.PI * 2;
          const p = prof(Math.cos(th) * r, v, Math.sin(th) * r * 0.86);
          if (a === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
        }
        g.stroke();
      }

      // --- meridiani
      for (let m = 0; m < 10; m++) {
        const th = m / 10 * Math.PI * 2;
        g.strokeStyle = 'rgba(73,226,255,0.16)';
        g.beginPath();
        for (let i = -10; i <= 10; i++) {
          const v = i / 10.5;
          const r = raggio(v);
          const p = prof(Math.cos(th) * r, v, Math.sin(th) * r * 0.86);
          if (i === -10) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
        }
        g.stroke();
      }

      // --- gli occhi, che ogni tanto sbattono
      if (performance.now() - this.ultimoBlink > 2600 + Math.random() * 2600) {
        this.ultimoBlink = performance.now(); this.chiuso = 1;
      }
      if (this.chiuso > 0) this.chiuso -= 0.09;
      const apertura = Math.max(0.06, 1 - Math.max(0, this.chiuso) * 1.6);

      for (const lato of [-1, 1]) {
        const o = prof(lato * 0.30, -0.12, 0.62);
        g.strokeStyle = 'rgba(190,250,255,0.95)';
        g.fillStyle = 'rgba(73,226,255,0.30)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(o.x, o.y, s * 0.105 * o.k, s * 0.055 * apertura * o.k, 0, 0, 6.3);
        g.fill(); g.stroke();
        if (apertura > 0.4) {
          g.fillStyle = 'rgba(226,250,255,0.95)';
          g.beginPath();
          g.arc(o.x, o.y, s * 0.028 * o.k, 0, 6.3);
          g.fill();
        }
      }

      // --- le sopracciglia
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(73,226,255,0.5)';
      for (const lato of [-1, 1]) {
        const a = prof(lato * 0.46, -0.27, 0.5), b = prof(lato * 0.14, -0.3, 0.6);
        g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2, a.y - s * 0.05, b.x, b.y); g.stroke();
      }

      // --- il naso
      const n1 = prof(0, -0.1, 0.74), n2 = prof(0, 0.14, 0.82);
      g.strokeStyle = 'rgba(73,226,255,0.4)';
      g.beginPath(); g.moveTo(n1.x, n1.y); g.lineTo(n2.x, n2.y); g.stroke();

      // --- la bocca, che si apre davvero quando Jarvis parla
      const apre = this.parlando > 0
        ? (0.3 + 0.7 * Math.abs(Math.sin(this.t * 17)) * Math.min(1, this.parlando * 3))
        : 0.06;
      const b1 = prof(-0.26, 0.33, 0.66), b2 = prof(0.26, 0.33, 0.66);
      const bc = prof(0, 0.33 + apre * 0.14, 0.72);
      g.strokeStyle = 'rgba(190,250,255,0.9)';
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(b1.x, b1.y);
      g.quadraticCurveTo(bc.x, bc.y, b2.x, b2.y);
      if (apre > 0.2) {
        const bs = prof(0, 0.33 - apre * 0.05, 0.72);
        g.quadraticCurveTo(bs.x, bs.y, b1.x, b1.y);
        g.fillStyle = 'rgba(73,226,255,' + (0.18 * apre).toFixed(3) + ')';
        g.fill();
      }
      g.stroke();

      g.shadowBlur = 0;
    }
  };

  /* --------------------------------- il volto si anima quando parla */

  try {
    const parlaVera = window.Voce.parla;
    window.Voce.parla = function (testo) {
      Volto.parlando = 1.2 + String(testo || '').length * 0.055;
      return parlaVera.apply(window.Voce, arguments);
    };
  } catch (e) { }

  /* ================================================== I COMANDI */

  function comando(frase) {
    const t = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return null;

    if (/^(scegli|cambia|carica|metti).{0,16}(la )?foto( della faccia| del volto| olografica)?$/.test(t)) {
      Volto.scegliFoto().then(r => { try { window.scrivi('jarvis', r); } catch (e) { } });
      return 'Apro la finestra per scegliere la foto...';
    }
    if (/^(faccia|volto) (sintetic[oa]|di filo|disegnat[oa])$/.test(t)) return Volto.accendi('sintetico');
    if (/^(faccia|volto) (dalla |della )?foto$/.test(t)) {
      if (!Volto.datiFoto) return 'Prima scegli una foto: di\' "scegli la foto della faccia".';
      return Volto.accendi('foto');
    }
    if (/^(accendi |attiva |mostra )?(la )?(faccia|volto) olografic[oa]$|^(accendi|mostra) (la )?faccia$/.test(t))
      return Volto.accendi(Volto.datiFoto ? 'foto' : 'sintetico');
    if (/^(togli|spegni|nascondi|via) (la )?(faccia|volto)/.test(t)) return Volto.accendi('nessuno');

    return null;
  }

  const originale = window.istantaneo;
  window.istantaneo = function (frase) {
    try { const r = comando(frase); if (r !== null && r !== undefined) return r; } catch (e) { }
    return originale ? originale(frase) : null;
  };

  window.Volto = Volto;

  /* ================================================== PARTENZA */

  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        if (Volto.modo === 'foto' && Volto.fotoUrl) Volto.caricaFoto(Volto.fotoUrl);
        else if (Volto.modo === 'sintetico') Volto.accendi('sintetico');
        else window.scrivi('sys', 'Volto olografico disponibile: di\' "faccia olografica", oppure "scegli la foto della faccia".');
      } catch (e) { }
    }, 2600);
  });
})();
