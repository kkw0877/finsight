"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { DonutChart } from "@/components/DonutChart";
import { MonthlyTrendChart } from "@/components/MonthlyTrendChart";
import { UploadWidget, type UploadResult } from "@/components/UploadWidget";
import type { AnalysisResult } from "@/types/analysis";

export interface DashboardContentProps {
  initialAnalysis: AnalysisResult | null;
  initialBlurred: boolean;
}

export function DashboardContent({ initialAnalysis, initialBlurred }: DashboardContentProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(initialAnalysis);
  const [blurred, setBlurred] = useState(initialBlurred);

  function handleResult({ blurred: nextBlurred, ...result }: UploadResult) {
    setAnalysis(result);
    setBlurred(nextBlurred);
  }

  const totalSpend = analysis?.categoryTotals.reduce((sum, c) => sum + c.total, 0) ?? 0;
  const topCategory = analysis?.categoryTotals[0];

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
          대시보드
        </h1>
        <p className="mt-2 text-base leading-[1.6] text-ink-muted">
          카드 명세서 CSV를 업로드하면 지출을 분석해드립니다.
        </p>
        <div className="mt-6">
          <UploadWidget onResult={handleResult} />
        </div>
      </section>

      {!analysis ? (
        <p className="text-base leading-[1.6] text-ink-muted">아직 업로드한 명세서가 없습니다.</p>
      ) : (
        <div className="relative">
          <div className={blurred ? "pointer-events-none select-none blur-sm" : undefined}>
            <div className="grid grid-cols-2 gap-4">
              <StatTile label="총 지출" value={`${totalSpend.toLocaleString("ko-KR")}원`} />
              <StatTile
                label="최다 지출 카테고리"
                value={topCategory ? `${topCategory.category} ${topCategory.percentage}%` : "-"}
              />
            </div>

            <p className="mt-6 text-base leading-[1.6] text-ink-muted">{analysis.summaryText}</p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Card>
                <p className="text-sm font-medium text-ink-subtle">카테고리별 지출</p>
                <div className="mt-4">
                  <DonutChart categoryTotals={analysis.categoryTotals} />
                </div>
              </Card>
              <Card>
                <p className="text-sm font-medium text-ink-subtle">월별 지출 추이</p>
                <div className="mt-4">
                  <MonthlyTrendChart data={analysis.monthlyTrend} />
                </div>
              </Card>
            </div>

            <Card className="mt-8">
              <p className="text-sm font-medium text-ink-subtle">거래 내역</p>
              <div className="mt-4 max-h-[480px] overflow-y-auto">
                {analysis.transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </Card>
          </div>

          {blurred && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="flex flex-col items-center gap-3 text-center">
                <p className="text-base text-ink">이번 달 무료 업로드 횟수를 모두 사용했습니다.</p>
                <Button type="button">Pro로 업그레이드</Button>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
