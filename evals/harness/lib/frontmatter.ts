import type { RawCase } from "./types";

const DELIMITER = "---";

/**
 * cases/*.md 전용 최소 frontmatter 파서. 순수 함수(파일시스템/네트워크 접근 없음) —
 * 전체 YAML을 지원하지 않고 `key: value`(스칼라)와 `key:\n  - item`(문자열 리스트)만 지원한다.
 */
export function parseFrontmatterMarkdown(source: string, filePath: string): RawCase {
  const lines = source.split("\n");
  if (lines[0]?.trim() !== DELIMITER) {
    throw new Error(`${filePath}: frontmatter는 "---"로 시작해야 합니다.`);
  }
  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === DELIMITER);
  if (endIndex === -1) {
    throw new Error(`${filePath}: frontmatter를 닫는 "---"를 찾을 수 없습니다.`);
  }

  const frontmatter = parseFrontmatterLines(lines.slice(1, endIndex), filePath);
  const body = lines
    .slice(endIndex + 1)
    .join("\n")
    .trim();

  return { filePath, frontmatter, body };
}

function parseFrontmatterLines(lines: string[], filePath: string): RawCase["frontmatter"] {
  const result: RawCase["frontmatter"] = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentKey && currentList) {
      result[currentKey] = currentList;
    }
    currentKey = null;
    currentList = null;
  };

  for (const rawLine of lines) {
    if (rawLine.trim() === "") continue;

    const listItemMatch = rawLine.match(/^\s*-\s+(.*)$/);
    if (listItemMatch) {
      if (!currentKey || !currentList) {
        throw new Error(`${filePath}: key 없이 리스트 항목이 나타났습니다: "${rawLine}"`);
      }
      currentList.push(unquote(listItemMatch[1]));
      continue;
    }

    flushList();

    const kvMatch = rawLine.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kvMatch) {
      throw new Error(`${filePath}: frontmatter 라인을 해석할 수 없습니다: "${rawLine}"`);
    }
    const [, key, rest] = kvMatch;
    if (rest.trim() === "") {
      currentKey = key;
      currentList = [];
    } else {
      result[key] = parseScalar(rest.trim());
    }
  }
  flushList();

  return result;
}

function parseScalar(value: string): string | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return unquote(value);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const isDoubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"');
  const isSingleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'");
  if ((isDoubleQuoted || isSingleQuoted) && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
