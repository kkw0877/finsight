import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewCase } from "../lib/types";
import type { ReviewSubjectOutput } from "../subjects/reviewSubject";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

const { judgeReview } = await import("./reviewJudge");

function textResponse(json: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

function reviewCase(overrides: Partial<ReviewCase> = {}): ReviewCase {
  return {
    track: "review",
    id: "r1",
    expect: "violation",
    rule: "규칙 설명",
    code: "code",
    filePath: "r1.md",
    ...overrides,
  };
}

function output(overrides: Partial<ReviewSubjectOutput> = {}): ReviewSubjectOutput {
  return { hasViolation: true, violatedRule: "규칙 설명", explanation: "설명", ...overrides };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("judgeReview", () => {
  it("Opus 5에 케이스와 리뷰어 출력을 보내고 pass/reason을 파싱한다", async () => {
    mockCreate.mockResolvedValueOnce(textResponse({ pass: true, reason: "정확히 잡았다" }));

    const result = await judgeReview(reviewCase(), output());

    expect(result).toEqual({ pass: true, reason: "정확히 잡았다" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-5",
        messages: [
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining('"expect":"violation"'),
          }),
        ],
      }),
    );
  });

  it("텍스트 블록이 없으면 에러를 던진다", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(judgeReview(reviewCase(), output())).rejects.toThrow(/텍스트 블록/);
  });
});
