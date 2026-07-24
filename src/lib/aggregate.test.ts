import { describe, expect, it } from "vitest";
import { aggregateTransactions } from "./aggregate";
import type { Transaction } from "@/types/transaction";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    uploadId: "upload-1",
    userId: "user-1",
    date: "2026-07-01",
    merchant: "테스트 가맹점",
    amount: 1000,
    category: "기타",
    ...overrides,
  };
}

describe("aggregateTransactions", () => {
  it("빈 배열이면 빈 집계와 안내 요약을 반환한다", () => {
    const result = aggregateTransactions([]);
    expect(result.categoryTotals).toEqual([]);
    expect(result.monthlyTrend).toEqual([]);
    expect(result.transactions).toEqual([]);
    expect(result.summaryText).toBe("분석할 거래 내역이 없습니다.");
  });

  it("카테고리별 합계와 비중을 내림차순으로 계산한다", () => {
    const result = aggregateTransactions([
      tx({ category: "식비", amount: 7000 }),
      tx({ category: "교통", amount: 3000 }),
    ]);
    expect(result.categoryTotals).toEqual([
      { category: "식비", total: 7000, percentage: 70 },
      { category: "교통", total: 3000, percentage: 30 },
    ]);
  });

  it("같은 카테고리의 거래를 합산한다", () => {
    const result = aggregateTransactions([
      tx({ category: "식비", amount: 4000 }),
      tx({ category: "식비", amount: 3000 }),
    ]);
    expect(result.categoryTotals).toEqual([{ category: "식비", total: 7000, percentage: 100 }]);
  });

  it("월별 합계를 오름차순으로 계산한다", () => {
    const result = aggregateTransactions([
      tx({ date: "2026-06-15", amount: 1000 }),
      tx({ date: "2026-07-01", amount: 2000 }),
      tx({ date: "2026-06-01", amount: 500 }),
    ]);
    expect(result.monthlyTrend).toEqual([
      { month: "2026-06", total: 1500 },
      { month: "2026-07", total: 2000 },
    ]);
  });

  it("최다 지출 카테고리로 요약 문장을 생성한다", () => {
    const result = aggregateTransactions([tx({ category: "쇼핑", amount: 5000 })]);
    expect(result.summaryText).toContain("쇼핑");
    expect(result.summaryText).toContain("100%");
  });
});
