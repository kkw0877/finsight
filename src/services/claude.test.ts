import { describe, expect, it } from "vitest";
import { classifyAndSummarize, parseCsvToTransactions } from "./claude";
import type { Transaction } from "@/types/transaction";

const UPLOAD_ID = "upload-1";
const USER_ID = "user-1";

describe("parseCsvToTransactions", () => {
  it("parses a normal CSV with a header row into transactions", async () => {
    const csv = ["날짜,가맹점,금액", "2026-07-01,스타벅스 강남점,4500", "2026-07-02,쿠팡,32000"].join(
      "\n",
    );

    const transactions = await parseCsvToTransactions(csv, UPLOAD_ID, USER_ID);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      uploadId: UPLOAD_ID,
      userId: USER_ID,
      date: "2026-07-01",
      merchant: "스타벅스 강남점",
      amount: 4500,
    });
    expect(transactions[0].id).toEqual(expect.any(String));
    expect(transactions[1]).toMatchObject({
      date: "2026-07-02",
      merchant: "쿠팡",
      amount: 32000,
    });
  });

  it("parses a CSV without a header row", async () => {
    const csv = "2026-07-01,이마트,15000";

    const transactions = await parseCsvToTransactions(csv, UPLOAD_ID, USER_ID);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ date: "2026-07-01", merchant: "이마트", amount: 15000 });
  });

  it("throws on empty input", async () => {
    await expect(parseCsvToTransactions("", UPLOAD_ID, USER_ID)).rejects.toThrow();
    await expect(parseCsvToTransactions("   \n  \n", UPLOAD_ID, USER_ID)).rejects.toThrow();
  });

  it("throws when a row has no parseable date/amount", async () => {
    const csv = "날짜,가맹점,금액\n이것은,파싱할,수없는,행입니다";
    await expect(parseCsvToTransactions(csv, UPLOAD_ID, USER_ID)).rejects.toThrow();
  });

  it("throws when only a header row is present", async () => {
    const csv = "날짜,가맹점,금액";
    await expect(parseCsvToTransactions(csv, UPLOAD_ID, USER_ID)).rejects.toThrow();
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

  it("assigns categories from merchant keywords", async () => {
    const transactions = [
      tx({ merchant: "스타벅스 강남점", amount: 4500 }),
      tx({ merchant: "GS25 편의점", amount: 3000 }),
      tx({ merchant: "지하철 교통카드", amount: 1500 }),
      tx({ merchant: "넷플릭스", amount: 17000 }),
    ];

    const result = await classifyAndSummarize(transactions);

    expect(result.transactions[0].category).toBe("식비");
    expect(result.transactions[1].category).toBe("식비");
    expect(result.transactions[2].category).toBe("교통");
    expect(result.transactions[3].category).toBe("구독서비스");
  });

  it("falls back to 기타 for unmatched merchants", async () => {
    const result = await classifyAndSummarize([tx({ merchant: "알수없는가맹점" })]);
    expect(result.transactions[0].category).toBe("기타");
  });

  it("computes category totals with percentages summing near 100", async () => {
    const transactions = [
      tx({ merchant: "스타벅스", amount: 3000, date: "2026-07-01" }),
      tx({ merchant: "쿠팡", amount: 7000, date: "2026-07-02" }),
    ];

    const result = await classifyAndSummarize(transactions);

    const totalPercentage = result.categoryTotals.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 0);
    expect(result.categoryTotals.find((c) => c.category === "쇼핑")?.total).toBe(7000);
    expect(result.categoryTotals.find((c) => c.category === "식비")?.total).toBe(3000);
  });

  it("computes monthly trend grouped by year-month", async () => {
    const transactions = [
      tx({ date: "2026-06-15", amount: 1000 }),
      tx({ date: "2026-07-01", amount: 2000 }),
      tx({ date: "2026-07-20", amount: 3000 }),
    ];

    const result = await classifyAndSummarize(transactions);

    expect(result.monthlyTrend).toEqual([
      { month: "2026-06", total: 1000 },
      { month: "2026-07", total: 5000 },
    ]);
  });

  it("generates a natural-language summary mentioning the top category", async () => {
    const transactions = [tx({ merchant: "스타벅스", amount: 420000 })];

    const result = await classifyAndSummarize(transactions);

    expect(result.summaryText).toContain("식비");
    expect(result.summaryText).toContain("420,000");
  });

  it("returns a fallback summary for empty transactions", async () => {
    const result = await classifyAndSummarize([]);
    expect(result.categoryTotals).toEqual([]);
    expect(result.monthlyTrend).toEqual([]);
    expect(result.summaryText).toEqual(expect.any(String));
  });
});
