const { app, BrowserWindow, desktopCapturer, ipcMain, shell } = require("electron");
const path = require("node:path");
const { isBlockedSource, isBlockedContent, sanitizeOcrText } = require("./security");
let mainWindow;
let monitorTimer = null;
let selectedSource = null;
let captureBusy = false;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440, height: 650, minWidth: 360, minHeight: 520,
    title: "Pelex Business Monitor",
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => { stopMonitor(); mainWindow = null; });
}
app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("window-all-closed", () => { stopMonitor(); if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", stopMonitor);

ipcMain.handle("pelex:list-sources", async () => {
  const sources = await desktopCapturer.getSources({ types: ["window"], thumbnailSize: { width: 480, height: 300 }, fetchWindowIcons: false });
  return sources.map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL(), blocked: isBlockedSource(s.name) }));
});
ipcMain.handle("pelex:select-source", async (_event, id) => {
  const sources = await desktopCapturer.getSources({ types: ["window"] });
  const source = sources.find(s => s.id === id);
  if (!source) return { ok: false, error: "That window is no longer available. Refresh the list." };
  if (isBlockedSource(source.name)) return { ok: false, error: "This window appears to be a banking, wallet or trading application. Capture is blocked." };
  selectedSource = { id: source.id, name: source.name };
  return { ok: true, name: source.name };
});
async function captureOnce() {
  if (!selectedSource || captureBusy) return { ok: false, error: "Select an approved business window first." };
  captureBusy = true;
  try {
    const sources = await desktopCapturer.getSources({ types: ["window"], thumbnailSize: { width: 1800, height: 1200 } });
    const source = sources.find(s => s.id === selectedSource.id);
    if (!source || isBlockedSource(source.name)) { stopMonitor(); return { ok: false, blocked: true, error: "Selected source disappeared or became restricted. Monitoring stopped." }; }
    const { createWorker } = require("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(source.thumbnail.toPNG());
      const text = sanitizeOcrText(result.data.text || "");
      if (isBlockedContent(text)) { stopMonitor(); return { ok: false, blocked: true, error: "Banking-related content detected. Capture stopped and OCR text discarded." }; }
      const lines = text.split(/\\r?\\n/).map(x => x.trim()).filter(Boolean);
      const relevant = lines.filter(x => /transaction|receipt|invoice|order|sale|paid|payment|amount|total|quantity|cashier|POS|reference|status|NGN|USD|EUR|GBP|₦/i.test(x));
      return { ok: true, source: source.name, capturedAt: new Date().toISOString(), text: relevant.join("\\n").slice(0, 12000), preview: source.thumbnail.toDataURL() };
    } finally { await worker.terminate(); }
  } catch (error) { return { ok: false, error: error.message || "Capture failed." }; }
  finally { captureBusy = false; }
}
ipcMain.handle("pelex:capture-once", captureOnce);
ipcMain.handle("pelex:start", async (_event, intervalMs) => {
  if (!selectedSource) return { ok: false, error: "Select a business window first." };
  stopMonitor();
  const interval = Math.max(5000, Math.min(60000, Number(intervalMs) || 10000));
  const first = await captureOnce();
  if (!first.ok) return first;
  monitorTimer = setInterval(async () => {
    if (!mainWindow || !monitorTimer) return;
    const result = await captureOnce();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("pelex:capture-result", result);
    if (result.blocked) stopMonitor();
  }, interval);
  return { ok: true, first, interval };
});
ipcMain.handle("pelex:stop", () => { stopMonitor(); return { ok: true }; });
function stopMonitor() { if (monitorTimer) clearInterval(monitorTimer); monitorTimer = null; }
ipcMain.handle("pelex:always-on-top", (_event, enabled) => { if (mainWindow) mainWindow.setAlwaysOnTop(Boolean(enabled)); return true; });
ipcMain.handle("pelex:open-import", async () => { await shell.openExternal("https://pelex.tech"); return true; });
