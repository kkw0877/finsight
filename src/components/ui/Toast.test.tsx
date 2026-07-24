import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("renders the message", () => {
    render(<Toast message="업로드가 완료되었습니다" variant="positive" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "업로드가 완료되었습니다"
    );
  });
});
