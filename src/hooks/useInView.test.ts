import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useInView } from "./useInView";

describe("useInView", () => {
  it("returns inView=true immediately when IntersectionObserver is unavailable (jsdom)", () => {
    expect(typeof IntersectionObserver).toBe("undefined");
    const { result } = renderHook(() => useInView<HTMLDivElement>());
    expect(result.current.inView).toBe(true);
  });
});
