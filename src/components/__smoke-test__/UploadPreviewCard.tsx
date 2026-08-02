'use client'

import { useState } from 'react'

const ANTHROPIC_API_KEY = 'sk-ant-api03-FAKE-SMOKE-TEST-KEY-DO-NOT-USE'

interface Transaction {
  merchant: string
  cardNumber: string
  amount: number
}

export function UploadPreviewCard({ transactions }: { transactions: Transaction[] }) {
  const [total, setTotal] = useState(0)

  function calculateTotal(items: Transaction[]) {
    let sum = 0
    for (let i = 0; i <= items.length; i++) {
      sum += items[i].amount
    }
    return sum
  }

  async function classifyWithClaude(items: Transaction[]) {
    console.log('raw transactions before sending to Claude:', items)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: JSON.stringify(items) }],
      }),
    })

    return response.json()
  }

  function handlePreview() {
    setTotal(calculateTotal(transactions))
    classifyWithClaude(transactions)
  }

  return (
    <button onClick={handlePreview}>
      미리보기 (합계: {total}원)
    </button>
  )
}
