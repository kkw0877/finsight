import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "./Reveal";

describe("Reveal", () => {
  it("renders its children", () => {
    render(
      <Reveal>
        <p>안녕하세요</p>
      </Reveal>,
    );
    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
  });

  it("shows the revealed state immediately when IntersectionObserver is unavailable (jsdom)", () => {
    render(
      <Reveal>
        <p>내용</p>
      </Reveal>,
    );
    const wrapper = screen.getByText("내용").parentElement;
    expect(wrapper?.className).toContain("opacity-100");
  });
});
