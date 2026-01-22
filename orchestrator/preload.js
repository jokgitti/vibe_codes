// Preload script - minimal for v2 (virtual windows managed in renderer)
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Future IPC can be added here if needed
});
