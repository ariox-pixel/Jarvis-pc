/* ====================================================================
   I WIDGET DELLA SCHERMATA PRINCIPALE.

   Pannelli olografici lungo i due lati della scena, con dati veri che si
   aggiornano da soli. Stanno ai bordi apposta: l'ologramma al centro e la
   conversazione in basso restano liberi, perche sono le due cose che
   guardi davvero. I widget si vedono con la coda dell'occhio, ed e il
   loro mestiere.

   Diciotto disponibili, scegli quelli che vuoi. Un clic su un pannello lo
   toglie; il pulsante in alto apre l'elenco per aggiungerne.
   ==================================================================== */
(function () {
  if (!window.M) return;
  const M = window.M;
  const PC = window.jarvisPC || null;

  const taglia = (s, n) => { s = String(s); return s.length <= n ? s : s.slice(0, n - 1) + '…'; };
  const righe = (t, n) => String(t || '').split('\n').filter(x => x.trim()).slice(0, n || 4);

  /* ================================================== IL CATALOGO */

  const CATALOGO = [
    {
      id: 'ora', titolo: 'ORA', dati: () => [
        new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })]
    },
    { id: 'computer', titolo: 'COMPUTER', pc: 'sistema', n: 4 },
    { id: 'energia', titolo: 'ENERGIA', lento: 'batteria', n: 2 },
    { id: 'dischi', titolo: 'ARCHIVIO', lento: 'dischi', n: 3 },
    { id: 'carico', titolo: 'CARICO', lento: 'processi', n: 5 },
    { id: 'rete', titolo: 'RETE', lento: 'rete', n: 2 },
    { id: 'finestre', titolo: 'FINESTRE', lento: 'finestre', n: 5 },
    {
      id: 'dafare', titolo: 'DA FARE', dati: () => {
        try {
          const c = window.Quaderno.leggi('cose').filter(x => !x.fatta);
          return c.length ? c.slice(-4).map(x => '› ' + taglia(x.t, 28)) : ['niente in sospeso'];
        } catch (e) { return ['-']; }
      }
    },
    {
      id: 'note', titolo: 'NOTE', dati: () => {
        try {
          const n = window.Quaderno.leggi('note');
          return n.length ? n.slice(-4).map(x => '› ' + taglia(x.t, 28)) : ['nessuna nota'];
        } catch (e) { return ['-']; }
      }
    },
    {
      id: 'conti', titolo: 'CONTI', dati: () => {
        try { return window.Quaderno.conti().replace('Questo mese: ', '').split(', '); } catch (e) { return ['-']; }
      }
    },
    {
      id: 'promemoria', titolo: 'PROMEMORIA', dati: () => {
        try { return righe(window.Proattivo.Promemoria.elenco(), 4).map(x => taglia(x, 30)); } catch (e) { return ['-']; }
      }
    },
    {
      id: 'routine', titolo: 'ROUTINE', dati: () => {
        try { return righe(window.Proattivo.Routine.elenco(), 4).map(x => taglia(x, 30)); } catch (e) { return ['-']; }
      }
    },
    {
      id: 'abitudini', titolo: 'ABITUDINI', dati: () => {
        try { return righe(window.Abitudini.riepilogo(), 4).map(x => taglia(x, 30)); } catch (e) { return ['-']; }
      }
    },
    {
      id: 'memoria', titolo: 'MEMORIA', dati: () => {
        try { return righe(window.Archivio.stato(), 2); } catch (e) { return ['-']; }
      }
    },
    {
      id: 'team', titolo: 'IL TEAM', dati: () => {
        try { return [window.AGENTI.length + ' specialisti'].concat(window.AGENTI.slice(0, 3).map(a => '› ' + a.label)); }
        catch (e) { return ['-']; }
      }
    },
    {
      id: 'musica', titolo: 'MUSICA', dati: () => {
        try { return righe(window.Musica.stato().replace('. ', '.\n'), 3).map(x => taglia(x, 30)); } catch (e) { return ['-']; }
      }
    },
    {
      id: 'automazioni', titolo: 'AUTOMAZIONI', dati: () => {
        try {
          const m = window.Macro.tutte(); const n = Object.keys(m);
          return n.length ? n.slice(0, 4).map(x => '› ' + x) : ['nessuna'];
        } catch (e) { return ['-']; }
      }
    },
    {
      id: 'mano', titolo: 'MANO', dati: () => {
        try { return righe(window.Sala && window.Sala.aperta ? 'sala aperta' : 'sala chiusa', 2); } catch (e) { return ['-']; }
      }
    }
  ];

  /* ================================================== IL PANNELLO */

  const Widget = {
    attivi: [],
    visibili: true,

    stile() {
      if (document.getElementById('jwidget-stile')) return;
      const s = document.createElement('style');
      s.id = 'jwidget-stile';
      s.textContent = `
#jwrap{position:absolute;inset:0;pointer-events:none;z-index:4}
#jwrap .col{position:absolute;top:10px;bottom:10px;width:188px;display:flex;flex-direction:column;gap:8px;
 overflow:hidden;pointer-events:none}
#jwrap .col.sx{left:10px} #jwrap .col.dx{right:10px}
#jwrap .w{pointer-events:auto;cursor:pointer;background:linear-gradient(155deg,rgba(26,92,124,.26),rgba(10,40,60,.12));
 border:1px solid rgba(73,226,255,.55);border-radius:9px;padding:8px 10px;color:#CFEFFA;
 box-shadow:0 0 16px rgba(73,226,255,.18),inset 0 0 14px rgba(73,226,255,.05);
 backdrop-filter:blur(2px);transition:.15s;position:relative;overflow:hidden}
#jwrap .w:hover{border-color:#fff;box-shadow:0 0 26px rgba(73,226,255,.42)}
#jwrap .w b{display:block;color:#49E2FF;font-size:10px;letter-spacing:2.4px;margin-bottom:5px;
 text-shadow:0 0 9px rgba(73,226,255,.8)}
#jwrap .w i{display:block;font-style:normal;font-size:11.5px;line-height:1.45;opacity:.9;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#jwrap .w::after{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:rgba(73,226,255,.7)}
#jwrap .piu{pointer-events:auto;cursor:pointer;background:rgba(26,92,124,.3);border:1px dashed rgba(73,226,255,.5);
 border-radius:9px;padding:7px;color:#49E2FF;text-align:center;font-size:11px;letter-spacing:2px}
#jscelta{position:absolute;inset:0;z-index:20;background:rgba(4,14,22,.95);padding:46px 20px 20px;overflow:auto;
 display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;align-content:start;pointer-events:auto}
#jscelta .v{border:1px solid rgba(73,226,255,.6);border-radius:8px;padding:11px;color:#CFEFFA;cursor:pointer;
 font-size:12px;letter-spacing:1.6px;text-align:center;background:rgba(26,92,124,.16)}
#jscelta .v:hover{background:rgba(73,226,255,.25);border-color:#fff}
#jscelta .v.gia{border-color:#54F0A8;color:#54F0A8}
#jscelta .chiudi{position:absolute;top:10px;right:14px;background:rgba(122,34,48,.8);color:#fff;border:0;
 border-radius:7px;padding:7px 14px;cursor:pointer;font-size:12px;letter-spacing:2px}`;
      document.head.appendChild(s);
    },

    monta() {
      const scena = document.getElementById('scena');
      if (!scena || document.getElementById('jwrap')) return;
      this.stile();
      const d = document.createElement('div');
      d.id = 'jwrap';
      d.innerHTML = '<div class="col sx"></div><div class="col dx"></div>';
      scena.appendChild(d);
      this.sx = d.querySelector('.col.sx');
      this.dx = d.querySelector('.col.dx');
      this.root = d;

      try { this.attivi = JSON.parse(M.get('widget', 'null')) || ['ora', 'energia', 'dischi', 'dafare', 'promemoria', 'rete']; }
      catch (e) { this.attivi = ['ora', 'energia', 'dafare']; }
      this.ridisegna();
      this.aggiorna();
      setInterval(() => { if (this.visibili) this.aggiorna(); }, 3000);
    },

    ricorda() { try { M.set('widget', JSON.stringify(this.attivi)); } catch (e) { } },

    ridisegna() {
      if (!this.sx) return;
      this.sx.innerHTML = ''; this.dx.innerHTML = '';
      this.attivi.forEach((id, i) => {
        const def = CATALOGO.find(x => x.id === id);
        if (!def) return;
        const e = document.createElement('div');
        e.className = 'w';
        e.dataset.id = id;
        e.innerHTML = '<b>' + def.titolo + '</b><div class="corpo"></div>';
        e.title = 'clic per togliere';
        e.onclick = () => this.togli(id);
        (i % 2 === 0 ? this.sx : this.dx).appendChild(e);
      });
      const piu = document.createElement('div');
      piu.className = 'piu';
      piu.textContent = '+ AGGIUNGI';
      piu.onclick = () => this.scelta();
      (this.attivi.length % 2 === 0 ? this.sx : this.dx).appendChild(piu);
    },

    async aggiorna() {
      if (!this.root) return;
      for (const e of this.root.querySelectorAll('.w')) {
        const def = CATALOGO.find(x => x.id === e.dataset.id);
        if (!def) continue;
        let r = ['-'];
        try {
          if (def.dati) r = def.dati();
          else if (def.pc && PC) r = righe(PC.subito(def.pc), def.n || 4);
          else if (def.lento && PC) r = righe(await PC.lento(def.lento), def.n || 4);
        } catch (x) { r = ['non disponibile']; }
        const c = e.querySelector('.corpo');
        if (c) c.innerHTML = r.filter(x => x && String(x).trim()).slice(0, def.n || 4)
          .map(x => '<i>' + String(x).replace(/[<>&]/g, '') + '</i>').join('');
      }
    },

    aggiungi(id) {
      if (!CATALOGO.some(x => x.id === id)) return 'Non ho un widget che si chiama "' + id + '".';
      if (this.attivi.indexOf(id) >= 0) return 'Quel widget c\'e gia.';
      if (this.attivi.length >= 10) return 'Dieci widget sono il massimo: toglierne uno prima.';
      this.attivi.push(id);
      this.ricorda(); this.ridisegna(); this.aggiorna();
      return 'Aggiunto il widget ' + id + '.';
    },

    togli(id) {
      this.attivi = this.attivi.filter(x => x !== id);
      this.ricorda(); this.ridisegna();
      return 'Tolto il widget ' + id + '.';
    },

    mostra(si) {
      this.visibili = si;
      if (this.root) this.root.style.display = si ? 'block' : 'none';
      if (si) this.aggiorna();
      return si ? 'Widget mostrati.' : 'Widget nascosti.';
    },

    scelta() {
      const vecchio = document.getElementById('jscelta');
      if (vecchio) { vecchio.remove(); return; }
      const scena = document.getElementById('scena');
      const d = document.createElement('div');
      d.id = 'jscelta';
      d.innerHTML = '<button class="chiudi">CHIUDI</button>' + CATALOGO.map(x =>
        '<div class="v' + (this.attivi.indexOf(x.id) >= 0 ? ' gia' : '') + '" data-id="' + x.id + '">' + x.titolo + '</div>').join('');
      d.querySelector('.chiudi').onclick = () => d.remove();
      d.querySelectorAll('.v').forEach(e => {
        e.onclick = () => {
          if (this.attivi.indexOf(e.dataset.id) >= 0) this.togli(e.dataset.id);
          else this.aggiungi(e.dataset.id);
          d.remove();
        };
      });
      scena.appendChild(d);
    },

    elenco() {
      return 'Widget disponibili: ' + CATALOGO.map(x => x.id).join(', ') +
        '.\nAttivi adesso: ' + (this.attivi.join(', ') || 'nessuno') + '.';
    }
  };

  /* ================================================== I COMANDI */

  function comando(frase) {
    const t = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    let m;
    if (/^(mostra|accendi|rimetti).{0,6}(i )?widget$/.test(t)) return Widget.mostra(true);
    if (/^(nascondi|togli|spegni).{0,6}(i )?widget$/.test(t)) return Widget.mostra(false);
    if (/^(quali|elenca|che).{0,10}widget/.test(t)) return Widget.elenco();
    if (/^(scegli|cambia|gestisci).{0,6}(i )?widget$/.test(t)) { Widget.scelta(); return 'Ecco l\'elenco.'; }
    m = t.match(/^(?:aggiungi|metti)(?: il)? widget\s+(.+)$/);
    if (m) return Widget.aggiungi(m[1].trim());
    m = t.match(/^(?:togli|leva|rimuovi)(?: il)? widget\s+(.+)$/);
    if (m) return Widget.togli(m[1].trim());
    return null;
  }

  const originale = window.istantaneo;
  window.istantaneo = function (frase) {
    try { const r = comando(frase); if (r !== null && r !== undefined) return r; } catch (e) { }
    return originale ? originale(frase) : null;
  };

  window.Widget = Widget;
  window.CATALOGO = CATALOGO;

  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        Widget.monta();
        window.scrivi('sys', 'Widget attivi ai lati della scena. Di\' "scegli i widget" per cambiarli, ' +
          'oppure clicca un pannello per toglierlo.');
      } catch (e) { }
    }, 2200);
  });
})();
