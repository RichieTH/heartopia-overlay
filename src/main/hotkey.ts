import { globalShortcut } from "electron";

const RESERVED_KEYS = new Set<string>([
  "Tab",
  "E",
  "W",
  "A",
  "S",
  "D",
  "F",
  "Space",
  "Enter",
  "Escape",
  "Ctrl+Shift+I",
  "CommandOrControl+Shift+I",
]);

export type HotkeyResult =
  | { ok: true }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "reserved"; offending: string };

export function validateAccelerator(accelerator: string): HotkeyResult {
  if (RESERVED_KEYS.has(accelerator)) {
    return { ok: false, reason: "reserved", offending: accelerator };
  }
  if (!/^([A-Za-z]|[A-Za-z0-9]+(\+[A-Za-z0-9]+)+)$/.test(accelerator)) {
    return { ok: false, reason: "reserved", offending: accelerator };
  }
  const hasModifier = /(Ctrl|Cmd|Alt|Shift|Command|Control|CommandOrControl|Meta|Super)\+/.test(
    accelerator,
  );
  if (!hasModifier) {
    return { ok: false, reason: "reserved", offending: accelerator };
  }
  return { ok: true };
}

export function registerHotkey(accelerator: string, handler: () => void): HotkeyResult {
  const validation = validateAccelerator(accelerator);
  if (!validation.ok) return validation;
  const ok = globalShortcut.register(accelerator, handler);
  return ok ? { ok: true } : { ok: false, reason: "conflict" };
}

export function rebindHotkey(
  oldAccelerator: string,
  newAccelerator: string,
  handler: () => void,
): HotkeyResult {
  const validation = validateAccelerator(newAccelerator);
  if (!validation.ok) return validation;
  globalShortcut.unregister(oldAccelerator);
  const ok = globalShortcut.register(newAccelerator, handler);
  return ok ? { ok: true } : { ok: false, reason: "conflict" };
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll();
}
