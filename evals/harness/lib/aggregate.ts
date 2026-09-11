import type { JudgeVerdict, Track } from "./types";

export interface TrackSummary {
  track: Track;
  total: number;
  passed: number;
  failed: number;
  failures: JudgeVerdict[];
}

export interface RunSummary {
  tracks: TrackSummary[];
  total: number;
  passed: number;
  failed: number;
  failures: JudgeVerdict[];
}

const ALL_TRACKS: Track[] = ["review", "qa"];

export function summarizeTrack(track: Track, verdicts: JudgeVerdict[]): TrackSummary {
  const failures = verdicts.filter((v) => !v.pass);
  return {
    track,
    total: verdicts.length,
    passed: verdicts.length - failures.length,
    failed: failures.length,
    failures,
  };
}

export function summarizeRun(verdicts: JudgeVerdict[]): RunSummary {
  const tracks = ALL_TRACKS.map((track) =>
    summarizeTrack(
      track,
      verdicts.filter((v) => v.track === track),
    ),
  ).filter((summary) => summary.total > 0);

  const failures = verdicts.filter((v) => !v.pass);
  return {
    tracks,
    total: verdicts.length,
    passed: verdicts.length - failures.length,
    failed: failures.length,
    failures,
  };
}

/** run.ts가 회귀 게이트로 그대로 사용하는 종료 코드 — 실패가 하나라도 있으면 1. */
export function exitCodeForSummary(summary: RunSummary): 0 | 1 {
  return summary.failed > 0 ? 1 : 0;
}

export function formatSummary(summary: RunSummary): string {
  const lines: string[] = [];
  for (const track of summary.tracks) {
    lines.push(`[${track.track}] ${track.passed}/${track.total} passed`);
    for (const failure of track.failures) {
      lines.push(`  FAIL ${failure.caseId}: ${failure.reason}`);
    }
  }
  lines.push(`TOTAL: ${summary.passed}/${summary.total}`);
  return lines.join("\n");
}
