---
id: violation-04-client-trusted-quota
track: review
expect: violation
rule: Free/Pro 분기는 is_pro 불리언 하나로 판단. quota 판정·블러 페이월 로직은 서버에서 강제(클라이언트 신뢰 금지).
---

```ts
// app/api/analysis/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // 클라이언트가 보낸 isPro 값을 그대로 신뢰해 quota 체크를 건너뛴다.
  const isPro: boolean = body.isPro;

  if (!isPro) {
    const usageThisMonth = body.usageCount ?? 0;
    if (usageThisMonth >= 3) {
      return new Response("무료 한도 초과", { status: 403 });
    }
  }

  return Response.json({ ok: true });
}
```
