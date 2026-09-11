import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatterMarkdown } from "./frontmatter";
import { toGoldenCase } from "./parseCase";
import type { GoldenCase, QaCase, ReviewCase } from "./types";

const here = path.dirname(fileURLToPath(import.meta.url));
const CASES_ROOT = path.join(here, "..", "cases");

export function loadCasesFromDir(dir: string): GoldenCase[] {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  return files.map((file) => {
    const filePath = path.join(dir, file);
    const source = fs.readFileSync(filePath, "utf-8");
    const raw = parseFrontmatterMarkdown(source, filePath);
    return toGoldenCase(raw);
  });
}

export function loadReviewCases(): ReviewCase[] {
  return loadCasesFromDir(path.join(CASES_ROOT, "review")) as ReviewCase[];
}

export function loadQaCases(): QaCase[] {
  return loadCasesFromDir(path.join(CASES_ROOT, "qa")) as QaCase[];
}
