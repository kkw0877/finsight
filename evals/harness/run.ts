import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkQaBalance, checkReviewBalance, checkUniqueIds } from "./lib/balance";
import { exitCodeForSummary, formatSummary, summarizeRun } from "./lib/aggregate";
import { loadQaCases, loadReviewCases } from "./lib/loadCases";
import { runQaTrack, runReviewTrack } from "./lib/orchestrate";
import type { JudgeVerdict, QaCase, ReviewCase } from "./lib/types";
import { runReviewSubject } from "./subjects/reviewSubject";
import { runQaSubject } from "./subjects/qaSubject";
import { judgeReview } from "./judge/reviewJudge";
import { judgeQa } from "./judge/qaJudge";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE_MD_PATH = path.join(here, "..", "..", "CLAUDE.md");

function logVerdict(prefix: string, c: { id: string }, verdict: JudgeVerdict): void {
  console.log(`[${prefix}] ${c.id}: ${verdict.pass ? "PASS" : `FAIL (${verdict.reason})`}`);
}

/**
 * 하네스 품질 회귀 게이트. golden set(cases/*.md)을 subject에 돌리고 Opus 5가 LLM-as-judge로
 * pass/fail 채점한 뒤 종료 코드를 반환한다(하나라도 fail이면 1). 네트워크 호출·비용이 발생하므로
 * `npm run eval`로만 실행하고, 무결성/균형 검사(순수 함수)는 `npm test`로 별도 커버한다.
 */
export async function main(): Promise<number> {
  const reviewCases: ReviewCase[] = loadReviewCases();
  const qaCases: QaCase[] = loadQaCases();

  const balanceIssues = [
    ...checkReviewBalance(reviewCases).issues,
    ...checkQaBalance(qaCases).issues,
    ...checkUniqueIds([...reviewCases, ...qaCases]),
  ];
  if (balanceIssues.length > 0) {
    console.error("Golden set 무결성 오류 — 라이브 채점을 실행하지 않습니다:");
    for (const issue of balanceIssues) console.error(`  - ${issue}`);
    return 1;
  }

  const claudeMdText = fs.readFileSync(CLAUDE_MD_PATH, "utf-8");

  const reviewVerdicts = await runReviewTrack(reviewCases, claudeMdText, {
    runSubject: runReviewSubject,
    judge: judgeReview,
    onCaseDone: (c, v) => logVerdict("review", c, v),
  });

  const qaVerdicts = await runQaTrack(qaCases, claudeMdText, {
    runSubject: runQaSubject,
    judge: judgeQa,
    onCaseDone: (c, v) => logVerdict("qa", c, v),
  });

  const summary = summarizeRun([...reviewVerdicts, ...qaVerdicts]);
  console.log("\n" + formatSummary(summary));
  return exitCodeForSummary(summary);
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main()
    .then((code) => process.exit(code))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
