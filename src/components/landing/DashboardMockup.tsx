import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DonutChart } from "@/components/DonutChart";
import { MonthlyTrendChart } from "@/components/MonthlyTrendChart";
import { CountUpValue } from "@/components/landing/CountUpValue";
import type { CategoryTotal, MonthlyTrendPoint } from "@/types/analysis";
import type { Category } from "@/types/transaction";

const SAMPLE_AMOUNTS: Record<Category, number> = {
  식비: 420000,
  주거_공과금: 260000,
  쇼핑: 200000,
  교통: 150000,
  여가_문화: 120000,
  구독서비스: 90000,
  의료_건강: 80000,
  저축_투자: 60000,
  기타: 40000,
};

const SAMPLE_TOTAL = Object.values(SAMPLE_AMOUNTS).reduce((sum, amount) => sum + amount, 0);

const SAMPLE_CATEGORY_TOTALS: CategoryTotal[] = (
  Object.entries(SAMPLE_AMOUNTS) as [Category, number][]
)
  .map(([category, total]) => ({
    category,
    total,
    percentage: Math.round((total / SAMPLE_TOTAL) * 1000) / 10,
  }))
  .sort((a, b) => b.total - a.total);

const SAMPLE_MONTHLY_TREND: MonthlyTrendPoint[] = [
  { month: "2026-02", total: 1120000 },
  { month: "2026-03", total: 1260000 },
  { month: "2026-04", total: 1190000 },
  { month: "2026-05", total: 1350000 },
  { month: "2026-06", total: 1280000 },
  { month: "2026-07", total: SAMPLE_TOTAL },
];

export function DashboardMockup() {
  const top = SAMPLE_CATEGORY_TOTALS[0];

  return (
    <section>
      <h2 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
        카드 명세서 하나면, 이런 화면을 받습니다
      </h2>
      <p className="mt-2 text-sm text-ink-subtle">예시 데이터로 미리 보여드려요 — 실제 화면입니다.</p>

      <div className="mt-6 space-y-6">
        <Card>
          <p className="text-sm font-medium text-ink-subtle">이번 달 요약</p>
          <p className="mt-2 text-base leading-[1.6] font-medium text-ink">
            이번 달 {top.category} <CountUpValue target={top.total} />, 전체의 {top.percentage}%를
            차지했어요.
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <StatTile label="총 지출" value={`${SAMPLE_TOTAL.toLocaleString("ko-KR")}원`} />
          <StatTile label="최다 지출 카테고리" value={`${top.category} ${top.percentage}%`} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <p className="text-sm font-medium text-ink-subtle">카테고리별 지출</p>
            <div className="mt-4">
              <DonutChart categoryTotals={SAMPLE_CATEGORY_TOTALS} />
            </div>
          </Card>
          <Card>
            <p className="text-sm font-medium text-ink-subtle">월별 지출 추이</p>
            <div className="mt-4">
              <MonthlyTrendChart data={SAMPLE_MONTHLY_TREND} className="h-auto w-full" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
