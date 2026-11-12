const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pelexMonitor", {
  listSources: () => ipcRenderer.invoke("pelex:list-sources"),
  selectSource: id => ipcRenderer.invoke("pelex:select-source", id),
  captureOnce: () => ipcRenderer.invoke("pelex:capture-once"),
  start: interval => ipcRenderer.invoke("pelex:start", interval),
  stop: () => ipcRenderer.invoke("pelex:stop"),
  setAlwaysOnTop: value => ipcRenderer.invoke("pelex:always-on-top", value),
  openImport: () => ipcRenderer.invoke("pelex:open-import"),
  onCapture: callback => ipcRenderer.on("pelex:capture-result", (_event, result) => callback(result))
});
