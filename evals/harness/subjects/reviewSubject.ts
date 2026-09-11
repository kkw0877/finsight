import Anthropic from "@anthropic-ai/sdk";
import { buildReviewSystemPrompt } from "../lib/criticalRules";
import type { ReviewCase } from "../lib/types";

/**
 * 리뷰 트랙의 subject: 경량 리뷰어 (Sonnet 5, CLAUDE.md CRITICAL 룰 요약을 시스템 프롬프트로).
 * Sonnet 5는 temperature/top_p/top_k를 받지 않는다(400) — 결정성은 sampling 대신
 * thinking 비활성화 + effort:low 조합으로 근사한다.
 */
const REVIEW_MODEL = "claude-sonnet-5";

const REVIEW_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    hasViolation: { type: "boolean" },
    violatedRule: {
      type: "string",
      description: "위반했다고 판단한 규칙(요약). 위반이 없으면 빈 문자열.",
    },
    explanation: { type: "string", description: "판단 근거를 한두 문장으로." },
  },
  required: ["hasViolation", "violatedRule", "explanation"],
  additionalProperties: false,
} as const;

export interface ReviewSubjectOutput {
  hasViolation: boolean;
  violatedRule: string;
  explanation: string;
}

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export async function runReviewSubject(
  reviewCase: ReviewCase,
  claudeMdText: string,
): Promise<ReviewSubjectOutput> {
  const system = buildReviewSystemPrompt(claudeMdText);

  const message = await getClient().messages.create({
    model: REVIEW_MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: REVIEW_OUTPUT_SCHEMA },
    },
    system,
    messages: [{ role: "user", content: reviewCase.code }],
  });

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) {
    throw new Error(`${reviewCase.id}: 리뷰어 응답에 텍스트 블록이 없습니다.`);
  }
  return JSON.parse(block.text) as ReviewSubjectOutput;
}
