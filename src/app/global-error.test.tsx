import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCaptureException } = vi.hoisted(() => ({ mockCaptureException: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { captureException: mockCaptureException } }));

import GlobalError from "./global-error";

describe("GlobalError", () => {
  beforeEach(() => {
    mockCaptureException.mockClear();
  });

  it("마운트 시 PostHog로 예외를 캡처한다", () => {
    const error = new Error("boom");

    render(<GlobalError error={error} reset={() => {}} />);

    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it("안내 문구와 다시 시도 버튼을 보여주고, 클릭하면 reset을 호출한다", () => {
    const resetMock = vi.fn();

    render(<GlobalError error={new Error("boom")} reset={resetMock} />);

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(resetMock).toHaveBeenCalledOnce();
  });
});
