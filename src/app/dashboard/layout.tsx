import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireUser } from "@/lib/auth";

// mock 인증은 쿠키가 아닌 모듈 상태를 읽어 Next.js가 동적 의존성을 감지하지 못한다.
// force-dynamic 없이는 빌드 시점 상태가 정적 HTML로 굳어 보호 라우트가 무력화된다.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <span className="text-sm font-medium text-ink">FinSight</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-subtle">{user.name ?? user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-12">{children}</main>
    </div>
  );
}
