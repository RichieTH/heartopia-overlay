import Store from "electron-store";

export type Prefs = {
  hotkey: string;
  clearOnClose: boolean;
  launchAtLogin: boolean;
  lastVersion: string;
};

export const DEFAULT_PREFS: Prefs = {
  hotkey: "CommandOrControl+Shift+H",
  clearOnClose: true,
  launchAtLogin: false,
  lastVersion: "",
};

const store = new Store<Prefs>({ defaults: DEFAULT_PREFS });

export function getPrefs(): Prefs {
  return {
    hotkey: store.get("hotkey") ?? DEFAULT_PREFS.hotkey,
    clearOnClose: store.get("clearOnClose") ?? DEFAULT_PREFS.clearOnClose,
    launchAtLogin: store.get("launchAtLogin") ?? DEFAULT_PREFS.launchAtLogin,
    lastVersion: store.get("lastVersion") ?? DEFAULT_PREFS.lastVersion,
  };
}

export function setPrefs(patch: Partial<Prefs>): void {
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) store.set(k, v);
  }
}
