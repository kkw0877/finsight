import { describe, it, expect, vi } from "vitest";
import { runReviewTrack, runQaTrack } from "./orchestrate";
import type { QaCase, ReviewCase } from "./types";
import type { ReviewSubjectOutput } from "../subjects/reviewSubject";

function reviewCase(overrides: Partial<ReviewCase> = {}): ReviewCase {
  return {
    track: "review",
    id: "r1",
    expect: "violation",
    rule: "규칙",
    code: "code",
    filePath: "r1.md",
    ...overrides,
  };
}

function qaCase(overrides: Partial<QaCase> = {}): QaCase {
  return {
    track: "qa",
    id: "q1",
    question: "질문",
    must: ["사실1"],
    mustNot: [],
    guard: false,
    filePath: "q1.md",
    ...overrides,
  };
}

const subjectOutput: ReviewSubjectOutput = { hasViolation: true, violatedRule: "규칙", explanation: "설명" };

describe("runReviewTrack", () => {
  it("각 케이스마다 subject -> judge 순서로 호출하고 JudgeVerdict를 만든다", async () => {
    const cases = [reviewCase({ id: "r1" }), reviewCase({ id: "r2" })];
    const runSubject = vi.fn().mockResolvedValue(subjectOutput);
    const judge = vi
      .fn()
      .mockResolvedValueOnce({ pass: true, reason: "ok" })
      .mockResolvedValueOnce({ pass: false, reason: "놓침" });
    const onCaseDone = vi.fn();

    const verdicts = await runReviewTrack(cases, "claude md text", { runSubject, judge, onCaseDone });

    expect(verdicts).toEqual([
      { caseId: "r1", track: "review", pass: true, reason: "ok" },
      { caseId: "r2", track: "review", pass: false, reason: "놓침" },
    ]);
    expect(runSubject).toHaveBeenNthCalledWith(1, cases[0], "claude md text");
    expect(judge).toHaveBeenNthCalledWith(1, cases[0], subjectOutput);
    expect(onCaseDone).toHaveBeenCalledTimes(2);
  });

  it("케이스가 없으면 빈 배열을 반환하고 subject/judge를 호출하지 않는다", async () => {
    const runSubject = vi.fn();
    const judge = vi.fn();
    const verdicts = await runReviewTrack([], "md", { runSubject, judge });
    expect(verdicts).toEqual([]);
    expect(runSubject).not.toHaveBeenCalled();
    expect(judge).not.toHaveBeenCalled();
  });
});

describe("runQaTrack", () => {
  it("각 케이스마다 subject -> judge 순서로 호출하고 JudgeVerdict를 만든다", async () => {
    const cases = [qaCase({ id: "q1" })];
    const runSubject = vi.fn().mockResolvedValue("답변");
    const judge = vi.fn().mockResolvedValue({ pass: true, reason: "ok" });

    const verdicts = await runQaTrack(cases, "claude md text", { runSubject, judge });

    expect(verdicts).toEqual([{ caseId: "q1", track: "qa", pass: true, reason: "ok" }]);
    expect(runSubject).toHaveBeenCalledWith(cases[0], "claude md text");
    expect(judge).toHaveBeenCalledWith(cases[0], "답변");
  });
});
