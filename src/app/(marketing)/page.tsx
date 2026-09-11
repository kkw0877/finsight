import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Reveal } from "@/components/landing/Reveal";
import { DashboardMockup } from "@/components/landing/DashboardMockup";
import { ProcessingPipeline } from "@/components/landing/ProcessingPipeline";
import { CategoryIconGrid } from "@/components/landing/CategoryIconGrid";

const FAQ_ITEMS = [
  {
    question: "PDF 카드 명세서도 업로드할 수 있나요?",
    answer:
      "텍스트 레이어가 있는 PDF라면 업로드할 수 있습니다. 스캔한 이미지 PDF는 텍스트를 추출할 수 없어 지원하지 않습니다.",
  },
  {
    question: "카드사마다 CSV 형식이 다른데 괜찮나요?",
    answer:
      "카드사별로 다른 인코딩(EUC-KR/CP949 등)과 컬럼 구성을 자동으로 인식해 하나의 형식으로 정리합니다.",
  },
  {
    question: "제 카드번호나 계좌번호가 노출되나요?",
    answer:
      "AI 분석을 위해 전송하는 사본에는 카드번호·계좌번호 등을 마스킹합니다. 원본 명세서는 마스킹 없이 내 계정에만 안전하게 보관됩니다.",
  },
  {
    question: "무료로 몇 번까지 업로드할 수 있나요?",
    answer:
      "무료 플랜은 매달 3회까지 업로드할 수 있습니다. Pro로 업그레이드하면 무제한 업로드와 히스토리 보관이 제공됩니다.",
  },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FinSight",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description:
      "카드사마다 제각각인 CSV·PDF 명세서를 업로드하면 AI가 항목을 분류해 카테고리별 지출과 월별 추이를 보여주는 지출 분석 서비스.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-24">
      {structuredData.map((data) => (
        <script
          key={data["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}

      <section className="max-w-[680px] space-y-6">
        <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
          카드 명세서를 올리면, 소비 패턴을 정리해드립니다
        </h1>
        <p className="text-base leading-[1.6] text-ink-muted">
          카드사마다 제각각인 명세서를 CSV나 PDF 그대로 업로드하기만 하면 거래를 분석해
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

        <Reveal>
          <section className="max-w-[680px] space-y-8">
            <h2 className="text-2xl font-semibold text-ink">자주 묻는 질문</h2>
            <dl className="space-y-6">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium text-ink">{item.question}</dt>
                  <dd className="mt-1 text-sm leading-[1.6] text-ink-muted">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
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
