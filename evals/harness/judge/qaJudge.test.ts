import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QaCase } from "../lib/types";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

const { judgeQa } = await import("./qaJudge");

function textResponse(json: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

function qaCase(overrides: Partial<QaCase> = {}): QaCase {
  return {
    track: "qa",
    id: "q1",
    question: "질문",
    must: ["사실1", "사실2"],
    mustNot: ["오답1"],
    guard: false,
    filePath: "q1.md",
    ...overrides,
  };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("judgeQa", () => {
  it("Opus 5에 must/mustNot과 답변을 보내고 pass/reason을 파싱한다", async () => {
    mockCreate.mockResolvedValueOnce(textResponse({ pass: false, reason: "사실2가 빠졌다" }));

    const result = await judgeQa(qaCase(), "답변 텍스트");

    expect(result).toEqual({ pass: false, reason: "사실2가 빠졌다" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-5",
        messages: [
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining('"must":["사실1","사실2"]'),
          }),
        ],
      }),
    );
  });

  it("텍스트 블록이 없으면 에러를 던진다", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(judgeQa(qaCase(), "답변")).rejects.toThrow(/텍스트 블록/);
  });
});
