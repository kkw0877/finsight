import Anthropic from "@anthropic-ai/sdk";
import type { Category, Transaction } from "@/types/transaction";
import type { AnalysisResult } from "@/types/analysis";
import { aggregateTransactions } from "@/lib/aggregate";

/**
 * ADR-004 2단계 호출: ①CSV→거래JSON 파싱(Haiku 4.5) → ②거래JSON→분류·요약(Sonnet 5).
 * ANTHROPIC_API_KEY는 이 파일 밖에서 참조하지 않는다 — SDK가 환경변수에서 직접 읽는다.
 */
const PARSE_MODEL = "claude-haiku-4-5";
const CLASSIFY_MODEL = "claude-sonnet-5";

const CATEGORIES: Category[] = [
  "식비",
  "교통",
  "주거_공과금",
  "쇼핑",
  "의료_건강",
  "구독서비스",
  "여가_문화",
  "저축_투자",
  "기타",
];

const client = new Anthropic();

const PARSE_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD 형식으로 정규화한 거래일자" },
          merchant: { type: "string", description: "가맹점명" },
          amount: { type: "number", description: "거래금액(원), 정수" },
        },
        required: ["date", "merchant", "amount"],
        additionalProperties: false,
      },
    },
  },
  required: ["transactions"],
  additionalProperties: false,
} as const;

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          category: { type: "string", enum: CATEGORIES },
        },
        required: ["id", "category"],
        additionalProperties: false,
      },
    },
    summaryText: { type: "string", description: "이번 달 지출 패턴에 대한 한두 문장 자연어 요약" },
  },
  required: ["classifications", "summaryText"],
  additionalProperties: false,
} as const;

interface ParsedTransactionRow {
  date: string;
  merchant: string;
  amount: number;
}

interface ClassificationEntry {
  id: string;
  category: string;
}

/** 응답 본문/프롬프트 전문은 절대 로그·에러 메시지에 남기지 않는다 (CLAUDE.md CRITICAL). */
function extractJsonText(message: Anthropic.Message): string {
  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) {
    throw new Error("Claude 응답 형식이 올바르지 않습니다.");
  }
  return block.text;
}

/**
 * CSV 원문(마스킹된 사본) → 정규화된 거래 JSON (Claude Haiku 4.5, ADR-004 1단계).
 * 호출부(upload API)가 이미 maskSensitiveData로 마스킹한 사본을 전달하므로 여기서는 그대로 전송한다.
 */
export async function parseCsvToTransactions(
  csvText: string,
  uploadId: string,
  userId: string,
): Promise<Transaction[]> {
  if (csvText.trim().length === 0) {
    throw new Error("빈 CSV는 파싱할 수 없습니다.");
  }

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: PARSE_MODEL,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: PARSE_SCHEMA } },
      system:
        "너는 한국 카드사/은행 명세서 CSV를 정규화된 거래 내역으로 변환하는 파서다. " +
        "헤더 행이 있으면 건너뛰고, 각 데이터 행에서 날짜(YYYY-MM-DD로 정규화)/가맹점명/금액(원 단위 정수, 부호 없이 절대값)을 추출한다. " +
        "취소·환불 행은 스킵한다. 파싱 가능한 거래가 하나도 없으면 transactions를 빈 배열로 반환한다.",
      messages: [{ role: "user", content: csvText }],
    });
  } catch {
    throw new Error("CSV 분석에 실패했습니다.");
  }

  let parsed: { transactions: ParsedTransactionRow[] };
  try {
    parsed = JSON.parse(extractJsonText(message)) as { transactions: ParsedTransactionRow[] };
  } catch {
    throw new Error("CSV 분석에 실패했습니다.");
  }

  if (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
    throw new Error("CSV에서 거래 내역을 찾을 수 없습니다.");
  }

  return parsed.transactions.map((row) => ({
    id: crypto.randomUUID(),
    uploadId,
    userId,
    date: row.date,
    merchant: row.merchant,
    amount: row.amount,
    category: "기타" as Category,
  }));
}

/**
 * 거래 JSON → 카테고리 분류(9종 고정) + 자연어 요약 (Claude Sonnet 5, ADR-004 2단계).
 * 카테고리별/월별 집계·비율은 모델이 아닌 코드(aggregateTransactions)로 계산해 정확성을 보장하고,
 * summaryText만 모델이 생성한 값을 사용한다.
 */
export async function classifyAndSummarize(transactions: Transaction[]): Promise<AnalysisResult> {
  if (transactions.length === 0) {
    return aggregateTransactions([]);
  }

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: CLASSIFY_MODEL,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
      system:
        `너는 개인 지출 내역을 분석하는 애널리스트다. 각 거래를 가맹점명을 참고해 다음 9개 고정 카테고리 중 ` +
        `정확히 하나로 분류한다: ${CATEGORIES.join(", ")}. 애매한 경우 '기타'로 분류한다. ` +
        "분류가 끝나면 전체 지출 패턴(가장 많이 쓴 카테고리, 특징적인 소비 등)을 한두 문장의 자연스러운 한국어로 요약한다.",
      messages: [
        {
          role: "user",
          content: JSON.stringify(
            transactions.map((t) => ({ id: t.id, date: t.date, merchant: t.merchant, amount: t.amount })),
          ),
        },
      ],
    });
  } catch {
    throw new Error("거래 분류에 실패했습니다.");
  }

  let parsed: { classifications: ClassificationEntry[]; summaryText: string };
  try {
    parsed = JSON.parse(extractJsonText(message)) as {
      classifications: ClassificationEntry[];
      summaryText: string;
    };
  } catch {
    throw new Error("거래 분류에 실패했습니다.");
  }

  const categoryById = new Map(parsed.classifications.map((c) => [c.id, c.category]));
  const categorized: Transaction[] = transactions.map((t) => {
    const category = categoryById.get(t.id);
    return {
      ...t,
      category: isValidCategory(category) ? category : "기타",
    };
  });

  const aggregated = aggregateTransactions(categorized);
  const summaryText =
    typeof parsed.summaryText === "string" && parsed.summaryText.trim().length > 0
      ? parsed.summaryText
      : aggregated.summaryText;

  return { ...aggregated, summaryText };
}

function isValidCategory(value: string | undefined): value is Category {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value);
}
