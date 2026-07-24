import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { canUpload } from "@/lib/quota";
import { detectAndDecode, maskSensitiveData, validateFileSize, validateRowCount } from "@/lib/csv";
import { parseCsvToTransactions, classifyAndSummarize } from "@/services/claude";
import type { Upload } from "@/types/upload";

const STATEMENTS_BUCKET = "csv-uploads";

/**
 * 실측(step 14 스파이크): 10행 파싱+분류 ~15초, 100행 ~67초 — 분류(Sonnet) 호출이 행 수에 비례해
 * 가장 크게 늘어난다. 일반적인 개인 카드 명세서(수십~수백 행) 기준으로 여유를 두고 300초로 설정한다.
 * 2,000행 상한에 근접한 대용량 CSV는 이 한도 내에서도 타임아웃될 수 있다(ADR-004에 명시된 트레이드오프).
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
    return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    validateFileSize(buffer.byteLength);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const csvText = detectAndDecode(buffer);

  try {
    validateRowCount(csvText);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const uploadId = crypto.randomUUID();
  const storagePath = `${user.id}/${uploadId}.csv`;
  const { error: storageError } = await supabase.storage.from(STATEMENTS_BUCKET).upload(storagePath, buffer);
  if (storageError) {
    return NextResponse.json({ error: "파일 저장에 실패했습니다." }, { status: 500 });
  }

  const maskedCsv = maskSensitiveData(csvText);

  let analysis;
  try {
    const transactions = await parseCsvToTransactions(maskedCsv, uploadId, user.id);
    analysis = await classifyAndSummarize(transactions);
  } catch {
    return NextResponse.json({ error: "CSV 분석에 실패했습니다." }, { status: 500 });
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

  return NextResponse.json({ ...analysis, blurred });
}
