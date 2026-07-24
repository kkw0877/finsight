import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@/lib/supabase/server";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error("NEXT_REDIRECT");
  },
}));

const { requireUser } = await import("./auth");

describe("requireUser", () => {
  beforeEach(async () => {
    redirectMock.mockClear();
    const supabase = await createServerClient();
    await supabase.auth.signInWithOAuth({ provider: "google" });
  });

  afterEach(async () => {
    const supabase = await createServerClient();
    await supabase.auth.signInWithOAuth({ provider: "google" });
  });

  it("returns the current user when logged in", async () => {
    const user = await requireUser();
    expect(user.id).toBe("mock-user-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when no user is logged in", async () => {
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
