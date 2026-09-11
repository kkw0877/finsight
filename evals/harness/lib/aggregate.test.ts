import { describe, it, expect } from "vitest";
import { summarizeRun, exitCodeForSummary, formatSummary } from "./aggregate";
import type { JudgeVerdict } from "./types";

const verdicts: JudgeVerdict[] = [
  { caseId: "r1", track: "review", pass: true, reason: "ok" },
  { caseId: "r2", track: "review", pass: false, reason: "위반을 놓침" },
  { caseId: "q1", track: "qa", pass: true, reason: "ok" },
];

describe("summarizeRun", () => {
  it("트랙별로 통과/실패를 집계한다", () => {
    const summary = summarizeRun(verdicts);
    expect(summary.total).toBe(3);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.failures).toEqual([{ caseId: "r2", track: "review", pass: false, reason: "위반을 놓침" }]);

    const review = summary.tracks.find((t) => t.track === "review");
    expect(review).toEqual({
      track: "review",
      total: 2,
      passed: 1,
      failed: 1,
      failures: [{ caseId: "r2", track: "review", pass: false, reason: "위반을 놓침" }],
    });

    const qa = summary.tracks.find((t) => t.track === "qa");
    expect(qa).toEqual({ track: "qa", total: 1, passed: 1, failed: 0, failures: [] });
  });

  it("결과가 없는 트랙은 요약에서 제외한다", () => {
    const summary = summarizeRun([{ caseId: "q1", track: "qa", pass: true, reason: "ok" }]);
    expect(summary.tracks).toHaveLength(1);
    expect(summary.tracks[0].track).toBe("qa");
  });

  it("빈 배열이면 전부 0이다", () => {
    const summary = summarizeRun([]);
    expect(summary).toEqual({ tracks: [], total: 0, passed: 0, failed: 0, failures: [] });
  });
});

describe("exitCodeForSummary", () => {
  it("실패가 하나라도 있으면 1을 반환한다", () => {
    expect(exitCodeForSummary(summarizeRun(verdicts))).toBe(1);
  });

  it("전부 통과하면 0을 반환한다", () => {
    const allPass = verdicts.map((v) => ({ ...v, pass: true }));
    expect(exitCodeForSummary(summarizeRun(allPass))).toBe(0);
  });

  it("케이스가 하나도 없어도 0을 반환한다", () => {
    expect(exitCodeForSummary(summarizeRun([]))).toBe(0);
  });
});

describe("formatSummary", () => {
  it("실패 케이스의 사유를 포함한 사람이 읽을 수 있는 요약을 만든다", () => {
    const text = formatSummary(summarizeRun(verdicts));
    expect(text).toContain("review");
    expect(text).toContain("FAIL r2");
    expect(text).toContain("위반을 놓침");
    expect(text).toContain("TOTAL: 2/3");
  });
});
