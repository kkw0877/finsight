import { describe, expect, it, vi } from "vitest";
import { createRealClient } from "./real-client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * supabase-js의 PostgrestFilterBuilder를 흉내내는 최소 페이크.
 * DB 컬럼은 snake_case, 어댑터가 camelCase로 왕복 변환하는지 검증한다.
 */
function createFakeBuilder(rows: Record<string, unknown>[]) {
  const state: {
    mode: "select" | "insert" | "upsert";
    inserted: Record<string, unknown>[];
    onConflict?: string;
    filters: [string, unknown][];
  } = {
    mode: "select",
    inserted: [],
    filters: [],
  };

  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
      state.mode = "insert";
      state.inserted = Array.isArray(payload) ? payload : [payload];
      return builder;
    }),
    upsert: vi.fn(
      (payload: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) => {
        state.mode = "upsert";
        state.inserted = Array.isArray(payload) ? payload : [payload];
        state.onConflict = options?.onConflict;
        return builder;
      },
    ),
    eq: vi.fn((column: string, value: unknown) => {
      state.filters.push([column, value]);
      return builder;
    }),
    single: vi.fn(async () => {
      const { data, error } = await execute();
      if (error) return { data: null, error };
      if (!data || data.length !== 1) return { data: null, error: { message: "not exactly one row" } };
      return { data: data[0], error: null };
    }),
    then: (onfulfilled?: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
      execute().then(onfulfilled, onrejected),
  };

  async function execute() {
    if (state.mode === "insert") {
      rows.push(...state.inserted);
      return { data: state.inserted, error: null };
    }
    if (state.mode === "upsert") {
      const column = state.onConflict;
      for (const row of state.inserted) {
        const idx = column ? rows.findIndex((r) => r[column] === row[column]) : -1;
        if (idx >= 0) rows[idx] = row;
        else rows.push(row);
      }
      return { data: state.inserted, error: null };
    }
    const matched = rows.filter((row) => state.filters.every(([col, val]) => row[col] === val));
    return { data: matched, error: null };
  }

  return builder;
}

function createFakeSupabaseClient(opts: {
  user?: { id: string; email: string; user_metadata?: Record<string, unknown> } | null;
  tableRows?: Record<string, unknown>[];
} = {}) {
  const rows = opts.tableRows ?? [];
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: opts.user ?? null } })),
      signInWithOAuth: vi.fn(async ({ options }: { options?: { redirectTo?: string } }) => ({
        data: { url: options?.redirectTo ?? "https://accounts.google.com/oauth" },
      })),
      signOut: vi.fn(async () => ({ error: null })),
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => createFakeBuilder(rows)),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async (path: string) => ({ data: { path }, error: null })),
        download: vi.fn(async () => ({ data: new Blob(["hello"]), error: null })),
      })),
    },
  } as unknown as SupabaseClient;
}

describe("createRealClient", () => {
  it("converts camelCase insert rows to snake_case columns", async () => {
    const rows: Record<string, unknown>[] = [];
    const client = createRealClient(createFakeSupabaseClient({ tableRows: rows }));

    await client.from("subscriptions").insert({ userId: "user-1", isPro: true });

    expect(rows).toEqual([{ user_id: "user-1", is_pro: true }]);
  });

  it("upsert converts payload and onConflict column to snake_case, replacing the matched row", async () => {
    const rows: Record<string, unknown>[] = [];
    const client = createRealClient(createFakeSupabaseClient({ tableRows: rows }));

    await client.from("subscriptions").upsert({ userId: "user-1", isPro: true }, { onConflict: "userId" });
    await client.from("subscriptions").upsert({ userId: "user-1", isPro: false }, { onConflict: "userId" });

    expect(rows).toEqual([{ user_id: "user-1", is_pro: false }]);
  });

  it("converts snake_case select results back to camelCase", async () => {
    const rows = [{ user_id: "user-1", is_pro: true }];
    const client = createRealClient(createFakeSupabaseClient({ tableRows: rows }));

    const { data, error } = await client.from("subscriptions").select().eq("userId", "user-1").single();

    expect(error).toBeNull();
    expect(data).toEqual({ userId: "user-1", isPro: true });
  });

  it("maps auth.getUser to null when no session", async () => {
    const client = createRealClient(createFakeSupabaseClient({ user: null }));
    const { data } = await client.auth.getUser();
    expect(data.user).toBeNull();
  });

  it("maps auth.getUser to a MockUser-shaped object when a session exists", async () => {
    const client = createRealClient(
      createFakeSupabaseClient({ user: { id: "user-1", email: "a@b.com", user_metadata: { full_name: "A" } } }),
    );
    const { data } = await client.auth.getUser();
    expect(data.user).toEqual({ id: "user-1", email: "a@b.com", name: "A" });
  });

  it("passes through storage upload/download", async () => {
    const client = createRealClient(createFakeSupabaseClient());
    const uploadResult = await client.storage.from("csv-uploads").upload("user-1/x.csv", Buffer.from("a"));
    expect(uploadResult.error).toBeNull();
    expect(uploadResult.data?.path).toBe("user-1/x.csv");

    const downloadResult = await client.storage.from("csv-uploads").download("user-1/x.csv");
    expect(downloadResult.error).toBeNull();
    expect(downloadResult.data).toBeInstanceOf(Blob);
  });
});
