import { describe, expect, it } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

describe("POST /api/auth/signin", () => {
  it("signs the mock user in on the server-side session", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    const response = await POST();
    expect(response.status).toBe(200);

    const { data } = await supabase.auth.getUser();
    expect(data.user?.id).toBe("mock-user-1");
  });
});
