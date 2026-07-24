import { describe, expect, it } from "vitest";
import { createBrowserClient } from "./client";

describe("createBrowserClient", () => {
  it("returns a client implementing the same SupabaseClientLike interface", async () => {
    const client = createBrowserClient();
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe("mock-user-1");
  });

  it("signInWithOAuth returns a redirect url", async () => {
    const client = createBrowserClient();
    const { data } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "/dashboard" },
    });
    expect(data.url).toBe("/dashboard");
  });
});
