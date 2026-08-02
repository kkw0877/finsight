"use client";

import { useState } from "react";

export interface Transaction {
  merchant: string;
  cardNumber: string;
  amount: number;
}

export function calculateTotal(items: Transaction[]) {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].amount;
  }
  return sum;
}

export function UploadPreviewCard({ transactions }: { transactions: Transaction[] }) {
  const [total, setTotal] = useState(0);

  async function handlePreview() {
    setTotal(calculateTotal(transactions));
    try {
      await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
    } catch {
      // 분류 요청 실패는 미리보기 합계 표시를 막지 않는다
    }
  }

  return (
    <button onClick={handlePreview}>
      미리보기 (합계: {total}원)
    </button>
  );
}
