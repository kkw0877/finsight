import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyTrendChart } from "./MonthlyTrendChart";

describe("MonthlyTrendChart", () => {
  it("월별 막대와 라벨을 렌더링한다", () => {
    render(
      <MonthlyTrendChart
        data={[
          { month: "2026-06", total: 10000 },
          { month: "2026-07", total: 20000 },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "월별 지출 추이 차트" })).toBeInTheDocument();
    expect(screen.getByText("2026-06")).toBeInTheDocument();
    expect(screen.getByText("2026-07")).toBeInTheDocument();
  });

  it("데이터가 없으면 안내 문구를 보여준다", () => {
    render(<MonthlyTrendChart data={[]} />);
    expect(screen.getByText("표시할 월별 추이 데이터가 없습니다.")).toBeInTheDocument();
  });
});
