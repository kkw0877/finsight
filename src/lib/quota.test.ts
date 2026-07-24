import { describe, expect, it } from "vitest";
import { FREE_MONTHLY_LIMIT, canUpload } from "./quota";

describe("FREE_MONTHLY_LIMIT", () => {
  it("is 3", () => {
    expect(FREE_MONTHLY_LIMIT).toBe(3);
  });
});

describe("canUpload", () => {
  it("allows Pro users regardless of uploads this month", () => {
    expect(canUpload(true, 0)).toBe(true);
    expect(canUpload(true, 3)).toBe(true);
    expect(canUpload(true, 100)).toBe(true);
  });

  it("allows Free users under the monthly limit", () => {
    expect(canUpload(false, 0)).toBe(true);
    expect(canUpload(false, 2)).toBe(true);
  });

  it("blocks Free users exactly at the monthly limit (boundary)", () => {
    expect(canUpload(false, 3)).toBe(false);
  });

  it("blocks Free users over the monthly limit", () => {
    expect(canUpload(false, 4)).toBe(false);
  });
});
