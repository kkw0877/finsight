/**
 * Mock-First (step 6): 실제 Polar 호출 없이 흐름 검증용 구현.
 * step 15에서 이 두 함수의 내부 구현만 실제 Polar SDK 호출로 교체한다 — 시그니처는 유지.
 */

/**
 * 업그레이드 클릭 시 Polar 체크아웃으로 리다이렉트할 URL 생성 (ADR-007).
 * 이 시점에는 DB에 아무 것도 쓰지 않는다 — checkout_pending 상태를 저장하지 않는다.
 */
export async function createCheckoutSession(userId: string): Promise<{ url: string }> {
  return { url: `/mock-checkout?user=${userId}` };
}

/**
 * Polar 웹훅 페이로드 검증 + 파싱 (ADR-007). 실제로는 서명 검증 후 구독 상태를 반환한다.
 * mock 구현은 서명 검증 없이 payload를 JSON으로 파싱해 형식이 맞으면 반환, 아니면 null.
 */
export async function verifyAndParseWebhook(
  payload: string,
  signature: string,
): Promise<{ userId: string; isPro: boolean } | null> {
  void signature;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const { userId, isPro } = parsed as Record<string, unknown>;

  if (typeof userId !== "string" || typeof isPro !== "boolean") {
    return null;
  }

  return { userId, isPro };
}
