export type HotkeyResult =
  | { ok: true }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "reserved"; offending: string };

export type Prefs = {
  hotkey: string;
  clearOnClose: boolean;
  launchAtLogin: boolean;
  lastVersion: string;
};

export type UpdateEvent =
  | { type: "available"; version: string }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

export interface HtpBridge {
  hidePanel(): void;
  getPrefs(): Promise<Prefs>;
  setPrefs(patch: Partial<Prefs>): Promise<HotkeyResult>;
  onHotkeyToggle(cb: () => void): () => void;
  checkForUpdates(): Promise<void>;
  installUpdate(): void;
  onUpdateEvent(cb: (e: UpdateEvent) => void): () => void;
}

declare global {
  interface Window {
    htp: HtpBridge;
  }
}
