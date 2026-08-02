import { describe, expect, it } from "vitest";
import { calculateTotal } from "./UploadPreviewCard";

describe("calculateTotal", () => {
  it("빈 배열이면 0을 반환한다", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("여러 거래의 금액 합계를 반환한다", () => {
    const transactions = [
      { merchant: "스타벅스", cardNumber: "1234", amount: 5000 },
      { merchant: "쿠팡", cardNumber: "1234", amount: 12000 },
    ];
    expect(calculateTotal(transactions)).toBe(17000);
  });
});
