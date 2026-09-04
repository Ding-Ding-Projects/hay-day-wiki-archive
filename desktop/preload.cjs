/* oxlint-disable typescript/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopShell', Object.freeze({
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  toggleMaximize: () => ipcRenderer.send('window-control', 'toggle-maximize'),
  close: () => ipcRenderer.send('window-control', 'close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChanged: (callback) => { const listener = (_event, value) => callback(Boolean(value)); ipcRenderer.on('window-maximized-changed', listener); return () => ipcRenderer.removeListener('window-maximized-changed', listener); },
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
}));

function installTitleBar() {
  if (!document.body || document.getElementById('desktop-titlebar')) return;
  const style = document.createElement('style');
  style.textContent = `body{padding-top:42px!important}#desktop-titlebar{position:fixed;inset:0 0 auto 0;z-index:2147483647;height:42px;display:flex;align-items:center;padding:0 8px 0 16px;background:#30472d;color:#fffdf5;-webkit-app-region:drag;user-select:none;font:600 13px/1.2 "Segoe UI",system-ui,sans-serif}#desktop-titlebar .desktop-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}#desktop-titlebar .desktop-controls{display:flex;height:100%;-webkit-app-region:no-drag}#desktop-titlebar button{width:42px;height:34px;margin:4px 0;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer;font:500 16px/1 "Segoe UI",sans-serif}#desktop-titlebar button:hover,#desktop-titlebar button:focus-visible{background:rgba(255,255,255,.18);outline:2px solid #ffe18a;outline-offset:-2px}#desktop-titlebar button[data-action="close"]:hover,#desktop-titlebar button[data-action="close"]:focus-visible{background:#b3261e}`;
  document.head.appendChild(style);
  const bar = document.createElement('div');
  bar.id = 'desktop-titlebar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Application window controls');
  bar.innerHTML = '<span class="desktop-title">Hay Day Wiki Archive</span><span class="desktop-controls"><button type="button" data-action="minimize" aria-label="Minimize window" title="Minimize">−</button><button type="button" data-action="maximize" aria-label="Maximize window" title="Maximize">□</button><button type="button" data-action="close" aria-label="Close window" title="Close">×</button></span>';
  bar.addEventListener('click', (event) => { const button = event.target.closest('button[data-action]'); if (!button) return; const action = button.dataset.action; if (action === 'minimize') window.desktopShell.minimize(); if (action === 'maximize') window.desktopShell.toggleMaximize(); if (action === 'close') window.desktopShell.close(); });
  document.body.prepend(bar);
  const maximize = bar.querySelector('button[data-action="maximize"]');
  const updateMaximize = (value) => { const label = value ? 'Restore window' : 'Maximize window'; maximize.setAttribute('aria-label', label); maximize.setAttribute('title', label); maximize.setAttribute('aria-pressed', String(Boolean(value))); maximize.textContent = value ? '❐' : '□'; };
  void window.desktopShell.isMaximized().then(updateMaximize);
  window.desktopShell.onMaximizedChanged(updateMaximize);
  document.addEventListener('click', (event) => { const anchor = event.target.closest('a[href]'); if (!anchor || anchor.target === '_blank') return; let url; try { url = new URL(anchor.href); } catch { return; } if (url.protocol === 'https:') { event.preventDefault(); void window.desktopShell.openExternal(url.href); } }, true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installTitleBar, { once: true }); else installTitleBar();
