import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryIconGrid } from "./CategoryIconGrid";
import { CATEGORY_LABELS } from "@/components/DonutChart";

describe("CategoryIconGrid", () => {
  it("renders the section heading", () => {
    render(<CategoryIconGrid />);
    expect(
      screen.getByRole("heading", { name: "9가지 카테고리로 자동 분류됩니다" }),
    ).toBeInTheDocument();
  });

  it("renders all 9 category labels", () => {
    render(<CategoryIconGrid />);
    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
