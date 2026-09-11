import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

describe("POST /api/auth/signin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs the mock user in on the server-side session", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    const response = await POST();
    expect(response.status).toBe(200);

    const { data } = await supabase.auth.getUser();
    expect(data.user?.id).toBe("mock-user-1");
  });

  it("Vercel Preview 환경(VERCEL_ENV=preview)에서는 403과 에러 메시지를 반환한다", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    const response = await POST();
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
