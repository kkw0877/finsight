export type Track = "review" | "qa";

export interface ReviewCase {
  track: "review";
  id: string;
  /** violation: 이 코드는 규칙을 위반해야 한다 / pass: 위반이 없어야 한다(오탐 방지용). */
  expect: "violation" | "pass";
  /** expect가 violation일 때 위반해야 하는 CLAUDE.md 규칙(요약). */
  rule: string;
  /** 리뷰 대상 코드(본문). */
  code: string;
  filePath: string;
}

export interface QaCase {
  track: "qa";
  id: string;
  /** 응답자에게 던지는 질문(본문). */
  question: string;
  /** 답변이 반드시 포함해야 하는 사실. */
  must: string[];
  /** 답변이 포함하면 안 되는 내용(오답/틀린 전제 수용 등). */
  mustNot: string[];
  /** 질문에 틀린 전제가 섞여 있어 이를 반박해야 하는 케이스인지. */
  guard: boolean;
  filePath: string;
}

export type GoldenCase = ReviewCase | QaCase;

export interface RawCase {
  filePath: string;
  frontmatter: Record<string, string | string[] | boolean>;
  body: string;
}

export interface JudgeVerdict {
  caseId: string;
  track: Track;
  pass: boolean;
  reason: string;
}
