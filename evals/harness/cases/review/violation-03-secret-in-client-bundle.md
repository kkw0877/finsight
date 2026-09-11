---
id: violation-03-secret-in-client-bundle
track: review
expect: violation
rule: 시크릿(Anthropic/Polar/Supabase service-role 키)은 services/ 래퍼를 통해 서버에서만 접근한다. NEXT_PUBLIC_ 접두사가 없는 환경변수는 클라이언트 번들에 절대 포함하지 않는다.
---

```tsx
"use client";

export function DebugPanel() {
  // 배포 환경에서 문제를 빠르게 확인하려고 넣은 임시 디버그 패널
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  return (
    <div className="text-xs text-gray-400">
      ANTHROPIC_API_KEY: {anthropicKey ? "설정됨" : "없음"}
    </div>
  );
}
```
