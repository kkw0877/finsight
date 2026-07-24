import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/services/supabase-admin";

const { mockValidateEvent, MockWebhookVerificationError } = vi.hoisted(() => {
  class MockWebhookVerificationError extends Error {}
  return { mockValidateEvent: vi.fn(), MockWebhookVerificationError };
});

// route.ts는 services/polar.ts를 통해 실제 Standard Webhooks 서명 검증을 수행한다(step 15).
// 네트워크·실제 서명 없이 결정적으로 동작해야 하므로 SDK를 목킹한다.
vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: mockValidateEvent,
  WebhookVerificationError: MockWebhookVerificationError,
}));

const { POST } = await import("./route");

function buildRequest(payload: string): NextRequest {
  return {
    text: async () => payload,
    headers: new Headers({
      "webhook-id": "wh-1",
      "webhook-timestamp": "1700000000",
      "webhook-signature": "v1,sig",
    }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockValidateEvent.mockReset();
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_test");
});

describe("POST /api/webhooks/polar", () => {
  it("유효한 payload를 받으면 subscriptions.isPro를 갱신한다", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "subscription.active",
      data: { customer: { externalId: "webhook-user-1" } },
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("subscriptions").select().eq("userId", "webhook-user-1");
    expect(data?.at(-1)?.isPro).toBe(true);
  });

  it("이후 구독 해지 webhook이 오면 isPro를 false로 갱신한다", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "subscription.active",
      data: { customer: { externalId: "webhook-user-2" } },
    });
    await POST(buildRequest("{}"));

    mockValidateEvent.mockReturnValueOnce({
      type: "subscription.revoked",
      data: { customer: { externalId: "webhook-user-2" } },
    });
    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("subscriptions").select().eq("userId", "webhook-user-2");
    expect(data?.at(-1)?.isPro).toBe(false);
  });

  it("서명 검증에 실패하면 400을 반환하고 DB를 갱신하지 않는다", async () => {
    const supabase = createServiceRoleClient();
    const { data: before } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");

    mockValidateEvent.mockImplementationOnce(() => {
      throw new MockWebhookVerificationError("bad signature");
    });

    const response = await POST(buildRequest("not-json"));
    expect(response.status).toBe(400);

    const { data: after } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");
    expect(after).toHaveLength(before?.length ?? 0);
  });

  it("관련 없는 이벤트 타입이면 400을 반환하고 DB를 갱신하지 않는다", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "checkout.created",
      data: {},
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(400);
  });
});
