import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QaCase, ReviewCase } from "./lib/types";

const fixtureReviewCase: ReviewCase = {
  track: "review",
  id: "r1",
  expect: "violation",
  rule: "규칙",
  code: "code",
  filePath: "r1.md",
};

const fixtureQaCase: QaCase = {
  track: "qa",
  id: "q1",
  question: "질문",
  must: ["사실1"],
  mustNot: [],
  guard: false,
  filePath: "q1.md",
};

const {
  mockLoadReviewCases,
  mockLoadQaCases,
  mockRunReviewSubject,
  mockRunQaSubject,
  mockJudgeReview,
  mockJudgeQa,
} = vi.hoisted(() => ({
  mockLoadReviewCases: vi.fn(),
  mockLoadQaCases: vi.fn(),
  mockRunReviewSubject: vi.fn(),
  mockRunQaSubject: vi.fn(),
  mockJudgeReview: vi.fn(),
  mockJudgeQa: vi.fn(),
}));

vi.mock("./lib/loadCases", () => ({
  loadReviewCases: mockLoadReviewCases,
  loadQaCases: mockLoadQaCases,
}));
vi.mock("./subjects/reviewSubject", () => ({ runReviewSubject: mockRunReviewSubject }));
vi.mock("./subjects/qaSubject", () => ({ runQaSubject: mockRunQaSubject }));
vi.mock("./judge/reviewJudge", () => ({ judgeReview: mockJudgeReview }));
vi.mock("./judge/qaJudge", () => ({ judgeQa: mockJudgeQa }));

const { main } = await import("./run");

beforeEach(() => {
  mockLoadReviewCases.mockReset().mockReturnValue([
    fixtureReviewCase,
    { ...fixtureReviewCase, id: "r2" },
    { ...fixtureReviewCase, id: "r3" },
    { ...fixtureReviewCase, id: "r4" },
    { ...fixtureReviewCase, id: "r5", expect: "pass" },
  ]);
  mockLoadQaCases.mockReset().mockReturnValue([
    fixtureQaCase,
    { ...fixtureQaCase, id: "q2" },
    { ...fixtureQaCase, id: "q3", guard: true },
  ]);
  mockRunReviewSubject.mockReset().mockResolvedValue({ hasViolation: true, violatedRule: "규칙", explanation: "" });
  mockRunQaSubject.mockReset().mockResolvedValue("답변");
  mockJudgeReview.mockReset().mockResolvedValue({ pass: true, reason: "ok" });
  mockJudgeQa.mockReset().mockResolvedValue({ pass: true, reason: "ok" });
});

describe("main", () => {
  it("모든 케이스가 통과하면 0을 반환한다", async () => {
    const code = await main();
    expect(code).toBe(0);
    expect(mockRunReviewSubject).toHaveBeenCalledTimes(5);
    expect(mockRunQaSubject).toHaveBeenCalledTimes(3);
  });

  it("하나라도 실패하면 1을 반환한다(회귀 게이트)", async () => {
    mockJudgeReview.mockResolvedValueOnce({ pass: false, reason: "놓침" });
    const code = await main();
    expect(code).toBe(1);
  });

  it("golden set 균형이 깨지면 subject/judge를 호출하지 않고 1을 반환한다", async () => {
    mockLoadReviewCases.mockReturnValue([fixtureReviewCase]);
    const code = await main();
    expect(code).toBe(1);
    expect(mockRunReviewSubject).not.toHaveBeenCalled();
    expect(mockRunQaSubject).not.toHaveBeenCalled();
  });
});
