export interface Upload {
  id: string;
  userId: string;
  storagePath: string;
  status: 'success' | 'failed';
  rowCount: number;
  createdAt: string;
}
