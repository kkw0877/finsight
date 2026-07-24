import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@/lib/supabase/server";

const { mockCheckoutsCreate } = vi.hoisted(() => ({ mockCheckoutsCreate: vi.fn() }));

// route.ts는 services/polar.ts를 통해 실제 Polar API를 호출한다(step 15).
// 네트워크 호출 없이 결정적으로 동작해야 하므로 SDK를 목킹한다.
vi.mock("@polar-sh/sdk", () => ({
  Polar: vi.fn().mockImplementation(() => ({
    checkouts: { create: mockCheckoutsCreate },
  })),
}));

const { POST } = await import("./route");

describe("POST /api/checkout", () => {
  beforeEach(() => {
    mockCheckoutsCreate.mockReset();
    mockCheckoutsCreate.mockResolvedValue({ url: "https://polar.sh/checkout/abc" });
    vi.stubEnv("POLAR_PRODUCT_ID", "prod-123");
  });

  it("비로그인 상태면 401을 반환한다", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    const response = await POST();
    expect(response.status).toBe(401);

    await supabase.auth.signInWithOAuth({ provider: "google" });
  });

  it("로그인 상태면 체크아웃 URL을 반환하고 DB에는 아무 것도 쓰지 않는다", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signInWithOAuth({ provider: "google" });

    const { data: before } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");

    const response = await POST();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.url).toBe("https://polar.sh/checkout/abc");
    expect(mockCheckoutsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ products: ["prod-123"], externalCustomerId: "mock-user-1" }),
    );

    const { data: after } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");
    expect(after).toHaveLength(before?.length ?? 0);
  });
});
