import type { JudgeVerdict, QaCase, ReviewCase } from "./types";
import type { ReviewSubjectOutput } from "../subjects/reviewSubject";

interface JudgeOutcome {
  pass: boolean;
  reason: string;
}

export interface RunReviewTrackDeps {
  runSubject: (c: ReviewCase, claudeMdText: string) => Promise<ReviewSubjectOutput>;
  judge: (c: ReviewCase, output: ReviewSubjectOutput) => Promise<JudgeOutcome>;
  onCaseDone?: (c: ReviewCase, verdict: JudgeVerdict) => void;
}

/** review 트랙: 케이스마다 subject(리뷰어)를 돌리고 그 출력을 judge에 채점시켜 JudgeVerdict로 모은다. */
export async function runReviewTrack(
  cases: ReviewCase[],
  claudeMdText: string,
  deps: RunReviewTrackDeps,
): Promise<JudgeVerdict[]> {
  const verdicts: JudgeVerdict[] = [];
  for (const c of cases) {
    const output = await deps.runSubject(c, claudeMdText);
    const { pass, reason } = await deps.judge(c, output);
    const verdict: JudgeVerdict = { caseId: c.id, track: "review", pass, reason };
    verdicts.push(verdict);
    deps.onCaseDone?.(c, verdict);
  }
  return verdicts;
}

export interface RunQaTrackDeps {
  runSubject: (c: QaCase, claudeMdText: string) => Promise<string>;
  judge: (c: QaCase, answer: string) => Promise<JudgeOutcome>;
  onCaseDone?: (c: QaCase, verdict: JudgeVerdict) => void;
}

/** qa 트랙: 케이스마다 subject(응답자)를 돌리고 그 답변을 judge에 채점시켜 JudgeVerdict로 모은다. */
export async function runQaTrack(
  cases: QaCase[],
  claudeMdText: string,
  deps: RunQaTrackDeps,
): Promise<JudgeVerdict[]> {
  const verdicts: JudgeVerdict[] = [];
  for (const c of cases) {
    const answer = await deps.runSubject(c, claudeMdText);
    const { pass, reason } = await deps.judge(c, answer);
    const verdict: JudgeVerdict = { caseId: c.id, track: "qa", pass, reason };
    verdicts.push(verdict);
    deps.onCaseDone?.(c, verdict);
  }
  return verdicts;
}
