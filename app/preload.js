/* ====================================================================
   IL PONTE fra la pagina di Jarvis e il computer.

   La pagina NON ha accesso diretto a Windows: puo solo chiedere una delle
   azioni previste, attraverso questo sportello. E' la differenza fra un
   assistente che puo fare certe cose e uno che puo fare qualsiasi cosa.
   ==================================================================== */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisPC', {
  /** Azioni istantanee: rispondono subito, senza far aspettare. */
  subito: (azione, arg) => ipcRenderer.sendSync('pc-subito', azione, arg),

  /** Azioni che richiedono qualche secondo: rispondono con una promessa. */
  lento: (azione, arg) => ipcRenderer.invoke('pc-lento', azione, arg),

  /** Serve alla pagina per sapere che sta girando dentro il programma Windows. */
  windows: true,
  versione: process.versions.electron
});
