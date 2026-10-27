/* ====================================================================
   JARVIS PER WINDOWS - il processo principale

   Questo e il "corpo" del programma: apre la finestra, e soprattutto da'
   a Jarvis le mani per comandare il computer. Sul telefono passava dai
   servizi di accessibilita; qui passa da qui.

   UNA REGOLA DI SICUREZZA, SCELTA APPOSTA:
   l'intelligenza artificiale NON puo eseguire comandi arbitrari. Esiste un
   elenco chiuso di azioni, scritte qui dentro una per una. Se Jarvis chiede
   qualcosa che non e in elenco, non succede niente. Un assistente che puo
   lanciare qualunque comando di sistema e un assistente che, il giorno in cui
   sbaglia o viene ingannato, puo fare danni veri.
   ==================================================================== */

const { app, BrowserWindow, ipcMain, shell, clipboard, Notification, protocol, net, dialog } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFile, exec } = require('child_process');

let finestra = null;

/**
 * I brani che l'utente ha scelto di persona.
 * La pagina non puo chiedere un file qualsiasi del disco: puo riprodurre
 * solo quelli passati da qui, dopo che li hai selezionati tu.
 */
const brani = new Map();
let contatoreBrani = 0;

/* ------------------------------------------- l'indirizzo interno

   Caricare la pagina come semplice file sul disco sembra la cosa piu
   ovvia, ma il browser considera quei file "senza origine" e per
   sicurezza blocca moduli, WebAssembly e fotocamera. Il riconoscimento
   della mano ha bisogno di tutti e tre.

   Percio Jarvis si da un indirizzo proprio, jarvis://app/, servito dal
   programma stesso: non e una rete, non apre porte, non passa dal
   firewall. Da li la pagina ha i permessi di un sito vero, in locale.    */

protocol.registerSchemesAsPrivileged([{
  scheme: 'jarvis',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
}]);

/* --------------------------------------------------------- la finestra */

function creaFinestra() {
  finestra = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#040E16',
    title: 'JARVIS',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  finestra.loadURL('jarvis://app/jarvis.html');

  // microfono e fotocamera: servono per la voce e per gli occhi di Jarvis
  finestra.webContents.session.setPermissionRequestHandler((wc, permesso, ok) => {
    ok(permesso === 'media' || permesso === 'audioCapture' || permesso === 'videoCapture');
  });

  // i collegamenti esterni si aprono nel browser, non dentro Jarvis
  finestra.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// una sola copia alla volta: due Jarvis che si parlano addosso non servono
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (finestra) { if (finestra.isMinimized()) finestra.restore(); finestra.focus(); }
  });
  app.whenReady().then(() => {
    protocol.handle('jarvis', (richiesta) => {
      try {
        const u = new URL(richiesta.url);

        // i brani scelti dall'utente, serviti per identificatore
        if (u.hostname === 'media') {
          const id = decodeURIComponent(u.pathname).replace(/^\//, '');
          const vero = brani.get(id);
          if (!vero) return new Response('no', { status: 404 });
          return net.fetch(pathToFileURL(vero).toString());
        }

        let dentro = decodeURIComponent(u.pathname);
        if (!dentro || dentro === '/') dentro = '/jarvis.html';
        // niente uscite dalla cartella dell'applicazione
        const file = path.normalize(path.join(__dirname, 'app', dentro));
        const radice = path.join(__dirname, 'app');
        if (!file.startsWith(radice)) return new Response('no', { status: 403 });
        return net.fetch(pathToFileURL(file).toString());
      } catch (e) {
        return new Response('errore', { status: 500 });
      }
    });
    creaFinestra();
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) creaFinestra(); });
}

/* ------------------------------------------------------------ utilita */

function powershell(script) {
  return new Promise((risolvi) => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 20000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, out, errOut) => risolvi(err ? ('ERRORE: ' + (errOut || err.message)) : String(out).trim())
    );
  });
}

