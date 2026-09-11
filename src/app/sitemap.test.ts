import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example.com");
});

describe("sitemap", () => {
  it("includes the landing page and the blog index", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://finsight.example.com",
        "https://finsight.example.com/blog",
      ]),
    );
  });

  it("does not include private/authenticated routes", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/dashboard"))).toBe(false);
    expect(urls.some((url) => url.includes("/login"))).toBe(false);
  });
});
