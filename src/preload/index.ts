import { contextBridge, ipcRenderer } from "electron";
import type { HtpBridge, UpdateEvent } from "./htp";

const bridge: HtpBridge = {
  hidePanel: () => ipcRenderer.send("panel:hide"),
  getPrefs: () => ipcRenderer.invoke("prefs:get"),
  setPrefs: (patch) => ipcRenderer.invoke("prefs:set", patch),
  onHotkeyToggle: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("hotkey:toggle", listener);
    return () => ipcRenderer.off("hotkey:toggle", listener);
  },
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  installUpdate: () => ipcRenderer.send("updater:install"),
  onUpdateEvent: (cb) => {
    const listener = (_: unknown, e: UpdateEvent) => cb(e);
    ipcRenderer.on("updater:event", listener);
    return () => ipcRenderer.off("updater:event", listener);
  },
};

contextBridge.exposeInMainWorld("htp", bridge);
