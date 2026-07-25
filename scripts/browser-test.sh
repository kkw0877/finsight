#!/usr/bin/env bash
# docs/BROWSER_TESTING.md에 문서화된 7개 시나리오를 dev-browser로 실행한다.
# 포트 3000이 이미 사용 중이면(=사용자가 직접 띄운 서버로 간주) 절대 건드리지 않고 재사용하며,
# 비어 있을 때만 직접 dev 서버를 기동하고, 자신이 기동한 경우에만 종료까지 책임진다.
set -euo pipefail

PORT=3000
BASE_URL="http://localhost:${PORT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO_SCRIPT="${SCRIPT_DIR}/browser-test.devbrowser.js"
DEV_LOG="/tmp/finsight-browser-test-dev.log"

STARTED_SERVER=0

if lsof -ti:"${PORT}" >/dev/null 2>&1; then
  echo "[browser-test] 포트 ${PORT}가 이미 사용 중입니다 — 기존 서버를 재사용합니다 (종료하지 않음)."
else
  echo "[browser-test] 포트 ${PORT}가 비어 있어 dev 서버를 직접 기동합니다."
  (cd "${SCRIPT_DIR}/.." && npm run dev > "${DEV_LOG}" 2>&1 &)
  STARTED_SERVER=1

  READY=0
  for _ in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}" 2>/dev/null | grep -q 200; then
      READY=1
      break
    fi
    sleep 1
  done
  if [ "${READY}" -ne 1 ]; then
    echo "[browser-test] dev 서버가 30초 내에 기동되지 않았습니다. 로그: ${DEV_LOG}" >&2
    exit 1
  fi
fi

cleanup() {
  if [ "${STARTED_SERVER}" -eq 1 ]; then
    echo "[browser-test] 직접 기동한 dev 서버를 종료합니다."
    lsof -ti:"${PORT}" 2>/dev/null | xargs -r kill
  fi
}
trap cleanup EXIT

OUTPUT="$(dev-browser --headless < "${SCENARIO_SCRIPT}")"
echo "${OUTPUT}"

ALL_PASS="$(echo "${OUTPUT}" | sed -n '/===BROWSER_TEST_RESULT_JSON_START===/,/===BROWSER_TEST_RESULT_JSON_END===/p' | sed '1d;$d' | node -e '
let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  try {
    console.log(JSON.parse(data).allPass);
  } catch {
    console.log("parse_error");
  }
});
')"

if [ "${ALL_PASS}" != "true" ]; then
  echo "[browser-test] 하나 이상의 시나리오가 실패했습니다."
  exit 1
fi

echo "[browser-test] 모든 시나리오 통과."
