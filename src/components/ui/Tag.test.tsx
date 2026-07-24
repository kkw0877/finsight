import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tag } from "./Tag";

describe("Tag", () => {
  it("renders label text with a pill radius", () => {
    render(<Tag>식비</Tag>);
    const tag = screen.getByText("식비");
    expect(tag.className).toContain("rounded-pill");
  });
});
