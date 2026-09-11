import type { QaCase, ReviewCase } from "./types";

const MIN_VIOLATION_CASES = 4;
const MIN_PASS_CASES = 1;
const MIN_QA_CASES = 3;
const MIN_GUARD_CASES = 1;

export interface ReviewBalance {
  violationCount: number;
  passCount: number;
  ok: boolean;
  issues: string[];
}

export interface QaBalance {
  total: number;
  guardCount: number;
  ok: boolean;
  issues: string[];
}

/** golden set 원칙: review 트랙은 위반 4개 이상 + 오탐 방지용 pass 1개 이상을 유지한다. */
export function checkReviewBalance(cases: ReviewCase[]): ReviewBalance {
  const violationCount = cases.filter((c) => c.expect === "violation").length;
  const passCount = cases.filter((c) => c.expect === "pass").length;
  const issues: string[] = [];
  if (violationCount < MIN_VIOLATION_CASES) {
    issues.push(`review violation 케이스가 ${MIN_VIOLATION_CASES}개 이상이어야 합니다 (현재 ${violationCount}개).`);
  }
  if (passCount < MIN_PASS_CASES) {
    issues.push(`review pass(오탐 방지) 케이스가 ${MIN_PASS_CASES}개 이상이어야 합니다 (현재 ${passCount}개).`);
  }
  return { violationCount, passCount, ok: issues.length === 0, issues };
}

/** golden set 원칙: qa 트랙은 최소 규모를 유지하고 틀린 전제를 반박하는 guard 케이스를 1개 이상 포함한다. */
export function checkQaBalance(cases: QaCase[]): QaBalance {
  const guardCount = cases.filter((c) => c.guard).length;
  const issues: string[] = [];
  if (cases.length < MIN_QA_CASES) {
    issues.push(`qa 케이스가 ${MIN_QA_CASES}개 이상이어야 합니다 (현재 ${cases.length}개).`);
  }
  if (guardCount < MIN_GUARD_CASES) {
    issues.push(`틀린 전제를 반박하는 guard 케이스가 ${MIN_GUARD_CASES}개 이상이어야 합니다 (현재 ${guardCount}개).`);
  }
  return { total: cases.length, guardCount, ok: issues.length === 0, issues };
}

export function checkUniqueIds(cases: { id: string; filePath: string }[]): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const c of cases) {
    const previousFilePath = seen.get(c.id);
    if (previousFilePath) {
      issues.push(`중복된 id "${c.id}": ${previousFilePath} / ${c.filePath}`);
    } else {
      seen.set(c.id, c.filePath);
    }
  }
  return issues;
}
