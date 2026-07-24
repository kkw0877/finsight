import type { Category, Transaction } from './transaction';

export interface CategoryTotal {
  category: Category;
  total: number;
  percentage: number;
}

export interface MonthlyTrendPoint {
  month: string;
  total: number;
}

export interface AnalysisResult {
  summaryText: string;
  categoryTotals: CategoryTotal[];
  monthlyTrend: MonthlyTrendPoint[];
  transactions: Transaction[];
}
