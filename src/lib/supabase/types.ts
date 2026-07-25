import type { Transaction } from "@/types/transaction";
import type { Upload } from "@/types/upload";
import type { Subscription } from "@/types/subscription";

export interface MockUser {
  id: string;
  email: string;
  name?: string;
}

export interface QueryResult<T> {
  data: T[] | null;
  error: Error | null;
}

export interface SingleQueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * supabase-js의 PostgrestFilterBuilder 서브셋.
 * select/insert로 모드를 정하고, eq로 필터를 쌓은 뒤 await하거나 single()로 종료한다.
 */
export interface TableQuery<T> extends PromiseLike<QueryResult<T>> {
  select(columns?: string): TableQuery<T>;
  insert(rows: T | T[]): TableQuery<T>;
  upsert(rows: T | T[], options: { onConflict: keyof T & string }): TableQuery<T>;
  eq(column: keyof T & string, value: unknown): TableQuery<T>;
  single(): Promise<SingleQueryResult<T>>;
}

export interface TableRowMap {
  uploads: Upload;
  transactions: Transaction;
  subscriptions: Subscription;
}

export type TableName = keyof TableRowMap;

export interface StorageFileResult {
  data: { path: string } | null;
  error: Error | null;
}

export interface StorageDownloadResult {
  data: Blob | null;
  error: Error | null;
}

export interface SupabaseClientLike {
  auth: {
    getUser(): Promise<{ data: { user: MockUser | null } }>;
    signInWithOAuth(opts: {
      provider: "google";
      options?: { redirectTo?: string };
    }): Promise<{ data: { url: string | null } }>;
    signOut(): Promise<{ error: null }>;
    exchangeCodeForSession(code: string): Promise<{ error: Error | null }>;
  };
  from<K extends TableName>(table: K): TableQuery<TableRowMap[K]>;
  storage: {
    from(bucket: string): {
      upload(path: string, file: Buffer | Blob): Promise<StorageFileResult>;
      download(path: string): Promise<StorageDownloadResult>;
    };
  };
}
