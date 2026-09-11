import { describe, it, expect } from "vitest";
import { checkReviewBalance, checkQaBalance, checkUniqueIds } from "./balance";
import type { QaCase, ReviewCase } from "./types";

function reviewCase(overrides: Partial<ReviewCase>): ReviewCase {
  return {
    track: "review",
    id: "r",
    expect: "violation",
    rule: "규칙",
    code: "code",
    filePath: "r.md",
    ...overrides,
  };
}

function qaCase(overrides: Partial<QaCase>): QaCase {
  return {
    track: "qa",
    id: "q",
    question: "질문",
    must: ["사실1"],
    mustNot: [],
    guard: false,
    filePath: "q.md",
    ...overrides,
  };
}

describe("checkReviewBalance", () => {
  it("violation 4개 + pass 1개 이상이면 ok다", () => {
    const cases = [
      reviewCase({ id: "v1" }),
      reviewCase({ id: "v2" }),
      reviewCase({ id: "v3" }),
      reviewCase({ id: "v4" }),
      reviewCase({ id: "p1", expect: "pass" }),
    ];
    const result = checkReviewBalance(cases);
    expect(result).toEqual({ violationCount: 4, passCount: 1, ok: true, issues: [] });
  });

  it("violation이 4개 미만이면 issue를 보고한다", () => {
    const cases = [reviewCase({ id: "v1" }), reviewCase({ id: "p1", expect: "pass" })];
    const result = checkReviewBalance(cases);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("violation"))).toBe(true);
  });

  it("pass 케이스가 없으면 issue를 보고한다", () => {
    const cases = [
      reviewCase({ id: "v1" }),
      reviewCase({ id: "v2" }),
      reviewCase({ id: "v3" }),
      reviewCase({ id: "v4" }),
    ];
    const result = checkReviewBalance(cases);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("pass"))).toBe(true);
  });
});

describe("checkQaBalance", () => {
  it("케이스 3개 이상 + guard 1개 이상이면 ok다", () => {
    const cases = [qaCase({ id: "q1" }), qaCase({ id: "q2" }), qaCase({ id: "q3", guard: true })];
    const result = checkQaBalance(cases);
    expect(result).toEqual({ total: 3, guardCount: 1, ok: true, issues: [] });
  });

  it("guard 케이스가 없으면 issue를 보고한다", () => {
    const cases = [qaCase({ id: "q1" }), qaCase({ id: "q2" }), qaCase({ id: "q3" })];
    const result = checkQaBalance(cases);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("guard"))).toBe(true);
  });

  it("총 케이스가 부족하면 issue를 보고한다", () => {
    const cases = [qaCase({ id: "q1", guard: true })];
    const result = checkQaBalance(cases);
    expect(result.ok).toBe(false);
  });
});

describe("checkUniqueIds", () => {
  it("id가 모두 유일하면 issue가 없다", () => {
    const issues = checkUniqueIds([
      { id: "a", filePath: "a.md" },
      { id: "b", filePath: "b.md" },
    ]);
    expect(issues).toEqual([]);
  });

  it("중복 id가 있으면 두 파일 경로를 포함한 issue를 반환한다", () => {
    const issues = checkUniqueIds([
      { id: "a", filePath: "a.md" },
      { id: "a", filePath: "a2.md" },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("a.md");
    expect(issues[0]).toContain("a2.md");
  });
});
