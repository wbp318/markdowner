const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let pendingFile = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 500,
    minHeight: 400,
    title: 'Markdowner',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // External links open in the default browser instead of inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }
  });

  win.webContents.on('did-finish-load', () => {
    if (pendingFile) { sendFile(pendingFile); pendingFile = null; }
  });

  buildMenu();
}

function sendFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    win.webContents.send('file-opened', { path: filePath, content });
    win.setTitle(`${path.basename(filePath)} - Markdowner`);
    app.addRecentDocument(filePath);
    watchFile(filePath);
  } catch (err) {
    dialog.showErrorBox('Could not open file', err.message);
  }
}

let watcher = null;
function watchFile(filePath) {
  if (watcher) { watcher.close(); watcher = null; }
  try {
    watcher = fs.watch(filePath, { persistent: false }, () => {
      // Debounce: editors often write in multiple steps.
      clearTimeout(watchFile._t);
      watchFile._t = setTimeout(() => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          win.webContents.send('file-opened', { path: filePath, content, reload: true });
        }
      }, 150);
    });
  } catch (_) { /* ignore watch failures */ }
}

async function openDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Open Markdown file',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (!canceled && filePaths[0]) sendFile(filePaths[0]);
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: openDialog },
        { label: 'Open Recent', role: 'recentDocuments', submenu: [{ label: 'Clear Recent', role: 'clearRecentDocuments' }] },
        { type: 'separator' },
        { label: 'Export as HTML...', accelerator: 'CmdOrCtrl+E', click: () => win.webContents.send('request-export') },
        { label: 'Print / Save as PDF...', accelerator: 'CmdOrCtrl+P', click: () => win.webContents.print() },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Dark Mode', accelerator: 'CmdOrCtrl+D', click: () => win.webContents.send('toggle-theme') },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'GitHub Repository', click: () => shell.openExternal('https://github.com/wbp318/markdowner') },
        { label: 'About', click: () => dialog.showMessageBox(win, {
            type: 'info', title: 'About Markdowner',
            message: `Markdowner ${app.getVersion()}`,
            detail: 'A simple desktop Markdown viewer that renders files just like GitHub.\n\nDrag a .md file onto the window or press Ctrl+O.'
          }) }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('open-dialog', openDialog);
ipcMain.handle('open-path', (_e, p) => { if (p) sendFile(p); });
ipcMain.handle('open-external', (_e, url) => { if (/^https?:/i.test(url)) shell.openExternal(url); });
ipcMain.handle('save-html', async (_e, { suggestedName, html }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export HTML',
    defaultPath: suggestedName,
    filters: [{ name: 'HTML', extensions: ['html'] }]
  });
  if (!canceled && filePath) fs.writeFileSync(filePath, html, 'utf8');
});

// Single-instance: a second launch (e.g. double-clicking another .md) reuses the window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = fileFromArgv(argv);
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); if (f) sendFile(f); }
  });

  app.whenReady().then(() => {
    createWindow();
    pendingFile = fileFromArgv(process.argv);
  });
}

function fileFromArgv(argv) {
  return argv.slice(1).find(a => !a.startsWith('-') && /\.(md|markdown|mdown|mkd|txt)$/i.test(a) && fs.existsSync(a)) || null;
}

app.on('window-all-closed', () => app.quit());
