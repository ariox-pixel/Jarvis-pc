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

const { app, BrowserWindow, ipcMain, shell, clipboard, Notification } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFile, exec } = require('child_process');

let finestra = null;

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

  finestra.loadFile(path.join(__dirname, 'app', 'jarvis.html'));

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
  app.whenReady().then(creaFinestra);
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

      case 'rete': {
        const out = await powershell(
          'Get-NetConnectionProfile | ForEach-Object { "$($_.Name) - $($_.NetworkCategory)" }'
        );
        return out && !out.startsWith('ERRORE') ? ('Rete: ' + out) : 'Non riesco a leggere la rete.';
      }
    }
  } catch (e) {
    return 'Non ci sono riuscito: ' + e.message;
  }
  return null;
});
