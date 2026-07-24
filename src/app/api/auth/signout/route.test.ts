import { describe, expect, it } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

describe("POST /api/auth/signout", () => {
  it("signs the mock user out of the server-side session", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signInWithOAuth({ provider: "google" });

    const response = await POST();
    expect(response.status).toBe(200);

    const { data } = await supabase.auth.getUser();
    expect(data.user).toBeNull();
  });
});
