import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CountUpValue } from "./CountUpValue";

function stubReducedMotion() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CountUpValue", () => {
  it("renders the final formatted value (reduced motion skips the animation)", () => {
    stubReducedMotion();
    render(<CountUpValue target={420000} />);
    expect(screen.getByText("420,000원")).toBeInTheDocument();
  });

  it("supports a custom format function", () => {
    stubReducedMotion();
    render(<CountUpValue target={31} format={(n) => `${n}%`} />);
    expect(screen.getByText("31%")).toBeInTheDocument();
  });
});
