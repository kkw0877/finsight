import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders primary variant with pill radius and primary background", () => {
    render(<Button>확인</Button>);
    const button = screen.getByRole("button", { name: "확인" });
    expect(button.className).toContain("rounded-pill");
    expect(button.className).toContain("bg-primary");
  });

  it("renders text variant without a primary background", () => {
    render(<Button variant="text">취소</Button>);
    const button = screen.getByRole("button", { name: "취소" });
    expect(button.className).not.toContain("bg-primary");
  });
});
