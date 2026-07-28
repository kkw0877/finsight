import { extractText, getDocumentProxy } from "unpdf";

const MAX_PDF_PAGE_COUNT = 30;

/**
 * PDF에서 텍스트 레이어를 추출한다. 카드번호·계좌번호 등의 마스킹(maskSensitiveData)은
 * 이 함수가 반환한 텍스트에 대해 호출부에서 적용한다 — PDF 원본 바이너리는 Claude로 보내지 않는다
 * (CLAUDE.md CRITICAL: Claude로 보내는 사본은 마스킹 필수).
 * 스캔 이미지처럼 텍스트 레이어가 없는 PDF는 지원하지 않는다.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  if (totalPages > MAX_PDF_PAGE_COUNT) {
    throw new Error(`PDF 페이지 수가 최대 허용치(${MAX_PDF_PAGE_COUNT}페이지)를 초과했습니다.`);
  }

  if (text.trim().length === 0) {
    throw new Error("PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF는 지원하지 않습니다.");
  }

  return text;
}
