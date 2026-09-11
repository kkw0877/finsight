import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { canUpload } from "@/lib/quota";
import { captureServerEvent, captureServerException } from "@/lib/posthog-server";
import {
  detectAndDecode,
  maskSensitiveData,
  resolveStatementFormat,
  validateFileSize,
  validateRowCount,
} from "@/lib/statement";
import { extractTextFromPdf } from "@/lib/pdf";
import { parseStatementToTransactions, classifyAndSummarize, flushAiObservability } from "@/services/claude";
import type { Upload } from "@/types/upload";

const STATEMENTS_BUCKET = "csv-uploads";

async function trackUploadFailure(userId: string, reason: string, properties?: Record<string, unknown>) {
  await captureServerEvent({
    distinctId: userId,
    event: "statement_upload_failed",
    properties: { reason, ...properties },
  });
}

/**
 * 실측(step 14 스파이크): 10행 파싱+분류 ~15초, 100행 ~67초 — 분류(Sonnet) 호출이 행 수에 비례해
 * 가장 크게 늘어난다. 일반적인 개인 카드 명세서(수십~수백 행) 기준으로 여유를 두고 300초로 설정한다.
 * 2,000행 상한에 근접한 대용량 CSV/PDF는 이 한도 내에서도 타임아웃될 수 있다(ADR-004에 명시된 트레이드오프).
 */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: existingUploads } = await supabase.from("uploads").select().eq("userId", user.id);
  const uploadsThisMonth = (existingUploads ?? []).filter(
    (upload) => upload.createdAt.slice(0, 7) === currentMonth,
  ).length;

  const { data: subscriptions } = await supabase.from("subscriptions").select().eq("userId", user.id);
  const isPro = subscriptions?.at(-1)?.isPro ?? false;
  const blurred = !canUpload(isPro, uploadsThisMonth);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    await trackUploadFailure(user.id, "missing_file");
    return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  }

  let format;
  try {
    format = resolveStatementFormat(file instanceof File ? file.name : "", file.type);
  } catch (err) {
    await trackUploadFailure(user.id, "invalid_format");
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    validateFileSize(buffer.byteLength, format);
  } catch (err) {
    await trackUploadFailure(user.id, "file_too_large", { file_format: format });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  let statementText: string;
  try {
    statementText = format === "pdf" ? await extractTextFromPdf(buffer) : detectAndDecode(buffer);
  } catch (err) {
    await trackUploadFailure(user.id, "decode_failed", { file_format: format });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    validateRowCount(statementText);
  } catch (err) {
    await trackUploadFailure(user.id, "invalid_row_count", { file_format: format });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const uploadId = crypto.randomUUID();
  const storagePath = `${user.id}/${uploadId}.${format}`;
  const { error: storageError } = await supabase.storage.from(STATEMENTS_BUCKET).upload(storagePath, buffer);
  if (storageError) {
    await trackUploadFailure(user.id, "storage_error", { file_format: format });
    await captureServerException(storageError, user.id, { uploadId, file_format: format });
    return NextResponse.json({ error: "파일 저장에 실패했습니다." }, { status: 500 });
  }

  const maskedText = maskSensitiveData(statementText);

  const traceId = crypto.randomUUID();
  let analysis;
  try {
    const transactions = await parseStatementToTransactions(maskedText, uploadId, user.id, traceId);
    analysis = await classifyAndSummarize(transactions, traceId);
  } catch (err) {
    await trackUploadFailure(user.id, "analysis_failed", { file_format: format });
    await captureServerException(err, user.id, { uploadId, traceId, file_format: format });
    return NextResponse.json({ error: "명세서 분석에 실패했습니다." }, { status: 500 });
  } finally {
    await flushAiObservability();
  }

  const uploadRow: Upload = {
    id: uploadId,
    userId: user.id,
    storagePath,
    status: "success",
    rowCount: analysis.transactions.length,
    createdAt: new Date().toISOString(),
  };
  await supabase.from("uploads").insert(uploadRow);
  await supabase.from("transactions").insert(analysis.transactions);

  await captureServerEvent({
    distinctId: user.id,
    event: "statement_uploaded",
    properties: {
      file_format: format,
      transaction_count: analysis.transactions.length,
      is_pro: isPro,
      result_blurred: blurred,
    },
  });

  return NextResponse.json({ ...analysis, blurred });
}
