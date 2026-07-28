"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AnalysisResult } from "@/types/analysis";

export interface UploadResult extends AnalysisResult {
  blurred: boolean;
}

export interface UploadWidgetProps {
  onResult: (result: UploadResult) => void;
}

const STAGE_LABELS = {
  reading: "파일 읽는 중",
  parsing: "거래 내역 인식 중",
  classifying: "카테고리 분류·요약 작성 중",
} as const;

type Stage = keyof typeof STAGE_LABELS;

// ADR-004의 2단계 Claude 호출(Haiku 파싱 → Sonnet/Opus 분류) 순서를 사용자에게 알리기 위한
// 근사 전환 시점. 실제 진행률을 알 수 없는 동기 처리라 퍼센트 대신 "지금 하는 일"만 알려준다.
const STAGE_TIMINGS: Array<{ stage: Stage; afterMs: number }> = [
  { stage: "parsing", afterMs: 3000 },
  { stage: "classifying", afterMs: 10000 },
];

export function UploadWidget({ onResult }: UploadWidgetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>("reading");
  const [error, setError] = useState<string | null>(null);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearStageTimers() {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setStage("reading");
    setError(null);
    stageTimers.current = STAGE_TIMINGS.map(({ stage: nextStage, afterMs }) =>
      setTimeout(() => setStage(nextStage), afterMs),
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "업로드에 실패했습니다.");
        return;
      }

      onResult(body as UploadResult);
      setFile(null);
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      clearStageTimers();
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv,.pdf"
          aria-label="CSV 또는 PDF 파일 선택"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={submitting}
          className="text-sm text-ink-muted file:mr-4 file:rounded-pill file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:text-ink"
        />
        <Button type="submit" disabled={!file || submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {STAGE_LABELS[stage]}
            </span>
          ) : (
            "업로드"
          )}
        </Button>
      </div>
      <p className="text-xs leading-[1.4] text-ink-subtle">
        CSV·PDF 지원 · EUC-KR/CP949 자동 인식 · 최대 2MB(CSV)/5MB(PDF) · 2,000행까지
      </p>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
