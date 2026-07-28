import { Upload, ScanText, Brain, Lightbulb, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

const STEPS = [
  {
    icon: Upload,
    title: "CSV/PDF 업로드",
    description: "카드사 명세서를 CSV나 PDF 그대로 올립니다.",
  },
  {
    icon: ScanText,
    title: "Haiku가 거래 인식",
    description: "명세서를 정규화된 거래 내역으로 변환합니다.",
  },
  {
    icon: Brain,
    title: "Sonnet/Opus가 분류·요약",
    description: "카테고리 분류와 지출 요약을 작성합니다.",
  },
  {
    icon: Lightbulb,
    title: "인사이트 완성",
    description: "지출 비중과 월별 추이를 한눈에 확인합니다.",
  },
];

export function ProcessingPipeline() {
  return (
    <section>
      <h2 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
        이렇게 분석합니다
      </h2>
      <p className="mt-2 text-sm text-ink-subtle">
        실제 처리 순서 그대로입니다 — 가짜 진행률이 아니에요.
      </p>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <div key={title} className="flex flex-col gap-4 lg:flex-1 lg:flex-row lg:items-center">
            <Card className="flex-1">
              <Icon aria-hidden="true" strokeWidth={1.5} className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-sm font-medium text-ink-subtle">{title}</h3>
              <p className="mt-2 text-base leading-[1.6] text-ink-muted">{description}</p>
            </Card>
            {index < STEPS.length - 1 && (
              <ArrowRight
                aria-hidden="true"
                strokeWidth={1.5}
                className="hidden h-5 w-5 shrink-0 text-ink-subtle lg:block"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
