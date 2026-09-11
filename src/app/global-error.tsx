"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/Button";

/**
 * 루트 레이아웃까지 무너뜨리는 렌더링 예외를 잡는 최후 방어선(Next.js Global Error).
 * window.onerror/onunhandledrejection으로는 잡히지 않는 React 렌더링 예외라 여기서
 * 직접 captureException을 호출한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="ko" className="dark">
      <body className="bg-canvas text-ink antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-lg font-medium">문제가 발생했습니다</h1>
          <p className="text-sm text-ink-subtle">
            페이지를 표시하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <Button onClick={reset}>다시 시도</Button>
        </div>
      </body>
    </html>
  );
}
