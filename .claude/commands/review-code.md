GitHub PR을 correctness/security/architecture 3개 차원으로 병렬 리뷰하고, GitHub PR 인라인 코멘트 + 요약 리뷰로 게시한다.

인자(`$ARGUMENTS`)로 PR 번호를 받을 수 있다. 없으면 현재 브랜치의 열린 PR을 자동 감지한다.

## 1. 대상 PR 확정

```bash
gh pr view $ARGUMENTS --json number,url,headRefOid,headRefName,baseRefName,title
```

인자가 비어 있으면 `$ARGUMENTS` 없이 실행해 현재 브랜치의 PR을 찾는다. 결과가 없으면(현재 브랜치에 열린 PR 없음) 리뷰를 진행하지 말고 사용자에게 "먼저 PR을 열어달라"고 안내한 뒤 중단한다.

## 2. Diff와 변경 파일 확보

```bash
gh pr diff <PR번호>
gh pr view <PR번호> --json files --jq '.files[].path'
```

## 3. 3개 서브에이전트 병렬 호출

한 메시지 안에서 Agent 툴을 3번 호출한다(각각 `subagent_type`: `correctness-reviewer`, `security-reviewer`, `architecture-reviewer`). 세 호출 모두 동일한 프롬프트 내용을 받는다:

- 2단계에서 얻은 diff 전문
- 변경 파일 목록
- PR head 커밋 SHA(`headRefOid`) — 리뷰어가 `line`을 이 커밋 기준 실제 줄 번호로 산출해야 함을 명시

세 에이전트 모두 자기 파일(correctness-reviewer.md / security-reviewer.md / architecture-reviewer.md)에 정의된 `### FINDING` 블록 형식으로만 응답한다.

## 4. 결과 취합

세 응답에서 모든 `### FINDING` 블록을 모은다. 각 finding이 어느 에이전트(차원)에서 나왔는지 기억해 두되, 인라인 코멘트 형식에는 차원을 노출하지 않는다(형식은 5번 참고).

- 심각도 집계: critical=🔴, major=🟠, minor=🟡, nit=⚪ 개수를 센다.
- 판정: critical이 하나라도 있으면 **Blocked**, 없고 major가 있으면 **Changes Requested**, 둘 다 없으면 **Approve**.
- 같은 file+line에 여러 finding이 겹치면 인라인 코멘트 하나로 합치고(각 finding을 블록으로 이어붙임), 요약의 집계 수치에는 각각 반영한다.
- **diff 범위 확인**: GitHub PR review comments API는 diff의 변경 범위(hunk, `@@ -a,b +c,d @@`) 밖의 줄에는 인라인 코멘트를 달 수 없다(422로 전체 게시 실패). 각 finding의 file+line이 2단계에서 얻은 diff의 해당 파일 hunk `+` 범위 안에 있는지 확인하라. 범위 밖이면(리뷰어가 Read로 주변 파일 전체를 확인하다 나온 finding 등) 인라인 코멘트 대상에서 제외하고, 5번 PR 요약의 "Critical / Major" 목록에만 `<file>:<line>`으로 남긴다(집계 수치에는 그대로 반영).

## 5. 초안 렌더링 (게시 전, 반드시 먼저 보여줄 것)

아래 형식으로 채팅에 초안을 렌더링하고, **아직 게시하지 않는다**.

**인라인 코멘트** (finding별, 4줄):
```
[🔴 critical] <제목>
<TL;DR 한 문장>
✓ Good: <있으면, 없으면 이 줄 생략>
→ Fix: `<짧은 수정 코드/방향>`
```

**PR 요약** (1개):
```
## 판정: <Approve|Changes Requested|Blocked>

🔴 <n>  🟠 <n>  🟡 <n>  ⚪ <n>

### Walkthrough
<2~3줄, 이번 PR이 뭘 바꿨는지>

### 잘된 점
<findings의 good 항목을 모아 2~3개로 요약>

### Critical / Major
- <file>:<line> — <title>
- ...
(critical/major가 없으면 "critical/major 없음")

### 다음 액션
<구체적으로, 예: "critical 2건 수정 후 재요청" / "major는 머지 전 반영 권장">
```

각 인라인 코멘트가 어느 파일/줄에 달릴 예정인지도 함께 나열한다.

## 6. 게시 확인

사용자에게 "이대로 PR에 게시할까요?"라고 묻고 **명시적인 승인을 받을 때까지 다음 단계로 진행하지 않는다.** 사용자가 수정을 요청하면 초안을 고쳐 다시 보여준다.

## 7. 게시

승인을 받으면 스크래치패드에 리뷰 payload를 JSON 파일로 작성한다(문자열의 개행/따옴표는 올바르게 이스케이프):

```json
{
  "commit_id": "<headRefOid>",
  "body": "<5번의 PR 요약 markdown 전체>",
  "event": "<APPROVE|REQUEST_CHANGES>",
  "comments": [
    { "path": "<file>", "line": <line>, "side": "RIGHT", "body": "<5번의 인라인 코멘트 4줄>" }
  ]
}
```

판정 매핑: Approve → `APPROVE`, Changes Requested/Blocked → `REQUEST_CHANGES` (GitHub review event는 이 세 값만 지원하므로 Blocked도 REQUEST_CHANGES를 쓰되 요약 body의 "판정" 문구로 구분한다). finding이 하나도 없으면 `comments`는 빈 배열로 둔다.

```bash
gh api repos/{owner}/{repo}/pulls/<PR번호>/reviews --method POST --input <json파일 경로>
```

**본인이 작성한 PR인 경우 폴백**: 위 호출이 `"Can not request changes on your own pull request"`(또는 동일 취지의 self-review 관련) 메시지와 함께 422로 실패하면, GitHub가 PR 작성자 본인의 `APPROVE`/`REQUEST_CHANGES`를 막는 정책 때문이다(팀 레포에서 다른 사람 계정으로 실행하면 발생하지 않는다). 이 경우:

1. JSON 파일의 `event`를 `COMMENT`로 바꾼다.
2. `body`(PR 요약) 맨 앞에 `> ⚠️ PR 작성자 본인 계정으로 실행되어 GitHub 정책상 원래 판정(<Approve|Changes Requested|Blocked>)을 걸 수 없어 COMMENT로 게시됨\n\n`을 추가해, 실제 판정과 게시된 이벤트가 다르다는 걸 리뷰 본문에서 알 수 있게 한다.
3. 같은 명령으로 재시도한다.

성공하면 게시된 리뷰의 URL을 사용자에게 알린다.

## 범위 밖

- 이 명령은 correctness/security/architecture 3개 차원만 다룬다. performance, conventions, test coverage 등 나머지 차원은 아직 서브에이전트가 없다 — 필요하면 `.claude/agents/`에 같은 패턴으로 추가한다.
- 로컬에만 있고 PR이 없는 변경사항은 다루지 않는다(빠른 로컬 체크는 `/review`를 쓴다).
