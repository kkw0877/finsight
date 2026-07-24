// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { GET } from "./route";
import type { NextRequest } from "next/server";

function buildRequest(url: string): NextRequest {
  return { nextUrl: new URL(url), url } as unknown as NextRequest;
}

describe("GET /api/auth/callback", () => {
  it("code가 있으면 세션을 교환하고 /dashboard로 리다이렉트한다", async () => {
    const response = await GET(buildRequest("http://localhost:3000/api/auth/callback?code=abc123"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("code가 없으면 /login으로 리다이렉트한다", async () => {
    const response = await GET(buildRequest("http://localhost:3000/api/auth/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("세션 교환 결과 로그인 상태가 반영된다", async () => {
    await GET(buildRequest("http://localhost:3000/api/auth/callback?code=abc123"));

    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    expect(data.user).not.toBeNull();
  });
});
