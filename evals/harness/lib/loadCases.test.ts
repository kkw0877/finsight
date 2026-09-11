import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { loadCasesFromDir, loadReviewCases, loadQaCases } from "./loadCases";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(here, "__fixtures__", "sample-cases");

describe("loadCasesFromDir", () => {
  it("디렉터리의 .md 파일을 파일명 순으로 파싱해서 반환한다", () => {
    const cases = loadCasesFromDir(FIXTURE_DIR);
    expect(cases.map((c) => c.id)).toEqual(["fixture-a", "fixture-b"]);
    expect(cases[0].track).toBe("review");
    expect(cases[1].track).toBe("qa");
  });

  it("존재하지 않는 디렉터리는 에러를 던진다", () => {
    expect(() => loadCasesFromDir(path.join(here, "__fixtures__", "does-not-exist"))).toThrow();
  });
});

describe("loadReviewCases / loadQaCases", () => {
  it("실제 cases/review, cases/qa 디렉터리를 파싱 가능한 상태로 로드한다", () => {
    const reviewCases = loadReviewCases();
    const qaCases = loadQaCases();

    expect(reviewCases.length).toBeGreaterThan(0);
    expect(qaCases.length).toBeGreaterThan(0);
    expect(reviewCases.every((c) => c.track === "review")).toBe(true);
    expect(qaCases.every((c) => c.track === "qa")).toBe(true);
  });
});
