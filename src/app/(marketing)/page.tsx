import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Reveal } from "@/components/landing/Reveal";
import { DashboardMockup } from "@/components/landing/DashboardMockup";
import { ProcessingPipeline } from "@/components/landing/ProcessingPipeline";
import { CategoryIconGrid } from "@/components/landing/CategoryIconGrid";

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

      <div className="mt-16 space-y-16">
        <Reveal>
          <DashboardMockup />
        </Reveal>

        <Reveal>
          <ProcessingPipeline />
        </Reveal>

        <Reveal>
          <CategoryIconGrid />
        </Reveal>
      </div>

      <section className="mt-16 max-w-[680px] space-y-6">
        <p className="text-base leading-[1.6] text-ink-muted">
          지금 바로 카드 명세서를 올려 이번 달 소비 패턴을 확인해보세요.
        </p>
        <GoogleSignInButton />
      </section>
    </main>
  );
}
