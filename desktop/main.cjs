/* oxlint-disable typescript/no-require-imports */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { createArchiveServer } = require('./server.cjs');

const APPROVED_EXTERNAL_HOSTS = new Set(['hayday.fandom.com','www.fandom.com','github.com','raw.githubusercontent.com','youtube.com','www.youtube.com','youtu.be','vimeo.com','www.vimeo.com']);
let mainWindow;
let archiveServer;

function isApprovedExternal(value) { try { const url = new URL(value); return url.protocol === 'https:' && (APPROVED_EXTERNAL_HOSTS.has(url.hostname) || url.hostname.endsWith('.fandom.com')); } catch { return false; } }
function isArchiveUrl(value) { if (!archiveServer) return false; try { const url = new URL(value); return url.protocol === 'http:' && url.hostname === '127.0.0.1' && Number(url.port) === archiveServer.port && url.pathname.startsWith('/hay-day-wiki-archive/'); } catch { return false; } }
function routeExternalNavigation(event, url) { if (isArchiveUrl(url)) return; event.preventDefault(); if (isApprovedExternal(url)) void shell.openExternal(url); }

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 720, minHeight: 520, show: false, frame: false, backgroundColor: '#fffdf5', title: 'Hay Day Wiki Archive', icon: path.join(__dirname, 'icon.ico'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, devTools: false, partition: 'archive-reader' } });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('will-navigate', (event, url) => routeExternalNavigation(event, url));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (isApprovedExternal(url)) void shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

ipcMain.on('window-control', (_event, action) => { if (!mainWindow) return; if (action === 'minimize') mainWindow.minimize(); if (action === 'toggle-maximize') { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } if (action === 'close') mainWindow.close(); });
ipcMain.handle('open-external', async (_event, url) => { if (!isApprovedExternal(url)) return { ok: false, reason: 'Only approved HTTPS source hosts can open externally.' }; await shell.openExternal(url); return { ok: true }; });

void app.whenReady().then(async () => { archiveServer = await createArchiveServer({ root: path.join(process.resourcesPath, 'pages') }); const window = createWindow(); await window.loadURL(archiveServer.url); });
app.on('window-all-closed', async () => { if (archiveServer) await archiveServer.close().catch(() => {}); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async (event) => { if (!archiveServer) return; event.preventDefault(); const server = archiveServer; archiveServer = null; await server.close().catch(() => {}); app.quit(); });

module.exports = { isApprovedExternal };
