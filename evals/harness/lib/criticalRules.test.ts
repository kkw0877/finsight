import { describe, it, expect } from "vitest";
import { extractCriticalRules, buildReviewSystemPrompt } from "./criticalRules";

const FIXTURE_CLAUDE_MD = `# 프로젝트

## 아키텍처 규칙
- CRITICAL: 첫 번째 규칙이다.
- CRITICAL: 두 번째 규칙이다.
- Server Components 기본, 인터랙션이 필요한 곳만 Client Component.

## 개발 프로세스
- CRITICAL: 세 번째 규칙이다.
- 커밋 메시지는 conventional commits 형식을 따를 것
`;

describe("extractCriticalRules", () => {
  it("CRITICAL: 로 시작하는 불릿만 추출한다", () => {
    const rules = extractCriticalRules(FIXTURE_CLAUDE_MD);
    expect(rules).toEqual(["첫 번째 규칙이다.", "두 번째 규칙이다.", "세 번째 규칙이다."]);
  });

  it("CRITICAL 라인이 없으면 빈 배열을 반환한다", () => {
    expect(extractCriticalRules("# 그냥 문서\n일반 텍스트\n")).toEqual([]);
  });
});

describe("buildReviewSystemPrompt", () => {
  it("추출된 규칙을 번호 매겨 시스템 프롬프트에 포함한다", () => {
    const prompt = buildReviewSystemPrompt(FIXTURE_CLAUDE_MD);
    expect(prompt).toContain("1. 첫 번째 규칙이다.");
    expect(prompt).toContain("2. 두 번째 규칙이다.");
    expect(prompt).toContain("3. 세 번째 규칙이다.");
    expect(prompt).not.toContain("conventional commits");
  });

  it("CRITICAL 규칙이 없으면 에러를 던진다", () => {
    expect(() => buildReviewSystemPrompt("아무 규칙도 없음")).toThrow();
  });
});
