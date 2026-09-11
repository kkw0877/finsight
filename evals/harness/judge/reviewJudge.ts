import Anthropic from "@anthropic-ai/sdk";
import type { ReviewCase } from "../lib/types";
import type { ReviewSubjectOutput } from "../subjects/reviewSubject";

/** review 트랙의 LLM-as-judge (Opus 5) — 리뷰어가 골든셋 라벨(expect/rule)과 맞게 판단했는지 채점한다. */
const JUDGE_MODEL = "claude-opus-5";

const JUDGE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    reason: { type: "string", description: "채점 근거를 한두 문장으로." },
  },
  required: ["pass", "reason"],
  additionalProperties: false,
} as const;

export interface JudgeResult {
  pass: boolean;
  reason: string;
}

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const JUDGE_SYSTEM_PROMPT = [
  "너는 코드 리뷰어(경량 리뷰어)의 채점자다.",
  "expect가 'violation'이면, 리뷰어가 hasViolation=true로 판단하고 violatedRule이 expectedRule과 의미상 같은 규칙을 가리킬 때만 pass다.",
  "expect가 'pass'이면, 리뷰어가 hasViolation=false로 판단했을 때만 pass다(오탐이면 fail).",
  "채점 결과(pass)와 근거(reason)를 한두 문장으로 반환한다.",
].join("\n");

export async function judgeReview(
  reviewCase: ReviewCase,
  output: ReviewSubjectOutput,
): Promise<JudgeResult> {
  const message = await getClient().messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: JUDGE_OUTPUT_SCHEMA } },
    system: JUDGE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          code: reviewCase.code,
          expect: reviewCase.expect,
          expectedRule: reviewCase.rule,
          reviewerOutput: output,
        }),
      },
    ],
  });

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) {
    throw new Error(`${reviewCase.id}: judge 응답에 텍스트 블록이 없습니다.`);
  }
  return JSON.parse(block.text) as JudgeResult;
}
