const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "InfoCam Controle de Caixa",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Use app.isPackaged to differentiate dev mode from packaged production app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Handle links opening in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Listener to perform local backup writing
ipcMain.on('save-local-backup', (event, data) => {
  try {
    // Save to user's local Documents folder
    const backupDir = path.join(app.getPath('documents'), 'Backup_InfoCam');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().substring(0, 10) + '_' + new Date().toTimeString().substring(0, 8).replace(/:/g, '-');
    const fileName = `Backup_ControleCaixa_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    event.reply('backup-status', { 
      success: true, 
      path: filePath, 
      fileName: fileName,
      dir: backupDir
    });
  } catch (err) {
    console.error('Error writing local backup:', err);
    event.reply('backup-status', { success: false, error: err.message });
  }
});
