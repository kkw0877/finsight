import type { GoldenCase, QaCase, RawCase, ReviewCase } from "./types";

export function toReviewCase(raw: RawCase): ReviewCase {
  const { frontmatter, filePath, body } = raw;
  const track = requireString(frontmatter, "track", filePath);
  if (track !== "review") {
    throw new Error(`${filePath}: track은 "review"여야 합니다 (실제: ${track}).`);
  }
  const id = requireString(frontmatter, "id", filePath);
  const expect = requireString(frontmatter, "expect", filePath);
  if (expect !== "violation" && expect !== "pass") {
    throw new Error(`${filePath}: expect는 "violation" 또는 "pass"여야 합니다 (실제: ${expect}).`);
  }
  const rule = requireString(frontmatter, "rule", filePath);
  const code = requireNonEmptyBody(body, filePath);

  return { track: "review", id, expect, rule, code, filePath };
}

export function toQaCase(raw: RawCase): QaCase {
  const { frontmatter, filePath, body } = raw;
  const track = requireString(frontmatter, "track", filePath);
  if (track !== "qa") {
    throw new Error(`${filePath}: track은 "qa"여야 합니다 (실제: ${track}).`);
  }
  const id = requireString(frontmatter, "id", filePath);
  const must = requireStringArray(frontmatter, "must", filePath);
  if (must.length === 0) {
    throw new Error(`${filePath}: must는 최소 1개 이상의 사실을 포함해야 합니다.`);
  }
  const mustNot = optionalStringArray(frontmatter, "mustNot");
  const guard = frontmatter.guard === true;
  const question = requireNonEmptyBody(body, filePath);

  return { track: "qa", id, question, must, mustNot, guard, filePath };
}

export function toGoldenCase(raw: RawCase): GoldenCase {
  const track = raw.frontmatter.track;
  if (track === "review") return toReviewCase(raw);
  if (track === "qa") return toQaCase(raw);
  throw new Error(`${raw.filePath}: 알 수 없는 track "${String(track)}" (review 또는 qa만 허용).`);
}

function requireString(fm: RawCase["frontmatter"], key: string, filePath: string): string {
  const value = fm[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${filePath}: frontmatter.${key}는 필수 문자열입니다.`);
  }
  return value;
}

function requireStringArray(fm: RawCase["frontmatter"], key: string, filePath: string): string[] {
  const value = fm[key];
  if (!Array.isArray(value)) {
    throw new Error(`${filePath}: frontmatter.${key}는 필수 리스트입니다.`);
  }
  return value;
}

function optionalStringArray(fm: RawCase["frontmatter"], key: string): string[] {
  const value = fm[key];
  return Array.isArray(value) ? value : [];
}

function requireNonEmptyBody(body: string, filePath: string): string {
  if (body.trim().length === 0) {
    throw new Error(`${filePath}: 본문이 비어 있습니다.`);
  }
  return body;
}
