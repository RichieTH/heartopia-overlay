import { ipcMain, type BrowserWindow } from "electron";
import { getPrefs, setPrefs } from "./store";
import { hideOverlay } from "./window";
import { rebindHotkey } from "./hotkey";
import type { Prefs, HotkeyResult } from "../preload/htp";

export function registerIpc(options: {
  window: BrowserWindow;
  currentHotkey: () => string;
  setCurrentHotkey: (a: string) => void;
  onHotkeyFired: () => void;
}): void {
  const { window, currentHotkey, setCurrentHotkey, onHotkeyFired } = options;

  ipcMain.on("panel:hide", () => hideOverlay(window));

  ipcMain.handle("prefs:get", (): Prefs => getPrefs());

  ipcMain.handle("prefs:set", (_e, patch: Partial<Prefs>): HotkeyResult => {
    if (patch.hotkey && patch.hotkey !== currentHotkey()) {
      const result = rebindHotkey(currentHotkey(), patch.hotkey, onHotkeyFired);
      if (!result.ok) return result;
      setCurrentHotkey(patch.hotkey);
    }
    setPrefs(patch);
    return { ok: true };
  });

  ipcMain.handle("updater:check", async () => {
    // Wired fully in Week 3. Stub silent in Week 1.
  });

  ipcMain.on("updater:install", () => {
    // Week 3.
  });
}
