import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BlogIndexPage from "./page";

describe("BlogIndexPage", () => {
  it("renders a heading", () => {
    render(<BlogIndexPage />);
    expect(
      screen.getByRole("heading", { name: "가이드", level: 1 }),
    ).toBeInTheDocument();
  });

  it("shows a placeholder when there are no posts yet", () => {
    render(<BlogIndexPage />);
    expect(screen.getByText(/준비 중입니다/)).toBeInTheDocument();
  });
});
