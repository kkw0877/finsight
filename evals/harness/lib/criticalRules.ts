const CRITICAL_LINE = /^-\s*CRITICAL:\s*(.+)$/;

/** CLAUDE.md 본문에서 "- CRITICAL: ..." 불릿만 뽑아낸다. 순수 함수 — 파일을 직접 읽지 않는다. */
export function extractCriticalRules(claudeMdText: string): string[] {
  return claudeMdText
    .split("\n")
    .map((line) => line.match(CRITICAL_LINE)?.[1]?.trim())
    .filter((rule): rule is string => Boolean(rule));
}

/**
 * review 트랙 subject(경량 리뷰어)의 시스템 프롬프트를 만든다.
 * CLAUDE.md의 CRITICAL 룰만 규칙으로 삼는다 — 스타일/취향 규칙은 위반 판단 대상이 아니다.
 */
export function buildReviewSystemPrompt(claudeMdText: string): string {
  const rules = extractCriticalRules(claudeMdText);
  if (rules.length === 0) {
    throw new Error("CLAUDE.md에서 CRITICAL 룰을 하나도 찾지 못했습니다.");
  }
  return [
    "너는 FinSight 코드베이스의 경량 코드 리뷰어다.",
    "다음은 이 프로젝트의 CRITICAL 규칙이다. 아래 규칙 위반 여부만 판단한다:",
    ...rules.map((rule, i) => `${i + 1}. ${rule}`),
    "",
    "주어진 코드 조각이 위 규칙 중 하나라도 위반하면 hasViolation=true로, 위반이 없으면 hasViolation=false로 응답한다.",
    "위 목록에 없는 스타일/취향 문제는 위반으로 판단하지 않는다.",
  ].join("\n");
}