/** I nomi che diciamo noi, tradotti nei programmi veri di Windows. */
const PROGRAMMI = {
  'blocco note': 'notepad', 'notepad': 'notepad', 'note': 'notepad',
  'calcolatrice': 'calc', 'calcolatore': 'calc', 'calc': 'calc',
  'paint': 'mspaint', 'disegno': 'mspaint',
  'esplora risorse': 'explorer', 'cartelle': 'explorer', 'file': 'explorer',
  'impostazioni': 'ms-settings:', 'pannello di controllo': 'control',
  'prompt': 'cmd', 'terminale': 'wt', 'powershell': 'powershell',
  'chrome': 'chrome', 'google chrome': 'chrome',
  'edge': 'msedge', 'microsoft edge': 'msedge',
  'firefox': 'firefox',
  'word': 'winword', 'excel': 'excel', 'powerpoint': 'powerpnt', 'outlook': 'outlook',
  'spotify': 'spotify', 'telegram': 'telegram', 'discord': 'discord',
  'gestione attivita': 'taskmgr', 'task manager': 'taskmgr',
  'registratore': 'SoundRecorder', 'fotocamera': 'microsoft.windows.camera:',
  'orologio': 'ms-clock:', 'calendario': 'outlookcal:', 'posta': 'outlookmail:',
  'mappe': 'bingmaps:', 'store': 'ms-windows-store:'
};

const SITI = {
  'youtube': 'https://www.youtube.com', 'google': 'https://www.google.com',
  'gmail': 'https://mail.google.com', 'maps': 'https://maps.google.com',
  'whatsapp': 'https://web.whatsapp.com', 'facebook': 'https://www.facebook.com',
  'instagram': 'https://www.instagram.com', 'amazon': 'https://www.amazon.it',
  'wikipedia': 'https://it.wikipedia.org', 'netflix': 'https://www.netflix.com',
  'spotify web': 'https://open.spotify.com', 'drive': 'https://drive.google.com',
  'chatgpt': 'https://chat.openai.com', 'github': 'https://github.com'
};

function cartella(nome) {
  const n = (nome || '').toLowerCase();
  const casa = os.homedir();
  if (/desktop|scrivania/.test(n)) return path.join(casa, 'Desktop');
  if (/document/.test(n)) return path.join(casa, 'Documents');
  if (/download|scarica/.test(n)) return path.join(casa, 'Downloads');
  if (/immagini|foto|picture/.test(n)) return path.join(casa, 'Pictures');
  if (/music|musica/.test(n)) return path.join(casa, 'Music');
  if (/video|filmat/.test(n)) return path.join(casa, 'Videos');
  if (/casa|home|utente/.test(n)) return casa;
  return null;
}


/* ------------------------------------------- confini di sicurezza */

/**
 * Jarvis puo scrivere, spostare e cancellare SOLO dentro le cartelle personali.
 * Fuori da qui (Windows, Programmi, altri utenti) non tocca niente, nemmeno se
 * glielo si chiede. Un assistente che puo scrivere ovunque e un assistente che,
 * il giorno in cui sbaglia, rompe il sistema operativo.
 */
function dentroCasa(percorso) {
  try {
    const casa = path.resolve(os.homedir());
    const p = path.resolve(percorso);
    return p === casa || p.startsWith(casa + path.sep);
  } catch (e) { return false; }
}

/** Trasforma un percorso detto a voce in uno vero dentro le cartelle personali. */
function percorsoUtente(testo) {
  const t = String(testo || '').trim().replace(/^["']|["']$/g, '');
  if (!t) return null;
  if (path.isAbsolute(t)) return dentroCasa(t) ? t : null;
  // "documenti/nota.txt" oppure "desktop\roba"
  const pezzi = t.replace(/\\/g, '/').split('/');
  const base = cartella(pezzi[0]);
  const completo = base ? path.join(base, ...pezzi.slice(1)) : path.join(os.homedir(), ...pezzi);
  return dentroCasa(completo) ? completo : null;
}

/** I caratteri che SendKeys interpreta come comandi vanno protetti. */
function proteggiTasti(testo) {
  return String(testo || '').replace(/([+^%~(){}\[\]])/g, '{$1}');
}

/** "ctrl+c", "alt+tab", "invio" -> la scrittura che vuole SendKeys. */
function comboTasti(testo) {
  const nomi = {
    invio: '{ENTER}', enter: '{ENTER}', esc: '{ESC}', escape: '{ESC}', tab: '{TAB}',
    spazio: ' ', su: '{UP}', giu: '{DOWN}', sinistra: '{LEFT}', destra: '{RIGHT}',
    canc: '{DELETE}', cancella: '{DELETE}', backspace: '{BACKSPACE}', indietro: '{BACKSPACE}',
    home: '{HOME}', fine: '{END}', pagsu: '{PGUP}', paggiu: '{PGDN}',
    f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}', f5: '{F5}', f6: '{F6}',
    f7: '{F7}', f8: '{F8}', f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}'
  };
  const pezzi = String(testo || '').toLowerCase().split(/[+\s]+/).filter(Boolean);
  let prefisso = '';
  let tasto = '';
  for (const p of pezzi) {
    if (p === 'ctrl' || p === 'control') prefisso += '^';
    else if (p === 'alt') prefisso += '%';
    else if (p === 'shift' || p === 'maiusc') prefisso += '+';
    else if (p === 'win' || p === 'windows') prefisso += '^{ESC}';   // non esiste in SendKeys: si usa Ctrl+Esc
    else tasto = nomi[p] || (p.length === 1 ? p : '');
  }
  if (prefisso === '^{ESC}' && !tasto) return '^{ESC}';
  return tasto ? prefisso + tasto : '';
}

