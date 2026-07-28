import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { UploadWidget } from "./UploadWidget";

function selectFile(input: HTMLElement, name = "statement.csv") {
  const file = new File(["date,merchant,amount"], name, { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("UploadWidget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("항상 인코딩·용량 제한 안내 문구를 보여준다", () => {
    render(<UploadWidget onResult={vi.fn()} />);
    expect(
      screen.getByText("CSV·PDF 지원 · EUC-KR/CP949 자동 인식 · 최대 2MB(CSV)/5MB(PDF) · 2,000행까지"),
    ).toBeInTheDocument();
  });

  it("분석 중에는 단계별 진행 라벨을 순서대로 보여준다", async () => {
    vi.useFakeTimers();
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof fetch;

    render(<UploadWidget onResult={vi.fn()} />);
    selectFile(screen.getByLabelText("CSV 또는 PDF 파일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(screen.getByText("파일 읽는 중")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("거래 내역 인식 중")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByText("카테고리 분류·요약 작성 중")).toBeInTheDocument();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          summaryText: "",
          categoryTotals: [],
          monthlyTrend: [],
          transactions: [],
          blurred: false,
        }),
      });
      await Promise.resolve();
    });
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

    selectFile(screen.getByLabelText("CSV 또는 PDF 파일 선택"));
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
    selectFile(screen.getByLabelText("CSV 또는 PDF 파일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => expect(screen.getByText("분석에 실패했습니다.")).toBeInTheDocument());
  });
});
