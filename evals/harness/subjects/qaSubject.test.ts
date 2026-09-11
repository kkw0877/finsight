import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QaCase } from "../lib/types";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

const { runQaSubject } = await import("./qaSubject");

const FIXTURE_CLAUDE_MD = "# 프로젝트\n- CRITICAL: 어떤 규칙\n";

function textResponse(json: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

function qaCase(overrides: Partial<QaCase> = {}): QaCase {
  return {
    track: "qa",
    id: "q1",
    question: "질문입니다.",
    must: ["사실1"],
    mustNot: [],
    guard: false,
    filePath: "q1.md",
    ...overrides,
  };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("runQaSubject", () => {
  it("라이브 CLAUDE.md 전문을 시스템 프롬프트에 담아 질문에 답한다", async () => {
    mockCreate.mockResolvedValueOnce(textResponse({ answer: "답변입니다." }));

    const result = await runQaSubject(qaCase({ question: "이건 되나요?" }), FIXTURE_CLAUDE_MD);

    expect(result).toBe("답변입니다.");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-5",
        system: expect.stringContaining("- CRITICAL: 어떤 규칙"),
        messages: [{ role: "user", content: "이건 되나요?" }],
      }),
    );
  });

  it("텍스트 블록이 없으면 에러를 던진다", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(runQaSubject(qaCase(), FIXTURE_CLAUDE_MD)).rejects.toThrow(/텍스트 블록/);
  });
});
