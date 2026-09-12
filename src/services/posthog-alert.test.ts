import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseAlertPayload, verifyWebhookSecret } from "./posthog-alert";

beforeEach(() => {
  vi.stubEnv("POSTHOG_ALERT_WEBHOOK_SECRET", "test-secret-value");
});

describe("verifyWebhookSecret", () => {
  it("returns true when the secret matches", () => {
    expect(verifyWebhookSecret("test-secret-value")).toBe(true);
  });

  it("returns false when the secret does not match", () => {
    expect(verifyWebhookSecret("wrong-secret")).toBe(false);
  });

  it("returns false (fail-closed) when POSTHOG_ALERT_WEBHOOK_SECRET is not configured", () => {
    vi.stubEnv("POSTHOG_ALERT_WEBHOOK_SECRET", "");
    expect(verifyWebhookSecret("anything")).toBe(false);
  });

  it("returns false for a missing secret path segment", () => {
    expect(verifyWebhookSecret(undefined)).toBe(false);
  });

  it("returns false without throwing when lengths differ", () => {
    expect(verifyWebhookSecret("short")).toBe(false);
  });
});

function issueCreatedPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      uuid: "evt-uuid-1",
      event: "$error_tracking_issue_created",
      distinct_id: "issue-1",
      properties: {
        name: "TypeError",
        description: "Cannot read properties of undefined",
        fingerprint: "fp-abc",
        exception_timestamp: "2026-09-12T00:00:00.000Z",
      },
    },
    project: { url: "https://us.posthog.com/project/123" },
    ...overrides,
  };
}

function issueSpikingPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      uuid: "evt-uuid-2",
      event: "$error_tracking_issue_spiking",
      distinct_id: "issue-2",
      properties: {
        name: "NetworkError",
        description: "Failed to fetch",
        fingerprint: "fp-def",
        exception_timestamp: "2026-09-12T00:05:00.000Z",
        current_bucket_value: 42,
        computed_baseline: 3,
      },
    },
    project: { url: "https://us.posthog.com/project/123" },
    ...overrides,
  };
}

describe("parseAlertPayload", () => {
  it("parses an issue_created event into a harness", () => {
    const harness = parseAlertPayload(issueCreatedPayload());
    expect(harness).toEqual({
      eventId: "evt-uuid-1",
      triggerType: "issue_created",
      fingerprint: "fp-abc",
      issueId: "issue-1",
      name: "TypeError",
      description: "Cannot read properties of undefined",
      exceptionTimestamp: "2026-09-12T00:00:00.000Z",
      currentBucketValue: null,
      computedBaseline: null,
      projectUrl: "https://us.posthog.com/project/123",
      deepLink: expect.stringContaining("fp-abc"),
    });
  });

  it("parses an issue_spiking event, keeping the bucket/baseline counters", () => {
    const harness = parseAlertPayload(issueSpikingPayload());
    expect(harness?.triggerType).toBe("issue_spiking");
    expect(harness?.currentBucketValue).toBe(42);
    expect(harness?.computedBaseline).toBe(3);
  });

  it("returns null for an unrelated PostHog event", () => {
    const harness = parseAlertPayload({ event: { uuid: "evt-uuid-3", event: "$pageview", properties: {} } });
    expect(harness).toBeNull();
  });

  it("returns null when the event has no uuid", () => {
    const harness = parseAlertPayload(
      issueCreatedPayload({
        event: {
          event: "$error_tracking_issue_created",
          distinct_id: "issue-1",
          properties: { name: "TypeError", description: "", fingerprint: "fp-abc", exception_timestamp: "t" },
        },
      }),
    );
    expect(harness).toBeNull();
  });

  it("returns null for a non-object body", () => {
    expect(parseAlertPayload(null)).toBeNull();
    expect(parseAlertPayload("not-json")).toBeNull();
  });
});
