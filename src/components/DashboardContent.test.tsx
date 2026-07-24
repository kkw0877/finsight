import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardContent } from "./DashboardContent";
import type { AnalysisResult } from "@/types/analysis";

const analysis: AnalysisResult = {
  summaryText: "이번 달 식비 7,000원(전체의 70%)으로 가장 많이 지출했습니다.",
  categoryTotals: [{ category: "식비", total: 7000, percentage: 70 }],
  monthlyTrend: [{ month: "2026-07", total: 7000 }],
  transactions: [
    {
      id: "t1",
      uploadId: "u1",
      userId: "user-1",
      date: "2026-07-01",
      merchant: "스타벅스",
      amount: 7000,
      category: "식비",
    },
  ],
};

describe("DashboardContent", () => {
  it("분석 결과가 없으면 안내 문구를 보여준다", () => {
    render(<DashboardContent initialAnalysis={null} initialBlurred={false} />);
    expect(screen.getByText("아직 업로드한 명세서가 없습니다.")).toBeInTheDocument();
  });

  it("분석 결과가 있으면 요약과 거래 내역을 렌더링한다", () => {
    render(<DashboardContent initialAnalysis={analysis} initialBlurred={false} />);
    expect(screen.getByText(analysis.summaryText)).toBeInTheDocument();
    expect(screen.getByText("스타벅스")).toBeInTheDocument();
  });

  it("blurred가 true면 결과 영역을 블러 처리하고 업그레이드 CTA를 보여준다", () => {
    const { container } = render(<DashboardContent initialAnalysis={analysis} initialBlurred={true} />);
    expect(screen.getByRole("button", { name: "Pro로 업그레이드" })).toBeInTheDocument();
    expect(container.querySelector(".blur-sm")).not.toBeNull();
  });
});
