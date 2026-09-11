import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewCase } from "../lib/types";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

const { runReviewSubject } = await import("./reviewSubject");

const FIXTURE_CLAUDE_MD = `# 프로젝트
## 규칙
- CRITICAL: 클라이언트에서 직접 API를 호출하지 않는다.
`;

function textResponse(json: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

function reviewCase(overrides: Partial<ReviewCase> = {}): ReviewCase {
  return {
    track: "review",
    id: "r1",
    expect: "violation",
    rule: "규칙",
    code: "const x = 1;",
    filePath: "r1.md",
    ...overrides,
  };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("runReviewSubject", () => {
  it("Sonnet 5에 CRITICAL 룰 시스템 프롬프트와 코드를 보내고 결과를 파싱한다", async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse({ hasViolation: true, violatedRule: "클라이언트 직접 호출 금지", explanation: "이유" }),
    );

    const result = await runReviewSubject(reviewCase({ code: "fetch('https://api.anthropic.com')" }), FIXTURE_CLAUDE_MD);

    expect(result).toEqual({
      hasViolation: true,
      violatedRule: "클라이언트 직접 호출 금지",
      explanation: "이유",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-5",
        system: expect.stringContaining("클라이언트에서 직접 API를 호출하지 않는다."),
        messages: [{ role: "user", content: "fetch('https://api.anthropic.com')" }],
      }),
    );
  });

  it("temperature/top_p 등 sampling 파라미터를 보내지 않는다(Sonnet 5는 400)", async () => {
    mockCreate.mockResolvedValueOnce(textResponse({ hasViolation: false, violatedRule: "", explanation: "ok" }));

    await runReviewSubject(reviewCase(), FIXTURE_CLAUDE_MD);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("temperature");
    expect(callArgs).not.toHaveProperty("top_p");
    expect(callArgs).not.toHaveProperty("top_k");
  });

  it("텍스트 블록이 없으면 에러를 던진다", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(runReviewSubject(reviewCase(), FIXTURE_CLAUDE_MD)).rejects.toThrow(/텍스트 블록/);
  });
});
