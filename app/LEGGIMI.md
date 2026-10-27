# JARVIS per Windows

La versione per computer di JARVIS by Ariosto Prudenziano.

## Come si ottiene il programma

1. Carica questi file su un repository GitHub (struttura delle cartelle inclusa).
2. Vai su **Actions** e aspetta che "Build EXE Windows" diventi verde.
3. Scarica l'artefatto **Jarvis-Windows**: dentro ci sono due file.

- `JARVIS-portatile.exe` - si avvia e basta, non installa niente.
- `JARVIS-installazione.exe` - installa il programma con icona sul desktop.

Al primo avvio Windows mostra "Protezione PC": e normale per un programma
senza firma digitale. Clicca **Ulteriori informazioni** e poi **Esegui comunque**.

## Prima cosa da fare

Apri le Impostazioni dentro Jarvis e incolla la chiave di Groq, la stessa
del telefono. Si crea gratis su console.groq.com.

## Comandi del computer

Oltre a tutto quello che fa la versione web, qui Jarvis comanda il PC:

- "apri blocco note", "apri chrome", "apri la cartella documenti"
- "alza il volume", "abbassa il volume", "muto"
- "fai una schermata"
- "blocca il computer"
- "spegni il computer" (parte dopo un minuto, si annulla con "annulla spegnimento")
- "cerca il file bilancio"
- "che computer e", "batteria", "quanto spazio", "cosa consuma"
- "copia negli appunti ...", "leggi gli appunti"
- "chiudi chrome"
- "avviati con windows"

Jarvis non puo eseguire comandi di sistema arbitrari: esiste un elenco chiuso
di azioni, scritte una per una in `main.js`. E' voluto.
