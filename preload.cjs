const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveLocalBackup: (data) => ipcRenderer.send('save-local-backup', data),
  onBackupStatus: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('backup-status', subscription);
    return () => {
      ipcRenderer.removeListener('backup-status', subscription);
    };
  }
});
