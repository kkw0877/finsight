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
});
