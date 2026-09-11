import Anthropic from "@anthropic-ai/sdk";
import type { QaCase } from "../lib/types";

/** qa 트랙의 subject: 라이브 CLAUDE.md 전문을 컨텍스트로 코드베이스 질문에 답하는 응답자 (Sonnet 5). */
const QA_MODEL = "claude-sonnet-5";

const QA_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", description: "질문에 대한 한국어 답변." },
  },
  required: ["answer"],
  additionalProperties: false,
} as const;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function buildQaSystemPrompt(claudeMdText: string): string {
  return [
    "너는 FinSight 코드베이스에 대해 질문받는 응답자다.",
    "아래는 이 프로젝트의 CLAUDE.md 전문이다. 이 내용에 근거해서만 답한다.",
    "질문에 사실과 다른 전제가 섞여 있으면 답하기 전에 그 전제를 바로잡는다.",
    "",
    "---",
    claudeMdText,
    "---",
  ].join("\n");
}

export async function runQaSubject(qaCase: QaCase, claudeMdText: string): Promise<string> {
  const message = await getClient().messages.create({
    model: QA_MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: QA_OUTPUT_SCHEMA },
    },
    system: buildQaSystemPrompt(claudeMdText),
    messages: [{ role: "user", content: qaCase.question }],
  });

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) {
    throw new Error(`${qaCase.id}: 응답자 응답에 텍스트 블록이 없습니다.`);
  }
  const parsed = JSON.parse(block.text) as { answer: string };
  return parsed.answer;
}
