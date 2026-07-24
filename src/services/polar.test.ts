import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCheckoutsCreate } = vi.hoisted(() => ({ mockCheckoutsCreate: vi.fn() }));

vi.mock("@polar-sh/sdk", () => ({
  Polar: vi.fn().mockImplementation(() => ({
    checkouts: { create: mockCheckoutsCreate },
  })),
}));

const { mockValidateEvent, MockWebhookVerificationError } = vi.hoisted(() => {
  class MockWebhookVerificationError extends Error {}
  return { mockValidateEvent: vi.fn(), MockWebhookVerificationError };
});

vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: mockValidateEvent,
  WebhookVerificationError: MockWebhookVerificationError,
}));

const { createCheckoutSession, verifyAndParseWebhook } = await import("./polar");

function signatureHeaders() {
  return JSON.stringify({
    "webhook-id": "wh-1",
    "webhook-timestamp": "1700000000",
    "webhook-signature": "v1,sig",
  });
}

beforeEach(() => {
  mockCheckoutsCreate.mockReset();
  mockValidateEvent.mockReset();
  vi.stubEnv("POLAR_PRODUCT_ID", "prod-123");
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example.com");
});

describe("createCheckoutSession", () => {
  it("creates a Polar checkout session linked to the user via externalCustomerId", async () => {
    mockCheckoutsCreate.mockResolvedValueOnce({ url: "https://polar.sh/checkout/abc" });

    const result = await createCheckoutSession("user-1");

    expect(result).toEqual({ url: "https://polar.sh/checkout/abc" });
    expect(mockCheckoutsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ products: ["prod-123"], externalCustomerId: "user-1" }),
    );
  });

  it("throws without calling Polar when no product is configured", async () => {
    vi.stubEnv("POLAR_PRODUCT_ID", "");

    await expect(createCheckoutSession("user-1")).rejects.toThrow();
    expect(mockCheckoutsCreate).not.toHaveBeenCalled();
  });
});

describe("verifyAndParseWebhook", () => {
  it("returns userId/isPro:true for a verified subscription.active event", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "subscription.active",
      data: { customer: { externalId: "user-1" } },
    });

    const result = await verifyAndParseWebhook("{}", signatureHeaders());
    expect(result).toEqual({ userId: "user-1", isPro: true });
  });

  it("returns userId/isPro:true for a verified subscription.uncanceled event", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "subscription.uncanceled",
      data: { customer: { externalId: "user-1" } },
    });

    const result = await verifyAndParseWebhook("{}", signatureHeaders());
    expect(result).toEqual({ userId: "user-1", isPro: true });
  });

  it("returns userId/isPro:false for a verified subscription.revoked event", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "subscription.revoked",
      data: { customer: { externalId: "user-1" } },
    });

    const result = await verifyAndParseWebhook("{}", signatureHeaders());
    expect(result).toEqual({ userId: "user-1", isPro: false });
  });

  it("returns null for event types unrelated to subscription status", async () => {
    mockValidateEvent.mockReturnValueOnce({
      type: "checkout.created",
      data: {},
    });

    const result = await verifyAndParseWebhook("{}", signatureHeaders());
    expect(result).toBeNull();
  });

  it("returns null when signature verification fails", async () => {
    mockValidateEvent.mockImplementationOnce(() => {
      throw new MockWebhookVerificationError("bad signature");
    });

    const result = await verifyAndParseWebhook("{}", signatureHeaders());
    expect(result).toBeNull();
  });

  it("returns null for a malformed signature header bundle without calling validateEvent", async () => {
    const result = await verifyAndParseWebhook("{}", "not-json");
    expect(result).toBeNull();
    expect(mockValidateEvent).not.toHaveBeenCalled();
  });

  it("throws without calling validateEvent when POLAR_WEBHOOK_SECRET is not configured (fail-closed)", async () => {
    vi.stubEnv("POLAR_WEBHOOK_SECRET", "");

    await expect(verifyAndParseWebhook("{}", signatureHeaders())).rejects.toThrow();
    expect(mockValidateEvent).not.toHaveBeenCalled();
  });
});
