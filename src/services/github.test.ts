import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OncallAlertHarness } from "@/types/oncall";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal("fetch", mockFetch);

const { dispatchOncallAlert } = await import("./github");

function harness(overrides: Partial<OncallAlertHarness> = {}): OncallAlertHarness {
  return {
    eventId: "evt-1",
    triggerType: "issue_created",
    fingerprint: "fp-abc",
    issueId: "issue-1",
    name: "TypeError",
    description: "boom",
    exceptionTimestamp: "2026-09-12T00:00:00.000Z",
    currentBucketValue: null,
    computedBaseline: null,
    projectUrl: "https://us.posthog.com/project/123",
    deepLink: "https://us.posthog.com/project/123/error_tracking/fingerprint/fp-abc",
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv("GITHUB_DISPATCH_TOKEN", "gh-pat-test");
});

describe("dispatchOncallAlert", () => {
  it("POSTs a repository_dispatch event with the harness as client_payload", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await dispatchOncallAlert(harness());

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/kkw0877/finsight/dispatches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer gh-pat-test",
          Accept: "application/vnd.github+json",
        }),
      }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body).toEqual({ event_type: "posthog-oncall-alert", client_payload: harness() });
  });

  it("throws when GitHub responds with a non-2xx status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "Bad credentials" });

    await expect(dispatchOncallAlert(harness())).rejects.toThrow();
  });

  it("throws without calling fetch when GITHUB_DISPATCH_TOKEN is not configured (fail-closed)", async () => {
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "");

    await expect(dispatchOncallAlert(harness())).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
