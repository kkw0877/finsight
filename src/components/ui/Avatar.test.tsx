import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders the first initial when no src is provided", () => {
    render(<Avatar name="김민준" />);
    const avatar = screen.getByRole("img", { name: "김민준" });
    expect(avatar).toHaveTextContent("김");
  });

  it("renders an image element when src is provided", () => {
    render(<Avatar name="김민준" src="/avatar.png" />);
    const avatar = screen.getByRole("img", { name: "김민준" });
    expect(avatar.tagName).toBe("IMG");
  });
});
