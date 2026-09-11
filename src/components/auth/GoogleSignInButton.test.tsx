import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
vi.stubGlobal("fetch", fetchMock);

import { GoogleSignInButton } from "./GoogleSignInButton";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    fetchMock.mockClear();
  });

  it("renders a Google sign-in button", () => {
    render(<GoogleSignInButton />);
    expect(
      screen.getByRole("button", { name: "Google로 로그인" }),
    ).toBeInTheDocument();
  });

  it("calls the sign-in API and redirects to /dashboard on click", async () => {
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole("button", { name: "Google로 로그인" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signin", {
      method: "POST",
    });
  });

  it("로그인 API가 에러를 반환하면 에러 메시지를 보여주고 리다이렉트하지 않는다", async () => {
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ error: "PR 프리뷰 환경에서는 Google 로그인을 사용할 수 없습니다." }), {
          status: 403,
        }),
    );

    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole("button", { name: "Google로 로그인" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "PR 프리뷰 환경에서는 Google 로그인을 사용할 수 없습니다.",
      ),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
