import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CATEGORY_LABELS } from "@/components/DonutChart";

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
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("renders the Google 로그인 CTA twice (hero + bottom)", () => {
    render(<LandingPage />);
    expect(
      screen.getAllByRole("button", { name: "Google로 로그인" }),
    ).toHaveLength(2);
  });

  it("renders the dashboard mockup section with real charts", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: "카드 명세서 하나면, 이런 화면을 받습니다",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "카테고리별 지출 비중 도넛차트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "월별 지출 추이 차트" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/예시 데이터/)).toBeInTheDocument();
  });

  it("renders the AI processing pipeline section", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: "이렇게 분석합니다" }),
    ).toBeInTheDocument();
    expect(screen.getByText("CSV 업로드")).toBeInTheDocument();
    expect(screen.getByText(/Haiku/)).toBeInTheDocument();
    expect(screen.getByText(/Sonnet/)).toBeInTheDocument();
    expect(screen.getByText("인사이트 완성")).toBeInTheDocument();
  });

  it("renders the category icon grid section", () => {
    render(<LandingPage />);
    const heading = screen.getByRole("heading", {
      name: "9가지 카테고리로 자동 분류됩니다",
    });
    expect(heading).toBeInTheDocument();
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(within(section as HTMLElement).getByText(label)).toBeInTheDocument();
    }
  });
});
