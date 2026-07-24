import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
          FinSight
        </h1>
        <p className="text-base leading-[1.6] text-ink-muted">
          카드 명세서를 업로드하면 AI가 분석해드립니다.
        </p>
        <GoogleSignInButton />
      </div>
    </main>
  );
}
