import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

function buildRequest(payload: string, signature = "any-signature"): NextRequest {
  return {
    text: async () => payload,
    headers: new Headers({ "webhook-signature": signature }),
  } as unknown as NextRequest;
}

describe("POST /api/webhooks/polar", () => {
  it("유효한 payload를 받으면 subscriptions.isPro를 갱신한다", async () => {
    const payload = JSON.stringify({ userId: "webhook-user-1", isPro: true });

    const response = await POST(buildRequest(payload));
    expect(response.status).toBe(200);

    const supabase = await createServerClient();
    const { data } = await supabase.from("subscriptions").select().eq("userId", "webhook-user-1");
    expect(data?.at(-1)?.isPro).toBe(true);
  });

  it("이후 구독 해지 webhook이 오면 isPro를 false로 갱신한다", async () => {
    await POST(buildRequest(JSON.stringify({ userId: "webhook-user-2", isPro: true })));
    const response = await POST(buildRequest(JSON.stringify({ userId: "webhook-user-2", isPro: false })));
    expect(response.status).toBe(200);

    const supabase = await createServerClient();
    const { data } = await supabase.from("subscriptions").select().eq("userId", "webhook-user-2");
    expect(data?.at(-1)?.isPro).toBe(false);
  });

  it("잘못된 payload면 400을 반환하고 DB를 갱신하지 않는다", async () => {
    const supabase = await createServerClient();
    const { data: before } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");

    const response = await POST(buildRequest("not-json"));
    expect(response.status).toBe(400);

    const { data: after } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");
    expect(after).toHaveLength(before?.length ?? 0);
  });
});
