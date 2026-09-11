import { beforeEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example.com");
});

describe("robots", () => {
  it("blocks private/authenticated routes from crawling", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallow = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : [r.disallow],
    );
    expect(disallow).toEqual(
      expect.arrayContaining(["/dashboard", "/api/", "/login"]),
    );
  });

  it("points to the sitemap under the app base URL", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://finsight.example.com/sitemap.xml");
  });
});
