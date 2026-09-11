import { describe, it, expect } from "vitest";
import { toReviewCase, toQaCase, toGoldenCase } from "./parseCase";
import type { RawCase } from "./types";

function rawCase(overrides: Partial<RawCase> = {}): RawCase {
  return {
    filePath: "fixture.md",
    frontmatter: {},
    body: "",
    ...overrides,
  };
}

describe("toReviewCase", () => {
  it("유효한 review raw case를 ReviewCase로 변환한다", () => {
    const raw = rawCase({
      frontmatter: { id: "r1", track: "review", expect: "violation", rule: "규칙 설명" },
      body: "const x = 1;",
    });
    const result = toReviewCase(raw);
    expect(result).toEqual({
      track: "review",
      id: "r1",
      expect: "violation",
      rule: "규칙 설명",
      code: "const x = 1;",
      filePath: "fixture.md",
    });
  });

  it("track이 review가 아니면 에러를 던진다", () => {
    const raw = rawCase({
      frontmatter: { id: "r1", track: "qa", expect: "violation", rule: "규칙" },
      body: "code",
    });
    expect(() => toReviewCase(raw)).toThrow(/track/);
  });

  it("expect가 violation/pass가 아니면 에러를 던진다", () => {
    const raw = rawCase({
      frontmatter: { id: "r1", track: "review", expect: "maybe", rule: "규칙" },
      body: "code",
    });
    expect(() => toReviewCase(raw)).toThrow(/expect/);
  });

  it("rule이 없으면 에러를 던진다", () => {
    const raw = rawCase({
      frontmatter: { id: "r1", track: "review", expect: "pass" },
      body: "code",
    });
    expect(() => toReviewCase(raw)).toThrow(/rule/);
  });

  it("본문(code)이 비어 있으면 에러를 던진다", () => {
    const raw = rawCase({
      frontmatter: { id: "r1", track: "review", expect: "pass", rule: "규칙" },
      body: "",
    });
    expect(() => toReviewCase(raw)).toThrow();
  });
});

describe("toQaCase", () => {
  it("유효한 qa raw case를 QaCase로 변환한다(guard 기본값 false)", () => {
    const raw = rawCase({
      frontmatter: { id: "q1", track: "qa", must: ["사실1"] },
      body: "질문 내용",
    });
    const result = toQaCase(raw);
    expect(result).toEqual({
      track: "qa",
      id: "q1",
      question: "질문 내용",
      must: ["사실1"],
      mustNot: [],
      guard: false,
      filePath: "fixture.md",
    });
  });

  it("guard: true와 mustNot을 그대로 반영한다", () => {
    const raw = rawCase({
      frontmatter: { id: "q2", track: "qa", must: ["사실1"], mustNot: ["오답1"], guard: true },
      body: "질문 내용",
    });
    const result = toQaCase(raw);
    expect(result.guard).toBe(true);
    expect(result.mustNot).toEqual(["오답1"]);
  });

  it("track이 qa가 아니면 에러를 던진다", () => {
    const raw = rawCase({
      frontmatter: { id: "q1", track: "review", must: ["사실1"] },
      body: "질문",
    });
    expect(() => toQaCase(raw)).toThrow(/track/);
  });

  it("must가 없으면 에러를 던진다", () => {
    const raw = rawCase({ frontmatter: { id: "q1", track: "qa" }, body: "질문" });
    expect(() => toQaCase(raw)).toThrow(/must/);
  });

  it("must가 빈 배열이면 에러를 던진다", () => {
    const raw = rawCase({ frontmatter: { id: "q1", track: "qa", must: [] }, body: "질문" });
    expect(() => toQaCase(raw)).toThrow(/must/);
  });

  it("본문(question)이 비어 있으면 에러를 던진다", () => {
    const raw = rawCase({ frontmatter: { id: "q1", track: "qa", must: ["사실1"] }, body: "" });
    expect(() => toQaCase(raw)).toThrow();
  });
});

describe("toGoldenCase", () => {
  it("track에 따라 review/qa로 분기한다", () => {
    const review = toGoldenCase(
      rawCase({
        frontmatter: { id: "r1", track: "review", expect: "pass", rule: "규칙" },
        body: "code",
      }),
    );
    expect(review.track).toBe("review");

    const qa = toGoldenCase(
      rawCase({ frontmatter: { id: "q1", track: "qa", must: ["사실1"] }, body: "질문" }),
    );
    expect(qa.track).toBe("qa");
  });

  it("알 수 없는 track이면 에러를 던진다", () => {
    expect(() => toGoldenCase(rawCase({ frontmatter: { id: "x", track: "unknown" }, body: "b" }))).toThrow(
      /track/,
    );
  });
});
