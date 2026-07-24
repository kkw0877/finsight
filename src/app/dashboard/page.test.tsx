import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({
    id: "mock-user-1",
    email: "mock-user@example.com",
    name: "Mock User",
  })),
}));

import DashboardPage from "./page";
import { createServerClient } from "@/lib/supabase/server";

describe("DashboardPage", () => {
  it("업로드 내역이 없으면 안내 문구를 보여준다", async () => {
    const jsx = await DashboardPage();
    render(jsx);
    expect(screen.getByText("아직 업로드한 명세서가 없습니다.")).toBeInTheDocument();
  });

  it("최근 업로드의 거래내역을 집계해서 렌더링한다", async () => {
    const supabase = await createServerClient();
    await supabase.from("uploads").insert({
      id: "upload-1",
      userId: "mock-user-1",
      storagePath: "mock-user-1/upload-1.csv",
      status: "success",
      rowCount: 1,
      createdAt: new Date().toISOString(),
    });
    await supabase.from("transactions").insert({
      id: "t1",
      uploadId: "upload-1",
      userId: "mock-user-1",
      date: new Date().toISOString().slice(0, 10),
      merchant: "스타벅스",
      amount: 5000,
      category: "식비",
    });

    const jsx = await DashboardPage();
    render(jsx);
    expect(screen.getByText("스타벅스")).toBeInTheDocument();
  });
});
