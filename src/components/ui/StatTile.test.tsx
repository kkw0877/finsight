import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  it("renders the label and a mono, tabular-nums value", () => {
    render(<StatTile label="이번 달 지출" value="₩420,000" />);
    expect(screen.getByText("이번 달 지출")).toBeInTheDocument();
    const value = screen.getByText("₩420,000");
    expect(value.className).toContain("font-mono");
    expect(value.className).toContain("tabular-nums");
  });
});
