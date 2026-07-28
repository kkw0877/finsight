import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessingPipeline } from "./ProcessingPipeline";

describe("ProcessingPipeline", () => {
  it("renders the section heading", () => {
    render(<ProcessingPipeline />);
    expect(
      screen.getByRole("heading", { name: "이렇게 분석합니다" }),
    ).toBeInTheDocument();
  });

  it("renders the four pipeline steps matching ADR-004's two-stage Claude call", () => {
    render(<ProcessingPipeline />);
    expect(screen.getByText("CSV/PDF 업로드")).toBeInTheDocument();
    expect(screen.getByText(/Haiku/)).toBeInTheDocument();
    expect(screen.getByText(/Sonnet/)).toBeInTheDocument();
    expect(screen.getByText(/Opus/)).toBeInTheDocument();
    expect(screen.getByText("인사이트 완성")).toBeInTheDocument();
  });
});
