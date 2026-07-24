import type { Category, Transaction } from "@/types/transaction";
import type { AnalysisResult, CategoryTotal, MonthlyTrendPoint } from "@/types/analysis";

/**
 * Mock-First (step 5): 실제 Claude 호출 없이 흐름 검증용 규칙 기반 구현.
 * step 14에서 이 두 함수의 내부 구현만 실제 Anthropic SDK 호출로 교체한다 — 시그니처는 유지.
 */

const DATE_RE = /^\d{4}[-./]\d{2}[-./]\d{2}$/;
const AMOUNT_RE = /^-?\d{1,3}(,\d{3})*$|^-?\d+$/;
const HEADER_KEYWORDS = /날짜|date|가맹점|상호|적요|금액|amount/i;

function normalizeDate(raw: string): string {
  return raw.replace(/[./]/g, "-");
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

interface ParsedRow {
  date: string;
  merchant: string;
  amount: number;
}

function parseRow(line: string): ParsedRow {
  const cols = line.split(",").map((c) => c.trim());
  const dateCol = cols.find((c) => DATE_RE.test(c));
  const amountCol = [...cols].reverse().find((c) => c !== dateCol && AMOUNT_RE.test(c));
  const merchantCol = cols.find((c) => c !== dateCol && c !== amountCol && c.length > 0);

  if (!dateCol || !amountCol || !merchantCol) {
    throw new Error(`CSV 행을 파싱할 수 없습니다: "${line}"`);
  }

  return { date: normalizeDate(dateCol), merchant: merchantCol, amount: parseAmount(amountCol) };
}

/**
 * CSV 원문 → 정규화된 거래 JSON (실제로는 Claude Haiku 4.5 담당, ADR-004 1단계).
 * mock 구현은 줄 단위 + 쉼표 분리로 날짜/가맹점/금액 컬럼을 추정한다 — 카드사별 정교한 파싱은 하지 않는다.
 */
export async function parseCsvToTransactions(
  csvText: string,
  uploadId: string,
  userId: string,
): Promise<Transaction[]> {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("빈 CSV는 파싱할 수 없습니다.");
  }

  const dataLines = HEADER_KEYWORDS.test(lines[0]) ? lines.slice(1) : lines;
  if (dataLines.length === 0) {
    throw new Error("헤더 외에 파싱할 거래 데이터가 없습니다.");
  }

  return dataLines.map((line) => {
    const { date, merchant, amount } = parseRow(line);
    return {
      id: crypto.randomUUID(),
      uploadId,
      userId,
      date,
      merchant,
      amount,
      category: "기타" as Category,
    };
  });
}

const CATEGORY_KEYWORDS: [RegExp, Category][] = [
  [/스타벅스|편의점|식당|배달|카페|음식|맥도날드|커피/i, "식비"],
  [/지하철|버스|택시|주유|교통|kakao\s*t|톨게이트/i, "교통"],
  [/전기|가스|수도|관리비|통신|아파트|월세/i, "주거_공과금"],
  [/쿠팡|마켓|백화점|올리브영|의류|쇼핑|이마트/i, "쇼핑"],
  [/병원|약국|의원|한의원|치과/i, "의료_건강"],
  [/넷플릭스|유튜브|멜론|구독|왓챠|스포티파이/i, "구독서비스"],
  [/영화|공연|여행|호텔|골프|서점/i, "여가_문화"],
  [/증권|펀드|적금|예금|투자/i, "저축_투자"],
];

function categorize(merchant: string): Category {
  const matched = CATEGORY_KEYWORDS.find(([re]) => re.test(merchant));
  return matched ? matched[1] : "기타";
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * 거래 JSON → 카테고리 분류 + 요약 인사이트 (실제로는 Claude Sonnet 5/Opus 4.8 담당, ADR-004 2단계).
 * mock 구현은 가맹점명 키워드 매칭으로 9종 고정 카테고리를 배정한다.
 */
export async function classifyAndSummarize(transactions: Transaction[]): Promise<AnalysisResult> {
  const categorized = transactions.map((t) => ({ ...t, category: categorize(t.merchant) }));

  const totalSpend = categorized.reduce((sum, t) => sum + t.amount, 0);

  const totalsByCategory = new Map<Category, number>();
  for (const t of categorized) {
    totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + t.amount);
  }
  const categoryTotals: CategoryTotal[] = [...totalsByCategory.entries()]
    .map(([category, total]) => ({
      category,
      total,
      percentage: totalSpend === 0 ? 0 : Math.round((total / totalSpend) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total);

  const totalsByMonth = new Map<string, number>();
  for (const t of categorized) {
    const month = monthOf(t.date);
    totalsByMonth.set(month, (totalsByMonth.get(month) ?? 0) + t.amount);
  }
  const monthlyTrend: MonthlyTrendPoint[] = [...totalsByMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const top = categoryTotals[0];
  const summaryText = top
    ? `이번 달 ${top.category} ${top.total.toLocaleString("ko-KR")}원(전체의 ${top.percentage}%)을 지출했습니다.`
    : "분석할 거래 내역이 없습니다.";

  return { summaryText, categoryTotals, monthlyTrend, transactions: categorized };
}
