import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types/transaction";
import { TransactionRow } from "./TransactionRow";

const transaction: Transaction = {
  id: "tx-1",
  uploadId: "up-1",
  userId: "user-1",
  date: "2026-07-01",
  merchant: "스타벅스 강남점",
  amount: 5500,
  category: "식비",
};

describe("TransactionRow", () => {
  it("renders merchant, date, category and mono amount", () => {
    render(<TransactionRow transaction={transaction} />);
    expect(screen.getByText("스타벅스 강남점")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
    expect(screen.getByText("식비")).toBeInTheDocument();
    const amount = screen.getByText("5,500");
    expect(amount.className).toContain("font-mono");
  });
});
