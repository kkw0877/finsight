import { describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./supabase-admin";

describe("createServiceRoleClient", () => {
  it("inserts a row without requiring a signed-in session (RLS bypass)", async () => {
    const client = createServiceRoleClient();

    const { error: signOutError } = await client.auth.signOut();
    expect(signOutError).toBeNull();

    const { error: insertError } = await client.from("subscriptions").insert({
      userId: "webhook-only-user",
      isPro: true,
    });
    expect(insertError).toBeNull();

    const { data, error } = await client
      .from("subscriptions")
      .select()
      .eq("userId", "webhook-only-user")
      .single();
    expect(error).toBeNull();
    expect(data?.isPro).toBe(true);
  });
});
