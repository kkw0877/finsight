import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCaptureServerException = vi.fn();

vi.mock("@/lib/posthog-server", () => ({
  captureServerException: mockCaptureServerException,
}));

const { onRequestError, register } = await import("./instrumentation");

const baseRequest = { path: "/api/upload", method: "POST", headers: {} };
const baseContext = {
  routerKind: "App Router" as const,
  routePath: "/api/upload",
  routeType: "route" as const,
  revalidateReason: undefined,
};

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  mockCaptureServerException.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("register", () => {
  it("아무 것도 하지 않는다", () => {
    expect(() => register()).not.toThrow();
  });
});

describe("onRequestError", () => {
  it("nodejs 런타임이 아니면 캡처하지 않는다", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const error = new Error("boom");

    await onRequestError(error, baseRequest, baseContext);

    expect(mockCaptureServerException).not.toHaveBeenCalled();
  });

  it("PostHog 쿠키가 없으면 distinctId 없이 캡처한다", async () => {
    const error = new Error("boom");

    await onRequestError(error, baseRequest, baseContext);

    expect(mockCaptureServerException).toHaveBeenCalledWith(error, undefined);
  });

  it("PostHog 쿠키에서 distinct_id를 추출해 캡처한다", async () => {
    const error = new Error("boom");
    const cookiePayload = encodeURIComponent(JSON.stringify({ distinct_id: "user-123" }));

    await onRequestError(error, { ...baseRequest, headers: { cookie: `ph_phc_abc_posthog=${cookiePayload}` } }, baseContext);

    expect(mockCaptureServerException).toHaveBeenCalledWith(error, "user-123");
  });

  it("쿠키 파싱에 실패해도 던지지 않고 distinctId 없이 캡처한다", async () => {
    const error = new Error("boom");

    await onRequestError(error, { ...baseRequest, headers: { cookie: "ph_phc_abc_posthog=not-valid-json" } }, baseContext);

    expect(mockCaptureServerException).toHaveBeenCalledWith(error, undefined);
  });
});
