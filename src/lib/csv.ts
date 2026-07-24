const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
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
 */
export function maskSensitiveData(csvText: string): string {
  let masked = csvText.replace(CARD_NUMBER_RE, maskKeepingLast4);
  masked = masked.replace(ACCOUNT_NUMBER_RE, (match) =>
    isDateLike(match) ? match : maskKeepingLast4(match),
  );
  return masked;
}

export function validateFileSize(bytes: number): void {
  if (bytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`파일 크기가 최대 허용치(${MAX_FILE_SIZE_BYTES}바이트)를 초과했습니다.`);
  }
}

export function validateRowCount(csvText: string): void {
  const lines = csvText.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length > MAX_ROW_COUNT) {
    throw new Error(`행 수가 최대 허용치(${MAX_ROW_COUNT}행)를 초과했습니다.`);
  }
}
