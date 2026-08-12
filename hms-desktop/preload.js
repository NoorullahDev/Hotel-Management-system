const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  savePdf: async (buffer, defaultFilename) => {
    return await ipcRenderer.invoke('save-pdf', buffer, defaultFilename);
  },
  printPdf: async (buffer) => {
    return await ipcRenderer.invoke('print-pdf', buffer);
  },
  printHtml: async (htmlContent) => {
    return await ipcRenderer.invoke('print-html', htmlContent);
  }
});
