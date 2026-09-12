import type { OncallAlertHarness } from "@/types/oncall";

/** 이 저장소 전용 파이프라인이라 POLAR_PRODUCT_ID처럼 상수로 고정한다(환경별로 달라지지 않음). */
const REPO = "kkw0877/finsight";

/**
 * PostHog 웹훅 핸들러(prod, Vercel serverless)는 `claude -p` 헤드리스 에이전트를 직접 띄울
 * 수 없다 — 대신 GitHub repository_dispatch API로 CI에 위임한다. CI의 Actions 잡이 받는
 * ephemeral `secrets.GITHUB_TOKEN`과 달리, 외부(Vercel)에서 이 API를 호출하려면 별도
 * fine-grained PAT(Contents: Read and write 권한)가 필요하다 — GITHUB_DISPATCH_TOKEN.
 * GITHUB_DISPATCH_TOKEN이 없으면 즉시 던진다(fail-closed, Polar 패턴과 동일).
 */
export async function dispatchOncallAlert(harness: OncallAlertHarness): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_DISPATCH_TOKEN이 설정되지 않았습니다.");
  }

  const response = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: "posthog-oncall-alert", client_payload: harness }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GitHub repository_dispatch 호출 실패 (status ${response.status}): ${detail}`);
  }
}
