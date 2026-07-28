import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractTextFromPdf } from "./pdf";

async function buildPdf(lines: string[], pageCount = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let p = 0; p < pageCount; p++) {
    const page = doc.addPage([400, 600]);
    let y = 560;
    for (const line of lines) {
      page.drawText(line, { x: 40, y, size: 12, font });
      y -= 20;
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe("extractTextFromPdf", () => {
  it("extracts transaction-like text from a PDF's text layer", async () => {
    // pdf-lib's standard (non-embedded) fonts only support WinAnsi encoding, so this
    // fixture uses ASCII text — real-world statement PDFs embed CID fonts that cover
    // Korean glyphs, which unpdf/pdf.js extracts the same way regardless of script.
    const buffer = await buildPdf([
      "date merchant amount",
      "2026-07-01 Starbucks Gangnam 4500",
      "2026-07-02 Coupang 15000",
    ]);

    const text = await extractTextFromPdf(buffer);

    expect(text).toContain("2026-07-01");
    expect(text).toContain("4500");
    expect(text).toContain("15000");
  });

  it("merges text across multiple pages", async () => {
    const buffer = await buildPdf(["page marker line"], 3);

    const text = await extractTextFromPdf(buffer);

    expect(text.split("page marker line").length - 1).toBe(3);
  });

  it("throws when the PDF has no extractable text (scanned/blank)", async () => {
    const buffer = await buildPdf([]);

    await expect(extractTextFromPdf(buffer)).rejects.toThrow();
  });

  it("throws when the page count exceeds the limit", async () => {
    const buffer = await buildPdf(["row"], 31);

    await expect(extractTextFromPdf(buffer)).rejects.toThrow();
  });
});
