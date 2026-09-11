import { PostHog } from "posthog-node";

type ServerEvent = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

function createPostHogClient() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    return null;
  }

  if (!host) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
      );
    }
    return null;
  }

  return new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
}

export async function captureServerEvent({ distinctId, event, properties }: ServerEvent) {
  const posthog = createPostHogClient();
  if (!posthog) return;

  posthog.capture({ distinctId, event, properties });
  await posthog.shutdown();
}

/**
 * instrumentation.ts의 onRequestError 훅과 API 라우트의 catch 블록에서 공용으로 쓰는
 * 예외 캡처. 매 호출마다 클라이언트를 새로 만들고 바로 shutdown하므로(서버리스 함수
 * 수명에 맞춘 패턴) enableExceptionAutocapture는 켜지 않는다 — 켜면 client마다
 * process의 uncaughtException 리스너가 누적돼 쌓인다.
 */
export async function captureServerException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>,
) {
  const posthog = createPostHogClient();
  if (!posthog) return;

  posthog.captureException(error, distinctId, properties);
  await posthog.shutdown();
}
