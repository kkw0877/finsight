import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UploadWidget } from "./UploadWidget";

function selectFile(input: HTMLElement, name = "statement.csv") {
  const file = new File(["date,merchant,amount"], name, { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("UploadWidget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("파일 선택 후 업로드하면 /api/upload로 전송하고 결과를 콜백으로 전달한다", async () => {
    const mockResult = {
      summaryText: "요약",
      categoryTotals: [],
      monthlyTrend: [],
      transactions: [],
      blurred: false,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    }) as unknown as typeof fetch;

    const onResult = vi.fn();
    render(<UploadWidget onResult={onResult} />);

    selectFile(screen.getByLabelText("CSV 파일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(mockResult));
    expect(global.fetch).toHaveBeenCalledWith("/api/upload", expect.objectContaining({ method: "POST" }));
  });

  it("파일을 선택하지 않으면 업로드 버튼이 비활성화된다", () => {
    render(<UploadWidget onResult={vi.fn()} />);
    expect(screen.getByRole("button", { name: "업로드" })).toBeDisabled();
  });

  it("업로드 실패 시 에러 메시지를 보여준다", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "분석에 실패했습니다." }),
    }) as unknown as typeof fetch;

    render(<UploadWidget onResult={vi.fn()} />);
    selectFile(screen.getByLabelText("CSV 파일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => expect(screen.getByText("분석에 실패했습니다.")).toBeInTheDocument());
  });
});
