import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DonutChart } from "./DonutChart";

describe("DonutChart", () => {
  it("각 카테고리의 범례(라벨+비중)를 렌더링한다", () => {
    render(
      <DonutChart
        categoryTotals={[
          { category: "식비", total: 7000, percentage: 70 },
          { category: "교통", total: 3000, percentage: 30 },
        ]}
      />,
    );
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("교통")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("도넛 svg를 렌더링한다", () => {
    render(<DonutChart categoryTotals={[{ category: "기타", total: 1000, percentage: 100 }]} />);
    expect(screen.getByRole("img", { name: "카테고리별 지출 비중 도넛차트" })).toBeInTheDocument();
  });

  it("데이터가 없으면 안내 문구를 보여준다", () => {
    render(<DonutChart categoryTotals={[]} />);
    expect(screen.getByText("표시할 지출 내역이 없습니다.")).toBeInTheDocument();
  });

  it("primary(앰버) 색상을 카테고리 색상으로 재사용하지 않는다", () => {
    const { container } = render(
      <DonutChart categoryTotals={[{ category: "식비", total: 1000, percentage: 100 }]} />,
    );
    const circles = container.querySelectorAll("circle[stroke]");
    expect(circles.length).toBeGreaterThan(0);
    circles.forEach((circle) => {
      expect(circle.getAttribute("stroke")).not.toBe("#f59e0b");
    });
  });
});
