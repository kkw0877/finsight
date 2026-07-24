export type Category =
  | '식비'
  | '교통'
  | '주거_공과금'
  | '쇼핑'
  | '의료_건강'
  | '구독서비스'
  | '여가_문화'
  | '저축_투자'
  | '기타';

export interface Transaction {
  id: string;
  uploadId: string;
  userId: string;
  date: string;
  merchant: string;
  amount: number;
  category: Category;
  memo?: string;
}
