import { describe, expect, it } from "vitest";
import { blogPosts, getAllPosts, getPostBySlug } from "./blog";

describe("blogPosts", () => {
  it("starts empty until content ownership is decided", () => {
    expect(blogPosts).toEqual([]);
  });
});

describe("getAllPosts", () => {
  it("returns the registry", () => {
    expect(getAllPosts()).toBe(blogPosts);
  });
});

describe("getPostBySlug", () => {
  it("returns undefined when no post matches", () => {
    expect(getPostBySlug("does-not-exist")).toBeUndefined();
  });
});
