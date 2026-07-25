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
import { FREE_MONTHLY_LIMIT } from "@/lib/quota";

export interface DashboardContentProps {
  initialAnalysis: AnalysisResult | null;
  initialBlurred: boolean;
}

export function DashboardContent({ initialAnalysis, initialBlurred }: DashboardContentProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(initialAnalysis);
  const [blurred, setBlurred] = useState(initialBlurred);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  function handleResult({ blurred: nextBlurred, ...result }: UploadResult) {
    setAnalysis(result);
    setBlurred(nextBlurred);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        setUpgradeError(body.error ?? "체크아웃 생성에 실패했습니다.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setUpgradeError("체크아웃 생성 중 오류가 발생했습니다.");
    } finally {
      setUpgrading(false);
    }
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
            <Card>
              <p className="text-sm font-medium text-ink-subtle">이번 달 요약</p>
              <p className="mt-2 text-base leading-[1.6] font-medium text-ink">{analysis.summaryText}</p>
            </Card>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <StatTile label="총 지출" value={`${totalSpend.toLocaleString("ko-KR")}원`} />
              <StatTile
                label="최다 지출 카테고리"
                value={topCategory ? `${topCategory.category} ${topCategory.percentage}%` : "-"}
              />
            </div>

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
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <Card className="flex flex-col items-center gap-3 text-center">
                <p className="text-base text-ink">
                  이번 달 무료 업로드 {FREE_MONTHLY_LIMIT}회를 모두 사용했어요.
                </p>
                <p className="text-sm leading-[1.6] text-ink-muted">
                  Pro로 업그레이드하면 무제한 업로드와 히스토리 보관을 이용할 수 있어요.
                </p>
                <Button type="button" onClick={handleUpgrade} disabled={upgrading}>
                  {upgrading ? "이동 중..." : "Pro로 업그레이드"}
                </Button>
                {upgradeError && <p className="text-sm text-negative">{upgradeError}</p>}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
