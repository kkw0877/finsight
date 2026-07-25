---
name: browser-test
description: Run FinSight's documented dev-browser scenarios (docs/BROWSER_TESTING.md) end-to-end via scripts/browser-test.sh and report pass/fail. Use when the user asks to browser-test FinSight, verify the golden path's unauthenticated flows, or re-run the scenarios in docs/BROWSER_TESTING.md.
---

# FinSight Browser Test

`docs/BROWSER_TESTING.md`에 문서화된 7개 시나리오(랜딩 페이지, 모바일 반응형, 라우트 보호, 로그인 페이지, Google OAuth 리다이렉트, 404, API 보호)를 자동 실행하고 결과를 보고한다.

## 실행

```bash
bash scripts/browser-test.sh
```

이 스크립트가 하는 일:
1. 포트 3000이 이미 사용 중이면 기존 서버를 그대로 재사용하고 절대 종료하지 않는다. 비어 있을 때만 `npm run dev`를 직접 기동한다.
2. `dev-browser --headless < scripts/browser-test.devbrowser.js`로 7개 시나리오를 순차 실행하고, 각 시나리오의 pass/fail을 코드로 판정한다 (`docs/BROWSER_TESTING.md`의 기대 결과와 동일한 assertion).
3. 자신이 직접 기동한 서버만 종료한다 (`trap cleanup EXIT`).
4. 하나라도 실패하면 non-zero exit code를 반환한다.

## 결과 보고

스크립트 출력에는 `===BROWSER_TEST_RESULT_JSON_START===` ~ `===BROWSER_TEST_RESULT_JSON_END===` 사이에 `{ allPass, results: [{ name, pass, details }, ...] }` 형태의 JSON이 포함된다. 이 JSON을 파싱해서 사용자에게 시나리오별 통과/실패 표로 요약해 보고한다. 실패한 시나리오가 있으면 `details`를 근거로 원인을 짚는다.

## 시나리오 변경 시

새 시나리오를 추가하거나 기존 시나리오의 기대값이 바뀌면 **`docs/BROWSER_TESTING.md`(사람이 읽는 문서)와 `scripts/browser-test.devbrowser.js`(실행 코드) 둘 다** 함께 갱신한다 — 문서만 고치고 스크립트를 갱신하지 않으면 다음 실행 시 진짜 회귀와 "문서-스크립트 불일치"를 구분할 수 없다.

## 범위 밖

인증이 필요한 골든 패스 구간(대시보드 렌더, quota/블러, Polar 체크아웃, 웹훅 `is_pro` 갱신)은 이 스크립트로 자동화하지 않는다. `docs/BROWSER_TESTING.md`의 "테스트 범위 밖" 섹션에 따라 `dev-browser --connect`로 사람이 직접 로그인한 브라우저에 붙어 진행한다.
