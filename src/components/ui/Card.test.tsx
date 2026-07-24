import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders with rounded-md, hairline border and no shadow", () => {
    const { container } = render(<Card>내용</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("rounded-md");
    expect(card.className).toContain("border-hairline");
    expect(card.className).not.toMatch(/shadow/);
  });
});
