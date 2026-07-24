import { describe, expect, it } from "vitest";
import { createMockClient } from "./mock-client";
import type { Upload } from "@/types/upload";
import type { Transaction } from "@/types/transaction";

/** jsdom의 Blob 구현에는 text()/arrayBuffer()가 없어 FileReader로 대신 읽는다. */
function readBlobAsText(blob: Blob | null | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!blob) return reject(new Error("blob is null"));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("createMockClient auth", () => {
  it("returns a fixed mock user by default", async () => {
    const client = createMockClient();
    const { data } = await client.auth.getUser();
    expect(data.user).toEqual({
      id: "mock-user-1",
      email: "mock-user@example.com",
      name: "Mock User",
    });
  });

  it("clears the user on signOut and restores it on signInWithOAuth", async () => {
    const client = createMockClient();

    const signOutResult = await client.auth.signOut();
    expect(signOutResult.error).toBeNull();
    expect((await client.auth.getUser()).data.user).toBeNull();

    const signInResult = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "/dashboard" },
    });
    expect(signInResult.data.url).toBe("/dashboard");
    expect((await client.auth.getUser()).data.user?.id).toBe("mock-user-1");
  });
});

describe("createMockClient table queries", () => {
  it("inserts a row without returning data by default", async () => {
    const client = createMockClient();
    const upload: Upload = {
      id: "upload-1",
      userId: "mock-user-1",
      storagePath: "mock-user-1/upload-1.csv",
      status: "success",
      rowCount: 10,
      createdAt: "2026-07-24T00:00:00.000Z",
    };

    const { data, error } = await client.from("uploads").insert(upload);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("insert().select() returns the inserted rows", async () => {
    const client = createMockClient();
    const upload: Upload = {
      id: "upload-2",
      userId: "mock-user-1",
      storagePath: "mock-user-1/upload-2.csv",
      status: "success",
      rowCount: 5,
      createdAt: "2026-07-24T00:00:00.000Z",
    };

    const { data, error } = await client.from("uploads").insert(upload).select();
    expect(error).toBeNull();
    expect(data).toEqual([upload]);
  });

  it("select().eq() filters rows and single() unwraps exactly one match", async () => {
    const client = createMockClient();
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        uploadId: "upload-3",
        userId: "mock-user-1",
        date: "2026-07-01",
        merchant: "스타벅스",
        amount: 5000,
        category: "식비",
      },
      {
        id: "tx-2",
        uploadId: "upload-3",
        userId: "mock-user-1",
        date: "2026-07-02",
        merchant: "GS25",
        amount: 3000,
        category: "식비",
      },
    ];
    await client.from("transactions").insert(transactions);

    const { data, error } = await client.from("transactions").select().eq("uploadId", "upload-3");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const single = await client
      .from("transactions")
      .select()
      .eq("uploadId", "upload-3")
      .eq("id", "tx-1")
      .single();
    expect(single.error).toBeNull();
    expect(single.data?.merchant).toBe("스타벅스");
  });

  it("single() errors when zero or multiple rows match", async () => {
    const client = createMockClient();
    const missing = await client.from("subscriptions").select().eq("userId", "no-such-user").single();
    expect(missing.data).toBeNull();
    expect(missing.error).toBeInstanceOf(Error);
  });
});

describe("createMockClient storage", () => {
  it("uploads and downloads a file roundtrip", async () => {
    const client = createMockClient();
    const bucket = client.storage.from("statements");
    const content = Buffer.from("date,merchant,amount\n2026-07-01,스타벅스,5000", "utf-8");

    const uploadResult = await bucket.upload("mock-user-1/upload-1.csv", content);
    expect(uploadResult.error).toBeNull();
    expect(uploadResult.data?.path).toBe("mock-user-1/upload-1.csv");

    const downloadResult = await bucket.download("mock-user-1/upload-1.csv");
    expect(downloadResult.error).toBeNull();
    expect(downloadResult.data?.size).toBe(content.byteLength);
    const text = await readBlobAsText(downloadResult.data);
    expect(text).toBe(content.toString("utf-8"));
  });

  it("returns an error when downloading a missing file", async () => {
    const client = createMockClient();
    const result = await client.storage.from("statements").download("no-such-path.csv");
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
