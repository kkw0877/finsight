"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AnalysisResult } from "@/types/analysis";

export interface UploadResult extends AnalysisResult {
  blurred: boolean;
}

export interface UploadWidgetProps {
  onResult: (result: UploadResult) => void;
}

export function UploadWidget({ onResult }: UploadWidgetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);

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
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          aria-label="CSV 파일 선택"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={submitting}
          className="text-sm text-ink-muted file:mr-4 file:rounded-pill file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:text-ink"
        />
        <Button type="submit" disabled={!file || submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              분석 중...
            </span>
          ) : (
            "업로드"
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
