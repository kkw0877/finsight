---
id: violation-02-pdf-binary-to-claude
track: review
expect: violation
rule: PDF는 서버에서 텍스트를 추출해 마스킹한 뒤 그 텍스트만 Claude로 보낸다 — PDF 원본 바이너리는 Claude로 전송하지 않는다.
---

```ts
// app/api/upload/parse/route.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function parsePdfStatement(pdfBuffer: Buffer) {
  const base64Pdf = pdfBuffer.toString("base64");

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
          },
          { type: "text", text: "이 PDF 명세서에서 거래 내역을 추출해줘." },
        ],
      },
    ],
  });

  return message;
}
```
