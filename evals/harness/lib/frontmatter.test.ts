import { describe, it, expect } from "vitest";
import { parseFrontmatterMarkdown } from "./frontmatter";

describe("parseFrontmatterMarkdown", () => {
  it("스칼라와 리스트 frontmatter 필드를 파싱한다", () => {
    const source = `---
id: sample
track: qa
must:
  - "첫 번째 사실"
  - 두 번째 사실
guard: true
---

질문 본문입니다.
`;
    const result = parseFrontmatterMarkdown(source, "sample.md");

    expect(result.frontmatter).toEqual({
      id: "sample",
      track: "qa",
      must: ["첫 번째 사실", "두 번째 사실"],
      guard: true,
    });
    expect(result.body).toBe("질문 본문입니다.");
    expect(result.filePath).toBe("sample.md");
  });

  it("여러 줄 본문(코드 블록 포함)을 그대로 보존한다", () => {
    const source = `---
id: code-sample
track: review
expect: violation
rule: 테스트 규칙
---

\`\`\`ts
const x = 1;
console.log(x);
\`\`\`
`;
    const result = parseFrontmatterMarkdown(source, "code.md");
    expect(result.body).toBe('```ts\nconst x = 1;\nconsole.log(x);\n```');
  });

  it("여는 delimiter가 없으면 에러를 던진다", () => {
    expect(() => parseFrontmatterMarkdown("no frontmatter here", "bad.md")).toThrow(/---/);
  });

  it("닫는 delimiter가 없으면 에러를 던진다", () => {
    expect(() => parseFrontmatterMarkdown("---\nid: x\n", "bad2.md")).toThrow(/닫는/);
  });

  it("key 없이 리스트 항목이 나오면 에러를 던진다", () => {
    const source = `---
- 잘못된 항목
---
본문
`;
    expect(() => parseFrontmatterMarkdown(source, "bad3.md")).toThrow();
  });

  it("해석할 수 없는 라인이 있으면 에러를 던진다", () => {
    const source = `---
이건 key: value 형식이 아님
---
본문
`;
    expect(() => parseFrontmatterMarkdown(source, "bad4.md")).toThrow();
  });
});
