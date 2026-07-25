import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DashboardMockup } from "./DashboardMockup";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DashboardMockup", () => {
  it("renders the section heading and an example-data caption", () => {
    render(<DashboardMockup />);
    expect(
      screen.getByRole("heading", { name: "카드 명세서 하나면, 이런 화면을 받습니다" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/예시 데이터/)).toBeInTheDocument();
  });

  it("renders a natural-language summary sentence with the count-up amount", () => {
    render(<DashboardMockup />);
    expect(screen.getByText(/차지했어요/)).toBeInTheDocument();
    expect(screen.getByText("420,000원")).toBeInTheDocument();
  });

  it("mirrors the real dashboard stat tiles and charts", () => {
    render(<DashboardMockup />);
    expect(screen.getByText("총 지출")).toBeInTheDocument();
    expect(screen.getByText("최다 지출 카테고리")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "카테고리별 지출 비중 도넛차트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "월별 지출 추이 차트" }),
    ).toBeInTheDocument();
  });
});
