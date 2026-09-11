import { describe, expect, it } from "vitest";
import { size, contentType } from "./opengraph-image";

describe("opengraph-image", () => {
  it("exports the standard OG image dimensions", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
  });

  it("exports a PNG content type", () => {
    expect(contentType).toBe("image/png");
  });
});
