import { BrowserWindow, screen } from "electron";
import { join } from "node:path";

export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

export function computeCenteredBounds(workArea: Rect, size: Size): Rect {
  const x = Math.max(workArea.x, workArea.x + Math.floor((workArea.width - size.width) / 2));
  const y = Math.max(workArea.y, workArea.y + Math.floor((workArea.height - size.height) / 2));
  return { x, y, ...size };
}

const DEFAULT_SIZE: Size = { width: 720, height: 480 };

export function createOverlayWindow(): BrowserWindow {
  const preloadPath = join(__dirname, "../preload/index.js");
  const win = new BrowserWindow({
    ...DEFAULT_SIZE,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  return win;
}

export function showCentered(win: BrowserWindow): void {
  const primary = screen.getPrimaryDisplay();
  const bounds = computeCenteredBounds(primary.workArea, DEFAULT_SIZE);
  win.setBounds(bounds);
  win.setFocusable(false);
  win.showInactive();
}

export function hideOverlay(win: BrowserWindow): void {
  win.hide();
  win.setFocusable(false);
}

export function allowFocus(win: BrowserWindow): void {
  win.setFocusable(true);
  win.focus();
}
