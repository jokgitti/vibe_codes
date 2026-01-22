const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');

// Available projects (relative to orchestrator folder)
const PROJECTS = [
  'circling_cycle',
  'lucid_dream',
  'pitchy_soundwave',
  'rotating_gliph',
  'tlkn_2_mslf'
];

// Window configuration
const WINDOW_SIZE = 400;
const MAX_WINDOWS = 16;  // System limit for simultaneous audio streams
const MAX_PER_PROJECT = 7;

// Track open project windows: { window, project }
const openWindows = [];

// Track count per project
const projectCounts = {};
PROJECTS.forEach(p => projectCounts[p] = 0);

// Main control panel window
let controlWindow = null;

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  controlWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  controlWindow.on('closed', () => {
    controlWindow = null;
    // Close all project windows when control panel closes
    openWindows.forEach(entry => {
      if (entry.window && !entry.window.isDestroyed()) {
        entry.window.close();
      }
    });
  });
}

function getRandomProject() {
  // Filter projects that haven't reached max
  const available = PROJECTS.filter(p => projectCounts[p] < MAX_PER_PROJECT);

  if (available.length === 0) {
    console.log('All projects at max capacity');
    return null;
  }

  return available[Math.floor(Math.random() * available.length)];
}

function getRandomPosition() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const x = Math.floor(Math.random() * (width - WINDOW_SIZE));
  const y = Math.floor(Math.random() * (height - WINDOW_SIZE));
  return { x, y };
}

function openProjectWindow() {
  if (openWindows.length >= MAX_WINDOWS) {
    console.log('Max windows reached');
    return false;
  }

  const project = getRandomProject();
  if (!project) {
    return false; // All projects at max
  }

  const { x, y } = getRandomPosition();

  const win = new BrowserWindow({
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    x,
    y,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const projectPath = path.join(__dirname, '..', project, 'index.html');
  win.loadFile(projectPath);

  // Track window with its project
  openWindows.push({ window: win, project });
  projectCounts[project]++;

  // Handle window closed by user
  win.on('closed', () => {
    const index = openWindows.findIndex(w => w.window === win);
    if (index > -1) {
      const closedProject = openWindows[index].project;
      projectCounts[closedProject]--;
      openWindows.splice(index, 1);
    }
    // Notify control panel of updated count
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('window-count', openWindows.length);
    }
  });

  // Notify control panel of updated count
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('window-count', openWindows.length);
  }

  console.log(`Opened ${project} [${projectCounts[project]}/${MAX_PER_PROJECT}] (${openWindows.length}/${MAX_WINDOWS})`);
  return true;
}

function closeOldestWindow() {
  if (openWindows.length < 5) {
    console.log(`Close blocked: only ${openWindows.length} windows (need 5+)`);
    return false;
  }

  const oldest = openWindows[0]; // Oldest window (FIFO)
  if (oldest && oldest.window && !oldest.window.isDestroyed()) {
    console.log(`Closing ${oldest.project} [${projectCounts[oldest.project]}/${MAX_PER_PROJECT}] (${openWindows.length}/${MAX_WINDOWS})`);
    oldest.window.close();
  }

  return true;
}

// IPC handlers
ipcMain.on('open-window', () => {
  openProjectWindow();
});

ipcMain.on('close-window', () => {
  closeOldestWindow();
});

ipcMain.handle('get-window-count', () => {
  return openWindows.length;
});

// App lifecycle
app.whenReady().then(() => {
  // Auto-grant microphone permissions to all windows
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(true); // Grant other permissions too for simplicity
    }
  });

  createControlWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
