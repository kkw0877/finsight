import type { Category, Transaction } from "@/types/transaction";
import type { AnalysisResult, CategoryTotal, MonthlyTrendPoint } from "@/types/analysis";

/**
 * 이미 분류된 거래내역에서 카테고리별/월별 집계를 조회 시점에 계산한다.
 * (ARCHITECTURE.md — 집계는 별도 저장 없이 조회 시점에 계산). Claude 호출 없이
 * 저장된 Transaction[]만으로 계산하므로 services/claude.ts의 분류 로직과는 무관하다.
 */
export function aggregateTransactions(transactions: Transaction[]): AnalysisResult {
  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);

  const totalsByCategory = new Map<Category, number>();
  for (const t of transactions) {
    totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + t.amount);
  }
  const categoryTotals: CategoryTotal[] = [...totalsByCategory.entries()]
    .map(([category, total]) => ({
      category,
      total,
      percentage: totalSpend === 0 ? 0 : Math.round((total / totalSpend) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total);

  const totalsByMonth = new Map<string, number>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    totalsByMonth.set(month, (totalsByMonth.get(month) ?? 0) + t.amount);
  }
  const monthlyTrend: MonthlyTrendPoint[] = [...totalsByMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const top = categoryTotals[0];
  const summaryText = top
    ? `${top.category} ${top.total.toLocaleString("ko-KR")}원(전체의 ${top.percentage}%)으로 가장 많이 지출했습니다.`
    : "분석할 거래 내역이 없습니다.";

  return { summaryText, categoryTotals, monthlyTrend, transactions };
}
