# harness eval

FinSight의 **비즈니스 로직**(명세서 파싱·분류·인사이트)이 아니라, 이 레포에서 실제로 쓰는 개발 **하네스**(경량 리뷰어, 코드베이스 Q&A 응답자)가 CLAUDE.md 규칙을 제대로 따르는지 측정하는 회귀 게이트다.

## 왜 두 트랙인가

- **review**: 코드 조각을 보고 CLAUDE.md의 CRITICAL 규칙을 위반했는지 판단하는 경량 리뷰어를 검증한다. 위반을 놓치는 것(false negative)도, 정상 코드를 위반이라고 오탐하는 것(false positive)도 둘 다 실패다.
- **qa**: 라이브 CLAUDE.md를 컨텍스트로 코드베이스 관례·예외처리·gotcha에 대한 질문에 답하는 응답자를 검증한다. 사실 누락(must)뿐 아니라, 질문에 섞인 틀린 전제를 그대로 인정해버리는 것(mustNot)도 실패다.

## 구조

```
evals/harness/
  cases/
    review/   # frontmatter: id, track, expect(violation|pass), rule / 본문: 리뷰 대상 코드
    qa/       # frontmatter: id, track, must[], mustNot[], guard? / 본문: 질문
  lib/        # 순수 함수 — frontmatter 파싱, 케이스 변환, 무결성/균형 검사, 집계, 오케스트레이션
  subjects/   # 네트워크 호출 — review/qa 트랙의 subject(피험자)
  judge/      # 네트워크 호출 — Opus 5 LLM-as-judge
  run.ts      # 엔트리포인트: golden set 로드 → subject 실행 → judge 채점 → 집계 → exit code
```

- `lib/`는 파일시스템은 건드리되(`loadCases.ts`) **네트워크·API 키가 전혀 필요 없다.** `subjects/`, `judge/`, `run.ts`만 `@anthropic-ai/sdk`로 실제 호출을 한다. 이 경계 덕분에 골든셋 자체의 무결성(라벨 형식, 균형, id 중복)은 키 없이 `npm test`로 항상 검증할 수 있고, 비용이 드는 라이브 채점은 `npm run eval`로 분리했다.

## 실행

```bash
npm test        # lib/*.test.ts — 파서·집계·무결성/균형 검사 (키 불필요, 무료)
npm run eval     # run.ts — 실제 Sonnet 5(subject) + Opus 5(judge) 호출, 하나라도 fail이면 exit 1
```

`npm run eval`은 `ANTHROPIC_API_KEY`(또는 `ant auth login` 프로필)가 필요하고 실제 과금이 발생한다. CI 회귀 게이트로 쓸 경우 이 스크립트의 exit code만 확인하면 된다.

## 모델과 채점 방식

- **review subject**: `claude-sonnet-5`, 시스템 프롬프트는 `lib/criticalRules.ts`가 CLAUDE.md에서 `- CRITICAL: ...` 불릿만 뽑아 만든다(하드코딩 아님 — CLAUDE.md가 바뀌면 같이 바뀐다). Sonnet 5는 `temperature`/`top_p`/`top_k`를 받지 않으므로(400 에러) 결정성은 `thinking: disabled` + `effort: low` 조합으로 근사한다.
- **qa subject**: `claude-sonnet-5`, CLAUDE.md 전문을 시스템 프롬프트에 그대로 담아 질문에 답하게 한다.
- **judge**: 두 트랙 모두 `claude-opus-5`가 LLM-as-judge로 pass/fail + 근거를 구조화 출력(`output_config.format`)으로 채점한다. review는 `expect`/`rule`과 리뷰어 출력을 의미상 비교하고, qa는 `must`/`mustNot`과 답변을 비교한다.

## golden set 원칙

- **작게 시작한다.** 지금은 review 4 violation + 1 pass, qa 4개 + guard 1개뿐이다. 트랙마다 최소 개수(`lib/balance.ts`)만 게이트로 강제하고, 새 케이스는 실제로 하네스가 틀렸던 사례가 나올 때마다 추가한다. 처음부터 커버리지를 넓히려 하지 않는다.
- **라벨은 사람이 박제한다.** `expect`, `rule`, `must`, `mustNot`, `guard`는 모델이 아니라 케이스를 작성하는 사람이 CLAUDE.md를 직접 읽고 정한다. 라벨 자체를 모델에게 생성시키면 하네스가 스스로를 채점하는 순환 참조가 생긴다.
- **균형을 유지한다.** review는 위반 탐지력과 오탐 방지력을 모두 재야 하므로 violation과 pass 케이스가 함께 있어야 하고, qa는 사실 누락뿐 아니라 틀린 전제에 대한 반박(guard)도 함께 재야 한다. `npm test`가 이 균형을 케이스를 추가/삭제할 때마다 자동으로 확인한다.

## 케이스 추가하기

`cases/review/*.md` 또는 `cases/qa/*.md`에 파일을 추가한다. frontmatter는 최소 YAML 서브셋만 지원한다(`lib/frontmatter.ts`): `key: value` 스칼라와 `key:\n  - item` 리스트.

review 예시:

```markdown
---
id: violation-05-예시
track: review
expect: violation
rule: CLAUDE.md에서 위반해야 하는 규칙을 그대로 옮겨 적는다
---

리뷰 대상 코드(그대로 위반이 드러나야 한다)
```

qa 예시:

```markdown
---
id: qa-06-예시
track: qa
must:
  - 답변이 반드시 포함해야 하는 사실
mustNot:
  - 답변에 있으면 안 되는 오답/틀린 전제 수용
guard: false
---

질문 본문
```

추가한 뒤 `npm test`로 균형/무결성이 깨지지 않는지 확인하고, `npm run eval`로 실제 채점이 의도대로 pass/fail 나는지 확인한다.
