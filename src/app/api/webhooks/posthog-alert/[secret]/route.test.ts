import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/services/supabase-admin";

const { mockDispatch } = vi.hoisted(() => ({ mockDispatch: vi.fn() }));
vi.mock("@/services/github", () => ({ dispatchOncallAlert: mockDispatch }));

const { POST } = await import("./route");

function buildRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function issueCreatedBody(eventId: string, fingerprint = "fp-route-1") {
  return {
    event: {
      uuid: eventId,
      event: "$error_tracking_issue_created",
      distinct_id: "issue-route-1",
      properties: {
        name: "TypeError",
        description: "boom",
        fingerprint,
        exception_timestamp: "2026-09-12T00:00:00.000Z",
      },
    },
    project: { url: "https://us.posthog.com/project/123" },
  };
}

beforeEach(() => {
  mockDispatch.mockReset();
  mockDispatch.mockResolvedValue(undefined);
  vi.stubEnv("POSTHOG_ALERT_WEBHOOK_SECRET", "test-secret-value");
});

describe("POST /api/webhooks/posthog-alert/[secret]", () => {
  it("검증된 새 이벤트는 멱등 저장소에 기록하고 CI dispatch를 호출한다", async () => {
    const response = await POST(buildRequest(issueCreatedBody("evt-route-1")), {
      params: Promise.resolve({ secret: "test-secret-value" }),
    });

    expect(response.status).toBe(200);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ eventId: "evt-route-1" }));

    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("oncall_alert_events").select().eq("eventId", "evt-route-1");
    expect(data).toHaveLength(1);
  });

  it("잘못된 secret이면 401을 반환하고 DB/dispatch를 건드리지 않는다", async () => {
    const response = await POST(buildRequest(issueCreatedBody("evt-route-2")), {
      params: Promise.resolve({ secret: "wrong-secret" }),
    });

    expect(response.status).toBe(401);
    expect(mockDispatch).not.toHaveBeenCalled();

    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("oncall_alert_events").select().eq("eventId", "evt-route-2");
    expect(data).toHaveLength(0);
  });

  it("이미 처리된 event_id가 재전송되면 dispatch 없이 200을 반환한다(멱등)", async () => {
    await POST(buildRequest(issueCreatedBody("evt-route-3")), {
      params: Promise.resolve({ secret: "test-secret-value" }),
    });
    mockDispatch.mockClear();

    const response = await POST(buildRequest(issueCreatedBody("evt-route-3")), {
      params: Promise.resolve({ secret: "test-secret-value" }),
    });

    expect(response.status).toBe(200);
    expect(mockDispatch).not.toHaveBeenCalled();

    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("oncall_alert_events").select().eq("eventId", "evt-route-3");
    expect(data).toHaveLength(1);
  });

  it("무관한 PostHog 이벤트는 200으로 무시하고 아무것도 기록하지 않는다", async () => {
    const response = await POST(
      buildRequest({ event: { uuid: "evt-route-4", event: "$pageview", properties: {} } }),
      { params: Promise.resolve({ secret: "test-secret-value" }) },
    );

    expect(response.status).toBe(200);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("dispatch 실패 시 방금 넣은 event_id를 롤백하고 502를 반환한다(재시도 허용)", async () => {
    mockDispatch.mockRejectedValueOnce(new Error("network error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(buildRequest(issueCreatedBody("evt-route-5")), {
      params: Promise.resolve({ secret: "test-secret-value" }),
    });

    expect(consoleError).toHaveBeenCalledWith("oncall dispatch failed:", "network error");
    consoleError.mockRestore();

    expect(response.status).toBe(502);

    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("oncall_alert_events").select().eq("eventId", "evt-route-5");
    expect(data).toHaveLength(0);
  });
});
