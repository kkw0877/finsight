import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  QueryResult,
  SingleQueryResult,
  StorageDownloadResult,
  StorageFileResult,
  SupabaseClientLike,
  TableName,
  TableQuery,
  TableRowMap,
} from "./types";

/**
 * DB 컬럼은 snake_case(supabase/migrations), 앱 타입(types/*.ts)은 camelCase다.
 * mock-client는 인메모리라 변환이 필요 없었지만, 실제 Postgres 앞에서는
 * 호출부(upload-api 등)를 고치지 않기 위해 이 어댑터에서만 변환한다.
 */
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function toSnakeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelToSnake(key), value]));
}

function toCamelRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [snakeToCamel(key), value])) as T;
}

function toError(error: { message: string } | null): Error | null {
  return error ? new Error(error.message) : null;
}

/**
 * supabase-js PostgrestFilterBuilder의 서브셋 — types.ts의 TableQuery 계약만 필요하다.
 */
interface PostgrestBuilder
  extends PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> {
  select(columns?: string): PostgrestBuilder;
  insert(rows: unknown): PostgrestBuilder;
  eq(column: string, value: unknown): PostgrestBuilder;
  single(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
}

class RealTableQuery<K extends TableName> implements TableQuery<TableRowMap[K]> {
  constructor(private readonly builder: PostgrestBuilder) {}

  select(columns?: string): TableQuery<TableRowMap[K]> {
    return new RealTableQuery(this.builder.select(columns));
  }

  insert(rows: TableRowMap[K] | TableRowMap[K][]): TableQuery<TableRowMap[K]> {
    const payload = Array.isArray(rows)
      ? rows.map((row) => toSnakeRow(row as unknown as Record<string, unknown>))
      : toSnakeRow(rows as unknown as Record<string, unknown>);
    return new RealTableQuery(this.builder.insert(payload));
  }

  eq(column: keyof TableRowMap[K] & string, value: unknown): TableQuery<TableRowMap[K]> {
    return new RealTableQuery(this.builder.eq(camelToSnake(column), value));
  }

  async single(): Promise<SingleQueryResult<TableRowMap[K]>> {
    const { data, error } = await this.builder.single();
    if (error) return { data: null, error: toError(error) };
    return { data: data ? toCamelRow<TableRowMap[K]>(data) : null, error: null };
  }

  then<TResult1 = QueryResult<TableRowMap[K]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<TableRowMap[K]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.builder
      .then(({ data, error }) => ({
        data: data ? data.map((row) => toCamelRow<TableRowMap[K]>(row)) : null,
        error: toError(error),
      }))
      .then(onfulfilled, onrejected);
  }
}

/**
 * 실제 @supabase/ssr 클라이언트를 SupabaseClientLike 계약으로 감싼다.
 * server.ts/client.ts가 이 함수만 호출해 mock-client와 동일한 인터페이스를 유지한다.
 */
export function createRealClient(client: SupabaseClient): SupabaseClientLike {
  return {
    auth: {
      async getUser() {
        const { data } = await client.auth.getUser();
        if (!data.user) return { data: { user: null } };
        return {
          data: {
            user: {
              id: data.user.id,
              email: data.user.email ?? "",
              name:
                (data.user.user_metadata?.full_name as string | undefined) ??
                (data.user.user_metadata?.name as string | undefined),
            },
          },
        };
      },
      async signInWithOAuth(opts) {
        const { data } = await client.auth.signInWithOAuth({
          provider: opts.provider,
          options: opts.options,
        });
        return { data: { url: data.url } };
      },
      async signOut() {
        const { error } = await client.auth.signOut();
        return { error: error ? new Error(error.message) : null } as { error: null };
      },
      async exchangeCodeForSession(code: string) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        return { error: toError(error) };
      },
    },
    from<K extends TableName>(table: K) {
      return new RealTableQuery<K>(client.from(table) as unknown as PostgrestBuilder);
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, file: Buffer | Blob): Promise<StorageFileResult> {
            const { data, error } = await client.storage.from(bucket).upload(path, file);
            return { data: data ? { path: data.path } : null, error: toError(error) };
          },
          async download(path: string): Promise<StorageDownloadResult> {
            const { data, error } = await client.storage.from(bucket).download(path);
            return { data: data ?? null, error: toError(error) };
          },
        };
      },
    },
  };
}
