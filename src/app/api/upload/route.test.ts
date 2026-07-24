// @vitest-environment node
import { describe, expect, it, beforeEach } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT } from "@/lib/quota";
import { POST } from "./route";
import type { NextRequest } from "next/server";

const VALID_CSV = `날짜,가맹점,금액
2026-07-01,스타벅스 강남점,4500
2026-07-02,GS25 편의점,3200
`;

// jsdom의 Request.formData()는 멀티파트 바디 파싱을 지원하지 않아 실제 Request 대신
// formData()만 구현한 최소 스텁으로 대체한다.
function buildRequest(csvContent: string, filename = "statement.csv"): NextRequest {
  const formData = new FormData();
  const file = new File([csvContent], filename, { type: "text/csv" });
  formData.append("file", file);
  return { formData: async () => formData } as unknown as NextRequest;
}

describe("POST /api/upload", () => {
  beforeEach(async () => {
    const supabase = await createServerClient();
    await supabase.auth.signInWithOAuth({ provider: "google" });
  });

  it("비로그인 상태면 401을 반환한다", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    const response = await POST(buildRequest(VALID_CSV));
    expect(response.status).toBe(401);
  });

  it("정상 CSV를 분석해서 uploads/transactions에 저장하고 결과를 반환한다", async () => {
    const response = await POST(buildRequest(VALID_CSV));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.blurred).toBe(false);
    expect(body.transactions).toHaveLength(2);
    expect(body.summaryText).toBeTruthy();

    const supabase = await createServerClient();
    const { data: uploads } = await supabase.from("uploads").select().eq("userId", "mock-user-1");
    const stored = uploads?.find((u) => u.rowCount === 2);
    expect(stored).toBeDefined();
    expect(stored?.storagePath).toMatch(/^mock-user-1\/[^/]+\.csv$/);
    expect(stored?.storagePath).not.toContain("statement.csv");

    const { data: transactions } = await supabase
      .from("transactions")
      .select()
      .eq("uploadId", stored!.id);
    expect(transactions).toHaveLength(2);
  });

  it("파일 크기가 2MB를 초과하면 400을 반환한다", async () => {
    const bigContent = "a".repeat(2 * 1024 * 1024 + 1);
    const response = await POST(buildRequest(bigContent));
    expect(response.status).toBe(400);
  });

  it("행 수가 2000행을 초과하면 400을 반환한다", async () => {
    const header = "날짜,가맹점,금액\n";
    const rows = Array.from({ length: 2001 }, (_, i) => `2026-07-01,가맹점${i},1000`).join("\n");
    const response = await POST(buildRequest(header + rows));
    expect(response.status).toBe(400);
  });

  it("무료 quota 소진 후에도 분석은 진행하되 blurred:true를 반환한다", async () => {
    const supabase = await createServerClient();
    const { data: before } = await supabase.from("uploads").select().eq("userId", "mock-user-1");
    const remaining = Math.max(0, FREE_MONTHLY_LIMIT - (before?.length ?? 0));

    for (let i = 0; i < remaining; i++) {
      const response = await POST(buildRequest(VALID_CSV));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.blurred).toBe(false);
    }

    const response = await POST(buildRequest(VALID_CSV));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.blurred).toBe(true);
    expect(body.transactions).toHaveLength(2);
  });
});
