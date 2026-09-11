import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { loadReviewCases, loadQaCases } from "./loadCases";
import { checkReviewBalance, checkQaBalance, checkUniqueIds } from "./balance";
import { extractCriticalRules } from "./criticalRules";

/**
 * cases/*.md golden set 자체를 대상으로 하는 회귀 게이트.
 * 네트워크·API 키 없이 `npm test`로 돌아가며, 라이브 채점(run.ts, `npm run eval`)을 실행하기 전에
 * "골든셋이 구조적으로 온전한가"를 먼저 보장한다.
 */
describe("review golden set", () => {
  const reviewCases = loadReviewCases();

  it("모든 케이스가 review 트랙이고 정상 파싱된다", () => {
    expect(reviewCases.length).toBeGreaterThan(0);
    for (const c of reviewCases) {
      expect(c.track).toBe("review");
      expect(c.code.length).toBeGreaterThan(0);
      expect(c.rule.length).toBeGreaterThan(0);
    }
  });

  it("violation 4개 이상 + 오탐 방지용 pass 1개 이상을 유지한다", () => {
    const balance = checkReviewBalance(reviewCases);
    expect(balance.ok, balance.issues.join("\n")).toBe(true);
  });

  it("id가 모두 유일하다", () => {
    expect(checkUniqueIds(reviewCases)).toEqual([]);
  });
});

describe("qa golden set", () => {
  const qaCases = loadQaCases();

  it("모든 케이스가 qa 트랙이고 정상 파싱된다", () => {
    expect(qaCases.length).toBeGreaterThan(0);
    for (const c of qaCases) {
      expect(c.track).toBe("qa");
      expect(c.question.length).toBeGreaterThan(0);
      expect(c.must.length).toBeGreaterThan(0);
    }
  });

  it("최소 3개 이상 + 틀린 전제를 반박하는 guard 케이스 1개 이상을 유지한다", () => {
    const balance = checkQaBalance(qaCases);
    expect(balance.ok, balance.issues.join("\n")).toBe(true);
  });

  it("id가 모두 유일하다", () => {
    expect(checkUniqueIds(qaCases)).toEqual([]);
  });
});

describe("전체 golden set", () => {
  it("review와 qa를 합쳐도 id가 유일하다", () => {
    expect(checkUniqueIds([...loadReviewCases(), ...loadQaCases()])).toEqual([]);
  });
});

describe("CLAUDE.md CRITICAL 룰 (review 트랙 시스템 프롬프트의 소스)", () => {
  it("CLAUDE.md에서 CRITICAL 룰을 하나 이상 추출할 수 있다", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const claudeMdPath = path.join(here, "..", "..", "..", "CLAUDE.md");
    const claudeMdText = fs.readFileSync(claudeMdPath, "utf-8");
    const rules = extractCriticalRules(claudeMdText);
    expect(rules.length).toBeGreaterThan(0);
  });
});
