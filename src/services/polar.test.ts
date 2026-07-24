import { describe, expect, it } from "vitest";
import { createCheckoutSession, verifyAndParseWebhook } from "./polar";

describe("createCheckoutSession", () => {
  it("returns a mock checkout url containing the user id", async () => {
    const result = await createCheckoutSession("user-1");

    expect(result).toEqual({ url: "/mock-checkout?user=user-1" });
  });
});

describe("verifyAndParseWebhook", () => {
  it("parses a valid webhook payload into userId/isPro", async () => {
    const payload = JSON.stringify({ userId: "user-1", isPro: true });

    const result = await verifyAndParseWebhook(payload, "any-signature");

    expect(result).toEqual({ userId: "user-1", isPro: true });
  });

  it("returns null for malformed JSON", async () => {
    const result = await verifyAndParseWebhook("not-json", "any-signature");

    expect(result).toBeNull();
  });

  it("returns null when userId is missing", async () => {
    const payload = JSON.stringify({ isPro: true });

    const result = await verifyAndParseWebhook(payload, "any-signature");

    expect(result).toBeNull();
  });

  it("returns null when isPro is missing or not a boolean", async () => {
    const payload = JSON.stringify({ userId: "user-1", isPro: "yes" });

    const result = await verifyAndParseWebhook(payload, "any-signature");

    expect(result).toBeNull();
  });
});
