import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.stubGlobal(
  "fetch",
  vi.fn(async () => new Response(JSON.stringify({ ok: true }))),
);

import LandingPage from "./page";

describe("LandingPage", () => {
  it("renders the headline", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: "카드 명세서를 올리면, 소비 패턴을 정리해드립니다",
      }),
    ).toBeInTheDocument();
  });

  it("renders the Google 로그인 CTA", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: "Google로 로그인" }),
    ).toBeInTheDocument();
  });

  it("renders core feature summaries", () => {
    render(<LandingPage />);
    expect(screen.getByText("CSV 업로드")).toBeInTheDocument();
    expect(screen.getByText("자동 카테고리 분류")).toBeInTheDocument();
    expect(screen.getByText("지출 비중 한눈에")).toBeInTheDocument();
    expect(screen.getByText("월별 추이 파악")).toBeInTheDocument();
  });
});
