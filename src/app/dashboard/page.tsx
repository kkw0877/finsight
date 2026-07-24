import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { canUpload } from "@/lib/quota";
import { aggregateTransactions } from "@/lib/aggregate";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createServerClient();

  const { data: uploads } = await supabase.from("uploads").select().eq("userId", user.id);
  const sortedUploads = [...(uploads ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestUpload = sortedUploads[0];

  if (!latestUpload) {
    return <DashboardContent initialAnalysis={null} initialBlurred={false} />;
  }

  const { data: transactions } = await supabase
    .from("transactions")
    .select()
    .eq("uploadId", latestUpload.id);

  const analysis = aggregateTransactions(transactions ?? []);

  const { data: subscriptions } = await supabase.from("subscriptions").select().eq("userId", user.id);
  const isPro = subscriptions?.[0]?.isPro ?? false;

  const latestMonth = latestUpload.createdAt.slice(0, 7);
  const uploadsBeforeLatest = sortedUploads.filter(
    (upload) => upload.createdAt.slice(0, 7) === latestMonth && upload.createdAt < latestUpload.createdAt,
  ).length;
  const blurred = !canUpload(isPro, uploadsBeforeLatest);

  return <DashboardContent initialAnalysis={analysis} initialBlurred={blurred} />;
}
