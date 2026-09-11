---
id: pass-01-clean-service-wrapper
track: review
expect: pass
rule: N/A — 규칙을 위반하지 않는 정상 코드다. 리뷰어가 오탐(false positive)을 내지 않는지 확인하는 케이스.
---

```ts
// services/quota.ts — 서버 전용. 클라이언트 컴포넌트에서 import하지 않는다.
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { maskSensitiveData } from "@/lib/masking";
import Anthropic from "@anthropic-ai/sdk";

// ANTHROPIC_API_KEY는 여기서 참조하지 않는다 — SDK가 서버 환경변수에서 직접 읽는다.
const client = new Anthropic();

export async function checkQuotaAndSummarize(userId: string, statementText: string) {
  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, uploads_this_month")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  if (!profile.is_pro && profile.uploads_this_month >= 3) {
    throw new Error("무료 한도를 초과했습니다.");
  }

  const maskedText = maskSensitiveData(statementText);

  let message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: maskedText }],
    });
  } catch {
    throw new Error("명세서 분석에 실패했습니다.");
  }

  return message;
}
```
