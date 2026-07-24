import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/types/transaction";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

const { classifyAndSummarize, parseCsvToTransactions } = await import("./claude");

const UPLOAD_ID = "upload-1";
const USER_ID = "user-1";

function textResponse(json: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("parseCsvToTransactions", () => {
  it("maps Claude's parsed rows into Transaction objects", async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse({
        transactions: [
          { date: "2026-07-01", merchant: "스타벅스 강남점", amount: 4500 },
          { date: "2026-07-02", merchant: "쿠팡", amount: 32000 },
        ],
      }),
    );

    const transactions = await parseCsvToTransactions("csv-content", UPLOAD_ID, USER_ID);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      uploadId: UPLOAD_ID,
      userId: USER_ID,
      date: "2026-07-01",
      merchant: "스타벅스 강남점",
      amount: 4500,
      category: "기타",
    });
    expect(transactions[0].id).toEqual(expect.any(String));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5" }));
  });

  it("throws on empty input without calling the API", async () => {
    await expect(parseCsvToTransactions("", UPLOAD_ID, USER_ID)).rejects.toThrow();
    await expect(parseCsvToTransactions("   \n  \n", UPLOAD_ID, USER_ID)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when Claude returns no parseable transactions", async () => {
    mockCreate.mockResolvedValueOnce(textResponse({ transactions: [] }));
    await expect(parseCsvToTransactions("garbled csv", UPLOAD_ID, USER_ID)).rejects.toThrow();
  });

  it("throws a generic error without leaking failure details when the API call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network exploded with sensitive info"));
    await expect(parseCsvToTransactions("csv", UPLOAD_ID, USER_ID)).rejects.toThrow(
      "CSV 분석에 실패했습니다.",
    );
  });

  it("throws a generic error when Claude's response is not valid JSON", async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "not json" }] });
    await expect(parseCsvToTransactions("csv", UPLOAD_ID, USER_ID)).rejects.toThrow(
      "CSV 분석에 실패했습니다.",
    );
  });
});

describe("classifyAndSummarize", () => {
  function tx(overrides: Partial<Transaction>): Transaction {
    return {
      id: crypto.randomUUID(),
      uploadId: UPLOAD_ID,
      userId: USER_ID,
      date: "2026-07-01",
      merchant: "기타상점",
      amount: 1000,
      category: "기타",
      ...overrides,
    };
  }

  it("applies Claude's category classifications to each transaction", async () => {
    const t1 = tx({ merchant: "스타벅스 강남점", amount: 4500 });
    const t2 = tx({ merchant: "지하철 교통카드", amount: 1500 });

    mockCreate.mockResolvedValueOnce(
      textResponse({
        classifications: [
          { id: t1.id, category: "식비" },
          { id: t2.id, category: "교통" },
        ],
        summaryText: "이번 달은 식비와 교통비 지출이 두드러졌습니다.",
      }),
    );

    const result = await classifyAndSummarize([t1, t2]);

    expect(result.transactions.find((t) => t.id === t1.id)?.category).toBe("식비");
    expect(result.transactions.find((t) => t.id === t2.id)?.category).toBe("교통");
    expect(result.summaryText).toBe("이번 달은 식비와 교통비 지출이 두드러졌습니다.");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-5" }));
  });

  it("falls back to 기타 when Claude returns a category outside the fixed 9 or omits a transaction", async () => {
    const t1 = tx({ merchant: "알수없는가맹점" });
    const t2 = tx({ merchant: "다른가맹점" });

    mockCreate.mockResolvedValueOnce(
      textResponse({
        classifications: [{ id: t1.id, category: "존재하지않는카테고리" }],
        summaryText: "요약",
      }),
    );

    const result = await classifyAndSummarize([t1, t2]);

    expect(result.transactions.find((t) => t.id === t1.id)?.category).toBe("기타");
    expect(result.transactions.find((t) => t.id === t2.id)?.category).toBe("기타");
  });

  it("computes category totals and monthly trend deterministically from classified transactions", async () => {
    const t1 = tx({ merchant: "스타벅스", amount: 3000, date: "2026-07-01" });
    const t2 = tx({ merchant: "쿠팡", amount: 7000, date: "2026-07-02" });

    mockCreate.mockResolvedValueOnce(
      textResponse({
        classifications: [
          { id: t1.id, category: "식비" },
          { id: t2.id, category: "쇼핑" },
        ],
        summaryText: "요약",
      }),
    );

    const result = await classifyAndSummarize([t1, t2]);

    const totalPercentage = result.categoryTotals.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 0);
    expect(result.categoryTotals.find((c) => c.category === "쇼핑")?.total).toBe(7000);
    expect(result.categoryTotals.find((c) => c.category === "식비")?.total).toBe(3000);
    expect(result.monthlyTrend).toEqual([{ month: "2026-07", total: 10000 }]);
  });

  it("falls back to a computed summary when Claude omits summaryText", async () => {
    const t1 = tx({ merchant: "스타벅스", amount: 420000 });

    mockCreate.mockResolvedValueOnce(
      textResponse({ classifications: [{ id: t1.id, category: "식비" }], summaryText: "" }),
    );

    const result = await classifyAndSummarize([t1]);

    expect(result.summaryText).toContain("식비");
    expect(result.summaryText).toContain("420,000");
  });

  it("returns an empty result without calling the API when there are no transactions", async () => {
    const result = await classifyAndSummarize([]);

    expect(result.categoryTotals).toEqual([]);
    expect(result.monthlyTrend).toEqual([]);
    expect(result.summaryText).toEqual(expect.any(String));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws a generic error without leaking details when the API call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network exploded"));
    await expect(classifyAndSummarize([tx({})])).rejects.toThrow("거래 분류에 실패했습니다.");
  });
});
