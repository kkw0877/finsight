import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

// mock 인증은 쿠키가 아닌 모듈 상태를 읽어 Next.js가 동적 의존성을 감지하지 못한다.
// force-dynamic 없이는 빌드 시점 상태가 정적 HTML로 굳어 보호 라우트가 무력화된다.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  const supabase = await createServerClient();
  const { data: subscriptions } = await supabase.from("subscriptions").select().eq("userId", user.id);
  const isPro = subscriptions?.at(-1)?.isPro ?? false;

  const displayName = user.name ?? user.email;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-hairline px-6 py-8">
        <span className="text-sm font-medium text-ink">FinSight</span>
        <div className="flex flex-col gap-4 border-t border-hairline pt-6">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm text-ink-subtle">{displayName}</span>
              <Tag variant={isPro ? "pro" : "neutral"} className="w-fit">
                {isPro ? "PRO" : "FREE"}
              </Tag>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="mx-auto max-w-[1200px] flex-1 px-6 py-12">{children}</main>
    </div>
  );
}
