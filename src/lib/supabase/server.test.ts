import { describe, expect, it } from "vitest";
import { createServerClient } from "./server";

describe("createServerClient", () => {
  it("resolves a client backed by a fixed mock logged-in user", async () => {
    const client = await createServerClient();
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe("mock-user-1");
  });

  it("supports inserting and reading back a row", async () => {
    const client = await createServerClient();
    const { error: insertError } = await client.from("subscriptions").insert({
      userId: "mock-user-1",
      isPro: true,
    });
    expect(insertError).toBeNull();

    const { data, error } = await client.from("subscriptions").select().eq("userId", "mock-user-1").single();
    expect(error).toBeNull();
    expect(data?.isPro).toBe(true);
  });
});
