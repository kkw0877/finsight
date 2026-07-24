import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders an svg polyline with a point per data value", () => {
    const { container } = render(<Sparkline data={[10, 40, 20, 60]} />);
    const svg = container.querySelector("svg");
    const polyline = container.querySelector("polyline");
    expect(svg).toBeInTheDocument();
    expect(polyline?.getAttribute("points")?.split(" ")).toHaveLength(4);
  });
});