/* ----------------------------------------- azioni immediate (sincrone) */

ipcMain.on('pc-subito', (evento, azione, arg) => {
  let risposta = null;
  try {
    switch (azione) {

      case 'apri': {
        const n = String(arg || '').toLowerCase().trim();
        if (/^https?:\/\//.test(n)) { shell.openExternal(n); risposta = 'Apro il collegamento.'; break; }
        const sito = Object.keys(SITI).find(k => n === k || n.includes(k));
        const prog = Object.keys(PROGRAMMI).find(k => n === k || n.includes(k));
        // un programma vero ha la precedenza sul sito con lo stesso nome
        if (prog) {
          const cmd = PROGRAMMI[prog];
          if (cmd.includes(':')) shell.openExternal(cmd);
          else exec('start "" "' + cmd + '"', { shell: 'cmd.exe', windowsHide: true });
          risposta = 'Apro ' + prog + '.';
        } else if (sito) {
          shell.openExternal(SITI[sito]);
          risposta = 'Apro ' + sito + '.';
        } else {
          const dir = cartella(n);
          if (dir) { shell.openPath(dir); risposta = 'Apro la cartella ' + n + '.'; }
          else {
            // ultimo tentativo: lo passiamo a Windows cosi com'e
            exec('start "" "' + n.replace(/"/g, '') + '"', { shell: 'cmd.exe', windowsHide: true });
            risposta = 'Provo ad aprire ' + n + '.';
          }
        }
        break;
      }

      case 'cerca-web':
        shell.openExternal('https://www.google.com/search?q=' + encodeURIComponent(String(arg || '')));
        risposta = 'Cerco "' + arg + '" sul web.';
        break;

      case 'blocca':
        exec('rundll32.exe user32.dll,LockWorkStation', { windowsHide: true });
        risposta = 'Blocco il computer.';
        break;

      case 'volume-su':
        powershell('(New-Object -ComObject WScript.Shell).SendKeys([char]175);'.repeat(1) +
          '1..4 | ForEach-Object { (New-Object -ComObject WScript.Shell).SendKeys([char]175) }');
        risposta = 'Alzo il volume.';
        break;

      case 'volume-giu':
        powershell('1..5 | ForEach-Object { (New-Object -ComObject WScript.Shell).SendKeys([char]174) }');
        risposta = 'Abbasso il volume.';
        break;

      case 'muto':
        powershell('(New-Object -ComObject WScript.Shell).SendKeys([char]173)');
        risposta = 'Tolgo l\'audio.';
        break;

      case 'appunti-leggi': {
        const t = clipboard.readText();
        risposta = t ? ('Negli appunti c\'e: ' + t.slice(0, 500)) : 'Gli appunti sono vuoti.';
        break;
      }

      case 'appunti-scrivi':
        clipboard.writeText(String(arg || ''));
        risposta = 'Copiato negli appunti.';
        break;

      case 'sistema': {
        const gb = n => (n / 1073741824).toFixed(1);
        const su = os.uptime();
        risposta = 'Computer: ' + os.hostname() +
          '\nWindows ' + os.release() +
          '\nProcessore: ' + (os.cpus()[0] ? os.cpus()[0].model : '?') + ' (' + os.cpus().length + ' nuclei)' +
          '\nMemoria: ' + gb(os.totalmem() - os.freemem()) + ' di ' + gb(os.totalmem()) + ' GB in uso' +
          '\nAcceso da ' + Math.floor(su / 3600) + ' ore e ' + Math.floor((su % 3600) / 60) + ' minuti';
        break;
      }

      case 'annulla-spegnimento':
        exec('shutdown /a', { windowsHide: true });
        risposta = 'Spegnimento annullato.';
        break;

      case 'avvio-automatico': {
        const acceso = String(arg) === 'si';
        app.setLoginItemSettings({ openAtLogin: acceso });
        risposta = acceso ? 'Mi avviero con Windows.' : 'Non mi avviero piu da solo.';
        break;
      }

      case 'notifica':
        if (Notification.isSupported()) {
          new Notification({ title: 'JARVIS', body: String(arg || '') }).show();
        }
        risposta = 'Notifica mostrata.';
        break;

      case 'in-primo-piano':
        if (finestra) {
          if (finestra.isMinimized()) finestra.restore();
          finestra.show();
          finestra.focus();
          // lampeggia nella barra e sta davanti per qualche secondo, poi torna normale:
          // una chiamata deve farsi notare, ma non restare inchiodata sopra tutto
          finestra.flashFrame(true);
          finestra.setAlwaysOnTop(true);
          setTimeout(() => { try { finestra.setAlwaysOnTop(false); finestra.flashFrame(false); } catch (e) {} }, 8000);
        }
        risposta = 'Eccomi.';
        break;

      case 'minimizza':
        if (finestra) finestra.minimize();
        risposta = 'Mi faccio da parte.';
        break;

      case 'chiudi-jarvis':
        risposta = 'A presto, signore.';
        setTimeout(() => app.quit(), 1500);
        break;
    }
  } catch (e) {
    risposta = 'Non ci sono riuscito: ' + e.message;
  }
  evento.returnValue = risposta;
});

/* ------------------------------------------- azioni lente (asincrone) */

ipcMain.handle('pc-lento', async (evento, azione, arg) => {
  try {
    switch (azione) {

      case 'schermata': {
        const dove = path.join(os.homedir(), 'Pictures',
          'jarvis-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.png');
        const out = await powershell(
          'Add-Type -AssemblyName System.Windows.Forms,System.Drawing; ' +
          '$b = [System.Windows.Forms.SystemInformation]::VirtualScreen; ' +
          '$i = New-Object System.Drawing.Bitmap $b.Width, $b.Height; ' +
          '$g = [System.Drawing.Graphics]::FromImage($i); ' +
          '$g.CopyFromScreen($b.Left, $b.Top, 0, 0, $i.Size); ' +
          '$i.Save("' + dove.replace(/\\/g, '\\\\') + '"); $g.Dispose(); $i.Dispose();'
        );
        if (out.startsWith('ERRORE')) return 'Non sono riuscito a fare la schermata.';
        return 'Schermata salvata in Immagini: ' + path.basename(dove);
      }

      case 'batteria': {
        const out = await powershell(
          '$b = Get-CimInstance Win32_Battery; ' +
          'if ($b) { "$($b.EstimatedChargeRemaining)|$($b.BatteryStatus)" } else { "nessuna" }'
        );
        if (out.includes('nessuna')) return 'Questo computer non ha batteria: e sempre alimentato.';
        const [liv, stato] = out.split('|');
        return 'Batteria al ' + liv + ' per cento, ' +
          (String(stato).trim() === '2' ? 'collegata alla corrente.' : 'a batteria.');
      }

      case 'dischi': {
        const out = await powershell(
          'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ' +
          'ForEach-Object { "{0} {1:N0} GB liberi su {2:N0} GB" -f $_.DeviceID, ($_.FreeSpace/1GB), ($_.Size/1GB) }'
        );
        return out && !out.startsWith('ERRORE') ? out : 'Non riesco a leggere i dischi.';
      }

      case 'processi': {
        const out = await powershell(
          'Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 8 | ' +
          'ForEach-Object { "{0} - {1:N0} MB" -f $_.ProcessName, ($_.WorkingSet/1MB) }'
        );
        return out && !out.startsWith('ERRORE') ? ('I programmi che consumano di piu:\n' + out) : 'Non riesco a leggere i programmi.';
      }

      case 'chiudi-programma': {
        const n = String(arg || '').toLowerCase().trim();
        const prog = Object.keys(PROGRAMMI).find(k => n.includes(k));
        const eseguibile = prog ? PROGRAMMI[prog] : n.replace(/[^a-z0-9_.-]/g, '');
        if (!eseguibile) return 'Non ho capito quale programma chiudere.';
        const out = await powershell('Stop-Process -Name "' + eseguibile.replace(/\.exe$/, '') + '" -Force -ErrorAction SilentlyContinue; "fatto"');
        return out.includes('fatto') ? ('Ho chiuso ' + (prog || eseguibile) + '.') : 'Non sono riuscito a chiuderlo.';
      }

      case 'spegni': {
        exec('shutdown /s /t 60', { windowsHide: true });
        return 'Spengo il computer fra un minuto. Dimmi "annulla spegnimento" se cambi idea.';
      }

      case 'riavvia': {
        exec('shutdown /r /t 60', { windowsHide: true });
        return 'Riavvio il computer fra un minuto. Dimmi "annulla spegnimento" se cambi idea.';
      }

      case 'cerca-file': {
        const cosa = String(arg || '').replace(/["`$]/g, '').trim();
        if (cosa.length < 2) return 'Dimmi almeno due lettere da cercare.';
        const basi = ['Desktop', 'Documents', 'Downloads', 'Pictures'];
        const out = await powershell(
          basi.map(b => '"' + path.join(os.homedir(), b).replace(/\\/g, '\\\\') + '"').join(',') +
          ' | Where-Object { Test-Path $_ } | ' +
          'ForEach-Object { Get-ChildItem -Path $_ -Recurse -Filter "*' + cosa + '*" -ErrorAction SilentlyContinue -File } | ' +
          'Select-Object -First 10 | ForEach-Object { $_.FullName }'
        );
        if (!out || out.startsWith('ERRORE')) return 'Non ho trovato niente con "' + cosa + '".';
        return 'Ho trovato:\n' + out;
      }

      case 'leggi-file': {
        const p = String(arg || '');
        if (!fs.existsSync(p)) return 'Il file non esiste.';
        const st = fs.statSync(p);
        if (st.size > 400000) return 'Il file e troppo grande da leggere tutto.';
        return fs.readFileSync(p, 'utf8').slice(0, 20000);
      }

      case 'musica-scegli': {
        const r = await dialog.showOpenDialog(finestra, {
          title: 'Scegli la musica di sottofondo',
          filters: [{ name: 'Musica', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac', 'opus', 'wma'] }],
          properties: ['openFile', 'multiSelections']
        });
        if (r.canceled || !r.filePaths.length) return JSON.stringify([]);
        const fuori = [];
        for (const f of r.filePaths) {
          const id = 'b' + (++contatoreBrani);
          brani.set(id, f);
          fuori.push({ id: id, nome: path.basename(f, path.extname(f)), url: 'jarvis://media/' + id });
        }
        return JSON.stringify(fuori);
      }

      case 'foto-scegli': {
        const r = await dialog.showOpenDialog(finestra, {
          title: 'Scegli la foto per il volto olografico',
          filters: [{ name: 'Immagini', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }],
          properties: ['openFile']
        });
        if (r.canceled || !r.filePaths.length) return '';
        const id = 'f' + (++contatoreBrani);
        brani.set(id, r.filePaths[0]);
        return 'jarvis://media/' + id;
      }

      case 'musica-cartella': {
        const r = await dialog.showOpenDialog(finestra, {
          title: 'Scegli una cartella di musica',
          properties: ['openDirectory']
        });
        if (r.canceled || !r.filePaths.length) return JSON.stringify([]);
        const dir = r.filePaths[0];
        const ok = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus', '.wma'];
        const fuori = [];
        try {
          for (const nome of fs.readdirSync(dir)) {
            if (ok.indexOf(path.extname(nome).toLowerCase()) < 0) continue;
            const f = path.join(dir, nome);
            const id = 'b' + (++contatoreBrani);
            brani.set(id, f);
            fuori.push({ id: id, nome: path.basename(nome, path.extname(nome)), url: 'jarvis://media/' + id });
            if (fuori.length >= 300) break;
          }
        } catch (e) { }
        return JSON.stringify(fuori);
      }

      case 'rete': {
        const out = await powershell(
          'Get-NetConnectionProfile | ForEach-Object { "$($_.Name) - $($_.NetworkCategory)" }'
        );
        return out && !out.startsWith('ERRORE') ? ('Rete: ' + out) : 'Non riesco a leggere la rete.';
      }
      /* ------------------------------------------------ tastiera */

      case 'digita': {
        const t = String(arg || '');
        if (!t) return 'Non mi hai detto cosa scrivere.';
        await powershell('Add-Type -AssemblyName System.Windows.Forms; ' +
          '[System.Windows.Forms.SendKeys]::SendWait("' + proteggiTasti(t).replace(/"/g, '""') + '")');
        return 'Scritto: ' + t.slice(0, 60);
      }

      case 'tasto': {
        const c = comboTasti(arg);
        if (!c) return 'Non ho capito quale tasto premere.';
        await powershell('Add-Type -AssemblyName System.Windows.Forms; ' +
          '[System.Windows.Forms.SendKeys]::SendWait("' + c.replace(/"/g, '""') + '")');
        return 'Premuto ' + arg + '.';
      }

      /* --------------------------------------------------- mouse */

      case 'mouse-muovi': {
        const m = /(-?\d+)\s*[,; ]\s*(-?\d+)/.exec(String(arg || ''));
        if (!m) return 'Mi servono due numeri: posizione orizzontale e verticale.';
        await powershell('Add-Type -AssemblyName System.Windows.Forms; ' +
          '[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(' + m[1] + ',' + m[2] + ')');
        return 'Puntatore spostato.';
      }

      case 'mouse-clic': {
        const q = String(arg || 'sinistro').toLowerCase();
        const destro = q.indexOf('destr') >= 0;
        const doppio = q.indexOf('doppi') >= 0;
        const giu = destro ? '0x0008' : '0x0002';
        const su = destro ? '0x0010' : '0x0004';
        const uno = '[M]::mouse_event(' + giu + ',0,0,0,0); Start-Sleep -m 40; [M]::mouse_event(' + su + ',0,0,0,0);';
        await powershell(
          'Add-Type -Name M -Namespace W -MemberDefinition \'[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int e);\'; ' +
          '$t = [W.M]; ' + (doppio ? (uno + ' Start-Sleep -m 90; ' + uno) : uno).replace(/\[M\]/g, '$t')
        );
        return (doppio ? 'Doppio clic' : (destro ? 'Clic destro' : 'Clic')) + ' fatto.';
      }

      case 'mouse-scorri': {
        const n = parseInt(String(arg || '3'), 10) || 3;
        await powershell(
          'Add-Type -Name M -Namespace W -MemberDefinition \'[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, int d, int e);\'; ' +
          '[W.M]::mouse_event(0x0800,0,0,' + (n * -120) + ',0)'
        );
        return n > 0 ? 'Scorro in basso.' : 'Scorro in alto.';
      }

      case 'schermo': {
        const out = await powershell('Add-Type -AssemblyName System.Windows.Forms; ' +
          '$s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "$($s.Width)x$($s.Height)"');
        return 'Lo schermo e ' + out + ' punti.';
      }

      /* ------------------------------------------------- finestre */

      case 'finestre': {
        const out = await powershell(
          'Get-Process | Where-Object { $_.MainWindowTitle } | ' +
          'Select-Object -First 15 | ForEach-Object { $_.MainWindowTitle }'
        );
        return out && !out.startsWith('ERRORE') ? ('Finestre aperte:\n' + out) : 'Non vedo finestre aperte.';
      }

      case 'finestra-davanti': {
        const titolo = String(arg || '').replace(/["`$]/g, '').trim();
        if (!titolo) return 'Quale finestra?';
        const out = await powershell(
          'Add-Type -Name W -Namespace U -MemberDefinition \'[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);\'; ' +
          '$p = Get-Process | Where-Object { $_.MainWindowTitle -like "*' + titolo + '*" } | Select-Object -First 1; ' +
          'if ($p) { [U.W]::ShowWindow($p.MainWindowHandle, 9) | Out-Null; [U.W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; $p.MainWindowTitle } else { "nessuna" }'
        );
        return out.indexOf('nessuna') >= 0 ? ('Non trovo una finestra con "' + titolo + '".') : ('Ho portato davanti: ' + out);
      }

      /* ---------------------------------------------------- file */

      case 'elenca-cartella': {
        const dir = percorsoUtente(arg || 'documenti');
        if (!dir) return 'Posso guardare solo dentro le tue cartelle personali.';
        if (!fs.existsSync(dir)) return 'Quella cartella non esiste.';
        const voci = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 30);
        if (!voci.length) return 'La cartella e vuota.';
        return 'In ' + path.basename(dir) + ':\n' +
          voci.map(v => (v.isDirectory() ? '[cartella] ' : '') + v.name).join('\n');
      }

      case 'scrivi-file': {
        let dati = arg;
        if (typeof dati === 'string') { try { dati = JSON.parse(dati); } catch (e) { dati = null; } }
        if (!dati || !dati.percorso) return 'Mi servono il percorso e il contenuto.';
        const dove = percorsoUtente(dati.percorso);
        if (!dove) return 'Posso scrivere solo dentro le tue cartelle personali (Documenti, Desktop, Download...).';
        fs.mkdirSync(path.dirname(dove), { recursive: true });
        fs.writeFileSync(dove, String(dati.contenuto || ''), 'utf8');
        return 'Scritto il file ' + path.basename(dove) + ' in ' + path.basename(path.dirname(dove)) + '.';
      }

      case 'crea-cartella': {
        const dove = percorsoUtente(arg);
        if (!dove) return 'Posso creare cartelle solo dentro le tue cartelle personali.';
        fs.mkdirSync(dove, { recursive: true });
        return 'Cartella creata: ' + path.basename(dove);
      }

      case 'rinomina': {
        let dati = arg;
        if (typeof dati === 'string') { try { dati = JSON.parse(dati); } catch (e) { dati = null; } }
        if (!dati || !dati.da || !dati.a) return 'Mi servono il nome vecchio e quello nuovo.';
        const da = percorsoUtente(dati.da);
        const a = percorsoUtente(dati.a);
        if (!da || !a) return 'Posso lavorare solo dentro le tue cartelle personali.';
        if (!fs.existsSync(da)) return 'Non trovo quel file.';
        fs.renameSync(da, a);
        return 'Rinominato in ' + path.basename(a) + '.';
      }

      case 'copia-file': {
        let dati = arg;
        if (typeof dati === 'string') { try { dati = JSON.parse(dati); } catch (e) { dati = null; } }
        if (!dati || !dati.da || !dati.a) return 'Mi servono il file di partenza e la destinazione.';
        const da = percorsoUtente(dati.da);
        const a = percorsoUtente(dati.a);
        if (!da || !a) return 'Posso lavorare solo dentro le tue cartelle personali.';
        if (!fs.existsSync(da)) return 'Non trovo quel file.';
        fs.mkdirSync(path.dirname(a), { recursive: true });
        fs.copyFileSync(da, a);
        return 'Copiato in ' + path.basename(a) + '.';
      }

      case 'cestina': {
        const p2 = percorsoUtente(arg);
        if (!p2) return 'Posso cestinare solo dentro le tue cartelle personali.';
        if (!fs.existsSync(p2)) return 'Non trovo quel file.';
        // nel cestino, non cancellato per sempre: un ripensamento deve restare possibile
        const out = await powershell(
          'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
          '[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile("' + p2.replace(/\\/g, '\\\\') + '", ' +
          '"OnlyErrorDialogs", "SendToRecycleBin"); "fatto"'
        );
        return out.indexOf('fatto') >= 0
          ? ('Ho spostato ' + path.basename(p2) + ' nel cestino. Da li puoi ancora recuperarlo.')
          : 'Non sono riuscito a cestinarlo.';
      }

    }
  } catch (e) {
    return 'Non ci sono riuscito: ' + e.message;
  }
  return null;
});
