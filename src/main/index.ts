import { app, BrowserWindow } from "electron";
import { createOverlayWindow, showCentered, hideOverlay } from "./window";
import { registerHotkey, unregisterAll } from "./hotkey";
import { getPrefs } from "./store";
import { registerIpc } from "./ipc";
import { initUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;
let currentHotkey = "";

function toggleOverlay(): void {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) hideOverlay(mainWindow);
  else showCentered(mainWindow);
}

app.whenReady().then(() => {
  const prefs = getPrefs();
  currentHotkey = prefs.hotkey;

  mainWindow = createOverlayWindow();

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(
      new URL("../renderer/index.html", `file://${__dirname}/`).pathname.slice(1),
    );
  }

  registerIpc({
    window: mainWindow,
    currentHotkey: () => currentHotkey,
    setCurrentHotkey: (a) => {
      currentHotkey = a;
    },
    onHotkeyFired: toggleOverlay,
  });

  const result = registerHotkey(currentHotkey, toggleOverlay);
  if (!result.ok) {
    console.error("[main] hotkey registration failed:", result);
    // Fallback UX comes in M3 (toast + settings flag). For Week 1 we log and proceed.
  }

  initUpdater(mainWindow);
});

app.on("window-all-closed", () => {
  unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  unregisterAll();
});
