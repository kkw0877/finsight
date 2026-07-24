export const FREE_MONTHLY_LIMIT = 3;

export function canUpload(isPro: boolean, uploadsThisMonth: number): boolean {
  if (isPro) return true;
  return uploadsThisMonth < FREE_MONTHLY_LIMIT;
}
