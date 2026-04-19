import { describe, it, expect, vi, beforeEach } from "vitest";

const register = vi.fn();
const unregister = vi.fn();
const isRegistered = vi.fn();

vi.mock("electron", () => ({
  globalShortcut: {
    register: (...a: unknown[]) => register(...a),
    unregister: (...a: unknown[]) => unregister(...a),
    isRegistered: (...a: unknown[]) => isRegistered(...a),
  },
}));

import { validateAccelerator, registerHotkey, rebindHotkey } from "@main/hotkey";

describe("validateAccelerator", () => {
  beforeEach(() => {
    register.mockReset();
    unregister.mockReset();
    isRegistered.mockReset();
  });

  it("rejects bare letters and game keys", () => {
    for (const key of ["Tab", "E", "W", "A", "S", "D", "F", "Space"]) {
      expect(validateAccelerator(key).ok).toBe(false);
    }
  });

  it("rejects Discord defaults", () => {
    expect(validateAccelerator("Ctrl+Shift+I").ok).toBe(false);
  });

  it("accepts sensible chords with a modifier", () => {
    expect(validateAccelerator("CommandOrControl+Shift+H")).toEqual({ ok: true });
    expect(validateAccelerator("Ctrl+Alt+Y")).toEqual({ ok: true });
  });
});

describe("registerHotkey", () => {
  beforeEach(() => {
    register.mockReset();
    unregister.mockReset();
    isRegistered.mockReset();
  });

  it("returns ok when Electron accepts the binding", () => {
    register.mockReturnValue(true);
    const result = registerHotkey("CommandOrControl+Shift+H", () => {});
    expect(result.ok).toBe(true);
    expect(register).toHaveBeenCalledOnce();
  });

  it("returns conflict when Electron rejects the binding", () => {
    register.mockReturnValue(false);
    const result = registerHotkey("CommandOrControl+Shift+H", () => {});
    expect(result).toEqual({ ok: false, reason: "conflict" });
  });

  it("rejects reserved keys without calling Electron", () => {
    const result = registerHotkey("Tab", () => {});
    expect(result).toEqual({ ok: false, reason: "reserved", offending: "Tab" });
    expect(register).not.toHaveBeenCalled();
  });
});

describe("rebindHotkey", () => {
  beforeEach(() => {
    register.mockReset();
    unregister.mockReset();
    isRegistered.mockReset();
  });

  it("unregisters the old accelerator before registering the new one", () => {
    register.mockReturnValue(true);
    const res = rebindHotkey("Ctrl+Shift+H", "Ctrl+Alt+Y", () => {});
    expect(unregister).toHaveBeenCalledWith("Ctrl+Shift+H");
    expect(register).toHaveBeenCalledWith("Ctrl+Alt+Y", expect.any(Function));
    expect(res.ok).toBe(true);
  });

  it("does not unregister if the new accelerator is reserved", () => {
    const res = rebindHotkey("Ctrl+Shift+H", "Tab", () => {});
    expect(unregister).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
  });
});
