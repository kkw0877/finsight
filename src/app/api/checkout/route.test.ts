import { describe, expect, it } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

describe("POST /api/checkout", () => {
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
    expect(body.url).toBe("/mock-checkout?user=mock-user-1");

    const { data: after } = await supabase.from("subscriptions").select().eq("userId", "mock-user-1");
    expect(after).toHaveLength(before?.length ?? 0);
  });
});
