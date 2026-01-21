const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orchestrator', {
  openWindow: () => ipcRenderer.send('open-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  getWindowCount: () => ipcRenderer.invoke('get-window-count'),
  onWindowCount: (callback) => {
    ipcRenderer.on('window-count', (event, count) => callback(count));
  }
});
