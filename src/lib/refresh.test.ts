import { describe, expect, it } from "vitest";
import { isWithinRefreshWindow } from "@/lib/refresh";

describe("refresh window", () => {
  it("throttles a successful refresh during the provider window", () => {
    expect(isWithinRefreshWindow("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:30.000Z"), 60000)).toBe(true);
  });

  it("allows refresh after the window or with no prior success", () => {
    expect(isWithinRefreshWindow("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:01:00.000Z"), 60000)).toBe(false);
    expect(isWithinRefreshWindow(undefined, Date.now(), 60000)).toBe(false);
  });
});
