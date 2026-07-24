import { Upload, Tag, PieChart, TrendingUp } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Card } from "@/components/ui/Card";

const features = [
  {
    icon: Upload,
    title: "CSV 업로드",
    description:
      "카드사·은행에서 내려받은 명세서 CSV를 그대로 올리면 됩니다. 인코딩이나 양식은 신경 쓰지 않아도 됩니다.",
  },
  {
    icon: Tag,
    title: "자동 카테고리 분류",
    description:
      "거래 내역을 식비·교통·쇼핑 등 9개 카테고리로 자동 분류해 정리합니다.",
  },
  {
    icon: PieChart,
    title: "지출 비중 한눈에",
    description: "이번 달 어디에 얼마를 썼는지 카테고리별 비중으로 확인하세요.",
  },
  {
    icon: TrendingUp,
    title: "월별 추이 파악",
    description: "월별 지출 추이를 비교해 소비 패턴 변화를 파악할 수 있습니다.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-24">
      <section className="max-w-[680px] space-y-6">
        <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
          카드 명세서를 올리면, 소비 패턴을 정리해드립니다
        </h1>
        <p className="text-base leading-[1.6] text-ink-muted">
          카드사마다 제각각인 명세서 CSV를 업로드하기만 하면 거래를 분석해
          카테고리별 지출과 월별 추이를 대시보드에서 보여줍니다.
        </p>
        <GoogleSignInButton />
      </section>

      <section className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <Icon
              aria-hidden="true"
              strokeWidth={1.5}
              className="h-6 w-6 text-primary"
            />
            <h2 className="mt-4 text-sm font-medium text-ink-subtle">
              {title}
            </h2>
            <p className="mt-2 text-base leading-[1.6] text-ink-muted">
              {description}
            </p>
          </Card>
        ))}
      </section>
    </main>
  );
}
