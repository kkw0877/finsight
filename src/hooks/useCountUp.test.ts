import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { useCountUp } from "./useCountUp";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCountUp", () => {
  it("stays at 0 while inactive (not yet revealed)", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useCountUp(1420000, { active: false }));
    expect(result.current).toBe(0);
  });

  it("returns the target immediately when the user prefers reduced motion", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useCountUp(1420000, { active: true }));
    expect(result.current).toBe(1420000);
  });
});
