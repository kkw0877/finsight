import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCapture, mockCaptureException, mockShutdown, PostHogMock } = vi.hoisted(() => {
  const mockCapture = vi.fn();
  const mockCaptureException = vi.fn();
  const mockShutdown = vi.fn().mockResolvedValue(undefined);
  const PostHogMock = vi.fn().mockImplementation(() => ({
    capture: mockCapture,
    captureException: mockCaptureException,
    shutdown: mockShutdown,
  }));
  return { mockCapture, mockCaptureException, mockShutdown, PostHogMock };
});

vi.mock("posthog-node", () => ({ PostHog: PostHogMock }));

const { captureServerEvent, captureServerException } = await import("./posthog-server");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
  mockCapture.mockClear();
  mockCaptureException.mockClear();
  mockShutdown.mockClear();
  PostHogMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("captureServerEvent", () => {
  it("캡처 후 shutdown으로 즉시 flush한다", async () => {
    await captureServerEvent({ distinctId: "user-1", event: "statement_uploaded", properties: { is_pro: true } });

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "user-1",
      event: "statement_uploaded",
      properties: { is_pro: true },
    });
    expect(mockShutdown).toHaveBeenCalledOnce();
  });

  it("PostHog 환경변수가 없으면 아무것도 캡처하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "");

    await captureServerEvent({ distinctId: "user-1", event: "statement_uploaded" });

    expect(PostHogMock).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });
});

describe("captureServerException", () => {
  it("distinctId와 추가 속성을 함께 캡처하고 shutdown한다", async () => {
    const error = new Error("명세서 분석에 실패했습니다.");

    await captureServerException(error, "user-1", { uploadId: "upload-1" });

    expect(mockCaptureException).toHaveBeenCalledWith(error, "user-1", { uploadId: "upload-1" });
    expect(mockShutdown).toHaveBeenCalledOnce();
  });

  it("distinctId 없이도 캡처할 수 있다", async () => {
    const error = new Error("boom");

    await captureServerException(error);

    expect(mockCaptureException).toHaveBeenCalledWith(error, undefined, undefined);
  });

  it("PostHog 환경변수가 없으면 아무것도 캡처하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");

    await captureServerException(new Error("boom"));

    expect(PostHogMock).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});
