import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders with design system classes", () => {
    render(<Input placeholder="검색" />);
    const input = screen.getByPlaceholderText("검색");
    expect(input.className).toContain("rounded-sm");
    expect(input.className).toContain("border-hairline");
  });
});
