import { describe, it, expect } from "vitest";
import { computeCenteredBounds } from "@main/window";

describe("computeCenteredBounds", () => {
  it("centers a 720x480 window on a 1920x1080 primary display", () => {
    const bounds = computeCenteredBounds(
      { x: 0, y: 0, width: 1920, height: 1080 },
      { width: 720, height: 480 },
    );
    expect(bounds).toEqual({ x: 600, y: 300, width: 720, height: 480 });
  });

  it("respects a non-zero workArea origin (taskbar offset)", () => {
    const bounds = computeCenteredBounds(
      { x: 0, y: 40, width: 1920, height: 1040 },
      { width: 720, height: 480 },
    );
    expect(bounds).toEqual({ x: 600, y: 320, width: 720, height: 480 });
  });

  it("clamps to workArea origin when the window is larger than the display", () => {
    const bounds = computeCenteredBounds(
      { x: 0, y: 0, width: 400, height: 300 },
      { width: 720, height: 480 },
    );
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
  });
});
