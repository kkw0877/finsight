---
id: violation-01-client-side-claude-call
track: review
expect: violation
rule: 모든 외부 API 호출(Claude, Polar, Supabase 관리자 기능)은 app/api/ 라우트 핸들러 또는 services/ 에서만 수행. 클라이언트 컴포넌트에서 직접 호출 금지.
---

```tsx
"use client";

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function SummaryButton({ statementText }: { statementText: string }) {
  async function handleClick() {
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: `요약해줘: ${statementText}` }],
    });
    console.log(res);
  }

  return <button onClick={handleClick}>요약 생성</button>;
}
```
