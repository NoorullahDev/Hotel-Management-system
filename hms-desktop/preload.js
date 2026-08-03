const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  savePdf: async (buffer, defaultFilename) => {
    return await ipcRenderer.invoke('save-pdf', buffer, defaultFilename);
  }
});
