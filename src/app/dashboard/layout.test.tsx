import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({
    id: "mock-user-1",
    email: "mock-user@example.com",
    name: "Mock User",
  })),
}));

import DashboardLayout from "./layout";

describe("DashboardLayout", () => {
  it("renders the logged-in user's name, a logout button, and its children", async () => {
    const jsx = await DashboardLayout({ children: <div>대시보드 콘텐츠</div> });
    render(jsx);

    expect(screen.getByText("Mock User")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByText("대시보드 콘텐츠")).toBeInTheDocument();
  });
});
