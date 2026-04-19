import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron-store", () => {
  const backing = new Map<string, unknown>();
  return {
    default: class MockStore {
      constructor(opts: { defaults?: Record<string, unknown> }) {
        if (opts?.defaults) {
          for (const [k, v] of Object.entries(opts.defaults)) {
            if (!backing.has(k)) backing.set(k, v);
          }
        }
      }
      get(key: string) {
        return backing.get(key);
      }
      set(key: string, value: unknown) {
        backing.set(key, value);
      }
      // Test hook
      static __reset() {
        backing.clear();
      }
    },
  };
});

import { getPrefs, setPrefs, DEFAULT_PREFS } from "@main/store";
import StoreCtor from "electron-store";

describe("main/store", () => {
  beforeEach(() => {
    (StoreCtor as unknown as { __reset: () => void }).__reset();
  });

  it("returns defaults when nothing has been written", () => {
    const prefs = getPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it("round-trips a hotkey change", () => {
    setPrefs({ hotkey: "Ctrl+Alt+Y" });
    expect(getPrefs().hotkey).toBe("Ctrl+Alt+Y");
  });

  it("preserves unwritten keys when partially updating", () => {
    setPrefs({ clearOnClose: false });
    expect(getPrefs().hotkey).toBe(DEFAULT_PREFS.hotkey);
    expect(getPrefs().clearOnClose).toBe(false);
  });
});
