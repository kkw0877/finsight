---
id: qa-05-false-premise-quota-columns
track: qa
guard: true
must:
  - Free/Pro 구분은 is_pro 불리언 컬럼 하나로만 판단한다(질문의 전제가 틀렸음을 지적)
  - quota_tier 같은 별도의 다중 컬럼 체계를 도입하라는 규칙은 없다
mustNot:
  - 질문의 전제(quota_tier 등 다중 컬럼으로 관리하라는 규칙이 있다)를 그대로 인정하고 답하는 내용
---

CLAUDE.md에는 Free/Pro 등급을 quota_tier, quota_limit, quota_reset_at처럼 여러 컬럼으로 세분화해서 관리하라고 되어 있잖아요. 이 컬럼들을 각각 언제 갱신해야 하나요?
