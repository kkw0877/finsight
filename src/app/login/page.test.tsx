import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders the FinSight heading and a Google sign-in button", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "FinSight" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Google로 로그인" }),
    ).toBeInTheDocument();
  });
});
