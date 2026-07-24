import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
vi.stubGlobal("fetch", fetchMock);

import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    fetchMock.mockClear();
  });

  it("renders a logout button", () => {
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("calls the sign-out API and redirects to /login on click", async () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
