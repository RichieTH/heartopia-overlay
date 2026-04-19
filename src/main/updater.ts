import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";
import type { UpdateEvent } from "../preload/htp";

export function initUpdater(window: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  const send = (e: UpdateEvent) => window.webContents.send("updater:event", e);

  autoUpdater.on("update-available", (info) => send({ type: "available", version: info.version }));
  autoUpdater.on("update-downloaded", (info) =>
    send({ type: "downloaded", version: info.version }),
  );
  autoUpdater.on("error", (err) => send({ type: "error", message: err.message }));

  // Kick a check, but never throw on network errors at startup.
  autoUpdater.checkForUpdates().catch(() => {
    /* swallow; user can retry from About in M3 */
  });
}
