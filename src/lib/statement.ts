export type StatementFormat = "csv" | "pdf";

const MAX_CSV_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ROW_COUNT = 2000;

/**
 * 한국 카드사/은행 CSV는 UTF-8 또는 EUC-KR/CP949로 내려받아지는 경우가 섞여 있다.
 * 엄격 모드 UTF-8 디코드를 시도해 실패하면 EUC-KR(WHATWG 표준상 CP949 포함)로 재시도한다.
 */
export function detectAndDecode(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("euc-kr").decode(buffer);
  }
}

const CARD_NUMBER_RE = /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g;
const ACCOUNT_NUMBER_RE = /\b\d{2,6}-\d{2,6}-\d{2,10}(?:-\d{1,6})?\b/g;

function maskKeepingLast4(match: string): string {
  const digits = match.replace(/\D/g, "");
  return `****${digits.slice(-4)}`;
}

function isDateLike(match: string): boolean {
  const parts = match.split("-");
  return parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2;
}

/**
 * DB 원본에는 적용하지 않는다 — Claude로 보내는 사본에만 사용할 것 (CLAUDE.md CRITICAL).
 * CSV 원문과 PDF에서 추출한 텍스트 모두에 동일하게 적용한다.
 */
export function maskSensitiveData(statementText: string): string {
  let masked = statementText.replace(CARD_NUMBER_RE, maskKeepingLast4);
  masked = masked.replace(ACCOUNT_NUMBER_RE, (match) =>
    isDateLike(match) ? match : maskKeepingLast4(match),
  );
  return masked;
}

/** PDF는 폰트·레이아웃 정보로 동일 내용도 CSV보다 파일 크기가 크므로 상한을 다르게 둔다. */
export function validateFileSize(bytes: number, format: StatementFormat): void {
  const limit = format === "csv" ? MAX_CSV_FILE_SIZE_BYTES : MAX_PDF_FILE_SIZE_BYTES;
  if (bytes > limit) {
    throw new Error(`파일 크기가 최대 허용치(${limit}바이트)를 초과했습니다.`);
  }
}

/** CSV 원문의 행 수든 PDF에서 추출한 텍스트의 줄 수든, Claude로 보내는 텍스트 분량을 동일하게 제한한다. */
export function validateRowCount(statementText: string): void {
  const lines = statementText.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length > MAX_ROW_COUNT) {
    throw new Error(`행 수가 최대 허용치(${MAX_ROW_COUNT}행)를 초과했습니다.`);
  }
}

/** 확장자를 우선 신뢰하고, 확장자가 없으면 MIME 타입으로 판정한다. */
export function resolveStatementFormat(filename: string, mimeType: string): StatementFormat {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith(".csv")) return "csv";
  if (lowerName.endsWith(".pdf")) return "pdf";
  if (mimeType === "text/csv" || mimeType === "application/csv") return "csv";
  if (mimeType === "application/pdf") return "pdf";
  throw new Error("지원하지 않는 파일 형식입니다. CSV 또는 PDF 파일만 업로드할 수 있습니다.");
}
