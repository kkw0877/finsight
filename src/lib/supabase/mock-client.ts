import type {
  MockUser,
  QueryResult,
  SingleQueryResult,
  StorageDownloadResult,
  StorageFileResult,
  SupabaseClientLike,
  TableName,
  TableQuery,
  TableRowMap,
} from "./types";

const MOCK_USER: MockUser = {
  id: "mock-user-1",
  email: "mock-user@example.com",
  name: "Mock User",
};

/**
 * 인메모리 상태. 서버 프로세스가 재시작되면(예: 배포 재빌드, 서버리스 콜드스타트)
 * 아래 데이터는 전부 초기화된다 — step 13에서 실제 Supabase로 교체되기 전까지의 한계다.
 */
const store: {
  currentUser: MockUser | null;
  uploads: TableRowMap["uploads"][];
  transactions: TableRowMap["transactions"][];
  subscriptions: TableRowMap["subscriptions"][];
  oncall_alert_events: TableRowMap["oncall_alert_events"][];
} = {
  currentUser: MOCK_USER,
  uploads: [],
  transactions: [],
  subscriptions: [],
  oncall_alert_events: [],
};

/** 실제 Postgres의 primary key 제약을 흉내내는, 테이블별 유일 키 컬럼. */
const PRIMARY_KEYS: Partial<Record<TableName, string>> = {
  oncall_alert_events: "eventId",
};

const storageObjects = new Map<string, Buffer>();

function storageKey(bucket: string, path: string): string {
  return `${bucket}/${path}`;
}

async function toBuffer(file: Buffer | Blob): Promise<Buffer> {
  if (Buffer.isBuffer(file)) return file;
  return Buffer.from(await file.arrayBuffer());
}

class MockTableQuery<K extends TableName> implements TableQuery<TableRowMap[K]> {
  private mode: "select" | "insert" | "upsert" | "delete" = "select";
  private insertRows: TableRowMap[K][] = [];
  private onConflictColumn?: string;
  private returnInsertedRows = false;
  private filters: [string, unknown][] = [];

  constructor(private readonly table: K) {}

  select(): TableQuery<TableRowMap[K]> {
    if (this.mode === "insert" || this.mode === "upsert") {
      this.returnInsertedRows = true;
    } else {
      this.mode = "select";
    }
    return this;
  }

  insert(rows: TableRowMap[K] | TableRowMap[K][]): TableQuery<TableRowMap[K]> {
    this.mode = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  delete(): TableQuery<TableRowMap[K]> {
    this.mode = "delete";
    return this;
  }

  upsert(
    rows: TableRowMap[K] | TableRowMap[K][],
    options: { onConflict: keyof TableRowMap[K] & string },
  ): TableQuery<TableRowMap[K]> {
    this.mode = "upsert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    this.onConflictColumn = options.onConflict;
    return this;
  }

  eq(column: keyof TableRowMap[K] & string, value: unknown): TableQuery<TableRowMap[K]> {
    this.filters.push([column, value]);
    return this;
  }

  async single(): Promise<SingleQueryResult<TableRowMap[K]>> {
    const { data, error } = await this.execute();
    if (error) return { data: null, error };
    if (!data || data.length !== 1) {
      return { data: null, error: new Error(`${this.table}: 조회 결과가 정확히 1건이 아닙니다.`) };
    }
    return { data: data[0], error: null };
  }

  then<TResult1 = QueryResult<TableRowMap[K]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<TableRowMap[K]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<TableRowMap[K]>> {
    const rows = store[this.table] as TableRowMap[K][];

    if (this.mode === "insert") {
      const primaryKey = PRIMARY_KEYS[this.table];
      if (primaryKey) {
        const hasDuplicate = this.insertRows.some((row) =>
          rows.some(
            (existing) =>
              (existing as unknown as Record<string, unknown>)[primaryKey] ===
              (row as unknown as Record<string, unknown>)[primaryKey],
          ),
        );
        if (hasDuplicate) {
          return {
            data: null,
            error: Object.assign(new Error(`${this.table}: duplicate key value violates unique constraint`), {
              code: "23505",
            }),
          };
        }
      }
      rows.push(...this.insertRows);
      return { data: this.returnInsertedRows ? this.insertRows : null, error: null };
    }

    if (this.mode === "delete") {
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i] as unknown as Record<string, unknown>;
        if (this.filters.every(([column, value]) => row[column] === value)) {
          rows.splice(i, 1);
        }
      }
      return { data: null, error: null };
    }

    if (this.mode === "upsert") {
      const column = this.onConflictColumn;
      for (const row of this.insertRows) {
        const idx = column
          ? rows.findIndex(
              (existing) =>
                (existing as unknown as Record<string, unknown>)[column] ===
                (row as unknown as Record<string, unknown>)[column],
            )
          : -1;
        if (idx >= 0) rows[idx] = row;
        else rows.push(row);
      }
      return { data: this.returnInsertedRows ? this.insertRows : null, error: null };
    }

    const matched = rows.filter((row) =>
      this.filters.every(
        ([column, value]) => (row as unknown as Record<string, unknown>)[column] === value,
      ),
    );
    return { data: matched, error: null };
  }
}

function createStorage(): SupabaseClientLike["storage"] {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, file: Buffer | Blob): Promise<StorageFileResult> {
          try {
            storageObjects.set(storageKey(bucket, path), await toBuffer(file));
            return { data: { path }, error: null };
          } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error("업로드에 실패했습니다.") };
          }
        },
        async download(path: string): Promise<StorageDownloadResult> {
          const buffer = storageObjects.get(storageKey(bucket, path));
          if (!buffer) {
            return { data: null, error: new Error("파일을 찾을 수 없습니다.") };
          }
          return { data: new Blob([Uint8Array.from(buffer)]), error: null };
        },
      };
    },
  };
}

export function createMockClient(): SupabaseClientLike {
  return {
    auth: {
      async getUser() {
        return { data: { user: store.currentUser } };
      },
      async signInWithOAuth(opts) {
        store.currentUser = MOCK_USER;
        return { data: { url: opts.options?.redirectTo ?? null } };
      },
      async signOut() {
        store.currentUser = null;
        return { error: null };
      },
      async exchangeCodeForSession() {
        store.currentUser = MOCK_USER;
        return { error: null };
      },
    },
    from<K extends TableName>(table: K) {
      return new MockTableQuery(table);
    },
    storage: createStorage(),
  };
}
