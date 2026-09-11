import type { Instrumentation } from "next";

export function register() {
  // Next.js 서버 인스턴스 부팅 훅 — 현재는 초기화할 것이 없다.
}

const POSTHOG_COOKIE_PATTERN = /ph_phc_.*?_posthog=([^;]+)/;

function extractDistinctId(cookieHeader: string | string[] | undefined): string | undefined {
  if (!cookieHeader) return undefined;

  const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;
  const match = cookieString.match(POSTHOG_COOKIE_PATTERN);
  if (!match) return undefined;

  try {
    const decoded = JSON.parse(decodeURIComponent(match[1])) as { distinct_id?: string };
    return decoded.distinct_id;
  } catch {
    return undefined;
  }
}

/**
 * try/catch로 감싸지 않은 서버 측 예외(라우트 핸들러, RSC 렌더링 등)를 전부 잡아
 * PostHog Error Tracking으로 보낸다. 개별 catch 블록의 captureServerException 호출과
 * 상호 보완적이다 — 여기서는 "놓친" 예외의 안전망 역할만 한다.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { captureServerException } = await import("@/lib/posthog-server");
  await captureServerException(error, extractDistinctId(request.headers.cookie));
};
