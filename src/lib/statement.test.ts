import { describe, expect, it } from "vitest";
import {
  detectAndDecode,
  maskSensitiveData,
  resolveStatementFormat,
  validateFileSize,
  validateRowCount,
} from "./statement";

const SAMPLE_KOREAN_CSV =
  "거래일자,가맹점,금액\n2026-07-01,스타벅스 강남점,4500\n2026-07-02,쿠팡,15000\n";

// CP949-encoded bytes of SAMPLE_KOREAN_CSV (generated via `iconv -f UTF-8 -t CP949`)
const CP949_HEX =
  "b0c5b7a1c0cfc0da2cb0a1b8cdc1a12cb1ddbed70a323032362d30372d30312cbdbac5b8b9f7bdba20b0adb3b2c1a12c343530300a323032362d30372d30322cc4edc6ce2c31353030300a";

describe("detectAndDecode", () => {
  it("decodes plain UTF-8 buffers as-is", () => {
    const buffer = Buffer.from(SAMPLE_KOREAN_CSV, "utf-8");
    expect(detectAndDecode(buffer)).toBe(SAMPLE_KOREAN_CSV);
  });

  it("decodes EUC-KR/CP949 buffers into the correct UTF-8 string", () => {
    const buffer = Buffer.from(CP949_HEX, "hex");
    expect(detectAndDecode(buffer)).toBe(SAMPLE_KOREAN_CSV);
  });

  it("decodes ASCII-only buffers unchanged", () => {
    const buffer = Buffer.from("date,merchant,amount\n2026-07-01,cafe,4500\n", "utf-8");
    expect(detectAndDecode(buffer)).toBe(
      "date,merchant,amount\n2026-07-01,cafe,4500\n",
    );
  });
});

describe("maskSensitiveData", () => {
  it("masks hyphen-separated card numbers, keeping the last 4 digits", () => {
    const input = "카드번호,1234-5678-9012-3456,매장,4500";
    const result = maskSensitiveData(input);
    expect(result).not.toContain("1234-5678-9012-3456");
    expect(result).toContain("3456");
  });

  it("masks hyphen-separated bank account numbers", () => {
    const input = "계좌번호,110-234-567890,입금,10000";
    const result = maskSensitiveData(input);
    expect(result).not.toContain("110-234-567890");
  });

  it("does not mask date-like values (YYYY-MM-DD)", () => {
    const input = "거래일자,2026-07-01,스타벅스,4500";
    expect(maskSensitiveData(input)).toBe(input);
  });

  it("does not mask plain transaction amounts", () => {
    const input = "거래일자,2026-07-01,스타벅스,150000";
    expect(maskSensitiveData(input)).toBe(input);
  });

  it("masks card numbers with no separators (16 consecutive digits)", () => {
    const input = "카드번호,1234567890123456,매장,4500";
    const result = maskSensitiveData(input);
    expect(result).not.toContain("1234567890123456");
    expect(result).toContain("3456");
  });

  it("masks account numbers with no separators (12+ digit run)", () => {
    const input = "계좌번호,11023456789012,입금,10000";
    const result = maskSensitiveData(input);
    expect(result).not.toContain("11023456789012");
    expect(result).toContain("9012");
  });

  it("does not mask digit runs under 12 digits (avoids masking amounts)", () => {
    const input = "거래일자,2026-07-01,스타벅스,15000000000"; // 11-digit amount
    expect(maskSensitiveData(input)).toBe(input);
  });
});

describe("validateFileSize", () => {
  const TWO_MB = 2 * 1024 * 1024;
  const FIVE_MB = 5 * 1024 * 1024;

  it("passes CSV sizes under the 2MB limit", () => {
    expect(() => validateFileSize(1024, "csv")).not.toThrow();
  });

  it("passes the exact CSV boundary (2MB)", () => {
    expect(() => validateFileSize(TWO_MB, "csv")).not.toThrow();
  });

  it("throws for CSV sizes over the 2MB limit", () => {
    expect(() => validateFileSize(TWO_MB + 1, "csv")).toThrow();
  });

  it("passes PDF sizes under the 5MB limit", () => {
    expect(() => validateFileSize(TWO_MB + 1, "pdf")).not.toThrow();
  });

  it("passes the exact PDF boundary (5MB)", () => {
    expect(() => validateFileSize(FIVE_MB, "pdf")).not.toThrow();
  });

  it("throws for PDF sizes over the 5MB limit", () => {
    expect(() => validateFileSize(FIVE_MB + 1, "pdf")).toThrow();
  });
});

describe("validateRowCount", () => {
  const buildCsv = (rowCount: number) =>
    Array.from({ length: rowCount }, (_, i) => `row${i}`).join("\n");

  it("passes for row counts under the limit", () => {
    expect(() => validateRowCount(buildCsv(10))).not.toThrow();
  });

  it("passes for the exact boundary (2000 rows)", () => {
    expect(() => validateRowCount(buildCsv(2000))).not.toThrow();
  });

  it("throws for row counts over the limit", () => {
    expect(() => validateRowCount(buildCsv(2001))).toThrow();
  });
});

describe("resolveStatementFormat", () => {
  it("resolves .csv filenames as csv", () => {
    expect(resolveStatementFormat("statement.csv", "text/csv")).toBe("csv");
  });

  it("resolves .pdf filenames as pdf", () => {
    expect(resolveStatementFormat("statement.pdf", "application/pdf")).toBe("pdf");
  });

  it("is case-insensitive on the extension", () => {
    expect(resolveStatementFormat("STATEMENT.CSV", "")).toBe("csv");
    expect(resolveStatementFormat("STATEMENT.PDF", "")).toBe("pdf");
  });

  it("falls back to MIME type when the extension is missing", () => {
    expect(resolveStatementFormat("statement", "text/csv")).toBe("csv");
    expect(resolveStatementFormat("statement", "application/pdf")).toBe("pdf");
  });

  it("throws for unsupported formats", () => {
    expect(() => resolveStatementFormat("statement.xlsx", "application/vnd.ms-excel")).toThrow();
  });
});
