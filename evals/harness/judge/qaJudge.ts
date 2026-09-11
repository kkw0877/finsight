import Anthropic from "@anthropic-ai/sdk";
import type { QaCase } from "../lib/types";

/** qa 트랙의 LLM-as-judge (Opus 5) — 응답이 must 사실을 모두 담고 mustNot을 포함하지 않는지 채점한다. */
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
  "너는 코드베이스 Q&A 응답자의 채점자다.",
  "답변이 must 목록의 사실을 모두 포함하고, mustNot 목록의 내용을 포함하지 않으면 pass다.",
  "문장이 원문과 동일할 필요는 없다 — 같은 사실을 전달하면 충족한 것으로 본다.",
  "must 중 하나라도 빠지거나 mustNot 중 하나라도 포함되면 fail이다.",
  "채점 결과(pass)와 근거(reason)를 한두 문장으로 반환한다.",
].join("\n");

export async function judgeQa(qaCase: QaCase, answer: string): Promise<JudgeResult> {
  const message = await getClient().messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: JUDGE_OUTPUT_SCHEMA } },
    system: JUDGE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          question: qaCase.question,
          must: qaCase.must,
          mustNot: qaCase.mustNot,
          answer,
        }),
      },
    ],
  });

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) {
    throw new Error(`${qaCase.id}: judge 응답에 텍스트 블록이 없습니다.`);
  }
  return JSON.parse(block.text) as JudgeResult;
}
