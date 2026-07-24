import { Polar } from "@polar-sh/sdk";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

/**
 * 실제 Polar 연동 (step 15, ADR-007). POLAR_ACCESS_TOKEN/POLAR_WEBHOOK_SECRET/
 * POLAR_PRODUCT_ID는 이 파일 밖에서 참조하지 않는다.
 */
const client = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });

/**
 * 업그레이드 클릭 시 Polar 체크아웃으로 리다이렉트할 URL 생성 (ADR-007).
 * 이 시점에는 DB에 아무 것도 쓰지 않는다 — checkout_pending 상태를 저장하지 않는다.
 * externalCustomerId로 우리 앱의 userId를 Polar 고객에 연결해, 웹훅에서 다시 꺼낼 수 있게 한다.
 */
export async function createCheckoutSession(userId: string): Promise<{ url: string }> {
  const productId = process.env.POLAR_PRODUCT_ID;
  if (!productId) {
    throw new Error("결제 상품이 아직 설정되지 않았습니다.");
  }

  const checkout = await client.checkouts.create({
    products: [productId],
    externalCustomerId: userId,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return { url: checkout.url };
}

/**
 * Polar 웹훅 페이로드 검증 + 파싱 (ADR-007). Standard Webhooks 서명(webhook-id/
 * webhook-timestamp/webhook-signature)을 검증한 뒤에만 payload를 신뢰한다 — 검증을
 * 생략하는 경로는 두지 않는다. POLAR_WEBHOOK_SECRET이 없으면 즉시 에러를 던진다(fail-closed).
 *
 * signatureHeaders는 route.ts가 세 헤더값을 JSON 문자열로 묶어 전달한다
 * (함수 시그니처는 step 6과 동일하게 payload/signature 두 개의 string 인자를 유지).
 */
export async function verifyAndParseWebhook(
  payload: string,
  signatureHeaders: string,
): Promise<{ userId: string; isPro: boolean } | null> {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("웹훅 서명 검증 비밀키가 설정되지 않았습니다.");
  }

  let headers: Record<string, string>;
  try {
    headers = JSON.parse(signatureHeaders) as Record<string, string>;
  } catch {
    return null;
  }

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(payload, headers, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return null;
    }
    throw error;
  }

  switch (event.type) {
    case "subscription.active":
    case "subscription.uncanceled": {
      const userId = event.data.customer.externalId;
      return typeof userId === "string" ? { userId, isPro: true } : null;
    }
    case "subscription.revoked": {
      const userId = event.data.customer.externalId;
      return typeof userId === "string" ? { userId, isPro: false } : null;
    }
    default:
      return null;
  }
}
